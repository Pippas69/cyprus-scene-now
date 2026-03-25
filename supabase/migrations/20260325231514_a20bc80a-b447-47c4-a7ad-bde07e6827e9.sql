
-- Add brought_by_user_id to track ghost origin
ALTER TABLE public.crm_guests
ADD COLUMN IF NOT EXISTS brought_by_user_id uuid REFERENCES public.profiles(id);

COMMENT ON COLUMN public.crm_guests.brought_by_user_id IS 'For ghost profiles: the account holder who brought this guest';
