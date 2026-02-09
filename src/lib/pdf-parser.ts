// Import the inner module directly to avoid pdf-parse's index.js test-file issue
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdf = require("pdf-parse/lib/pdf-parse");

export interface ParsedExperience {
  company: string;
  title: string;
  start_date: string; // YYYY-MM format
  end_date: string | null; // null = "Present"
  location: string | null;
  description: string | null;
}

export interface ParsedEducation {
  institution: string;
  degree: string | null;
  field_of_study: string | null;
  start_date: string | null; // YYYY-MM format
  end_date: string | null;
}

export interface ParsedSkill {
  name: string;
}

export interface ParsedProfile {
  headline: string | null;
  experiences: ParsedExperience[];
  education: ParsedEducation[];
  skills: ParsedSkill[];
  warnings: string[];
}

const MONTHS: Record<string, string> = {
  January: "01",
  February: "02",
  March: "03",
  April: "04",
  May: "05",
  June: "06",
  July: "07",
  August: "08",
  September: "09",
  October: "10",
  November: "11",
  December: "12",
};

const MONTH_NAMES = Object.keys(MONTHS);
const MONTH_PATTERN = MONTH_NAMES.join("|");

// Matches "January 2026 - Present (2 months)" or "January 2026 - April 2025 (8 months)"
const DATE_RANGE_REGEX = new RegExp(
  `(${MONTH_PATTERN})\\s+(\\d{4})\\s*-\\s*(Present|(${MONTH_PATTERN})\\s+(\\d{4}))\\s*\\(.*?\\)`
);

// Duration summary for multi-role companies: "1 year 6 months"
const DURATION_SUMMARY_REGEX =
  /^\d+\s+years?\s*\d*\s*months?$|^\d+\s+months?$|^\d+\s+years?$/;

// Location: "City, State, Country" or "City, Country" or "San Francisco Bay Area"
const LOCATION_REGEX =
  /^[A-Z][a-zA-Zà-ÿ\s.]+,\s+[A-Za-zà-ÿ\s.]+(?:,\s+[A-Za-zà-ÿ\s.]+)?$|^San Francisco Bay Area$/;

// Known section headers in the sidebar
const SIDEBAR_SECTIONS = [
  "Contact",
  "Top Skills",
  "Languages",
  "Honors-Awards",
  "Publications",
  "Certifications",
];

function parseMonthYear(month: string, year: string): string {
  return `${year}-${MONTHS[month]}`;
}

function cleanText(text: string): string {
  return text.replace(/Page \d+ of \d+/g, "").trim();
}

/**
 * Extract skills from the "Top Skills" sidebar section.
 * Skills appear between "Top Skills" and the next section header.
 */
function parseSkills(lines: string[]): ParsedSkill[] {
  const topSkillsIdx = lines.indexOf("Top Skills");
  if (topSkillsIdx === -1) return [];

  const skills: ParsedSkill[] = [];
  for (let i = topSkillsIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (SIDEBAR_SECTIONS.includes(line)) break;
    // Skills are short names; stop if we hit section-like content
    if (line === "Experience" || line === "Education") break;
    if (line.length > 0 && line.length <= 50) {
      skills.push({ name: line });
    }
  }
  return skills;
}

/**
 * Extract headline from the lines between the last sidebar section and "Experience".
 * The headline is typically: Name, Headline, Location, then "Experience".
 * We want the second line in that block (the headline text).
 */
function extractHeadline(lines: string[]): string | null {
  const expIdx = lines.indexOf("Experience");
  if (expIdx === -1 || expIdx < 2) return null;

  // Walk backwards from "Experience". The lines just before are:
  // [Name, Headline, Location] or [Name, Location] or [Name]
  // Skip the location line if present, then check for headline.
  let offset = 1;
  if (LOCATION_REGEX.test(lines[expIdx - offset])) {
    offset++;
  }

  // lines[expIdx - offset] should be the headline (or the name if no headline)
  if (expIdx - offset < 0) return null;
  const candidate = lines[expIdx - offset];

  // If this looks like a section header or sidebar content, there's no headline
  if (SIDEBAR_SECTIONS.includes(candidate)) return null;

  // Verify there's a name line above it (the headline isn't the first line of main content)
  if (expIdx - offset - 1 < 0) return null;
  const nameCandidate = lines[expIdx - offset - 1];
  // If the line above is also a section header, then our "candidate" is actually the name, not headline
  if (SIDEBAR_SECTIONS.includes(nameCandidate)) return null;

  return candidate.substring(0, 200);
}

function parseExperiences(lines: string[]): ParsedExperience[] {
  const experiences: ParsedExperience[] = [];
  let currentMultiRoleCompany: string | null = null;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Check for duration summary (multi-role company indicator)
    if (DURATION_SUMMARY_REGEX.test(line)) {
      if (i >= 1) {
        currentMultiRoleCompany = lines[i - 1];
      }
      i++;
      continue;
    }

    // Check for date range line
    const dateMatch = line.match(DATE_RANGE_REGEX);
    if (dateMatch) {
      const startMonth = dateMatch[1];
      const startYear = dateMatch[2];
      const isPresent = dateMatch[3] === "Present";
      const endMonth = dateMatch[4] || null;
      const endYear = dateMatch[5] || null;

      const start_date = parseMonthYear(startMonth, startYear);
      const end_date =
        isPresent || !endMonth || !endYear
          ? null
          : parseMonthYear(endMonth, endYear);

      // Title is the line above the date
      const titleLine = i >= 1 ? lines[i - 1] : "";

      // Determine company
      let company: string;
      if (currentMultiRoleCompany) {
        company = currentMultiRoleCompany;
      } else {
        const companyIdx = i - 2;
        if (companyIdx >= 0) {
          const candidate = lines[companyIdx];
          if (
            !DATE_RANGE_REGEX.test(candidate) &&
            !LOCATION_REGEX.test(candidate) &&
            !DURATION_SUMMARY_REGEX.test(candidate)
          ) {
            company = candidate;
          } else {
            const lastExp = experiences[experiences.length - 1];
            company = lastExp ? lastExp.company : "Unknown";
          }
        } else {
          company = "Unknown";
        }
      }

      // Collect location and description after the date
      let location: string | null = null;
      let description: string | null = null;
      let nextIdx = i + 1;

      if (nextIdx < lines.length && LOCATION_REGEX.test(lines[nextIdx])) {
        location = lines[nextIdx];
        nextIdx++;
      }

      const descLines: string[] = [];
      while (nextIdx < lines.length) {
        const nextLine = lines[nextIdx];
        if (
          DATE_RANGE_REGEX.test(nextLine) ||
          DURATION_SUMMARY_REGEX.test(nextLine)
        ) {
          break;
        }
        // If next line after this is a date, this line is a title — stop
        if (
          nextIdx + 1 < lines.length &&
          DATE_RANGE_REGEX.test(lines[nextIdx + 1])
        ) {
          break;
        }
        // If two lines ahead is a date, this line is a company name — stop
        if (
          nextIdx + 2 < lines.length &&
          DATE_RANGE_REGEX.test(lines[nextIdx + 2])
        ) {
          break;
        }
        descLines.push(nextLine);
        nextIdx++;
      }

      if (descLines.length > 0) {
        description = descLines.join(" ").trim().substring(0, 500) || null;
      }

      experiences.push({
        company,
        title: titleLine,
        start_date,
        end_date,
        location,
        description,
      });

      i = nextIdx;
      continue;
    }

    // Reset multi-role when we see a new company header pattern
    // (line followed by title followed by date)
    if (i + 2 < lines.length && DATE_RANGE_REGEX.test(lines[i + 2])) {
      currentMultiRoleCompany = null;
    }

    i++;
  }

  return experiences;
}

function parseEducationEntries(lines: string[]): ParsedEducation[] {
  const entries: ParsedEducation[] = [];
  let i = 0;

  while (i < lines.length) {
    const institution = lines[i];
    i++;

    if (i >= lines.length) {
      entries.push({
        institution,
        degree: null,
        field_of_study: null,
        start_date: null,
        end_date: null,
      });
      break;
    }

    // Collect the detail line(s) — may span multiple lines
    let detailLine = lines[i];
    i++;

    // Continue collecting if next lines seem to be part of the same entry
    while (i < lines.length && !lines[i - 1].includes("·") && lines[i].includes("·")) {
      detailLine += " " + lines[i];
      i++;
    }

    // Also join the line after if the detail was split (e.g., degree name wrapping)
    // Check if detailLine doesn't contain date info but next line does
    if (
      i < lines.length &&
      !detailLine.includes("·") &&
      lines[i].includes("·")
    ) {
      detailLine += " " + lines[i];
      i++;
    }

    // Handle line-split dates: if detailLine has unclosed "(" join next line
    if (
      i < lines.length &&
      detailLine.includes("(") &&
      !detailLine.includes(")")
    ) {
      detailLine += " " + lines[i];
      i++;
    }

    let degree: string | null = null;
    let field_of_study: string | null = null;
    let start_date: string | null = null;
    let end_date: string | null = null;

    // Parse dates from parentheses: "(July 2023 - May\n2028)" — may be split
    const fullDetail = detailLine.replace(/\n/g, " ");
    const dateInParens = fullDetail.match(
      new RegExp(
        `\\(?\\s*(${MONTH_PATTERN})\\s+(\\d{4})\\s*-\\s*(${MONTH_PATTERN})\\s+(\\d{4})\\s*\\)?`
      )
    );

    if (dateInParens) {
      start_date = parseMonthYear(dateInParens[1], dateInParens[2]);
      end_date = parseMonthYear(dateInParens[3], dateInParens[4]);
    }

    // Extract degree and field from before "·"
    const beforeDot = fullDetail.split("·")[0].trim();
    if (beforeDot) {
      const parts = beforeDot.split(",").map((p) => p.trim());
      if (parts.length >= 2) {
        degree = parts[0] || null;
        field_of_study = parts.slice(1).join(", ").trim() || null;
      } else {
        degree = parts[0] || null;
      }
    }

    entries.push({ institution, degree, field_of_study, start_date, end_date });
  }

  return entries;
}

export async function parseLinkedInPdf(
  buffer: Buffer
): Promise<ParsedProfile> {
  const warnings: string[] = [];

  let text: string;
  try {
    const result = await pdf(buffer);
    text = result.text;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes("password")) {
      throw new Error(
        "This PDF appears to be password-protected. Please upload an unprotected PDF."
      );
    }
    throw new Error(
      "Failed to parse PDF. Please ensure it is a valid PDF file."
    );
  }

  text = cleanText(text);
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Extract skills from sidebar
  const skills = parseSkills(lines);
  if (skills.length === 0) {
    warnings.push("Could not find skills in this PDF.");
  }

  // Extract headline
  const headline = extractHeadline(lines);

  // Find section boundaries
  const expIdx = lines.indexOf("Experience");
  const eduIdx = lines.indexOf("Education");

  // Parse experiences
  let experiences: ParsedExperience[] = [];
  if (expIdx !== -1) {
    const endIdx = eduIdx !== -1 ? eduIdx : lines.length;
    const expLines = lines.slice(expIdx + 1, endIdx);
    experiences = parseExperiences(expLines);
  } else {
    warnings.push("Could not find Experience section in this PDF.");
  }

  // Parse education
  let education: ParsedEducation[] = [];
  if (eduIdx !== -1) {
    const eduLines = lines.slice(eduIdx + 1);
    education = parseEducationEntries(eduLines);
  } else {
    warnings.push("Could not find Education section in this PDF.");
  }

  if (
    experiences.length === 0 &&
    education.length === 0 &&
    skills.length === 0
  ) {
    warnings.push(
      "We couldn't find experience, education, or skills data in this PDF. You can add entries manually."
    );
  }

  return { headline, experiences, education, skills, warnings };
}
