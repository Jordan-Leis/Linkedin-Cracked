import { z } from "zod/v4";
import { CATEGORY_SLUGS, MAX_CATEGORIES_PER_PROFILE } from "./constants";

const linkedinUrlRegex = /^https:\/\/(www\.)?linkedin\.com\/in\/.+$/;

export const profileUpsertSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(1, "Display name is required")
    .max(50, "Display name must be 50 characters or less"),
  linkedin_url: z
    .string()
    .url("Must be a valid URL")
    .regex(linkedinUrlRegex, "Must be a valid LinkedIn profile URL (https://linkedin.com/in/...)"),
  follower_count: z
    .number()
    .int()
    .min(0, "Follower count must be 0 or greater"),
  experience_count: z
    .number()
    .int()
    .min(0, "Experience count must be 0 or greater"),
  projects_count: z
    .number()
    .int()
    .min(0, "Projects count must be 0 or greater")
    .nullable()
    .optional(),
  skills_count: z
    .number()
    .int()
    .min(0, "Skills count must be 0 or greater")
    .nullable()
    .optional(),
  education_count: z
    .number()
    .int()
    .min(0, "Education count must be 0 or greater")
    .nullable()
    .optional(),
  category_slugs: z
    .array(z.enum(CATEGORY_SLUGS as unknown as [string, ...string[]]))
    .min(1, "Select at least 1 category")
    .max(MAX_CATEGORIES_PER_PROFILE, `Maximum ${MAX_CATEGORIES_PER_PROFILE} categories`),
});

export type ProfileUpsertInput = z.infer<typeof profileUpsertSchema>;

export const voteSchema = z.object({
  matchup_id: z.string().uuid("Invalid matchup ID"),
  winner_profile_id: z.string().uuid("Invalid winner profile ID"),
});

export type VoteInput = z.infer<typeof voteSchema>;

export const accountDeleteSchema = z.object({
  confirm: z.literal(true, "You must confirm account deletion"),
});
