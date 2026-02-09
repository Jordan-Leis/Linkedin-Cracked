import { z } from "zod/v4";
import {
  CATEGORY_SLUGS,
  MAX_CATEGORIES_PER_PROFILE,
  MAX_EXPERIENCES,
  MAX_EDUCATION,
  MAX_SKILLS,
  FIELD_LIMITS,
} from "./constants";

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

// Rich Profiles: Structured data schemas

export const experienceSchema = z.object({
  company: z.string().trim().min(1).max(FIELD_LIMITS.company),
  title: z.string().trim().min(1).max(FIELD_LIMITS.title),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD").nullable(),
  location: z.string().trim().max(FIELD_LIMITS.location).nullable().optional(),
  description: z.string().trim().max(FIELD_LIMITS.description).nullable().optional(),
  sort_order: z.number().int().min(0),
});

export type ExperienceInput = z.infer<typeof experienceSchema>;

export const educationSchema = z.object({
  institution: z.string().trim().min(1).max(FIELD_LIMITS.institution),
  degree: z.string().trim().max(FIELD_LIMITS.degree).nullable().optional(),
  field_of_study: z.string().trim().max(FIELD_LIMITS.fieldOfStudy).nullable().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD").nullable().optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD").nullable().optional(),
});

export type EducationInput = z.infer<typeof educationSchema>;

export const skillSchema = z.object({
  name: z.string().trim().min(1).max(FIELD_LIMITS.skillName),
  sort_order: z.number().int().min(0),
});

export type SkillInput = z.infer<typeof skillSchema>;

export const experiencesSaveSchema = z.object({
  experiences: z.array(experienceSchema).max(MAX_EXPERIENCES),
});

export const educationSaveSchema = z.object({
  education: z.array(educationSchema).max(MAX_EDUCATION),
});

export const skillsSaveSchema = z.object({
  skills: z
    .array(skillSchema)
    .max(MAX_SKILLS)
    .refine(
      (skills) => {
        const names = skills.map((s) => s.name.toLowerCase());
        return new Set(names).size === names.length;
      },
      { message: "Duplicate skill names are not allowed" }
    ),
});

export const headlineSchema = z.object({
  headline: z.string().trim().max(FIELD_LIMITS.headline).nullable(),
});

// Follower Verification schemas

export const verifyFollowersSchema = z.object({
  consent: z.literal(true, "You must consent to follower verification"),
});

export const updateVerifiedCountSchema = z.object({
  use_verified_count: z.literal(true, "Must confirm using verified count"),
});

export const manualVerifySchema = z.object({
  claimed_count: z.number().int().min(0, "Claimed count must be 0 or greater"),
});
