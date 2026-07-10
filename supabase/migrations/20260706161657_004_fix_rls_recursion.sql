/*
# Fix RLS Infinite Recursion on user_roles and app_users

1. Purpose
The existing RLS policies on `user_roles` and `app_users` query `user_roles`
from within their own SELECT policies, causing infinite recursion
("infinite recursion detected in policy for relation user_roles").
This prevents the app from loading user profiles and roles after login,
so the post-login redirect to /dashboard never succeeds.

2. Changes
- Create a SECURITY DEFINER function `is_system_admin(uid uuid)` that
  checks whether a user has the SYSTEM_ADMIN role. SECURITY DEFINER
  runs with the function owner's privileges, bypassing RLS on user_roles,
  which breaks the recursion.
- Replace the recursive `user_roles_read_own` SELECT policy with one
  that uses `is_system_admin(auth.uid())` instead of a self-referencing
  subquery on user_roles.
- Replace the recursive `users_read_own` SELECT policy on app_users with
  one that uses `is_system_admin(auth.uid())`.
- Replace the `user_roles_insert_admin` INSERT policy similarly.
- Replace the `insurers_manage_admin` FOR ALL policy similarly.

3. Security
- No data is lost; only policies are dropped and recreated.
- The SECURITY DEFINER function is owned by the postgres user and only
  reads from user_roles/roles — it does not expose data beyond a boolean.
- RLS remains enabled on all tables.
*/

-- Create a SECURITY DEFINER function to check SYSTEM_ADMIN role without RLS recursion
CREATE OR REPLACE FUNCTION public.is_system_admin(check_uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = check_uid
      AND r.code = 'SYSTEM_ADMIN'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_system_admin(uuid) TO authenticated;

-- Fix user_roles SELECT policy (was self-referencing, causing infinite recursion)
DROP POLICY IF EXISTS "user_roles_read_own" ON user_roles;
CREATE POLICY "user_roles_read_own" ON user_roles FOR SELECT
  TO authenticated USING (
    user_id = auth.uid() OR public.is_system_admin(auth.uid())
  );

-- Fix user_roles INSERT policy (was self-referencing, causing infinite recursion)
DROP POLICY IF EXISTS "user_roles_insert_admin" ON user_roles;
CREATE POLICY "user_roles_insert_admin" ON user_roles FOR INSERT
  TO authenticated WITH CHECK (public.is_system_admin(auth.uid()));

-- Fix app_users SELECT policy (was querying user_roles, causing recursion)
DROP POLICY IF EXISTS "users_read_own" ON app_users;
CREATE POLICY "users_read_own" ON app_users FOR SELECT
  TO authenticated USING (
    auth.uid() = id OR public.is_system_admin(auth.uid())
  );

-- Fix insurers manage policy (was querying user_roles, causing recursion)
DROP POLICY IF EXISTS "insurers_manage_admin" ON insurers;
CREATE POLICY "insurers_manage_admin" ON insurers FOR ALL
  TO authenticated USING (public.is_system_admin(auth.uid()))
  WITH CHECK (public.is_system_admin(auth.uid()));
