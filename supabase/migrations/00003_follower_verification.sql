-- Follower Count Verification: Extend profiles, add verification log + screenshots
-- Depends on: 00001_initial_schema.sql

-- =============================================================
-- EXTEND PROFILES TABLE
-- =============================================================
ALTER TABLE public.profiles
  ADD COLUMN follower_verify_status text NOT NULL DEFAULT 'unverified'
    CHECK (follower_verify_status IN ('unverified', 'pending_manual', 'verified', 'expired')),
  ADD COLUMN follower_count_verified integer,
  ADD COLUMN follower_verified_at timestamptz,
  ADD COLUMN follower_verify_method text
    CHECK (follower_verify_method IS NULL OR follower_verify_method IN ('automatic', 'manual')),
  ADD COLUMN follower_consent_at timestamptz;

-- =============================================================
-- FOLLOWER_VERIFICATION_LOG
-- =============================================================
CREATE TABLE public.follower_verification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  method text NOT NULL CHECK (method IN ('automatic', 'manual')),
  result text NOT NULL CHECK (result IN ('success', 'failure', 'pending')),
  self_reported_count integer NOT NULL,
  verified_count integer,
  failure_reason text,
  consent_recorded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX verification_log_profile_id_idx ON public.follower_verification_log (profile_id);
CREATE INDEX verification_log_profile_created_idx ON public.follower_verification_log (profile_id, created_at DESC);

ALTER TABLE public.follower_verification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own verification logs"
  ON public.follower_verification_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = profile_id
        AND profiles.user_id = auth.uid()
    )
  );

-- INSERT is server-side only (service role)
-- No UPDATE policy (append-only audit log)
-- DELETE cascades from profile deletion

-- =============================================================
-- VERIFICATION_SCREENSHOTS
-- =============================================================
CREATE TABLE public.verification_screenshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  review_status text NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'approved', 'rejected')),
  reviewer_notes text,
  reviewed_at timestamptz
);

CREATE INDEX verification_screenshots_profile_id_idx ON public.verification_screenshots (profile_id);
CREATE INDEX verification_screenshots_review_status_idx ON public.verification_screenshots (review_status);

ALTER TABLE public.verification_screenshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own screenshots"
  ON public.verification_screenshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = profile_id
        AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own screenshots"
  ON public.verification_screenshots FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = profile_id
        AND profiles.user_id = auth.uid()
    )
  );

-- UPDATE is server-side only (admin review via service role)
-- DELETE cascades from profile deletion
