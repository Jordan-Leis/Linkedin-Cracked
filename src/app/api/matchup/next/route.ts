import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { findMatch, pairKey, type MatchCandidate } from "@/lib/matchmaking";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Get the voter's profile + interests
  const { data: voterProfile } = await supabase
    .from("profiles")
    .select("id, user_id, current_mmr, profile_interests(category_id, categories(slug))")
    .eq("user_id", user.id)
    .single();

  if (!voterProfile) {
    return NextResponse.json(
      { error: "You need a profile first" },
      { status: 400 }
    );
  }

  const voterCategories = (
    voterProfile.profile_interests as unknown as Array<{ categories: { slug: string } }>
  ).map((pi) => pi.categories.slug);

  // Fetch all profiles with their categories
  const { data: allProfiles } = await supabase
    .from("profiles")
    .select("id, user_id, current_mmr, profile_interests(category_id, categories(slug))");

  if (!allProfiles || allProfiles.length < 2) {
    return NextResponse.json({
      matchup: null,
      message: "Not enough profiles to create a matchup yet.",
    });
  }

  // Build candidate list
  const candidates: MatchCandidate[] = allProfiles.map((p) => ({
    id: p.id,
    user_id: p.user_id,
    current_mmr: p.current_mmr,
    category_slugs: (
      p.profile_interests as unknown as Array<{ categories: { slug: string } }>
    ).map((pi) => pi.categories.slug),
  }));

  // Get matchups the voter has already voted on
  const { data: existingVotes } = await supabase
    .from("votes")
    .select("matchup_id, matchups(profile_a_id, profile_b_id)")
    .eq("voter_user_id", user.id);

  const votedPairKeys = new Set<string>();
  if (existingVotes) {
    for (const vote of existingVotes) {
      const matchup = vote.matchups as unknown as {
        profile_a_id: string;
        profile_b_id: string;
      };
      if (matchup) {
        votedPairKeys.add(pairKey(matchup.profile_a_id, matchup.profile_b_id));
      }
    }
  }

  // Inject voter's categories into matching context
  // The voter acts as context but is excluded from pairing
  const voterCandidate: MatchCandidate = {
    id: voterProfile.id,
    user_id: user.id,
    current_mmr: voterProfile.current_mmr,
    category_slugs: voterCategories,
  };

  // Ensure voter is in candidates (should already be, but be safe)
  if (!candidates.find((c) => c.id === voterCandidate.id)) {
    candidates.push(voterCandidate);
  }

  const match = findMatch(user.id, candidates, votedPairKeys);

  if (!match) {
    return NextResponse.json({
      matchup: null,
      message: "Not enough profiles to create a matchup yet.",
    });
  }

  // Create matchup record
  const { data: matchup, error } = await supabase
    .from("matchups")
    .insert({
      profile_a_id: match.profileA.id,
      profile_b_id: match.profileB.id,
    })
    .select("id")
    .single();

  if (error || !matchup) {
    return NextResponse.json(
      { error: "Failed to create matchup" },
      { status: 500 }
    );
  }

  // Fetch full profiles with structured data for rich battle cards
  const profileSelect = "*, profile_interests(category_id, categories(slug, label)), profile_experiences(company, title, sort_order), profile_skills(name, sort_order)";

  const { data: profileA } = await supabase
    .from("profiles")
    .select(profileSelect)
    .eq("id", match.profileA.id)
    .single();

  const { data: profileB } = await supabase
    .from("profiles")
    .select(profileSelect)
    .eq("id", match.profileB.id)
    .single();

  const formatProfile = (p: typeof profileA) => {
    if (!p) return null;
    const { profile_interests, profile_experiences, profile_skills, ...rest } = p;

    const experiences = (
      profile_experiences as unknown as Array<{ company: string; title: string; sort_order: number }>
    ) || [];
    const skills = (
      profile_skills as unknown as Array<{ name: string; sort_order: number }>
    ) || [];

    // Top 2 experiences by sort_order, top 3 skills by sort_order
    const topExperiences = [...experiences]
      .sort((a, b) => a.sort_order - b.sort_order)
      .slice(0, 2)
      .map(({ company, title }) => ({ company, title }));

    const topSkills = [...skills]
      .sort((a, b) => a.sort_order - b.sort_order)
      .slice(0, 3)
      .map((s) => s.name);

    return {
      ...rest,
      categories: (
        profile_interests as unknown as Array<{
          categories: { slug: string; label: string };
        }>
      ).map((pi) => pi.categories),
      top_experiences: topExperiences,
      top_skills: topSkills,
    };
  };

  return NextResponse.json({
    matchup: {
      id: matchup.id,
      profile_a: formatProfile(profileA),
      profile_b: formatProfile(profileB),
    },
  });
}
