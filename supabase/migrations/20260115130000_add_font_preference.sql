-- Add font_preference column to user_profile table
-- Allows users to choose between default font and dyslexia-friendly font (OpenDyslexic)
alter table public.user_profile
add column font_preference text default 'default' check (font_preference in ('default', 'dyslexic'));
