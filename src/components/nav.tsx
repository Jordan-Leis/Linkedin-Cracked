"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import type { User } from "@supabase/supabase-js";

export function Nav() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <header className="border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold">
          LinkedIn Cracked
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/leaderboard"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Leaderboard
          </Link>
          {user ? (
            <>
              <Link
                href="/battle"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Battle
              </Link>
              <Link
                href="/settings"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Settings
              </Link>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                Sign Out
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={() =>
                supabase.auth.signInWithOAuth({
                  provider: "linkedin_oidc",
                  options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                  },
                })
              }
            >
              Login with LinkedIn
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
