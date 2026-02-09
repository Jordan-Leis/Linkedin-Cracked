import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { headlineSchema } from "@/lib/validators";

export async function PATCH(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = headlineSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      headline: parsed.data.headline,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id);

  if (error) {
    return NextResponse.json({ error: "Failed to update headline" }, { status: 500 });
  }

  return NextResponse.json({ headline: parsed.data.headline });
}
