
-- Fix existing data: create missing ghost profiles for merged tickets
DO $$
DECLARE
  rec RECORD;
  v_existing_count int;
  v_profile_first_name text;
  v_profile_name text;
  v_profile_full_name text;
  v_name_matches boolean;
  v_needed int;
  i int;
BEGIN
  -- First pass: create ghosts for tickets with different-case names that got merged
  FOR rec IN
    SELECT 
      t.id as ticket_id,
      t.guest_name,
      t.user_id as buyer_id,
      e.business_id
    FROM tickets t
    JOIN events e ON e.id = t.event_id
    WHERE t.status != 'cancelled'
      AND t.guest_name IS NOT NULL 
      AND trim(t.guest_name) != ''
    ORDER BY e.business_id, t.created_at
  LOOP
    v_name_matches := false;
    IF rec.buyer_id IS NOT NULL THEN
      SELECT p.first_name, p.name, concat_ws(' ', p.first_name, p.last_name)
      INTO v_profile_first_name, v_profile_name, v_profile_full_name
      FROM profiles p WHERE p.id = rec.buyer_id;
      
      IF FOUND THEN
        v_name_matches := (
          normalize_guest_identity(rec.guest_name) = normalize_guest_identity(v_profile_first_name)
          OR normalize_guest_identity(rec.guest_name) = normalize_guest_identity(v_profile_name)
          OR normalize_guest_identity(rec.guest_name) = normalize_guest_identity(v_profile_full_name)
        );
      END IF;
    END IF;
    
    IF v_name_matches THEN
      CONTINUE;
    END IF;
    
    SELECT count(*) INTO v_existing_count
    FROM crm_guests cg
    WHERE cg.business_id = rec.business_id
      AND cg.user_id IS NULL
      AND cg.guest_name = rec.guest_name
      AND cg.profile_type = 'ghost';
    
    IF v_existing_count = 0 THEN
      INSERT INTO crm_guests (business_id, user_id, guest_name, phone, email, profile_type, brought_by_user_id)
      VALUES (rec.business_id, NULL, rec.guest_name, NULL, NULL, 'ghost', rec.buyer_id);
    END IF;
  END LOOP;
  
  -- Second pass: for exact same names with multiple tickets but only 1 ghost
  FOR rec IN
    SELECT 
      e.business_id,
      t.guest_name,
      count(*) as ticket_count,
      (SELECT count(*) FROM crm_guests cg 
       WHERE cg.business_id = e.business_id 
         AND cg.user_id IS NULL 
         AND cg.guest_name = t.guest_name 
         AND cg.profile_type = 'ghost') as ghost_count,
      (t.user_id::text)::uuid as sample_buyer_id
    FROM tickets t
    JOIN events e ON e.id = t.event_id
    WHERE t.status != 'cancelled'
      AND t.guest_name IS NOT NULL
      AND trim(t.guest_name) != ''
      AND NOT (
        t.user_id IS NOT NULL 
        AND EXISTS (
          SELECT 1 FROM profiles pr WHERE pr.id = t.user_id
          AND (
            normalize_guest_identity(t.guest_name) = normalize_guest_identity(pr.first_name)
            OR normalize_guest_identity(t.guest_name) = normalize_guest_identity(pr.name)
            OR normalize_guest_identity(t.guest_name) = normalize_guest_identity(concat_ws(' ', pr.first_name, pr.last_name))
          )
        )
      )
    GROUP BY e.business_id, t.guest_name, t.user_id
    HAVING count(*) > (
      SELECT count(*) FROM crm_guests cg 
      WHERE cg.business_id = e.business_id 
        AND cg.user_id IS NULL 
        AND cg.guest_name = t.guest_name 
        AND cg.profile_type = 'ghost'
    )
  LOOP
    v_needed := rec.ticket_count - rec.ghost_count;
    FOR i IN 1..v_needed LOOP
      INSERT INTO crm_guests (business_id, user_id, guest_name, phone, email, profile_type, brought_by_user_id)
      VALUES (rec.business_id, NULL, rec.guest_name, NULL, NULL, 'ghost', rec.sample_buyer_id);
    END LOOP;
  END LOOP;
END $$;
