"use client";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export default function Home() {
  const supabase = createClient();

  const handleLogin = () => {
    supabase.auth.signInWithOAuth({
      provider: "linkedin_oidc",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="flex flex-col items-center justify-center gap-8 py-20">
      <div className="text-center space-y-4 max-w-2xl">
        <h1 className="text-5xl font-bold tracking-tight">
          Who has the most <span className="text-primary">cracked</span>{" "}
          LinkedIn?
        </h1>
        <p className="text-xl text-muted-foreground">
          Submit your profile, battle head-to-head, and climb the leaderboard.
          May the most impressive profile win.
        </p>
      </div>

      <Button size="lg" onClick={handleLogin} className="text-lg px-8 py-6">
        Login with LinkedIn
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 max-w-3xl">
        <div className="text-center space-y-2">
          <div className="text-3xl font-bold">1</div>
          <h3 className="font-semibold">Submit Your Profile</h3>
          <p className="text-sm text-muted-foreground">
            Add your LinkedIn URL and metrics to get a baseline rating.
          </p>
        </div>
        <div className="text-center space-y-2">
          <div className="text-3xl font-bold">2</div>
          <h3 className="font-semibold">Vote in Battles</h3>
          <p className="text-sm text-muted-foreground">
            See two profiles side-by-side and pick the more impressive one.
          </p>
        </div>
        <div className="text-center space-y-2">
          <div className="text-3xl font-bold">3</div>
          <h3 className="font-semibold">Climb the Leaderboard</h3>
          <p className="text-sm text-muted-foreground">
            Elo-based rankings update with every vote. Can you reach #1?
          </p>
        </div>
      </div>
    </div>
  );
}
