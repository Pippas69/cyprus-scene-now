-- Fix infinite recursion in RLS policies for student_discount_redemptions
-- Previous attempt failed because public.business_users does not exist.

-- 1) Ownership helper (no recursion): only checks businesses.user_id
create or replace function public.is_business_owner(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.businesses b
    where b.id = p_business_id
      and b.user_id = auth.uid()
  );
$$;

-- 2) Ensure RLS is enabled
alter table public.student_discount_redemptions enable row level security;

-- 3) Drop any existing policies on this table that might be recursive
do $$
declare pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'student_discount_redemptions'
  loop
    execute format('drop policy if exists %I on public.student_discount_redemptions', pol.policyname);
  end loop;
end $$;

-- 4) Recreate minimal, non-recursive policies
create policy "Business can read student discount redemptions"
on public.student_discount_redemptions
for select
to authenticated
using (public.is_business_owner(business_id));

create policy "Business can create student discount redemptions"
on public.student_discount_redemptions
for insert
to authenticated
with check (public.is_business_owner(business_id));

-- 5) Lock down helper
revoke all on function public.is_business_owner(uuid) from public;
grant execute on function public.is_business_owner(uuid) to authenticated;
