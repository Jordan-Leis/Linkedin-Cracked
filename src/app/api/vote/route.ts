import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { voteSchema } from "@/lib/validators";
import { computeEloUpdate } from "@/lib/mmr";
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
    `vote:${user.id}`,
    RATE_LIMITS.vote.limit,
    RATE_LIMITS.vote.windowMs
  );
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429 }
    );
  }

  // Parse and validate body
  const body = await request.json();
  const parsed = voteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { matchup_id, winner_profile_id } = parsed.data;

  // Fetch the matchup
  const { data: matchup } = await supabase
    .from("matchups")
    .select("id, profile_a_id, profile_b_id")
    .eq("id", matchup_id)
    .single();

  if (!matchup) {
    return NextResponse.json(
      { error: "Matchup not found" },
      { status: 400 }
    );
  }

  // Validate winner is one of the matchup profiles
  if (
    winner_profile_id !== matchup.profile_a_id &&
    winner_profile_id !== matchup.profile_b_id
  ) {
    return NextResponse.json(
      { error: "Winner must be one of the matchup profiles" },
      { status: 400 }
    );
  }

  // Anti-abuse: no self-voting
  const { data: voterProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (
    voterProfile &&
    (voterProfile.id === matchup.profile_a_id ||
      voterProfile.id === matchup.profile_b_id)
  ) {
    return NextResponse.json(
      { error: "You cannot vote on your own matchup" },
      { status: 400 }
    );
  }

  // Determine winner and loser
  const loser_profile_id =
    winner_profile_id === matchup.profile_a_id
      ? matchup.profile_b_id
      : matchup.profile_a_id;

  // Fetch both profiles' current MMR
  const { data: winnerProfile } = await supabase
    .from("profiles")
    .select("id, current_mmr")
    .eq("id", winner_profile_id)
    .single();

  const { data: loserProfile } = await supabase
    .from("profiles")
    .select("id, current_mmr")
    .eq("id", loser_profile_id)
    .single();

  if (!winnerProfile || !loserProfile) {
    return NextResponse.json(
      { error: "Profile not found" },
      { status: 400 }
    );
  }

  // Compute Elo update
  const eloResult = computeEloUpdate(
    winnerProfile.current_mmr,
    loserProfile.current_mmr,
    "a" // winner is always "a" since we pass winner first
  );

  // Insert vote (unique constraint on matchup_id + voter_user_id prevents duplicates)
  const { data: vote, error: voteError } = await supabase
    .from("votes")
    .insert({
      matchup_id,
      voter_user_id: user.id,
      winner_profile_id,
      loser_profile_id,
    })
    .select("id")
    .single();

  if (voteError) {
    if (voteError.code === "23505") {
      return NextResponse.json(
        { error: "You have already voted on this matchup" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to record vote" },
      { status: 500 }
    );
  }

  // Update MMR for both profiles
  await supabase
    .from("profiles")
    .update({ current_mmr: eloResult.newMmrA })
    .eq("id", winner_profile_id);

  await supabase
    .from("profiles")
    .update({ current_mmr: eloResult.newMmrB })
    .eq("id", loser_profile_id);

  return NextResponse.json({
    vote: {
      id: vote.id,
      matchup_id,
      winner_profile_id,
      loser_profile_id,
    },
    mmr_updates: {
      winner: {
        profile_id: winner_profile_id,
        old_mmr: winnerProfile.current_mmr,
        new_mmr: eloResult.newMmrA,
      },
      loser: {
        profile_id: loser_profile_id,
        old_mmr: loserProfile.current_mmr,
        new_mmr: eloResult.newMmrB,
      },
    },
  });
}
