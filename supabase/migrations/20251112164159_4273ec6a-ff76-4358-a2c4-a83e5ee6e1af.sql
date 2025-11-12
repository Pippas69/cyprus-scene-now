-- Update handle_new_user trigger to automatically assign admin role to founders
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (
    id,
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
    -- Greek → English city mapping for town field
    COALESCE(
      CASE
        WHEN new.raw_user_meta_data->>'town' = 'Λευκωσία' THEN 'Nicosia'
        WHEN new.raw_user_meta_data->>'town' = 'Λεμεσός' THEN 'Limassol'
        WHEN new.raw_user_meta_data->>'town' = 'Λάρνακα' THEN 'Larnaca'
        WHEN new.raw_user_meta_data->>'town' = 'Πάφος' THEN 'Paphos'
        WHEN new.raw_user_meta_data->>'town' = 'Παραλίμνι' THEN 'Paralimni'
        WHEN new.raw_user_meta_data->>'town' = 'Αγία Νάπα' THEN 'Ayia Napa'
        ELSE new.raw_user_meta_data->>'town'
      END, ''
    ),
    -- Keep original town value in city field
    COALESCE(new.raw_user_meta_data->>'town', ''),
    -- Handle preferences array safely
    COALESCE(
      ARRAY(
        SELECT jsonb_array_elements_text(new.raw_user_meta_data->'preferences')
      ),
      '{}'::text[]
    ),
    -- Construct name from first_name and last_name
    COALESCE(
      NULLIF(TRIM(
        COALESCE(new.raw_user_meta_data->>'first_name', '') || ' ' ||
        COALESCE(new.raw_user_meta_data->>'last_name', '')
      ), ''),
      'User'
    ),
    -- Automatic admin assignment for founders
    CASE
      WHEN LOWER(new.email) IN (
        'ramisenan@gmail.com',
        'marinoskoumi04@gmail.com'
      )
      THEN 'admin'::app_role
      ELSE 'user'::app_role
    END
  );

  RETURN new;
END;
$function$;