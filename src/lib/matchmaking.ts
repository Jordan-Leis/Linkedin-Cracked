import { MMR_TOLERANCE_INITIAL, MMR_TOLERANCE_WIDENED } from "./constants";

export interface MatchCandidate {
  id: string;
  user_id: string;
  current_mmr: number;
  category_slugs: string[];
}

export interface MatchResult {
  profileA: MatchCandidate;
  profileB: MatchCandidate;
}

/**
 * Find the best matchup pair from a pool of candidates.
 *
 * Algorithm:
 * 1. Exclude the voter's own profile.
 * 2. Filter to profiles sharing at least 1 interest category with the voter.
 * 3. Find a pair where |mmr_a - mmr_b| <= tolerance (starting at 200, widening to 400, then any).
 * 4. Select randomly among qualifying pairs.
 */
export function findMatch(
  voterUserId: string,
  candidates: MatchCandidate[],
  votedPairKeys: Set<string>
): MatchResult | null {
  // Exclude voter's own profile
  const eligible = candidates.filter((c) => c.user_id !== voterUserId);

  if (eligible.length < 2) return null;

  // Try with progressively wider MMR tolerance
  const tolerances = [MMR_TOLERANCE_INITIAL, MMR_TOLERANCE_WIDENED, Infinity];

  for (const tolerance of tolerances) {
    const pairs = findPairsWithinTolerance(eligible, tolerance, votedPairKeys);
    if (pairs.length > 0) {
      const pick = pairs[Math.floor(Math.random() * pairs.length)];
      return pick;
    }
  }

  return null;
}

/**
 * Generate a canonical key for a pair of profile IDs.
 * Sorted so (A,B) and (B,A) produce the same key.
 */
export function pairKey(idA: string, idB: string): string {
  return idA < idB ? `${idA}:${idB}` : `${idB}:${idA}`;
}

/**
 * Find all valid pairs within a given MMR tolerance,
 * excluding pairs the voter has already voted on.
 */
function findPairsWithinTolerance(
  candidates: MatchCandidate[],
  tolerance: number,
  votedPairKeys: Set<string>
): MatchResult[] {
  const pairs: MatchResult[] = [];

  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const a = candidates[i];
      const b = candidates[j];
      const mmrDiff = Math.abs(a.current_mmr - b.current_mmr);

      if (mmrDiff > tolerance) continue;

      // Check overlapping categories
      const hasOverlap = a.category_slugs.some((slug) =>
        b.category_slugs.includes(slug)
      );
      if (!hasOverlap) continue;

      // Check if voter already voted on this pair
      const key = pairKey(a.id, b.id);
      if (votedPairKeys.has(key)) continue;

      pairs.push({ profileA: a, profileB: b });
    }
  }

  return pairs;
}
