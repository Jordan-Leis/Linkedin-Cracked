import { describe, it, expect } from "vitest";
import { computeBaselineMMR } from "@/lib/mmr";

describe("computeBaselineMMR", () => {
  it("returns 1000 for all-zero inputs", () => {
    expect(
      computeBaselineMMR({
        follower_count: 0,
        experience_count: 0,
      })
    ).toBe(1000);
  });

  it("returns 1000 for all-zero with explicit nulls", () => {
    expect(
      computeBaselineMMR({
        follower_count: 0,
        experience_count: 0,
        projects_count: null,
        skills_count: null,
        education_count: null,
      })
    ).toBe(1000);
  });

  it("computes correctly with all fields filled", () => {
    const result = computeBaselineMMR({
      follower_count: 5000,
      experience_count: 4,
      projects_count: 3,
      skills_count: 25,
      education_count: 2,
    });
    // 1000 + 50 + 120 + 60 + 50 + 30 = 1310
    expect(result).toBe(1310);
  });

  it("caps follower_count at 50000", () => {
    const capped = computeBaselineMMR({
      follower_count: 100000,
      experience_count: 0,
    });
    const atCap = computeBaselineMMR({
      follower_count: 50000,
      experience_count: 0,
    });
    expect(capped).toBe(atCap);
    expect(capped).toBe(1500); // 1000 + 500
  });

  it("is deterministic: same inputs produce same output", () => {
    const metrics = {
      follower_count: 12345,
      experience_count: 7,
      projects_count: 5,
      skills_count: 30,
      education_count: 3,
    };
    const result1 = computeBaselineMMR(metrics);
    const result2 = computeBaselineMMR(metrics);
    const result3 = computeBaselineMMR(metrics);
    expect(result1).toBe(result2);
    expect(result2).toBe(result3);
  });

  it("returns an integer", () => {
    const result = computeBaselineMMR({
      follower_count: 1234,
      experience_count: 3,
      projects_count: 2,
      skills_count: 15,
      education_count: 1,
    });
    expect(Number.isInteger(result)).toBe(true);
  });

  it("handles optional fields as undefined", () => {
    const result = computeBaselineMMR({
      follower_count: 1000,
      experience_count: 2,
    });
    // 1000 + 10 + 60 = 1070
    expect(result).toBe(1070);
  });

  it("produces expected range ceiling", () => {
    const max = computeBaselineMMR({
      follower_count: 50000,
      experience_count: 10,
      projects_count: 10,
      skills_count: 50,
      education_count: 5,
    });
    // 1000 + 500 + 300 + 200 + 100 + 75 = 2175
    expect(max).toBe(2175);
  });
});
