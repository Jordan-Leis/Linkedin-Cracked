import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CategoryBadge } from "@/components/category-badge";

export interface ProfileCardData {
  id: string;
  display_name: string;
  linkedin_url: string;
  current_mmr: number;
  follower_count: number;
  experience_count: number;
  projects_count?: number | null;
  skills_count?: number | null;
  education_count?: number | null;
  categories: { slug: string; label: string }[];
}

interface ProfileCardProps {
  profile: ProfileCardData;
  action?: React.ReactNode;
}

export function ProfileCard({ profile, action }: ProfileCardProps) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{profile.display_name}</span>
          <span className="text-2xl font-bold text-primary">
            {profile.current_mmr}
          </span>
        </CardTitle>
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
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Followers:</span>{" "}
            <span className="font-medium">
              {profile.follower_count.toLocaleString()}
            </span>
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
        {action && <div className="pt-2">{action}</div>}
      </CardContent>
    </Card>
  );
}
