import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { experiencesSaveSchema } from "@/lib/validators";
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
  const parsed = experiencesSaveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 }
    );
  }

  // Get user's profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, baseline_mmr, current_mmr, follower_count, experience_count, projects_count, skills_count, education_count")
    .eq("user_id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Delete existing and insert new in a transaction-like manner
  const { error: deleteError } = await supabase
    .from("profile_experiences")
    .delete()
    .eq("profile_id", profile.id);

  if (deleteError) {
    return NextResponse.json({ error: "Failed to update experiences" }, { status: 500 });
  }

  const entries = parsed.data.experiences;
  if (entries.length > 0) {
    const { error: insertError } = await supabase
      .from("profile_experiences")
      .insert(
        entries.map((exp) => ({
          profile_id: profile.id,
          company: exp.company,
          title: exp.title,
          start_date: exp.start_date,
          end_date: exp.end_date,
          location: exp.location ?? null,
          description: exp.description ?? null,
          sort_order: exp.sort_order,
        }))
      );

    if (insertError) {
      return NextResponse.json({ error: "Failed to save experiences" }, { status: 500 });
    }
  }

  // Recompute counts and MMR
  const newExperienceCount = entries.length;
  const oldBaseline = profile.baseline_mmr;
  const newBaseline = computeBaselineMMR({
    follower_count: profile.follower_count,
    experience_count: newExperienceCount,
    projects_count: profile.projects_count,
    skills_count: profile.skills_count,
    education_count: profile.education_count,
  });
  const baselineDelta = newBaseline - oldBaseline;
  const newCurrentMmr = profile.current_mmr + baselineDelta;

  await supabase
    .from("profiles")
    .update({
      experience_count: newExperienceCount,
      baseline_mmr: newBaseline,
      current_mmr: newCurrentMmr,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id);

  return NextResponse.json({
    saved: entries.length,
    experience_count: newExperienceCount,
    mmr_update: {
      old_baseline: oldBaseline,
      new_baseline: newBaseline,
      old_current: profile.current_mmr,
      new_current: newCurrentMmr,
    },
  });
}
