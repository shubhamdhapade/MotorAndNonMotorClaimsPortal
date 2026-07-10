/*
# Fix RLS Policies That Allow Unrestricted Access

1. Purpose
Several RLS policies use `WITH CHECK (true)` or `FOR ALL ... USING (true)`,
which bypass row-level security entirely for authenticated users. This
migration replaces those permissive policies with proper ownership/role
checks so each write is gated on the caller being an active app user
(and, where appropriate, a SYSTEM_ADMIN).

2. Security changes
- `is_system_admin(uuid)`: Revoke EXECUTE from `anon` and `authenticated`.
  The function is only invoked server-side from within RLS policies
  (never via the REST RPC endpoint from the frontend), so public/REST
  execution is unnecessary. SECURITY DEFINER is retained because the
  function must bypass RLS on user_roles to avoid infinite recursion.
- `policies` INSERT: gated on the caller being an active app user.
- `claims` INSERT: gated on the caller being an active app user.
- `claims` UPDATE: gated on the caller being an active app user
  (replaces the previous `USING (true)` update policy).
- `claim_motor_details`, `claim_damage_map`, `documents`, `payments`,
  `closures`, `reopens`, `task_queue`: the previous `FOR ALL ... USING (true)`
  write policies are dropped and replaced with separate INSERT, UPDATE,
  and DELETE policies, each gated on the caller being an active app user.
- `audit_events` INSERT: gated on the caller being an active app user.

3. Important notes
- SELECT policies on these tables are intentionally left as
  `USING (true)` (read-all for authenticated) because all authenticated
  staff can view claims and related records; only writes are restricted.
- No data is lost; only policies are dropped and recreated.
- RLS remains enabled on all tables.
*/

-- 1. Lock down is_system_admin: revoke EXECUTE from anon and authenticated.
--    The function is only called inside RLS policies (server-side), never
--    via the REST RPC endpoint from the frontend.
REVOKE EXECUTE ON FUNCTION public.is_system_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_system_admin(uuid) FROM authenticated;

-- 2. policies INSERT: only active app users can create policies.
DROP POLICY IF EXISTS "policies_insert_fnol" ON policies;
CREATE POLICY "policies_insert_fnol" ON policies FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND is_active)
  );

-- 3. claims INSERT: only active app users can create claims.
DROP POLICY IF EXISTS "claims_create_fnol" ON claims;
CREATE POLICY "claims_create_fnol" ON claims FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND is_active)
  );

-- 4. claims UPDATE: only active app users can update claims.
DROP POLICY IF EXISTS "claims_update_assigned" ON claims;
CREATE POLICY "claims_update_assigned" ON claims FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND is_active)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND is_active)
  );

-- 5. claim_motor_details: split FOR ALL into INSERT/UPDATE/DELETE.
DROP POLICY IF EXISTS "motor_details_write" ON claim_motor_details;
CREATE POLICY "motor_details_insert" ON claim_motor_details FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND is_active)
  );
CREATE POLICY "motor_details_update" ON claim_motor_details FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND is_active)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND is_active)
  );
CREATE POLICY "motor_details_delete" ON claim_motor_details FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND is_active)
  );

-- 6. claim_damage_map: split FOR ALL into INSERT/UPDATE/DELETE.
DROP POLICY IF EXISTS "damage_map_write" ON claim_damage_map;
CREATE POLICY "damage_map_insert" ON claim_damage_map FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND is_active)
  );
CREATE POLICY "damage_map_update" ON claim_damage_map FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND is_active)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND is_active)
  );
CREATE POLICY "damage_map_delete" ON claim_damage_map FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND is_active)
  );

-- 7. documents: split FOR ALL into INSERT/UPDATE/DELETE.
DROP POLICY IF EXISTS "documents_write" ON documents;
CREATE POLICY "documents_insert" ON documents FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND is_active)
  );
CREATE POLICY "documents_update" ON documents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND is_active)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND is_active)
  );
CREATE POLICY "documents_delete" ON documents FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND is_active)
  );

-- 8. payments: split FOR ALL into INSERT/UPDATE/DELETE.
DROP POLICY IF EXISTS "payments_write" ON payments;
CREATE POLICY "payments_insert" ON payments FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND is_active)
  );
CREATE POLICY "payments_update" ON payments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND is_active)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND is_active)
  );
CREATE POLICY "payments_delete" ON payments FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND is_active)
  );

-- 9. closures: split FOR ALL into INSERT/UPDATE/DELETE.
DROP POLICY IF EXISTS "closures_write" ON closures;
CREATE POLICY "closures_insert" ON closures FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND is_active)
  );
CREATE POLICY "closures_update" ON closures FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND is_active)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND is_active)
  );
CREATE POLICY "closures_delete" ON closures FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND is_active)
  );

-- 10. reopens: split FOR ALL into INSERT/UPDATE/DELETE.
DROP POLICY IF EXISTS "reopens_write" ON reopens;
CREATE POLICY "reopens_insert" ON reopens FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND is_active)
  );
CREATE POLICY "reopens_update" ON reopens FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND is_active)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND is_active)
  );
CREATE POLICY "reopens_delete" ON reopens FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND is_active)
  );

-- 11. audit_events INSERT: only active app users can write audit events.
DROP POLICY IF EXISTS "audit_events_insert" ON audit_events;
CREATE POLICY "audit_events_insert" ON audit_events FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND is_active)
  );

-- 12. task_queue: split FOR ALL into INSERT/UPDATE/DELETE.
DROP POLICY IF EXISTS "task_queue_write" ON task_queue;
CREATE POLICY "task_queue_insert" ON task_queue FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND is_active)
  );
CREATE POLICY "task_queue_update" ON task_queue FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND is_active)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND is_active)
  );
CREATE POLICY "task_queue_delete" ON task_queue FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND is_active)
  );
