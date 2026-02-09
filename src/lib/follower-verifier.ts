import { parseFollowerString } from "./follower-parser";

export interface VerificationSuccess {
  count: number;
}

export interface VerificationError {
  error: string;
}

export type VerificationResult = VerificationSuccess | VerificationError;

/**
 * Verify a LinkedIn profile's follower count by visiting the public profile
 * page with a headless browser and extracting the follower count text.
 */
export async function verifyFollowerCount(
  linkedinUrl: string
): Promise<VerificationResult> {
  // Dynamic imports — these are server-only dependencies
  let chromium: typeof import("@sparticuz/chromium");
  let puppeteer: typeof import("puppeteer-core");
  try {
    chromium = await import("@sparticuz/chromium");
    puppeteer = await import("puppeteer-core");
  } catch {
    return { error: "Browser dependencies not available." };
  }

  let browser;
  try {
    browser = await puppeteer.default.launch({
      args: chromium.default.args,
      defaultViewport: { width: 1280, height: 800 },
      executablePath: await chromium.default.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // Navigate to the LinkedIn profile
    await page.goto(linkedinUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // Wait a moment for dynamic content
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Check for login wall / auth wall
    const pageContent = await page.content();
    if (
      pageContent.includes("authwall") ||
      pageContent.includes("Sign in") && pageContent.includes("Join now")
    ) {
      return {
        error:
          "Your LinkedIn profile appears to be private or blocked. Please make it public temporarily or use screenshot verification.",
      };
    }

    // Extract text content from the page
    const bodyText = await page.evaluate(() => document.body.innerText);

    // Look for follower count patterns
    const followerPatterns = [
      /(\d[\d,]*(?:\.\d+)?)\s*\+?\s*(?:K|M)?\s*followers?/gi,
      /(\d[\d,]*(?:\.\d+)?)\s*\+?\s*(?:K|M)?\s*connections?/gi,
    ];

    for (const pattern of followerPatterns) {
      const matches = bodyText.matchAll(pattern);
      for (const match of matches) {
        const count = parseFollowerString(match[0]);
        if (count !== null) {
          return { count };
        }
      }
    }

    return {
      error:
        "Could not find follower count on the profile page. The profile may be private or the page structure may have changed.",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("timeout") || msg.includes("Timeout")) {
      return { error: "Timed out loading the LinkedIn profile. Please try again." };
    }
    return { error: "Failed to verify follower count. Please try again or use screenshot verification." };
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}
