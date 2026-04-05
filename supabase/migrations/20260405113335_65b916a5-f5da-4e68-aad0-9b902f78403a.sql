
-- ============================================================
-- S1: Block is_admin self-escalation via trigger
-- ============================================================
-- This trigger prevents non-admin users from modifying sensitive
-- fields on their own profile (is_admin, suspended, etc.)

CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If the user is updating their OWN profile (not an admin action)
  -- revert any changes to sensitive fields
  IF NOT has_role(auth.uid(), 'admin') THEN
    NEW.is_admin := OLD.is_admin;
    NEW.suspended := OLD.suspended;
    NEW.suspended_at := OLD.suspended_at;
    NEW.suspended_by := OLD.suspended_by;
    NEW.suspension_reason := OLD.suspension_reason;
    NEW.reservation_restricted_until := OLD.reservation_restricted_until;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Attach trigger to profiles table
DROP TRIGGER IF EXISTS protect_sensitive_fields_trigger ON public.profiles;
CREATE TRIGGER protect_sensitive_fields_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_sensitive_profile_fields();

-- ============================================================
-- S2: Tighten Realtime channel policy
-- ============================================================
-- Drop old policy and create a more explicit one
DROP POLICY IF EXISTS "Users can read their own realtime messages" ON realtime.messages;

CREATE POLICY "Users can read their own realtime messages"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Public channels anyone can subscribe to
  extension LIKE 'realtime:public:events%'
  OR extension LIKE 'realtime:public:business_posts%'
  OR extension LIKE 'realtime:public:event_posts%'
  OR extension LIKE 'realtime:public:rsvps%'
  OR extension LIKE 'realtime:public:post_reactions%'
  -- User-specific channels (must contain the user's own ID)
  OR extension LIKE ('%' || auth.uid()::text || '%')
);
