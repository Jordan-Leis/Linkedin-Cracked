import { Badge } from "@/components/ui/badge";

interface CategoryBadgeProps {
  slug: string;
  label: string;
}

export function CategoryBadge({ label }: CategoryBadgeProps) {
  return <Badge variant="secondary">{label}</Badge>;
}
