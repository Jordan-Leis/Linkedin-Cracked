"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ProfileCard, type ProfileCardData } from "@/components/profile-card";

interface Matchup {
  id: string;
  profile_a: ProfileCardData;
  profile_b: ProfileCardData;
}

interface MmrUpdate {
  winner: { profile_id: string; old_mmr: number; new_mmr: number };
  loser: { profile_id: string; old_mmr: number; new_mmr: number };
}

export default function BattlePage() {
  const [matchup, setMatchup] = useState<Matchup | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [message, setMessage] = useState("");
  const [lastResult, setLastResult] = useState<MmrUpdate | null>(null);
  const [error, setError] = useState("");

  const fetchMatchup = useCallback(async () => {
    setLoading(true);
    setError("");
    setLastResult(null);

    try {
      const res = await fetch("/api/matchup/next");
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to load matchup");
        setMatchup(null);
        return;
      }

      if (data.matchup) {
        setMatchup(data.matchup);
        setMessage("");
      } else {
        setMatchup(null);
        setMessage(data.message || "No matchups available.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatchup();
  }, [fetchMatchup]);

  const handleVote = async (winnerProfileId: string) => {
    if (!matchup || voting) return;
    setVoting(true);
    setError("");

    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchup_id: matchup.id,
          winner_profile_id: winnerProfileId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to cast vote");
        return;
      }

      setLastResult(data.mmr_updates);

      // Auto-load next matchup after a brief delay
      setTimeout(() => {
        fetchMatchup();
      }, 2000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setVoting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-muted-foreground">Finding a matchup...</p>
      </div>
    );
  }

  if (message && !matchup) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <p className="text-muted-foreground">{message}</p>
        <Button variant="outline" onClick={fetchMatchup}>
          Try Again
        </Button>
      </div>
    );
  }

  if (error && !matchup) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={fetchMatchup}>
          Retry
        </Button>
      </div>
    );
  }

  if (!matchup) return null;

  return (
    <div className="flex flex-col items-center gap-8 py-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Who&apos;s More Cracked?</h1>
        <p className="text-muted-foreground mt-1">
          Vote for the profile you think is more impressive
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {lastResult && (
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Winner: {lastResult.winner.old_mmr} → {lastResult.winner.new_mmr} MMR
          </p>
          <p>
            Loser: {lastResult.loser.old_mmr} → {lastResult.loser.new_mmr} MMR
          </p>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6 items-start">
        <ProfileCard
          profile={matchup.profile_a}
          action={
            <Button
              className="w-full"
              onClick={() => handleVote(matchup.profile_a.id)}
              disabled={voting || !!lastResult}
            >
              Vote for {matchup.profile_a.display_name}
            </Button>
          }
        />

        <div className="flex items-center self-center text-2xl font-bold text-muted-foreground">
          VS
        </div>

        <ProfileCard
          profile={matchup.profile_b}
          action={
            <Button
              className="w-full"
              onClick={() => handleVote(matchup.profile_b.id)}
              disabled={voting || !!lastResult}
            >
              Vote for {matchup.profile_b.display_name}
            </Button>
          }
        />
      </div>

      <Button variant="outline" onClick={fetchMatchup} disabled={loading}>
        Skip / Next Matchup
      </Button>
    </div>
  );
}
