"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { INTEREST_CATEGORIES, MAX_CATEGORIES_PER_PROFILE } from "@/lib/constants";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [displayName, setDisplayName] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkExistingProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/");
        return;
      }
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (existing) {
        router.replace("/battle");
        return;
      }
      setChecking(false);
    }
    checkExistingProfile();
  }, [supabase, router]);

  if (checking) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const toggleCategory = (slug: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(slug)) {
        return prev.filter((s) => s !== slug);
      }
      if (prev.length >= MAX_CATEGORIES_PER_PROFILE) {
        setError(`Maximum ${MAX_CATEGORIES_PER_PROFILE} categories allowed`);
        return prev;
      }
      setError("");
      return [...prev, slug];
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!displayName.trim()) {
      setError("Display name is required");
      return;
    }
    if (selectedCategories.length === 0) {
      setError("Select at least 1 category");
      return;
    }

    // Store onboarding data in sessionStorage for the profile submission step
    sessionStorage.setItem(
      "onboarding",
      JSON.stringify({
        display_name: displayName.trim(),
        category_slugs: selectedCategories,
      })
    );
    router.push("/submit");
  };

  return (
    <div className="flex justify-center py-12">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Welcome to LinkedIn Cracked!</CardTitle>
          <CardDescription>
            Set up your profile to start battling.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="displayName" className="text-sm font-medium">
                Display Name
              </label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Interest Categories (select 1–{MAX_CATEGORIES_PER_PROFILE})
              </label>
              <div className="flex flex-wrap gap-2">
                {INTEREST_CATEGORIES.map((cat) => (
                  <Badge
                    key={cat.slug}
                    variant={
                      selectedCategories.includes(cat.slug)
                        ? "default"
                        : "outline"
                    }
                    className="cursor-pointer text-sm px-3 py-1"
                    onClick={() => toggleCategory(cat.slug)}
                  >
                    {cat.label}
                  </Badge>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full">
              Continue to Profile Submission
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
