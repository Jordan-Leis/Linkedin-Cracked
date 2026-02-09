import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { educationSaveSchema } from "@/lib/validators";
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
  const parsed = educationSaveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, baseline_mmr, current_mmr, follower_count, experience_count, projects_count, skills_count, education_count")
    .eq("user_id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const { error: deleteError } = await supabase
    .from("profile_education")
    .delete()
    .eq("profile_id", profile.id);

  if (deleteError) {
    return NextResponse.json({ error: "Failed to update education" }, { status: 500 });
  }

  const entries = parsed.data.education;
  if (entries.length > 0) {
    const { error: insertError } = await supabase
      .from("profile_education")
      .insert(
        entries.map((edu) => ({
          profile_id: profile.id,
          institution: edu.institution,
          degree: edu.degree ?? null,
          field_of_study: edu.field_of_study ?? null,
          start_date: edu.start_date ?? null,
          end_date: edu.end_date ?? null,
        }))
      );

    if (insertError) {
      return NextResponse.json({ error: "Failed to save education" }, { status: 500 });
    }
  }

  const newEducationCount = entries.length;
  const oldBaseline = profile.baseline_mmr;
  const newBaseline = computeBaselineMMR({
    follower_count: profile.follower_count,
    experience_count: profile.experience_count,
    projects_count: profile.projects_count,
    skills_count: profile.skills_count,
    education_count: newEducationCount,
  });
  const baselineDelta = newBaseline - oldBaseline;
  const newCurrentMmr = profile.current_mmr + baselineDelta;

  await supabase
    .from("profiles")
    .update({
      education_count: newEducationCount,
      baseline_mmr: newBaseline,
      current_mmr: newCurrentMmr,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id);

  return NextResponse.json({
    saved: entries.length,
    education_count: newEducationCount,
    mmr_update: {
      old_baseline: oldBaseline,
      new_baseline: newBaseline,
      old_current: profile.current_mmr,
      new_current: newCurrentMmr,
    },
  });
}
