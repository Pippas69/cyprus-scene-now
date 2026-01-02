-- Add suspended field to profiles for user management
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS suspended boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS suspended_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS suspended_by uuid,
ADD COLUMN IF NOT EXISTS suspension_reason text;

-- Create index for efficient querying of suspended users
CREATE INDEX IF NOT EXISTS idx_profiles_suspended ON public.profiles(suspended) WHERE suspended = true;

-- Add RLS policy for admins to update suspension status
CREATE POLICY "Admins can update user suspension status"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create a function to suspend/unsuspend users with audit logging
CREATE OR REPLACE FUNCTION public.admin_set_user_suspension(
  target_user_id uuid,
  is_suspended boolean,
  reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_id uuid;
  old_suspended boolean;
BEGIN
  -- Get the admin user id
  admin_id := auth.uid();
  
  -- Verify the caller is an admin
  IF NOT has_role(admin_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can suspend users';
  END IF;
  
  -- Get current suspension status
  SELECT suspended INTO old_suspended FROM profiles WHERE id = target_user_id;
  
  -- Update the user's suspension status
  UPDATE profiles
  SET 
    suspended = is_suspended,
    suspended_at = CASE WHEN is_suspended THEN now() ELSE NULL END,
    suspended_by = CASE WHEN is_suspended THEN admin_id ELSE NULL END,
    suspension_reason = CASE WHEN is_suspended THEN reason ELSE NULL END,
    updated_at = now()
  WHERE id = target_user_id;
  
  -- Log the action in audit log
  INSERT INTO admin_audit_log (
    admin_user_id,
    action_type,
    entity_type,
    entity_id,
    old_value,
    new_value
  ) VALUES (
    admin_id,
    CASE WHEN is_suspended THEN 'suspend_user' ELSE 'unsuspend_user' END,
    'profile',
    target_user_id,
    jsonb_build_object('suspended', old_suspended),
    jsonb_build_object('suspended', is_suspended, 'reason', reason)
  );
  
  RETURN true;
END;
$$;

-- Grant execute permission to authenticated users (function checks admin role internally)
GRANT EXECUTE ON FUNCTION public.admin_set_user_suspension TO authenticated;