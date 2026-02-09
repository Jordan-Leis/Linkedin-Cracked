"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CategoryBadge } from "@/components/category-badge";
import { INTEREST_CATEGORIES } from "@/lib/constants";

interface LeaderboardProfile {
  id: string;
  display_name: string;
  current_mmr: number;
  rank: number;
  follower_count: number;
  experience_count: number;
  categories: { slug: string; label: string }[];
}

export default function LeaderboardPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<LeaderboardProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedCategory) params.set("category", selectedCategory);
    params.set("limit", String(limit));
    params.set("offset", String(offset));

    try {
      const res = await fetch(`/api/leaderboard?${params}`);
      const data = await res.json();
      if (res.ok) {
        setProfiles(data.profiles);
        setTotal(data.total);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, offset]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const handleCategoryChange = (slug: string | null) => {
    setSelectedCategory(slug);
    setOffset(0);
  };

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <p className="text-muted-foreground mt-1">
          The most cracked profiles on LinkedIn
        </p>
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        <Badge
          variant={selectedCategory === null ? "default" : "outline"}
          className="cursor-pointer text-sm px-3 py-1"
          onClick={() => handleCategoryChange(null)}
        >
          All
        </Badge>
        {INTEREST_CATEGORIES.map((cat) => (
          <Badge
            key={cat.slug}
            variant={selectedCategory === cat.slug ? "default" : "outline"}
            className="cursor-pointer text-sm px-3 py-1"
            onClick={() => handleCategoryChange(cat.slug)}
          >
            {cat.label}
          </Badge>
        ))}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : profiles.length === 0 ? (
        <p className="text-muted-foreground">No profiles yet.</p>
      ) : (
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedCategory
                ? `${INTEREST_CATEGORIES.find((c) => c.slug === selectedCategory)?.label} Rankings`
                : "Global Rankings"}
              <span className="text-sm text-muted-foreground font-normal ml-2">
                ({total} profiles)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {profiles.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-4 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => router.push(`/p/${p.id}`)}
                >
                  <span className="text-2xl font-bold text-muted-foreground w-10 text-right">
                    #{p.rank}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{p.display_name}</p>
                    <div className="flex gap-1 mt-1">
                      {p.categories.map((cat) => (
                        <CategoryBadge
                          key={cat.slug}
                          slug={cat.slug}
                          label={cat.label}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="text-xl font-bold text-primary">
                    {p.current_mmr}
                  </span>
                </div>
              ))}
            </div>

            {total > limit && (
              <div className="flex justify-center gap-4 mt-6">
                <Button
                  variant="outline"
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={offset + limit >= total}
                  onClick={() => setOffset(offset + limit)}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
