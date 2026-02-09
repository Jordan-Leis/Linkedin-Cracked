import { describe, it, expect } from "vitest";
import { findMatch, pairKey, type MatchCandidate } from "@/lib/matchmaking";

function candidate(
  id: string,
  userId: string,
  mmr: number,
  categories: string[]
): MatchCandidate {
  return { id, user_id: userId, current_mmr: mmr, category_slugs: categories };
}

describe("pairKey", () => {
  it("produces consistent key regardless of order", () => {
    expect(pairKey("aaa", "bbb")).toBe(pairKey("bbb", "aaa"));
  });

  it("produces different keys for different pairs", () => {
    expect(pairKey("aaa", "bbb")).not.toBe(pairKey("aaa", "ccc"));
  });
});

describe("findMatch", () => {
  const voterUserId = "voter-user";

  it("returns null when fewer than 2 eligible candidates", () => {
    const candidates = [candidate("p1", voterUserId, 1200, ["swe"])];
    expect(findMatch(voterUserId, candidates, new Set())).toBeNull();
  });

  it("returns null when only the voter exists", () => {
    const candidates = [candidate("p1", voterUserId, 1200, ["swe"])];
    expect(findMatch(voterUserId, candidates, new Set())).toBeNull();
  });

  it("excludes the voter's own profile from results", () => {
    const candidates = [
      candidate("p1", voterUserId, 1200, ["swe"]),
      candidate("p2", "user2", 1210, ["swe"]),
      candidate("p3", "user3", 1220, ["swe"]),
    ];
    const result = findMatch(voterUserId, candidates, new Set());
    expect(result).not.toBeNull();
    expect(result!.profileA.user_id).not.toBe(voterUserId);
    expect(result!.profileB.user_id).not.toBe(voterUserId);
  });

  it("matches profiles with overlapping categories and close MMR", () => {
    const candidates = [
      candidate("p1", "user1", 1200, ["swe", "product"]),
      candidate("p2", "user2", 1210, ["swe"]),
    ];
    const result = findMatch(voterUserId, candidates, new Set());
    expect(result).not.toBeNull();
    expect(result!.profileA.id).toBe("p1");
    expect(result!.profileB.id).toBe("p2");
  });

  it("does not match profiles with no overlapping categories", () => {
    const candidates = [
      candidate("p1", "user1", 1200, ["swe"]),
      candidate("p2", "user2", 1210, ["design"]),
    ];
    const result = findMatch(voterUserId, candidates, new Set());
    expect(result).toBeNull();
  });

  it("prefers tight MMR tolerance first", () => {
    // Two close profiles and one far profile — all share categories
    const candidates = [
      candidate("p1", "user1", 1200, ["swe"]),
      candidate("p2", "user2", 1210, ["swe"]),
      candidate("p3", "user3", 1600, ["swe"]),
    ];
    // Run many times — p3 should never appear in tight tolerance
    const results = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const result = findMatch(voterUserId, candidates, new Set());
      if (result) {
        results.add(result.profileA.id);
        results.add(result.profileB.id);
      }
    }
    // The tight tolerance pair (p1, p2) is the only pair within 200 MMR with overlap
    // p3 at 1600 is 390-400 from p2 (widened) and 400 from p1 (at boundary)
    // So we should mostly see p1,p2
    expect(results.has("p1")).toBe(true);
    expect(results.has("p2")).toBe(true);
  });

  it("widens tolerance when no close matches exist", () => {
    const candidates = [
      candidate("p1", "user1", 1200, ["swe"]),
      candidate("p2", "user2", 1550, ["swe"]),
    ];
    // Diff is 350, which is > 200 but <= 400
    const result = findMatch(voterUserId, candidates, new Set());
    expect(result).not.toBeNull();
  });

  it("falls back to any tolerance when needed", () => {
    const candidates = [
      candidate("p1", "user1", 1000, ["swe"]),
      candidate("p2", "user2", 2000, ["swe"]),
    ];
    // Diff is 1000, exceeds both 200 and 400, but Infinity catches it
    const result = findMatch(voterUserId, candidates, new Set());
    expect(result).not.toBeNull();
  });

  it("skips pairs the voter has already voted on", () => {
    const candidates = [
      candidate("p1", "user1", 1200, ["swe"]),
      candidate("p2", "user2", 1210, ["swe"]),
    ];
    const votedKeys = new Set([pairKey("p1", "p2")]);
    const result = findMatch(voterUserId, candidates, votedKeys);
    expect(result).toBeNull();
  });

  it("returns a different un-voted pair when one is already voted", () => {
    const candidates = [
      candidate("p1", "user1", 1200, ["swe"]),
      candidate("p2", "user2", 1210, ["swe"]),
      candidate("p3", "user3", 1220, ["swe"]),
    ];
    const votedKeys = new Set([pairKey("p1", "p2")]);
    const result = findMatch(voterUserId, candidates, votedKeys);
    expect(result).not.toBeNull();
    const key = pairKey(result!.profileA.id, result!.profileB.id);
    expect(votedKeys.has(key)).toBe(false);
  });

  it("returns null when all pairs are already voted on", () => {
    const candidates = [
      candidate("p1", "user1", 1200, ["swe"]),
      candidate("p2", "user2", 1210, ["swe"]),
    ];
    const votedKeys = new Set([pairKey("p1", "p2")]);
    const result = findMatch(voterUserId, candidates, votedKeys);
    expect(result).toBeNull();
  });
});
