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

// Rich Profiles: PDF Upload
export const PDF_UPLOAD_MAX_SIZE = 5 * 1024 * 1024; // 5MB
export const PDF_UPLOAD_RATE_LIMIT = { limit: 5, windowMs: 60 * 60 * 1000 }; // 5 per hour

// Follower Verification
export const VERIFICATION_RATE_LIMIT = { limit: 3, windowMs: 24 * 60 * 60 * 1000 }; // 3 per 24h
export const VERIFICATION_EXPIRY_DAYS = 90;
export const VERIFICATION_WARNING_DAYS = 83; // 90 - 7
export const DISCREPANCY_TOLERANCE_PERCENT = 5;
export const MAX_SCREENSHOT_SIZE = 2 * 1024 * 1024; // 2MB
export const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg"] as const;

// Rich Profiles: Field limits
export const MAX_EXPERIENCES = 50;
export const MAX_EDUCATION = 20;
export const MAX_SKILLS = 50;
export const FIELD_LIMITS = {
  company: 100,
  title: 100,
  headline: 200,
  skillName: 50,
  description: 500,
  location: 100,
  institution: 100,
  degree: 100,
  fieldOfStudy: 100,
} as const;
