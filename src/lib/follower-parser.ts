/**
 * Parse a follower count string into a number.
 * Handles formats: "5,200 followers", "1.2K followers", "500+ connections",
 * "1M followers", "0 followers", etc.
 * Returns null if the string cannot be parsed.
 */
export function parseFollowerString(text: string): number | null {
  if (!text || typeof text !== "string") return null;

  const cleaned = text.trim().toLowerCase();
  if (!cleaned) return null;

  // Match number patterns with optional suffix
  const match = cleaned.match(/^([\d,]+(?:\.\d+)?)\s*(\+)?\s*(k|m)?\s*(followers?|connections?)?/i);
  if (!match) return null;

  const numStr = match[1].replace(/,/g, "");
  const suffix = match[3]?.toLowerCase();

  let value = parseFloat(numStr);
  if (isNaN(value)) return null;

  if (suffix === "k") {
    value *= 1000;
  } else if (suffix === "m") {
    value *= 1000000;
  }

  return Math.floor(value);
}
