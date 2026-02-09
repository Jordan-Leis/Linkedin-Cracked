import { describe, it, expect, beforeAll } from "vitest";
import { parseLinkedInPdfText, type ParsedProfile } from "@/lib/pdf-parser";

// Synthetic LinkedIn PDF text matching the parser's expected structure
const SAMPLE_PDF_TEXT = [
  "Contact",
  "www.linkedin.com/in/testuser",
  "Top Skills",
  "PyTorch",
  "VHDL",
  "TensorFlow",
  "Languages",
  "English",
  "Jordan Test",
  "UWaterloo CE 2028 | Cansbridge Fellow | Director @ WAT.ai",
  "Waterloo, Ontario, Canada",
  "Experience",
  "The Cansbridge Fellowship",
  "Cansbridge Fellow",
  "January 2026 - Present (2 months)",
  "San Francisco Bay Area",
  "Selected as one of 15 fellows for an entrepreneurship program.",
  "Harding Technologies",
  "Software Developer Intern",
  "January 2024 - April 2024 (4 months)",
  "Kitchener, Ontario, Canada",
  "WAT.ai",
  "3 years 6 months",
  "Director",
  "September 2025 - Present (5 months)",
  "Technical Project Manager",
  "January 2025 - September 2025 (9 months)",
  "Machine Learning Engineer",
  "May 2024 - January 2025 (9 months)",
  "Health Canada | Sant\u00e9 Canada",
  "Machine Learning Intern",
  "May 2025 - August 2025 (4 months)",
  "Ottawa, Ontario, Canada",
  "Education",
  "University of Waterloo",
  "Bachelor of Computer Science, Computer Engineering \u00b7 (July 2023 - May 2028)",
].join("\n");

describe("parseLinkedInPdfText", () => {
  let result: ParsedProfile;

  // Parse once, test multiple aspects
  beforeAll(() => {
    result = parseLinkedInPdfText(SAMPLE_PDF_TEXT);
  });

  describe("headline extraction", () => {
    it("extracts the headline from the PDF", () => {
      expect(result.headline).toBeTruthy();
      expect(result.headline).toContain("UWaterloo");
    });
  });

  describe("experience parsing", () => {
    it("extracts multiple experience entries", () => {
      expect(result.experiences.length).toBeGreaterThanOrEqual(5);
    });

    it("parses company names correctly", () => {
      const companies = result.experiences.map((e) => e.company);
      expect(companies).toContain("The Cansbridge Fellowship");
      expect(companies).toContain("Health Canada | Sant\u00e9 Canada");
    });

    it("parses titles correctly", () => {
      const titles = result.experiences.map((e) => e.title);
      expect(titles).toContain("Cansbridge Fellow");
      expect(titles).toContain("Machine Learning Intern");
    });

    it("parses start dates in YYYY-MM format", () => {
      const cansbridge = result.experiences.find(
        (e) => e.company === "The Cansbridge Fellowship"
      );
      expect(cansbridge).toBeTruthy();
      expect(cansbridge!.start_date).toBe("2026-01");
    });

    it("sets end_date to null for 'Present' entries", () => {
      const cansbridge = result.experiences.find(
        (e) => e.company === "The Cansbridge Fellowship"
      );
      expect(cansbridge).toBeTruthy();
      expect(cansbridge!.end_date).toBeNull();
    });

    it("parses end dates for completed roles", () => {
      const harding = result.experiences.find(
        (e) => e.company === "Harding Technologies"
      );
      expect(harding).toBeTruthy();
      expect(harding!.start_date).toBe("2024-01");
      expect(harding!.end_date).toBe("2024-04");
    });

    it("handles multi-role companies (WAT.ai)", () => {
      const wataiRoles = result.experiences.filter(
        (e) => e.company === "WAT.ai"
      );
      expect(wataiRoles.length).toBeGreaterThanOrEqual(2);

      const titles = wataiRoles.map((r) => r.title);
      expect(titles).toContain("Director");
      expect(titles).toContain("Technical Project Manager");
    });

    it("extracts locations when available", () => {
      const cansbridge = result.experiences.find(
        (e) => e.company === "The Cansbridge Fellowship"
      );
      expect(cansbridge?.location).toBeTruthy();
      expect(cansbridge!.location).toContain("San Francisco");
    });

    it("extracts descriptions when available", () => {
      const cansbridge = result.experiences.find(
        (e) => e.company === "The Cansbridge Fellowship"
      );
      expect(cansbridge?.description).toBeTruthy();
      expect(cansbridge!.description).toContain("15 fellows");
    });
  });

  describe("education parsing", () => {
    it("extracts education entries", () => {
      expect(result.education.length).toBeGreaterThanOrEqual(1);
    });

    it("parses institution name", () => {
      const uow = result.education.find(
        (e) => e.institution === "University of Waterloo"
      );
      expect(uow).toBeTruthy();
    });

    it("parses degree", () => {
      const uow = result.education.find(
        (e) => e.institution === "University of Waterloo"
      );
      expect(uow?.degree).toBeTruthy();
      expect(uow!.degree).toContain("Bachelor");
    });

    it("parses date range for education", () => {
      const uow = result.education.find(
        (e) => e.institution === "University of Waterloo"
      );
      expect(uow?.start_date).toBe("2023-07");
      expect(uow?.end_date).toBe("2028-05");
    });
  });

  describe("skills parsing", () => {
    it("extracts skills from the sidebar", () => {
      expect(result.skills.length).toBeGreaterThanOrEqual(3);
    });

    it("includes known skills", () => {
      const names = result.skills.map((s) => s.name);
      expect(names).toContain("PyTorch");
      expect(names).toContain("VHDL");
      expect(names).toContain("TensorFlow");
    });
  });

  describe("warnings", () => {
    it("has no warnings for a well-formed PDF", () => {
      expect(result.warnings).toEqual([]);
    });
  });

  describe("edge cases", () => {
    it("returns warnings for text with no recognizable sections", () => {
      const parsed = parseLinkedInPdfText("Just some random text\nNothing here");
      expect(parsed.warnings.length).toBeGreaterThan(0);
    });

    it("returns warnings when only Experience section is missing", () => {
      const textWithoutExp = [
        "Top Skills",
        "Python",
        "Education",
        "MIT",
        "BS Computer Science \u00b7 (September 2020 - May 2024)",
      ].join("\n");
      const parsed = parseLinkedInPdfText(textWithoutExp);
      expect(parsed.warnings).toContain(
        "Could not find Experience section in this PDF."
      );
    });
  });
});
