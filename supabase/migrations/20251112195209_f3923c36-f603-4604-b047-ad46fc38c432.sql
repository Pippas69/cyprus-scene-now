-- Clean up duplicate profiles
DELETE FROM public.profiles a
USING public.profiles b
WHERE a.id = b.id
AND a.ctid < b.ctid;

-- Remove profiles with no matching auth user
DELETE FROM public.profiles
WHERE id NOT IN (SELECT id FROM auth.users);

-- Update trigger to handle re-signups safely with ON CONFLICT
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (
    id,
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
    new.id,
    COALESCE(new.raw_user_meta_data->>'first_name', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', ''),
    (new.raw_user_meta_data->>'age')::integer,
    new.email,
    COALESCE(new.raw_user_meta_data->>'town', ''),
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
    COALESCE(
      ARRAY(
        SELECT jsonb_array_elements_text(new.raw_user_meta_data->'preferences')
      ),
      '{}'::text[]
    ),
    COALESCE(
      NULLIF(TRIM(
        COALESCE(new.raw_user_meta_data->>'first_name', '') || ' ' ||
        COALESCE(new.raw_user_meta_data->>'last_name', '')
      ), ''),
      'User'
    ),
    CASE
      WHEN LOWER(new.email) IN (
        'ramisenan@gmail.com',
        'marinoskoumi04@gmail.com'
      )
      THEN 'admin'::app_role
      ELSE 'user'::app_role
    END
  )
  ON CONFLICT (id)
  DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    age = EXCLUDED.age,
    email = EXCLUDED.email,
    town = EXCLUDED.town,
    city = EXCLUDED.city,
    preferences = EXCLUDED.preferences,
    name = EXCLUDED.name,
    updated_at = now();

  RETURN new;
END;
$function$;