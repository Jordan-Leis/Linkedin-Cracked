import { ELO_K_FACTOR } from "./constants";

export interface ProfileMetrics {
  follower_count: number;
  experience_count: number;
  projects_count?: number | null;
  skills_count?: number | null;
  education_count?: number | null;
}

/**
 * Compute deterministic baseline MMR from profile metrics.
 *
 * Formula:
 *   1000
 *   + min(follower_count, 50000) * 0.01   (max +500)
 *   + experience_count * 30                (max ~300 for 10 roles)
 *   + (projects_count ?? 0) * 20           (max ~200)
 *   + (skills_count ?? 0) * 2              (max ~100)
 *   + (education_count ?? 0) * 15          (max ~75)
 *
 * Result: floor(value), integer in range ~1000–2175
 */
export function computeBaselineMMR(metrics: ProfileMetrics): number {
  const followers = Math.min(metrics.follower_count, 50000) * 0.01;
  const experience = metrics.experience_count * 30;
  const projects = (metrics.projects_count ?? 0) * 20;
  const skills = (metrics.skills_count ?? 0) * 2;
  const education = (metrics.education_count ?? 0) * 15;

  return Math.floor(1000 + followers + experience + projects + skills + education);
}

export interface EloUpdateResult {
  newMmrA: number;
  newMmrB: number;
}

/**
 * Compute Elo rating update for a head-to-head matchup.
 *
 * Uses standard Elo formula with K=32:
 *   expected_a = 1 / (1 + 10^((mmrB - mmrA) / 400))
 *   If A wins: newMmrA = round(mmrA + K * (1 - expected_a))
 *              newMmrB = round(mmrB + K * (0 - (1 - expected_a)))
 */
export function computeEloUpdate(
  mmrA: number,
  mmrB: number,
  winner: "a" | "b"
): EloUpdateResult {
  const K = ELO_K_FACTOR;
  const expectedA = 1 / (1 + Math.pow(10, (mmrB - mmrA) / 400));
  const expectedB = 1 - expectedA;

  const scoreA = winner === "a" ? 1 : 0;
  const scoreB = winner === "b" ? 1 : 0;

  return {
    newMmrA: Math.round(mmrA + K * (scoreA - expectedA)),
    newMmrB: Math.round(mmrB + K * (scoreB - expectedB)),
  };
}
