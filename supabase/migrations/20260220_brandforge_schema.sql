-- BrandForge AI: Add brand-related columns to user_profiles
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS brand_name text,
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS target_audience text,
  ADD COLUMN IF NOT EXISTS brand_tone text,
  ADD COLUMN IF NOT EXISTS platforms jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS brand_colors jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS brand_description text,
  ADD COLUMN IF NOT EXISTS logo_url text;

-- BrandForge AI: Add platform-specific content columns to daily_recommendations
ALTER TABLE public.daily_recommendations
  ADD COLUMN IF NOT EXISTS content_instagram text,
  ADD COLUMN IF NOT EXISTS content_twitter text,
  ADD COLUMN IF NOT EXISTS content_linkedin text,
  ADD COLUMN IF NOT EXISTS ad_copy text,
  ADD COLUMN IF NOT EXISTS calendar_tip text,
  ADD COLUMN IF NOT EXISTS trending_hook text;
