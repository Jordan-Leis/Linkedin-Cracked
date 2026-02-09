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
      "id, display_name, headline, linkedin_url, current_mmr, follower_count, experience_count, projects_count, skills_count, education_count, follower_verify_status, follower_verified_at, follower_verify_method, profile_interests(category_id, categories(slug, label)), profile_experiences(id, company, title, start_date, end_date, location, description, sort_order), profile_education(id, institution, degree, field_of_study, start_date, end_date), profile_skills(id, name, sort_order)"
    )
    .eq("id", id)
    .single();

  if (!profile) {
    notFound();
  }

  const experiences = (
    profile.profile_experiences as unknown as Array<{
      id: string; company: string; title: string; start_date: string; end_date: string | null;
      location: string | null; description: string | null; sort_order: number;
    }>
  ) || [];

  const education = (
    profile.profile_education as unknown as Array<{
      id: string; institution: string; degree: string | null; field_of_study: string | null;
      start_date: string | null; end_date: string | null;
    }>
  ) || [];

  const skills = (
    profile.profile_skills as unknown as Array<{
      id: string; name: string; sort_order: number;
    }>
  ) || [];

  const sortedExperiences = [...experiences].sort((a, b) => a.sort_order - b.sort_order);
  const sortedSkills = [...skills].sort((a, b) => a.sort_order - b.sort_order);

  const profileData = {
    ...profile,
    categories: (
      profile.profile_interests as unknown as Array<{
        categories: { slug: string; label: string };
      }>
    ).map((pi) => pi.categories),
    top_experiences: sortedExperiences.slice(0, 2).map(({ company, title }) => ({ company, title })),
    top_skills: sortedSkills.slice(0, 3).map((s) => s.name),
  };

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <h1 className="text-2xl font-bold">{profile.display_name}</h1>
      {profile.headline && (
        <p className="text-muted-foreground text-center max-w-md">{profile.headline as string}</p>
      )}
      <ProfileCard profile={profileData} />

      {/* Full structured data */}
      {sortedExperiences.length > 0 && (
        <div className="w-full max-w-md space-y-3">
          <h2 className="text-lg font-semibold">Experience</h2>
          {sortedExperiences.map((exp) => (
            <div key={exp.id} className="border rounded-md p-3">
              <div className="font-medium">{exp.title}</div>
              <div className="text-sm text-muted-foreground">{exp.company}</div>
              <div className="text-xs text-muted-foreground">
                {exp.start_date} &mdash; {exp.end_date || "Present"}
                {exp.location && ` | ${exp.location}`}
              </div>
              {exp.description && (
                <p className="text-sm mt-1">{exp.description}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {education.length > 0 && (
        <div className="w-full max-w-md space-y-3">
          <h2 className="text-lg font-semibold">Education</h2>
          {education.map((edu) => (
            <div key={edu.id} className="border rounded-md p-3">
              <div className="font-medium">{edu.institution}</div>
              {edu.degree && (
                <div className="text-sm text-muted-foreground">
                  {edu.degree}
                  {edu.field_of_study && `, ${edu.field_of_study}`}
                </div>
              )}
              {edu.start_date && (
                <div className="text-xs text-muted-foreground">
                  {edu.start_date} &mdash; {edu.end_date || "Present"}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {sortedSkills.length > 0 && (
        <div className="w-full max-w-md space-y-3">
          <h2 className="text-lg font-semibold">Skills</h2>
          <div className="flex flex-wrap gap-2">
            {sortedSkills.map((skill) => (
              <span
                key={skill.id}
                className="border rounded-full px-3 py-1 text-sm"
              >
                {skill.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
