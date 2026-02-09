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
import { ProfileCard, type ProfileCardData } from "@/components/profile-card";
import { createClient } from "@/lib/supabase/client";
import { INTEREST_CATEGORIES, MAX_CATEGORIES_PER_PROFILE } from "@/lib/constants";

export default function SubmitPage() {
  const router = useRouter();
  const supabase = createClient();

  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [followerCount, setFollowerCount] = useState("");
  const [experienceCount, setExperienceCount] = useState("");
  const [projectsCount, setProjectsCount] = useState("");
  const [skillsCount, setSkillsCount] = useState("");
  const [educationCount, setEducationCount] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState<ProfileCardData | null>(null);
  const [isEdit, setIsEdit] = useState(false);

  useEffect(() => {
    // Check for onboarding data
    const onboarding = sessionStorage.getItem("onboarding");
    if (onboarding) {
      const data = JSON.parse(onboarding);
      setDisplayName(data.display_name || "");
      setSelectedCategories(data.category_slugs || []);
      sessionStorage.removeItem("onboarding");
    }

    // Check for existing profile
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: existing } = await supabase
        .from("profiles")
        .select("*, profile_interests(category_id, categories(slug, label))")
        .eq("user_id", user.id)
        .single();

      if (existing) {
        setIsEdit(true);
        setDisplayName(existing.display_name);
        setLinkedinUrl(existing.linkedin_url);
        setFollowerCount(String(existing.follower_count));
        setExperienceCount(String(existing.experience_count));
        setProjectsCount(
          existing.projects_count != null ? String(existing.projects_count) : ""
        );
        setSkillsCount(
          existing.skills_count != null ? String(existing.skills_count) : ""
        );
        setEducationCount(
          existing.education_count != null
            ? String(existing.education_count)
            : ""
        );
        const cats = (existing.profile_interests as Array<{categories: {slug: string; label: string}}>)
          .map((pi) => pi.categories.slug);
        setSelectedCategories(cats);
      }
    }
    loadProfile();
  }, [supabase]);

  const toggleCategory = (slug: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(slug)) return prev.filter((s) => s !== slug);
      if (prev.length >= MAX_CATEGORIES_PER_PROFILE) return prev;
      return [...prev, slug];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/profile/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName,
          linkedin_url: linkedinUrl,
          follower_count: parseInt(followerCount) || 0,
          experience_count: parseInt(experienceCount) || 0,
          projects_count: projectsCount ? parseInt(projectsCount) : null,
          skills_count: skillsCount ? parseInt(skillsCount) : null,
          education_count: educationCount ? parseInt(educationCount) : null,
          category_slugs: selectedCategories,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      setProfile(data.profile);
      setIsEdit(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-8 py-8">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>{isEdit ? "Edit Your Profile" : "Submit Your Profile"}</CardTitle>
          <CardDescription>
            Enter your LinkedIn metrics to compute your baseline rating.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="displayName" className="text-sm font-medium">
                Display Name *
              </label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                maxLength={50}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="linkedinUrl" className="text-sm font-medium">
                LinkedIn URL *
              </label>
              <Input
                id="linkedinUrl"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/yourname"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Followers *</label>
                <Input
                  type="number"
                  min="0"
                  value={followerCount}
                  onChange={(e) => setFollowerCount(e.target.value)}
                  placeholder="0"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Experience *</label>
                <Input
                  type="number"
                  min="0"
                  value={experienceCount}
                  onChange={(e) => setExperienceCount(e.target.value)}
                  placeholder="0"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Projects</label>
                <Input
                  type="number"
                  min="0"
                  value={projectsCount}
                  onChange={(e) => setProjectsCount(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Skills</label>
                <Input
                  type="number"
                  min="0"
                  value={skillsCount}
                  onChange={(e) => setSkillsCount(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Education</label>
                <Input
                  type="number"
                  min="0"
                  value={educationCount}
                  onChange={(e) => setEducationCount(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Categories (1–{MAX_CATEGORIES_PER_PROFILE})
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

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting
                ? "Saving..."
                : isEdit
                ? "Update Profile"
                : "Submit Profile"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {profile && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-center">Your Profile Card</h2>
          <ProfileCard profile={profile} />
          <div className="flex justify-center">
            <Button variant="outline" onClick={() => router.push("/battle")}>
              Go to Battles
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
