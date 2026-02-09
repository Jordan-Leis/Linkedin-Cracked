-- LinkedIn-Cracked: Initial schema
-- Tables: categories, profiles, profile_interests, matchups, votes
-- All tables have RLS enabled with appropriate policies

-- =============================================================
-- CATEGORIES (lookup table, admin-seeded)
-- =============================================================
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null
);

alter table public.categories enable row level security;

create policy "Anyone can read categories"
  on public.categories for select
  using (true);

-- Seed interest categories
insert into public.categories (slug, label) values
  ('swe', 'SWE'),
  ('research', 'Research'),
  ('growth', 'Growth'),
  ('product', 'Product'),
  ('design', 'Design'),
  ('data-science', 'Data Science'),
  ('marketing', 'Marketing'),
  ('sales', 'Sales'),
  ('operations', 'Operations'),
  ('other', 'Other');

-- =============================================================
-- PROFILES
-- =============================================================
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 50),
  linkedin_url text not null,
  follower_count integer not null check (follower_count >= 0),
  experience_count integer not null check (experience_count >= 0),
  projects_count integer check (projects_count >= 0),
  skills_count integer check (skills_count >= 0),
  education_count integer check (education_count >= 0),
  baseline_mmr integer not null,
  current_mmr integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_current_mmr_idx on public.profiles (current_mmr desc);

alter table public.profiles enable row level security;

create policy "Anyone can read profiles"
  on public.profiles for select
  using (true);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = user_id);

create policy "Users can delete own profile"
  on public.profiles for delete
  using (auth.uid() = user_id);

-- =============================================================
-- PROFILE_INTERESTS (junction table)
-- =============================================================
create table public.profile_interests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.categories(id),
  unique (profile_id, category_id)
);

create index profile_interests_profile_id_idx on public.profile_interests (profile_id);
create index profile_interests_category_id_idx on public.profile_interests (category_id);

alter table public.profile_interests enable row level security;

create policy "Anyone can read profile interests"
  on public.profile_interests for select
  using (true);

create policy "Users can insert own profile interests"
  on public.profile_interests for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = profile_id
        and profiles.user_id = auth.uid()
    )
  );

create policy "Users can delete own profile interests"
  on public.profile_interests for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = profile_id
        and profiles.user_id = auth.uid()
    )
  );

-- =============================================================
-- MATCHUPS
-- =============================================================
create table public.matchups (
  id uuid primary key default gen_random_uuid(),
  profile_a_id uuid not null references public.profiles(id) on delete cascade,
  profile_b_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (profile_a_id != profile_b_id)
);

create index matchups_profiles_idx on public.matchups (profile_a_id, profile_b_id);

alter table public.matchups enable row level security;

create policy "Anyone can read matchups"
  on public.matchups for select
  using (true);

create policy "Authenticated users can create matchups"
  on public.matchups for insert
  with check (auth.uid() is not null);

-- =============================================================
-- VOTES
-- =============================================================
create table public.votes (
  id uuid primary key default gen_random_uuid(),
  matchup_id uuid not null references public.matchups(id) on delete cascade,
  voter_user_id uuid not null references auth.users(id),
  winner_profile_id uuid not null references public.profiles(id) on delete cascade,
  loser_profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (matchup_id, voter_user_id)
);

create index votes_matchup_id_idx on public.votes (matchup_id);
create index votes_voter_user_id_idx on public.votes (voter_user_id);
create index votes_voter_created_idx on public.votes (voter_user_id, created_at);

alter table public.votes enable row level security;

create policy "Users can read own votes"
  on public.votes for select
  using (auth.uid() = voter_user_id);

create policy "Users can insert own votes"
  on public.votes for insert
  with check (auth.uid() = voter_user_id);

create policy "Users can delete own votes"
  on public.votes for delete
  using (auth.uid() = voter_user_id);
