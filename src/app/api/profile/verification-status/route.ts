import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { VERIFICATION_EXPIRY_DAYS, VERIFICATION_WARNING_DAYS } from "@/lib/constants";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, follower_verify_status, follower_count_verified, follower_verified_at, follower_verify_method")
    .eq("user_id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Calculate expiry info
  let expiresAt: string | null = null;
  let daysUntilExpiry: number | null = null;
  let expiringSoon = false;
  let displayStatus = profile.follower_verify_status;

  if (profile.follower_verified_at && profile.follower_verify_status === "verified") {
    const verifiedDate = new Date(profile.follower_verified_at);
    const expiryDate = new Date(verifiedDate.getTime() + VERIFICATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    expiresAt = expiryDate.toISOString();

    const now = new Date();
    const msUntilExpiry = expiryDate.getTime() - now.getTime();
    daysUntilExpiry = Math.ceil(msUntilExpiry / (24 * 60 * 60 * 1000));

    if (daysUntilExpiry <= 0) {
      displayStatus = "expired";
      daysUntilExpiry = 0;
    }

    const warningDate = new Date(verifiedDate.getTime() + VERIFICATION_WARNING_DAYS * 24 * 60 * 60 * 1000);
    expiringSoon = now >= warningDate && daysUntilExpiry > 0;
  }

  // Fetch pending screenshots
  const { data: pendingScreenshots } = await supabase
    .from("verification_screenshots")
    .select("id, uploaded_at, review_status")
    .eq("profile_id", profile.id)
    .eq("review_status", "pending");

  return NextResponse.json({
    status: displayStatus,
    verified_count: profile.follower_count_verified,
    verified_at: profile.follower_verified_at,
    method: profile.follower_verify_method,
    expires_at: expiresAt,
    days_until_expiry: daysUntilExpiry,
    expiring_soon: expiringSoon,
    pending_screenshots: pendingScreenshots ?? [],
  });
}
