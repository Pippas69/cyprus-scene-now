CREATE OR REPLACE FUNCTION public.generate_promoter_tracking_code(_promoter_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _raw_name TEXT;
  _name_part TEXT;
  _random_part TEXT;
  _candidate TEXT;
  _attempt INT := 0;
BEGIN
  SELECT COALESCE(
    NULLIF(trim(first_name), ''),
    NULLIF(split_part(COALESCE(name, ''), ' ', 1), ''),
    'pr'
  )
  INTO _raw_name
  FROM public.profiles
  WHERE id = _promoter_user_id;

  IF _raw_name IS NULL OR length(_raw_name) = 0 THEN
    _raw_name := 'pr';
  END IF;

  _name_part := lower(regexp_replace(_raw_name, '[^a-zA-Z]', '', 'g'));
  IF _name_part IS NULL OR length(_name_part) = 0 THEN
    _name_part := 'pr';
  END IF;
  _name_part := substring(_name_part, 1, 12);

  LOOP
    _random_part := lower(substring(md5(random()::text || clock_timestamp()::text), 1, 4));
    _candidate := _name_part || '-' || _random_part;

    IF NOT EXISTS (SELECT 1 FROM public.promoter_links WHERE tracking_code = _candidate) THEN
      RETURN _candidate;
    END IF;

    _attempt := _attempt + 1;
    IF _attempt > 10 THEN
      RETURN _name_part || '-' || lower(substring(md5(random()::text || gen_random_uuid()::text), 1, 8));
    END IF;
  END LOOP;
END;
$function$;