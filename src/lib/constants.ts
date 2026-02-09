export const INTEREST_CATEGORIES = [
  { slug: "swe", label: "SWE" },
  { slug: "research", label: "Research" },
  { slug: "growth", label: "Growth" },
  { slug: "product", label: "Product" },
  { slug: "design", label: "Design" },
  { slug: "data-science", label: "Data Science" },
  { slug: "marketing", label: "Marketing" },
  { slug: "sales", label: "Sales" },
  { slug: "operations", label: "Operations" },
  { slug: "other", label: "Other" },
] as const;

export const CATEGORY_SLUGS = INTEREST_CATEGORIES.map((c) => c.slug);

export const ELO_K_FACTOR = 32;

export const MMR_TOLERANCE_INITIAL = 200;
export const MMR_TOLERANCE_WIDENED = 400;

export const RATE_LIMITS = {
  vote: { limit: 30, windowMs: 5 * 60 * 1000 },
  profileUpsert: { limit: 10, windowMs: 60 * 60 * 1000 },
} as const;

export const MAX_CATEGORIES_PER_PROFILE = 3;
