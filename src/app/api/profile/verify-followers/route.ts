import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyFollowersSchema } from "@/lib/validators";
import { checkRateLimit } from "@/lib/rate-limit";
import { VERIFICATION_RATE_LIMIT, DISCREPANCY_TOLERANCE_PERCENT } from "@/lib/constants";
import { verifyFollowerCount } from "@/lib/follower-verifier";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = verifyFollowersSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "You must consent to follower verification." },
      { status: 400 }
    );
  }

  // Rate limit
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

  // Get user's profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, linkedin_url, follower_count")
    .eq("user_id", user.id)
    .single();

  if (!profile || !profile.linkedin_url) {
    return NextResponse.json(
      { error: "You need a profile with a LinkedIn URL first." },
      { status: 400 }
    );
  }

  // Use service client for writing verification logs (bypasses RLS)
  const serviceClient = await createServiceClient();

  // Attempt automated verification
  const result = await verifyFollowerCount(profile.linkedin_url);

  if ("error" in result) {
    // Log the failure
    await serviceClient.from("follower_verification_log").insert({
      profile_id: profile.id,
      method: "automatic",
      result: "failure",
      self_reported_count: profile.follower_count,
      verified_count: null,
      failure_reason: result.error,
      consent_recorded: true,
    });

    return NextResponse.json({
      status: "failed",
      reason: result.error,
      suggest_manual: true,
    });
  }

  // Verification succeeded
  const verifiedCount = result.count;
  const selfReported = profile.follower_count;
  const discrepancyPercent =
    selfReported > 0
      ? Math.abs(((verifiedCount - selfReported) / selfReported) * 100)
      : verifiedCount > 0
      ? 100
      : 0;
  const withinTolerance = discrepancyPercent <= DISCREPANCY_TOLERANCE_PERCENT;
  const now = new Date().toISOString();

  // Log success
  await serviceClient.from("follower_verification_log").insert({
    profile_id: profile.id,
    method: "automatic",
    result: "success",
    self_reported_count: selfReported,
    verified_count: verifiedCount,
    consent_recorded: true,
  });

  // Update profile verification fields
  await supabase
    .from("profiles")
    .update({
      follower_verify_status: "verified",
      follower_count_verified: verifiedCount,
      follower_verified_at: now,
      follower_verify_method: "automatic",
      follower_consent_at: now,
      updated_at: now,
    })
    .eq("id", profile.id);

  const response: Record<string, unknown> = {
    status: "verified",
    verified_count: verifiedCount,
    self_reported_count: selfReported,
    discrepancy_percent: Math.round(discrepancyPercent * 10) / 10,
    within_tolerance: withinTolerance,
    verified_at: now,
    method: "automatic",
  };

  if (!withinTolerance) {
    response.prompt_update = true;
    response.message = `Your verified follower count (${verifiedCount.toLocaleString()}) differs from your reported count (${selfReported.toLocaleString()}). Would you like to update?`;
  }

  return NextResponse.json(response);
}
