-- FIX: Add missing column causing trigger error
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS notification_email text;
