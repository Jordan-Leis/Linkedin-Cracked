import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CategoryBadge } from "@/components/category-badge";
import { VerificationBadge } from "@/components/verification-badge";

export interface ProfileCardData {
  id: string;
  display_name: string;
  headline?: string | null;
  linkedin_url: string;
  current_mmr: number;
  follower_count: number;
  experience_count: number;
  projects_count?: number | null;
  skills_count?: number | null;
  education_count?: number | null;
  categories: { slug: string; label: string }[];
  top_experiences?: { company: string; title: string }[];
  top_skills?: string[];
  avatar_url?: string | null;
  follower_verify_status?: string | null;
  follower_verified_at?: string | null;
  follower_verify_method?: string | null;
}

interface ProfileCardProps {
  profile: ProfileCardData;
  action?: React.ReactNode;
}

export function ProfileCard({ profile, action }: ProfileCardProps) {
  const hasStructuredData =
    (profile.top_experiences && profile.top_experiences.length > 0) ||
    (profile.top_skills && profile.top_skills.length > 0);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {profile.avatar_url && (
              <Image
                src={profile.avatar_url}
                alt=""
                width={40}
                height={40}
                className="rounded-full object-cover"
                referrerPolicy="no-referrer"
                unoptimized
              />
            )}
            <span>{profile.display_name}</span>
          </div>
          <span className="text-2xl font-bold text-primary">
            {profile.current_mmr}
          </span>
        </CardTitle>
        {profile.headline && (
          <p className="text-sm text-muted-foreground">{profile.headline}</p>
        )}
        <CardDescription>
          <a
            href={profile.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            LinkedIn Profile
          </a>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-1">
          {profile.categories.map((cat) => (
            <CategoryBadge key={cat.slug} slug={cat.slug} label={cat.label} />
          ))}
        </div>

        {/* Rich data: top experiences and skills */}
        {hasStructuredData ? (
          <div className="space-y-3">
            {profile.top_experiences && profile.top_experiences.length > 0 && (
              <div className="space-y-1">
                {profile.top_experiences.map((exp, i) => (
                  <div key={i} className="text-sm">
                    <span className="font-medium">{exp.title}</span>
                    <span className="text-muted-foreground"> at {exp.company}</span>
                  </div>
                ))}
              </div>
            )}
            {profile.top_skills && profile.top_skills.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {profile.top_skills.map((skill) => (
                  <span
                    key={skill}
                    className="text-xs border rounded-full px-2 py-0.5 text-muted-foreground"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}
            <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
              {profile.follower_count.toLocaleString()} followers
              <VerificationBadge
                verifyStatus={profile.follower_verify_status}
                verifiedAt={profile.follower_verified_at}
                method={profile.follower_verify_method}
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="inline-flex items-center gap-1">
              <span className="text-muted-foreground">Followers:</span>{" "}
              <span className="font-medium">
                {profile.follower_count.toLocaleString()}
              </span>
              <VerificationBadge
                verifyStatus={profile.follower_verify_status}
                verifiedAt={profile.follower_verified_at}
                method={profile.follower_verify_method}
              />
            </div>
            <div>
              <span className="text-muted-foreground">Experience:</span>{" "}
              <span className="font-medium">{profile.experience_count}</span>
            </div>
            {profile.projects_count != null && (
              <div>
                <span className="text-muted-foreground">Projects:</span>{" "}
                <span className="font-medium">{profile.projects_count}</span>
              </div>
            )}
            {profile.skills_count != null && (
              <div>
                <span className="text-muted-foreground">Skills:</span>{" "}
                <span className="font-medium">{profile.skills_count}</span>
              </div>
            )}
            {profile.education_count != null && (
              <div>
                <span className="text-muted-foreground">Education:</span>{" "}
                <span className="font-medium">{profile.education_count}</span>
              </div>
            )}
          </div>
        )}
        {action && <div className="pt-2">{action}</div>}
      </CardContent>
    </Card>
  );
}
