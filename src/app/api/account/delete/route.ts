import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { accountDeleteSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Parse and validate body
  const body = await request.json();
  const parsed = accountDeleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "You must confirm account deletion" },
      { status: 400 }
    );
  }

  // Delete user's votes
  await supabase.from("votes").delete().eq("voter_user_id", user.id);

  // Delete profile (cascades to profile_interests and matchups via ON DELETE CASCADE)
  await supabase.from("profiles").delete().eq("user_id", user.id);

  // Delete the auth user via admin API (requires service role)
  const serviceClient = await createServiceClient();
  const { error } = await serviceClient.auth.admin.deleteUser(user.id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }

  return NextResponse.json({ deleted: true });
}
