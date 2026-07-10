/*
# Revoke PUBLIC EXECUTE on is_system_admin

1. Purpose
The `is_system_admin(uuid)` SECURITY DEFINER function still grants EXECUTE
to the implicit PUBLIC role (the default `=X/postgres` ACL entry). Every
role — including `anon` and `authenticated` — inherits the PUBLIC grant,
so the function remained callable via `/rest/v1/rpc/is_system_admin` by
unauthenticated and authenticated users even after the previous migration
revoked the explicit `anon`/`authenticated` grants.

2. Security changes
- `REVOKE EXECUTE ON FUNCTION public.is_system_admin(uuid) FROM PUBLIC;`
  removes the inherited PUBLIC grant. Only `postgres` and `service_role`
  retain EXECUTE. The function is only invoked server-side from within
  RLS policies, never via the REST RPC endpoint from the frontend.
- SECURITY DEFINER is retained because the function must bypass RLS on
  user_roles to avoid the infinite recursion fixed in migration 004.

3. Important notes
- No data is lost; only function grants are changed.
- RLS policies that call `is_system_admin(auth.uid())` continue to work
  because policies execute with the table owner's privileges, not the
  caller's function grants.
*/

REVOKE EXECUTE ON FUNCTION public.is_system_admin(uuid) FROM PUBLIC;
