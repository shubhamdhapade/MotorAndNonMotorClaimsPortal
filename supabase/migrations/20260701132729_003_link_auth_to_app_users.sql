/*
# Link Auth Users to App Users and Assign Roles

1. Purpose
- Creates app_users entries for the 6 demo users created in auth.users
- Assigns appropriate roles via user_roles table
- This is needed because the edge function only created auth.users entries

2. Users Created
- admin@motorclaims.com → SYSTEM_ADMIN
- fnol1@motorclaims.com → FNOL_ASSISTANT
- assessor1@motorclaims.com → ASSESSOR_ASSISTANT
- approver1@motorclaims.com → APPROVALS_ASSISTANT
- payments1@motorclaims.com → PAYMENTS_ASSISTANT
- closure1@motorclaims.com → CLOSURE_ASSISTANT

3. Security
- Uses authenticated role for RLS compliance
- Proper user_id to auth.users foreign key relationship
*/

-- Insert app_users for each demo user
INSERT INTO app_users (id, employee_id, full_name, email, department, is_active)
VALUES 
  ('7853194d-5e00-48ab-b018-1f0368fe8ead', 'EMP001', 'System Administrator', 'admin@motorclaims.com', 'IT', true),
  ('84fb36a8-3a92-446c-b9ba-e33cf7781cd5', 'EMP002', 'FNOL Assistant 1', 'fnol1@motorclaims.com', 'FNOL', true),
  ('768d3f2b-74a0-4d29-ba4e-87c0aa2b2e8e', 'EMP003', 'Assessor 1', 'assessor1@motorclaims.com', 'Assessment', true),
  ('1827e3b2-b136-4f40-bd8d-746ccb05078a', 'EMP004', 'Approver 1', 'approver1@motorclaims.com', 'Approvals', true),
  ('7ba9ce86-d3da-4cc9-813f-3d50be0e403e', 'EMP005', 'Payments 1', 'payments1@motorclaims.com', 'Payments', true),
  ('74c84fd2-b9b6-406d-9bd7-c979352187da', 'EMP006', 'Closure 1', 'closure1@motorclaims.com', 'Closure', true)
ON CONFLICT (id) DO NOTHING;

-- Assign roles to users
INSERT INTO user_roles (id, user_id, role_id, assigned_by, assigned_at)
SELECT 
  gen_random_uuid(),
  u.id,
  r.id,
  '7853194d-5e00-48ab-b018-1f0368fe8ead',
  now()
FROM auth.users u
CROSS JOIN roles r
WHERE 
  (u.email = 'admin@motorclaims.com' AND r.code = 'SYSTEM_ADMIN')
  OR (u.email = 'fnol1@motorclaims.com' AND r.code = 'FNOL_ASSISTANT')
  OR (u.email = 'assessor1@motorclaims.com' AND r.code = 'ASSESSOR_ASSISTANT')
  OR (u.email = 'approver1@motorclaims.com' AND r.code = 'APPROVALS_ASSISTANT')
  OR (u.email = 'payments1@motorclaims.com' AND r.code = 'PAYMENTS_ASSISTANT')
  OR (u.email = 'closure1@motorclaims.com' AND r.code = 'CLOSURE_ASSISTANT')
ON CONFLICT DO NOTHING;
