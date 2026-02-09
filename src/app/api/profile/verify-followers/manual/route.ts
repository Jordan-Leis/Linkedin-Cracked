import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  VERIFICATION_RATE_LIMIT,
  MAX_SCREENSHOT_SIZE,
  ALLOWED_IMAGE_TYPES,
} from "@/lib/constants";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Rate limit (shared with automated verification)
  const rl = checkRateLimit(
    `verify:${user.id}`,
    VERIFICATION_RATE_LIMIT.limit,
    VERIFICATION_RATE_LIMIT.windowMs
  );
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429 }
    );
  }

  // Parse multipart form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file");
  const claimedCountStr = formData.get("claimed_count");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  if (!claimedCountStr) {
    return NextResponse.json(
      { error: "Claimed count is required." },
      { status: 400 }
    );
  }

  const claimedCount = parseInt(String(claimedCountStr));
  if (isNaN(claimedCount) || claimedCount < 0) {
    return NextResponse.json(
      { error: "Claimed count must be a non-negative integer." },
      { status: 400 }
    );
  }

  // Validate file type
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return NextResponse.json(
      { error: "File must be PNG or JPG." },
      { status: 400 }
    );
  }

  // Validate file size
  if (file.size > MAX_SCREENSHOT_SIZE) {
    return NextResponse.json(
      { error: "Screenshot must be under 2MB." },
      { status: 400 }
    );
  }

  // Get user's profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, follower_count")
    .eq("user_id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  // Upload to Supabase Storage
  const ext = file.type === "image/png" ? "png" : "jpg";
  const storagePath = `${profile.id}/${crypto.randomUUID()}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("verification-screenshots")
    .upload(storagePath, arrayBuffer, {
      contentType: file.type,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: "Failed to upload screenshot." },
      { status: 500 }
    );
  }

  // Insert screenshot record
  const { data: screenshot, error: insertError } = await supabase
    .from("verification_screenshots")
    .insert({
      profile_id: profile.id,
      storage_path: storagePath,
      review_status: "pending",
    })
    .select("id")
    .single();

  if (insertError || !screenshot) {
    return NextResponse.json(
      { error: "Failed to save screenshot record." },
      { status: 500 }
    );
  }

  // Update profile status
  await supabase
    .from("profiles")
    .update({
      follower_verify_status: "pending_manual",
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id);

  // Log the attempt via service client
  const serviceClient = await createServiceClient();
  await serviceClient.from("follower_verification_log").insert({
    profile_id: profile.id,
    method: "manual",
    result: "pending",
    self_reported_count: profile.follower_count,
    verified_count: claimedCount,
    consent_recorded: true,
  });

  return NextResponse.json({
    status: "pending_manual",
    screenshot_id: screenshot.id,
    message:
      "Your screenshot has been submitted for review. You will be notified when reviewed.",
  });
}
