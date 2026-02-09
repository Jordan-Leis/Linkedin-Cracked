import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { PDF_UPLOAD_MAX_SIZE, PDF_UPLOAD_RATE_LIMIT } from "@/lib/constants";
import { parseLinkedInPdf } from "@/lib/pdf-parser";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Rate limit
  const rl = checkRateLimit(
    `pdf-upload:${user.id}`,
    PDF_UPLOAD_RATE_LIMIT.limit,
    PDF_UPLOAD_RATE_LIMIT.windowMs
  );
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429 }
    );
  }

  // Extract file from FormData
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid form data." },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "No file provided." },
      { status: 400 }
    );
  }

  // Validate MIME type
  if (file.type !== "application/pdf") {
    return NextResponse.json(
      { error: "File must be a PDF." },
      { status: 400 }
    );
  }

  // Validate size
  if (file.size > PDF_UPLOAD_MAX_SIZE) {
    return NextResponse.json(
      { error: "PDF must be under 5MB." },
      { status: 400 }
    );
  }

  // Read file into buffer and parse
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  try {
    const parsed = await parseLinkedInPdf(buffer);
    return NextResponse.json({ parsed });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to parse PDF.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
