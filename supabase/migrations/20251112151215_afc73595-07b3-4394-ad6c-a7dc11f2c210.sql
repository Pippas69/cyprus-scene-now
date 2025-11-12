-- Fix profiles table to accept all signup form fields properly
-- Make optional fields truly optional
ALTER TABLE public.profiles ALTER COLUMN first_name DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN last_name DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN age DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN town DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN city DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN preferences DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN name DROP NOT NULL;

-- Set default empty values for fields that might be null
ALTER TABLE public.profiles ALTER COLUMN first_name SET DEFAULT '';
ALTER TABLE public.profiles ALTER COLUMN last_name SET DEFAULT '';
ALTER TABLE public.profiles ALTER COLUMN name SET DEFAULT '';
ALTER TABLE public.profiles ALTER COLUMN preferences SET DEFAULT '{}';

-- Update the handle_new_user trigger to properly handle nullable fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    first_name, 
    last_name, 
    age, 
    email, 
    town,
    city,
    preferences,
    name,
    role
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'first_name', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', ''),
    (new.raw_user_meta_data->>'age')::integer,
    new.email,
    COALESCE(new.raw_user_meta_data->>'town', ''),
    COALESCE(new.raw_user_meta_data->>'town', ''),
    COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(new.raw_user_meta_data->'preferences')),
      '{}'::text[]
    ),
    COALESCE(
      NULLIF(TRIM(COALESCE(new.raw_user_meta_data->>'first_name', '') || ' ' || COALESCE(new.raw_user_meta_data->>'last_name', '')), ''),
      'User'
    ),
    'user'::app_role
  );
  RETURN new;
END;
$function$;