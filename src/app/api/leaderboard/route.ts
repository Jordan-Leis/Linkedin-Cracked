import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_SLUGS } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = request.nextUrl;

  const category = searchParams.get("category");
  const limit = Math.min(
    Math.max(parseInt(searchParams.get("limit") || "50") || 50, 1),
    100
  );
  const offset = Math.max(parseInt(searchParams.get("offset") || "0") || 0, 0);

  // Validate category slug if provided
  if (category && !(CATEGORY_SLUGS as readonly string[]).includes(category)) {
    return NextResponse.json(
      { error: "Invalid category slug" },
      { status: 400 }
    );
  }

  let query = supabase
    .from("profiles")
    .select(
      "id, display_name, current_mmr, follower_count, experience_count, follower_verify_status, follower_verified_at, follower_verify_method, profile_interests(category_id, categories(slug, label))",
      { count: "exact" }
    )
    .order("current_mmr", { ascending: false })
    .range(offset, offset + limit - 1);

  // Filter by category if specified
  if (category) {
    // Get profiles that have this category
    const { data: categoryRow } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", category)
      .single();

    if (!categoryRow) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 400 }
      );
    }

    // Get profile IDs in this category
    const { data: interests } = await supabase
      .from("profile_interests")
      .select("profile_id")
      .eq("category_id", categoryRow.id);

    const profileIds = (interests || []).map((i) => i.profile_id);

    if (profileIds.length === 0) {
      return NextResponse.json({
        profiles: [],
        total: 0,
        limit,
        offset,
      });
    }

    query = query.in("id", profileIds);
  }

  const { data: profiles, count } = await query;

  const formattedProfiles = (profiles || []).map((p, index) => ({
    id: p.id,
    display_name: p.display_name,
    current_mmr: p.current_mmr,
    rank: offset + index + 1,
    follower_count: p.follower_count,
    experience_count: p.experience_count,
    follower_verify_status: p.follower_verify_status,
    follower_verified_at: p.follower_verified_at,
    follower_verify_method: p.follower_verify_method,
    categories: (
      p.profile_interests as unknown as Array<{
        categories: { slug: string; label: string };
      }>
    ).map((pi) => pi.categories),
  }));

  return NextResponse.json({
    profiles: formattedProfiles,
    total: count ?? 0,
    limit,
    offset,
  });
}
