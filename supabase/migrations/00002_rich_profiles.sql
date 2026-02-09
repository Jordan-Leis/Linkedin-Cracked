-- Rich Profiles: Structured experiences, education, skills
-- Extends profiles table with headline; adds 3 new tables with RLS

-- =============================================================
-- EXTEND PROFILES TABLE
-- =============================================================
ALTER TABLE public.profiles
  ADD COLUMN headline text CHECK (char_length(headline) <= 200);

-- =============================================================
-- PROFILE_EXPERIENCES
-- =============================================================
CREATE TABLE public.profile_experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company text NOT NULL CHECK (char_length(company) BETWEEN 1 AND 100),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  start_date date NOT NULL,
  end_date date,
  location text CHECK (char_length(location) <= 100),
  description text CHECK (char_length(description) <= 500),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX profile_experiences_profile_id_idx ON public.profile_experiences (profile_id);
CREATE INDEX profile_experiences_profile_sort_idx ON public.profile_experiences (profile_id, sort_order);

ALTER TABLE public.profile_experiences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read experiences"
  ON public.profile_experiences FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own experiences"
  ON public.profile_experiences FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = profile_id
        AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own experiences"
  ON public.profile_experiences FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = profile_id
        AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own experiences"
  ON public.profile_experiences FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = profile_id
        AND profiles.user_id = auth.uid()
    )
  );

-- =============================================================
-- PROFILE_EDUCATION
-- =============================================================
CREATE TABLE public.profile_education (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  institution text NOT NULL CHECK (char_length(institution) BETWEEN 1 AND 100),
  degree text CHECK (char_length(degree) <= 100),
  field_of_study text CHECK (char_length(field_of_study) <= 100),
  start_date date,
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX profile_education_profile_id_idx ON public.profile_education (profile_id);

ALTER TABLE public.profile_education ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read education"
  ON public.profile_education FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own education"
  ON public.profile_education FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = profile_id
        AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own education"
  ON public.profile_education FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = profile_id
        AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own education"
  ON public.profile_education FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = profile_id
        AND profiles.user_id = auth.uid()
    )
  );

-- =============================================================
-- PROFILE_SKILLS
-- =============================================================
CREATE TABLE public.profile_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 50),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, name)
);

CREATE INDEX profile_skills_profile_id_idx ON public.profile_skills (profile_id);

ALTER TABLE public.profile_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read skills"
  ON public.profile_skills FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own skills"
  ON public.profile_skills FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = profile_id
        AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own skills"
  ON public.profile_skills FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = profile_id
        AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own skills"
  ON public.profile_skills FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = profile_id
        AND profiles.user_id = auth.uid()
    )
  );
