-- Add avatar URL to profiles (populated from LinkedIn OAuth metadata)

ALTER TABLE public.profiles ADD COLUMN avatar_url text;
