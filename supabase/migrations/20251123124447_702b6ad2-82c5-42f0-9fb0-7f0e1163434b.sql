-- ============================================================================
-- PHASE 1: CRITICAL SECURITY FIXES
-- ============================================================================

-- 1.1: Create User Roles System (SEPARATE from profiles table)
-- ============================================================================

-- Create app_role enum if not exists
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Migrate existing admin users from profiles.is_admin to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM public.profiles
WHERE is_admin = true
ON CONFLICT (user_id, role) DO NOTHING;

-- Drop existing policies if they exist
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
    DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;
    DROP POLICY IF EXISTS "Only admins can update roles" ON public.user_roles;
    DROP POLICY IF EXISTS "Only admins can delete roles" ON public.user_roles;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

-- Create RLS policies for user_roles
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Only admins can insert roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 1.2: Fix Profile Email Exposure with Public View
-- ============================================================================

-- Create public_profiles view (exposes only safe fields)
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id, 
  name, 
  first_name, 
  last_name, 
  avatar_url, 
  city, 
  town,
  interests,
  created_at,
  updated_at
FROM public.profiles;

-- Grant access to view
GRANT SELECT ON public.public_profiles TO authenticated, anon;

-- 1.3: Create Admin Audit Log Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    action_type text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    old_value jsonb,
    new_value jsonb,
    ip_address text,
    user_agent text,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ BEGIN
    DROP POLICY IF EXISTS "Only admins can view audit log" ON public.admin_audit_log;
    DROP POLICY IF EXISTS "Authenticated can insert audit log" ON public.admin_audit_log;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

-- Only admins can view audit log
CREATE POLICY "Only admins can view audit log"
ON public.admin_audit_log FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Authenticated users can insert (logged actions)
CREATE POLICY "Authenticated can insert audit log"
ON public.admin_audit_log FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = admin_user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_log_admin ON public.admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.admin_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.admin_audit_log(created_at DESC);

-- 1.4: Enhance Reports Table for Content Moderation
-- ============================================================================

-- Add new columns to existing reports table
DO $$ BEGIN
    -- Add description column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reports' AND column_name = 'description') THEN
        ALTER TABLE public.reports ADD COLUMN description text;
    END IF;
    
    -- Add status column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reports' AND column_name = 'status') THEN
        ALTER TABLE public.reports ADD COLUMN status text DEFAULT 'pending';
    END IF;
    
    -- Add admin_notes column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reports' AND column_name = 'admin_notes') THEN
        ALTER TABLE public.reports ADD COLUMN admin_notes text;
    END IF;
    
    -- Add reviewed_by column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reports' AND column_name = 'reviewed_by') THEN
        ALTER TABLE public.reports ADD COLUMN reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
    
    -- Add updated_at column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reports' AND column_name = 'updated_at') THEN
        ALTER TABLE public.reports ADD COLUMN updated_at timestamptz DEFAULT now();
    END IF;
END $$;

-- Drop existing policies if they exist
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can create reports" ON public.reports;
    DROP POLICY IF EXISTS "Users can view own reports or admins can view all" ON public.reports;
    DROP POLICY IF EXISTS "Only admins can update reports" ON public.reports;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

-- Users can create reports
CREATE POLICY "Users can create reports"
ON public.reports FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can view own reports, admins can view all
CREATE POLICY "Users can view own reports or admins can view all"
ON public.reports FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Only admins can update reports
CREATE POLICY "Only admins can update reports"
ON public.reports FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_entity ON public.reports(entity_type, entity_id);

-- 1.5: Create Featured Content Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.featured_content (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    start_date timestamptz NOT NULL,
    end_date timestamptz NOT NULL,
    weight integer DEFAULT 1,
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE (entity_type, entity_id)
);

ALTER TABLE public.featured_content ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ BEGIN
    DROP POLICY IF EXISTS "Public can view active featured content" ON public.featured_content;
    DROP POLICY IF EXISTS "Only admins can insert featured content" ON public.featured_content;
    DROP POLICY IF EXISTS "Only admins can update featured content" ON public.featured_content;
    DROP POLICY IF EXISTS "Only admins can delete featured content" ON public.featured_content;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

-- Public can view active featured content
CREATE POLICY "Public can view active featured content"
ON public.featured_content FOR SELECT
TO authenticated, anon
USING (start_date <= now() AND end_date >= now());

-- Only admins can manage featured content
CREATE POLICY "Only admins can insert featured content"
ON public.featured_content FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update featured content"
ON public.featured_content FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete featured content"
ON public.featured_content FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_featured_content_dates ON public.featured_content(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_featured_content_entity ON public.featured_content(entity_type, entity_id);