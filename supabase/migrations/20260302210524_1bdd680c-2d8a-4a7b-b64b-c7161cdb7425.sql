-- Drop and recreate function to fix return type issue
DROP FUNCTION IF EXISTS public.get_audience_demographics(uuid, timestamptz, timestamptz);

CREATE OR REPLACE FUNCTION public.get_audience_demographics(
    p_business_id uuid,
    p_start_date timestamptz DEFAULT NULL,
    p_end_date timestamptz DEFAULT NULL
)
RETURNS TABLE (
    age_group text,
    gender text,
    city text,
    visit_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_start_date timestamptz;
    v_end_date timestamptz;
    v_user_id uuid;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM businesses WHERE id = p_business_id AND user_id = v_user_id
        ) AND NOT EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = v_user_id AND role = 'admin'
        ) THEN
            RAISE EXCEPTION 'Access denied: You do not own this business';
        END IF;
    END IF;

    v_start_date := COALESCE(p_start_date, NOW() - INTERVAL '1 year');
    v_end_date := COALESCE(p_end_date, NOW());

    WITH all_visits AS (
        -- 1) Ticket check-ins
        SELECT t.user_id, 1 AS visit_count
        FROM tickets t
        JOIN events e ON t.event_id = e.id
        WHERE e.business_id = p_business_id
          AND t.checked_in_at IS NOT NULL
          AND t.checked_in_at >= v_start_date
          AND t.checked_in_at <= v_end_date

        UNION ALL

        -- 2) Offer redemptions
        SELECT op.user_id, 1 AS visit_count
        FROM offer_purchases op
        WHERE op.business_id = p_business_id
          AND op.redeemed_at IS NOT NULL
          AND op.redeemed_at >= v_start_date
          AND op.redeemed_at <= v_end_date

        UNION ALL

        -- 3) Reservation check-ins (excluding offer-linked AND ticket-linked)
        SELECT r.user_id, 1 AS visit_count
        FROM reservations r
        LEFT JOIN events e ON r.event_id = e.id
        WHERE (r.business_id = p_business_id OR e.business_id = p_business_id)
          AND r.checked_in_at IS NOT NULL
          AND r.checked_in_at >= v_start_date
          AND r.checked_in_at <= v_end_date
          AND NOT EXISTS (
            SELECT 1 FROM offer_purchases op2
            WHERE op2.reservation_id = r.id
          )
          AND NOT (LOWER(COALESCE(r.special_requests, '')) LIKE '%offer claim:%')
          -- Exclude auto-created-from-tickets reservations (already counted in section 1)
          AND COALESCE(r.auto_created_from_tickets, false) = false

        UNION ALL

        -- 4) Student discount redemptions
        SELECT sv.user_id, 1 AS visit_count
        FROM student_discount_redemptions sdr
        JOIN student_verifications sv ON sdr.student_verification_id = sv.id
        WHERE sdr.business_id = p_business_id
          AND sdr.created_at >= v_start_date
          AND sdr.created_at <= v_end_date
    ),
    user_visit_counts AS (
        SELECT user_id, SUM(visit_count) AS weight
        FROM all_visits
        WHERE user_id IS NOT NULL
        GROUP BY user_id
    ),
    demographics AS (
        SELECT
            p.id,
            CASE
                WHEN p.age IS NULL THEN 'Unknown'
                WHEN p.age < 18 THEN 'Under 18'
                WHEN p.age BETWEEN 18 AND 24 THEN '18-24'
                WHEN p.age BETWEEN 25 AND 34 THEN '25-34'
                WHEN p.age BETWEEN 35 AND 44 THEN '35-44'
                WHEN p.age BETWEEN 45 AND 54 THEN '45-54'
                ELSE '55+'
            END AS age_group,
            COALESCE(p.gender, 'Unknown') AS gender,
            COALESCE(p.city, 'Unknown') AS city,
            uvc.weight AS visit_count
        FROM user_visit_counts uvc
        JOIN profiles p ON p.id = uvc.user_id
    )
    SELECT
        d.age_group,
        d.gender,
        d.city,
        SUM(d.visit_count) AS visit_count
    FROM demographics d
    GROUP BY d.age_group, d.gender, d.city
    ORDER BY visit_count DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_audience_demographics TO authenticated, service_role;