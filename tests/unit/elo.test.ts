import { describe, it, expect } from "vitest";
import { computeEloUpdate } from "@/lib/mmr";

describe("computeEloUpdate", () => {
  it("updates correctly for equal MMR when A wins", () => {
    const { newMmrA, newMmrB } = computeEloUpdate(1200, 1200, "a");
    // expected_a = 0.5, so delta = 32 * (1 - 0.5) = 16
    expect(newMmrA).toBe(1216);
    expect(newMmrB).toBe(1184);
  });

  it("updates correctly for equal MMR when B wins", () => {
    const { newMmrA, newMmrB } = computeEloUpdate(1200, 1200, "b");
    expect(newMmrA).toBe(1184);
    expect(newMmrB).toBe(1216);
  });

  it("winner always gains and loser always loses", () => {
    const { newMmrA, newMmrB } = computeEloUpdate(1000, 1400, "a");
    expect(newMmrA).toBeGreaterThan(1000);
    expect(newMmrB).toBeLessThan(1400);
  });

  it("underdog winning gains more than favorite winning", () => {
    const underdogWins = computeEloUpdate(1000, 1400, "a");
    const favoriteWins = computeEloUpdate(1000, 1400, "b");

    const underdogGain = underdogWins.newMmrA - 1000;
    const favoriteGain = favoriteWins.newMmrB - 1400;

    expect(underdogGain).toBeGreaterThan(favoriteGain);
  });

  it("is deterministic", () => {
    const r1 = computeEloUpdate(1300, 1250, "a");
    const r2 = computeEloUpdate(1300, 1250, "a");
    expect(r1.newMmrA).toBe(r2.newMmrA);
    expect(r1.newMmrB).toBe(r2.newMmrB);
  });

  it("changes are bounded by K=32", () => {
    const { newMmrA, newMmrB } = computeEloUpdate(1200, 1200, "a");
    expect(newMmrA - 1200).toBeLessThanOrEqual(32);
    expect(1200 - newMmrB).toBeLessThanOrEqual(32);
  });

  it("total MMR is conserved (zero-sum)", () => {
    const { newMmrA, newMmrB } = computeEloUpdate(1300, 1100, "b");
    // Due to rounding, total may differ by at most 1
    expect(Math.abs(newMmrA + newMmrB - 1300 - 1100)).toBeLessThanOrEqual(1);
  });

  it("handles large MMR difference", () => {
    const { newMmrA, newMmrB } = computeEloUpdate(2000, 1000, "a");
    // Favorite winning should gain very little
    expect(newMmrA - 2000).toBeLessThan(5);
    expect(1000 - newMmrB).toBeLessThan(5);
  });
});
