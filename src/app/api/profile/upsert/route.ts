import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { profileUpsertSchema } from "@/lib/validators";
import { computeBaselineMMR } from "@/lib/mmr";
import { checkRateLimit } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/lib/constants";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Rate limit
  const rl = checkRateLimit(
    `profile:${user.id}`,
    RATE_LIMITS.profileUpsert.limit,
    RATE_LIMITS.profileUpsert.windowMs
  );
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429 }
    );
  }

  // Parse and validate body
  const body = await request.json();
  const parsed = profileUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const newBaseline = computeBaselineMMR({
    follower_count: data.follower_count,
    experience_count: data.experience_count,
    projects_count: data.projects_count ?? null,
    skills_count: data.skills_count ?? null,
    education_count: data.education_count ?? null,
  });

  const avatarUrl = user.user_metadata?.avatar_url ?? null;

  // Check if profile exists
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, baseline_mmr, current_mmr, linkedin_url, avatar_url")
    .eq("user_id", user.id)
    .single();

  let profileId: string;

  if (existingProfile) {
    // Update: adjust current_mmr by baseline delta
    const baselineDelta = newBaseline - existingProfile.baseline_mmr;
    const newCurrentMmr = existingProfile.current_mmr + baselineDelta;

    // Reset verification if LinkedIn URL changed
    const verificationReset =
      existingProfile.linkedin_url !== data.linkedin_url
        ? {
            follower_verify_status: "unverified" as const,
            follower_count_verified: null,
            follower_verified_at: null,
            follower_verify_method: null,
          }
        : {};

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: data.display_name,
        linkedin_url: data.linkedin_url,
        follower_count: data.follower_count,
        experience_count: data.experience_count,
        projects_count: data.projects_count ?? null,
        skills_count: data.skills_count ?? null,
        education_count: data.education_count ?? null,
        baseline_mmr: newBaseline,
        current_mmr: newCurrentMmr,
        updated_at: new Date().toISOString(),
        ...verificationReset,
        ...(existingProfile.avatar_url ? {} : { avatar_url: avatarUrl }),
      })
      .eq("id", existingProfile.id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      );
    }
    profileId = existingProfile.id;
  } else {
    // Insert new profile
    const { data: newProfile, error } = await supabase
      .from("profiles")
      .insert({
        user_id: user.id,
        display_name: data.display_name,
        linkedin_url: data.linkedin_url,
        follower_count: data.follower_count,
        experience_count: data.experience_count,
        projects_count: data.projects_count ?? null,
        skills_count: data.skills_count ?? null,
        education_count: data.education_count ?? null,
        baseline_mmr: newBaseline,
        current_mmr: newBaseline,
        avatar_url: avatarUrl,
      })
      .select("id")
      .single();

    if (error || !newProfile) {
      return NextResponse.json(
        { error: "Failed to create profile" },
        { status: 500 }
      );
    }
    profileId = newProfile.id;
  }

  // Update profile interests: delete old, insert new
  await supabase.from("profile_interests").delete().eq("profile_id", profileId);

  // Get category IDs for the slugs
  const { data: categories } = await supabase
    .from("categories")
    .select("id, slug, label")
    .in("slug", data.category_slugs);

  if (categories && categories.length > 0) {
    await supabase.from("profile_interests").insert(
      categories.map((cat) => ({
        profile_id: profileId,
        category_id: cat.id,
      }))
    );
  }

  // Fetch the complete profile for response
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", profileId)
    .single();

  return NextResponse.json({
    profile: {
      ...profile,
      categories: categories ?? [],
    },
  });
}
