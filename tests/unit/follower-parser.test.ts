import { describe, it, expect } from "vitest";
import { parseFollowerString } from "@/lib/follower-parser";

describe("parseFollowerString", () => {
  it("parses plain number with commas", () => {
    expect(parseFollowerString("5,200 followers")).toBe(5200);
  });

  it("parses K suffix", () => {
    expect(parseFollowerString("1.2K followers")).toBe(1200);
  });

  it("parses M suffix", () => {
    expect(parseFollowerString("1M followers")).toBe(1000000);
  });

  it("parses 500+ connections", () => {
    expect(parseFollowerString("500+ connections")).toBe(500);
  });

  it("parses zero followers", () => {
    expect(parseFollowerString("0 followers")).toBe(0);
  });

  it("parses number without commas", () => {
    expect(parseFollowerString("1200 followers")).toBe(1200);
  });

  it("parses number with spaces around suffix", () => {
    expect(parseFollowerString("2.5 K followers")).toBe(2500);
  });

  it("handles case insensitivity", () => {
    expect(parseFollowerString("3.5k Followers")).toBe(3500);
  });

  it("returns null for empty string", () => {
    expect(parseFollowerString("")).toBeNull();
  });

  it("returns null for null input", () => {
    expect(parseFollowerString(null as unknown as string)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(parseFollowerString(undefined as unknown as string)).toBeNull();
  });

  it("returns null for non-matching text", () => {
    expect(parseFollowerString("no numbers here")).toBeNull();
  });

  it("parses large numbers with commas", () => {
    expect(parseFollowerString("12,345 followers")).toBe(12345);
  });

  it("parses decimal K values", () => {
    expect(parseFollowerString("5.5K followers")).toBe(5500);
  });

  it("parses 'follower' singular", () => {
    expect(parseFollowerString("1 follower")).toBe(1);
  });

  it("parses connection singular", () => {
    expect(parseFollowerString("1 connection")).toBe(1);
  });
});
