import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateVerifiedCountSchema } from "@/lib/validators";
import { computeBaselineMMR } from "@/lib/mmr";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updateVerifiedCountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, follower_count, follower_count_verified, follower_verify_status, baseline_mmr, current_mmr, experience_count, projects_count, skills_count, education_count")
    .eq("user_id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  if (profile.follower_verify_status !== "verified" || profile.follower_count_verified == null) {
    return NextResponse.json(
      { error: "No verified count to apply." },
      { status: 400 }
    );
  }

  const newFollowerCount = profile.follower_count_verified;
  const oldBaseline = profile.baseline_mmr;
  const newBaseline = computeBaselineMMR({
    follower_count: newFollowerCount,
    experience_count: profile.experience_count,
    projects_count: profile.projects_count,
    skills_count: profile.skills_count,
    education_count: profile.education_count,
  });
  const baselineDelta = newBaseline - oldBaseline;
  const newCurrentMmr = profile.current_mmr + baselineDelta;

  await supabase
    .from("profiles")
    .update({
      follower_count: newFollowerCount,
      baseline_mmr: newBaseline,
      current_mmr: newCurrentMmr,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id);

  return NextResponse.json({
    follower_count: newFollowerCount,
    mmr_update: {
      old_baseline: oldBaseline,
      new_baseline: newBaseline,
      old_current: profile.current_mmr,
      new_current: newCurrentMmr,
    },
  });
}
