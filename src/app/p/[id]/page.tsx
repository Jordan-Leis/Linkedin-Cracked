import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileCard } from "@/components/profile-card";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, display_name, linkedin_url, current_mmr, follower_count, experience_count, projects_count, skills_count, education_count, profile_interests(category_id, categories(slug, label))"
    )
    .eq("id", id)
    .single();

  if (!profile) {
    notFound();
  }

  const profileData = {
    ...profile,
    categories: (
      profile.profile_interests as unknown as Array<{
        categories: { slug: string; label: string };
      }>
    ).map((pi) => pi.categories),
  };

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <h1 className="text-2xl font-bold">{profile.display_name}</h1>
      <ProfileCard profile={profileData} />
    </div>
  );
}
