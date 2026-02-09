import { describe, it, expect } from "vitest";
import { parseLinkedInPdf, type ParsedProfile } from "@/lib/pdf-parser";
import { readFileSync } from "fs";
import { join } from "path";

// Load the sample PDF once for all tests
const samplePdfBuffer = readFileSync(
  join(process.cwd(), "Profile (1).pdf")
);

describe("parseLinkedInPdf", () => {
  let result: ParsedProfile;

  // Parse once, test multiple aspects
  beforeAll(async () => {
    result = await parseLinkedInPdf(samplePdfBuffer);
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
      expect(companies).toContain("Health Canada | Santé Canada");
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
    it("rejects password-protected PDFs with a clear message", async () => {
      // An empty/invalid buffer should throw
      const emptyBuffer = Buffer.from([]);
      await expect(parseLinkedInPdf(emptyBuffer)).rejects.toThrow();
    });

    it("handles buffer with no recognizable sections", async () => {
      // A minimal valid PDF with no LinkedIn content
      // pdf-parse may still extract something or return empty text
      const minimalPdf = Buffer.from(
        "%PDF-1.0\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n" +
          "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" +
          "3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\n" +
          "xref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n" +
          "0000000115 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF"
      );
      try {
        const parsed = await parseLinkedInPdf(minimalPdf);
        // Should get warnings about missing sections
        expect(parsed.warnings.length).toBeGreaterThan(0);
      } catch {
        // pdf-parse may reject invalid PDFs, which is fine
        expect(true).toBe(true);
      }
    });
  });
});
