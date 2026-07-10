/*
# Create Seed Users

1. Purpose
Creates seed users for testing the motor claims application with Supabase auth.
Each user is assigned a specific role for RBAC testing.

2. Users Created
- admin@motorclaims.com (SYSTEM_ADMIN)
- fnol1@motorclaims.com (FNOL_ASSISTANT)
- assessor1@motorclaims.com (ASSESSOR_ASSISTANT)
- approver1@motorclaims.com (APPROVALS_ASSISTANT)
- payments1@motorclaims.com (PAYMENTS_ASSISTANT)
- closure1@motorclaims.com (CLOSURE_ASSISTANT)

All passwords: admin123

3. Notes
- Uses raw_app_meta_data for role assignment (immutable by user)
- Creates app_users profile entries
- Assigns roles in user_roles table
*/

-- Create function to create users (to be called manually in Supabase dashboard or via API)
-- For now, create app_users entries that will be linked after auth.users creation

-- Insert app_users entries (these will be linked after user signup)
-- Note: actual auth.users must be created via Supabase auth API
-- The IDs below are placeholder - actual IDs come from auth.users

DO $$
DECLARE
  admin_id uuid;
  fnol_id uuid;
  assessor_id uuid;
  approver_id uuid;
  payments_id uuid;
  closure_id uuid;
BEGIN
  -- Check if users exist in auth.users and create app_users entries
  SELECT id INTO admin_id FROM auth.users WHERE email = 'admin@motorclaims.com' LIMIT 1;
  IF admin_id IS NOT NULL THEN
    INSERT INTO app_users (id, employee_id, full_name, email, department, is_active)
    VALUES (admin_id, 'EMP001', 'System Admin', 'admin@motorclaims.com', 'IT', true)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  SELECT id INTO fnol_id FROM auth.users WHERE email = 'fnol1@motorclaims.com' LIMIT 1;
  IF fnol_id IS NOT NULL THEN
    INSERT INTO app_users (id, employee_id, full_name, email, department, is_active)
    VALUES (fnol_id, 'EMP002', 'FNOL User One', 'fnol1@motorclaims.com', 'Claims', true)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  SELECT id INTO assessor_id FROM auth.users WHERE email = 'assessor1@motorclaims.com' LIMIT 1;
  IF assessor_id IS NOT NULL THEN
    INSERT INTO app_users (id, employee_id, full_name, email, department, is_active)
    VALUES (assessor_id, 'EMP003', 'Assessor User One', 'assessor1@motorclaims.com', 'Assessment', true)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  SELECT id INTO approver_id FROM auth.users WHERE email = 'approver1@motorclaims.com' LIMIT 1;
  IF approver_id IS NOT NULL THEN
    INSERT INTO app_users (id, employee_id, full_name, email, department, is_active)
    VALUES (approver_id, 'EMP004', 'Approver User One', 'approver1@motorclaims.com', 'Approvals', true)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  SELECT id INTO payments_id FROM auth.users WHERE email = 'payments1@motorclaims.com' LIMIT 1;
  IF payments_id IS NOT NULL THEN
    INSERT INTO app_users (id, employee_id, full_name, email, department, is_active)
    VALUES (payments_id, 'EMP005', 'Payments User One', 'payments1@motorclaims.com', 'Payments', true)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  SELECT id INTO closure_id FROM auth.users WHERE email = 'closure1@motorclaims.com' LIMIT 1;
  IF closure_id IS NOT NULL THEN
    INSERT INTO app_users (id, employee_id, full_name, email, department, is_active)
    VALUES (closure_id, 'EMP006', 'Closure User One', 'closure1@motorclaims.com', 'Closure', true)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Assign roles
  IF admin_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role_id)
    SELECT admin_id, id FROM roles WHERE code = 'SYSTEM_ADMIN'
    ON CONFLICT (user_id, role_id) DO NOTHING;
  END IF;

  IF fnol_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role_id)
    SELECT fnol_id, id FROM roles WHERE code = 'FNOL_ASSISTANT'
    ON CONFLICT (user_id, role_id) DO NOTHING;
  END IF;

  IF assessor_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role_id)
    SELECT assessor_id, id FROM roles WHERE code = 'ASSESSOR_ASSISTANT'
    ON CONFLICT (user_id, role_id) DO NOTHING;
  END IF;

  IF approver_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role_id)
    SELECT approver_id, id FROM roles WHERE code = 'APPROVALS_ASSISTANT'
    ON CONFLICT (user_id, role_id) DO NOTHING;
  END IF;

  IF payments_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role_id)
    SELECT payments_id, id FROM roles WHERE code = 'PAYMENTS_ASSISTANT'
    ON CONFLICT (user_id, role_id) DO NOTHING;
  END IF;

  IF closure_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role_id)
    SELECT closure_id, id FROM roles WHERE code = 'CLOSURE_ASSISTANT'
    ON CONFLICT (user_id, role_id) DO NOTHING;
  END IF;
END $$;
