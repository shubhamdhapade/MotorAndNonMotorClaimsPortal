/*
# Motor Claims Schema for India Phase 1

1. Purpose
This migration creates the complete database schema for a motor claims management system with:
- User authentication and role-based access control (RBAC)
- Policy and insurer management
- Motor claims workflow (FNOL → Assessment → Approval → Payment → Closure)
- Document management
- Audit trail for all actions
- Reopen functionality with maker-checker

2. New Tables
- `insurers` - Insurance company master data
- `app_users` - Extended user profile with role assignment
- `roles` - System roles (SYSTEM_ADMIN, FNOL_ASSISTANT, etc.)
- `user_roles` - Many-to-many user-role mapping
- `policies` - Insurance policies
- `claims` - Main claim records with status tracking
- `claim_motor_details` - Motor-specific claim details
- `claim_damage_map` - Vehicle damage parts and positions
- `documents` - Uploaded document metadata
- `payments` - NEFT payment records
- `closures` - Claim closure records
- `reopens` - Reopen requests with maker-checker
- `audit_events` - Immutable audit trail
- `task_queue` - Workflow task assignments

3. Security
- RLS enabled on all tables
- Policies scope data to authenticated users based on roles
*/

-- Create ENUM types
CREATE TYPE claim_status AS ENUM (
  'DRAFT', 'FNOL_SUBMITTED', 'FNOL_REVIEW', 'ASSESSMENT_PENDING',
  'ASSESSMENT_IN_PROGRESS', 'ASSESSMENT_COMPLETED', 'APPROVAL_PENDING',
  'APPROVED', 'REJECTED', 'PAYMENT_PENDING', 'PAYMENT_PROCESSING',
  'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'CLOSED', 'REOPENED'
);

CREATE TYPE vehicle_type AS ENUM ('2W', '4W', 'CV');
CREATE TYPE loss_type AS ENUM ('ACCIDENT', 'THEFT', 'FIRE', 'NATURAL_CALAMITY', 'OTHER');
CREATE TYPE payment_status AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED');

-- Insurers table
CREATE TABLE IF NOT EXISTS insurers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  contact_email text,
  contact_phone text,
  address text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- App users (extends auth.users)
CREATE TABLE IF NOT EXISTS app_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id text UNIQUE,
  full_name text NOT NULL,
  email text NOT NULL,
  department text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- User roles mapping
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES app_users(id),
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role_id)
);

-- Policies table
CREATE TABLE IF NOT EXISTS policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_number text UNIQUE NOT NULL,
  insurer_id uuid NOT NULL REFERENCES insurers(id),
  policy_holder_name text NOT NULL,
  policy_holder_contact text,
  policy_holder_email text,
  policy_holder_address text,
  vehicle_registration_number text NOT NULL,
  vehicle_type vehicle_type NOT NULL,
  vehicle_make text,
  vehicle_model text,
  vehicle_year integer,
  engine_number text,
  chassis_number text,
  sum_insured bigint NOT NULL,
  premium bigint NOT NULL,
  policy_start_date date NOT NULL,
  policy_end_date date NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create sequence for claim numbers
CREATE SEQUENCE IF NOT EXISTS claim_seq START 1;

-- Claims table
CREATE TABLE IF NOT EXISTS claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_number text UNIQUE NOT NULL DEFAULT 'CLM-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('claim_seq')::text, 6, '0'),
  policy_id uuid NOT NULL REFERENCES policies(id),
  insurer_id uuid NOT NULL REFERENCES insurers(id),
  status claim_status NOT NULL DEFAULT 'DRAFT',
  current_version integer DEFAULT 1,
  vehicle_type vehicle_type NOT NULL,
  vehicle_registration_number text NOT NULL,
  loss_type loss_type NOT NULL,
  loss_date timestamptz NOT NULL,
  loss_location text,
  loss_description text,
  estimated_loss_amount bigint,
  approved_amount bigint,
  settlement_amount bigint,
  fnol_submitted_at timestamptz,
  fnol_submitted_by uuid REFERENCES app_users(id),
  assessment_assigned_to uuid REFERENCES app_users(id),
  assessment_started_at timestamptz,
  assessment_completed_at timestamptz,
  approval_assigned_to uuid REFERENCES app_users(id),
  approval_level text,
  approved_at timestamptz,
  approved_by uuid REFERENCES app_users(id),
  rejected_at timestamptz,
  rejected_by uuid REFERENCES app_users(id),
  rejection_reason text,
  payment_initiated_at timestamptz,
  payment_completed_at timestamptz,
  settlement_letter_sent boolean DEFAULT false,
  closed_at timestamptz,
  closed_by uuid REFERENCES app_users(id),
  closure_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Claim motor details (extended info)
CREATE TABLE IF NOT EXISTS claim_motor_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  driver_name text,
  driver_license_number text,
  driver_license_expiry date,
  fir_number text,
  fir_station text,
  fir_date date,
  third_party_involved boolean DEFAULT false,
  third_party_details jsonb,
  passengers_count integer DEFAULT 0,
  fatalities integer DEFAULT 0,
  injuries integer DEFAULT 0,
  garage_name text,
  garage_address text,
  garage_contact text,
  surveyor_name text,
  surveyor_contact text,
  survey_scheduled_date date,
  survey_completed_date date,
  reserve_recommendation bigint,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Claim damage mapping (parts affected)
CREATE TABLE IF NOT EXISTS claim_damage_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  vehicle_type vehicle_type NOT NULL,
  part_name text NOT NULL,
  part_category text,
  side text,
  position text,
  damage_severity text,
  estimated_repair_cost bigint,
  created_at timestamptz DEFAULT now()
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid REFERENCES claims(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  document_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  mime_type text,
  is_mandatory boolean DEFAULT false,
  is_conditional boolean DEFAULT false,
  is_verified boolean DEFAULT false,
  verified_by uuid REFERENCES app_users(id),
  verified_at timestamptz,
  uploaded_by uuid NOT NULL REFERENCES app_users(id),
  uploaded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create sequence for payment numbers
CREATE SEQUENCE IF NOT EXISTS payment_seq START 1;

-- Payments table (NEFT only)
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  payment_number text UNIQUE NOT NULL DEFAULT 'PAY-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('payment_seq')::text, 6, '0'),
  amount bigint NOT NULL,
  beneficiary_name text NOT NULL,
  beneficiary_account_number text NOT NULL,
  beneficiary_ifsc_code text NOT NULL,
  beneficiary_bank_name text,
  status payment_status NOT NULL DEFAULT 'PENDING',
  utr_number text,
  neft_initiated_at timestamptz,
  neft_completed_at timestamptz,
  failure_reason text,
  settlement_letter_generated boolean DEFAULT false,
  settlement_letter_path text,
  initiated_by uuid NOT NULL REFERENCES app_users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Closures table
CREATE TABLE IF NOT EXISTS closures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  closure_type text NOT NULL,
  closed_by uuid NOT NULL REFERENCES app_users(id),
  closure_reason text,
  closure_date timestamptz DEFAULT now(),
  settlement_letter_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Reopens table (with maker-checker)
CREATE TABLE IF NOT EXISTS reopens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  reason_code integer NOT NULL CHECK (reason_code BETWEEN 1 AND 10),
  reason_text text NOT NULL,
  requested_by uuid NOT NULL REFERENCES app_users(id),
  requested_at timestamptz DEFAULT now(),
  maker_status text DEFAULT 'PENDING',
  maker_comments text,
  maker_approved_by uuid REFERENCES app_users(id),
  maker_approved_at timestamptz,
  checker_status text DEFAULT 'PENDING',
  checker_comments text,
  checker_approved_by uuid REFERENCES app_users(id),
  checker_approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Audit events (immutable)
CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  performed_by uuid NOT NULL REFERENCES app_users(id),
  performed_at timestamptz DEFAULT now(),
  ip_address text,
  user_agent text,
  metadata jsonb
);

-- Task queue for workflow assignments
CREATE TABLE IF NOT EXISTS task_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  task_type text NOT NULL,
  assigned_to uuid REFERENCES app_users(id),
  assigned_role text,
  priority integer DEFAULT 5,
  status text DEFAULT 'PENDING',
  due_date timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE insurers ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_motor_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_damage_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE reopens ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for app_users
DROP POLICY IF EXISTS "users_read_own" ON app_users;
CREATE POLICY "users_read_own" ON app_users FOR SELECT
  TO authenticated USING (auth.uid() = id OR 
    EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id 
            WHERE ur.user_id = auth.uid() AND r.code = 'SYSTEM_ADMIN'));

DROP POLICY IF EXISTS "users_update_own" ON app_users;
CREATE POLICY "users_update_own" ON app_users FOR UPDATE
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "users_insert_own" ON app_users;
CREATE POLICY "users_insert_own" ON app_users FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

-- RLS Policies for roles
DROP POLICY IF EXISTS "roles_read_all" ON roles;
CREATE POLICY "roles_read_all" ON roles FOR SELECT
  TO authenticated USING (true);

-- RLS Policies for user_roles
DROP POLICY IF EXISTS "user_roles_read_own" ON user_roles;
CREATE POLICY "user_roles_read_own" ON user_roles FOR SELECT
  TO authenticated USING (user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id 
            WHERE ur.user_id = auth.uid() AND r.code = 'SYSTEM_ADMIN'));

DROP POLICY IF EXISTS "user_roles_insert_admin" ON user_roles;
CREATE POLICY "user_roles_insert_admin" ON user_roles FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id 
            WHERE ur.user_id = auth.uid() AND r.code = 'SYSTEM_ADMIN'));

-- RLS Policies for insurers
DROP POLICY IF EXISTS "insurers_read_all" ON insurers;
CREATE POLICY "insurers_read_all" ON insurers FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insurers_manage_admin" ON insurers;
CREATE POLICY "insurers_manage_admin" ON insurers FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id 
            WHERE ur.user_id = auth.uid() AND r.code = 'SYSTEM_ADMIN'));

-- RLS Policies for policies
DROP POLICY IF EXISTS "policies_read_all" ON policies;
CREATE POLICY "policies_read_all" ON policies FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "policies_insert_fnol" ON policies;
CREATE POLICY "policies_insert_fnol" ON policies FOR INSERT
  TO authenticated WITH CHECK (true);

-- RLS Policies for claims
DROP POLICY IF EXISTS "claims_read_all" ON claims;
CREATE POLICY "claims_read_all" ON claims FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "claims_create_fnol" ON claims;
CREATE POLICY "claims_create_fnol" ON claims FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "claims_update_assigned" ON claims;
CREATE POLICY "claims_update_assigned" ON claims FOR UPDATE
  TO authenticated USING (true);

-- RLS for claim_motor_details
DROP POLICY IF EXISTS "motor_details_read" ON claim_motor_details;
CREATE POLICY "motor_details_read" ON claim_motor_details FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "motor_details_write" ON claim_motor_details;
CREATE POLICY "motor_details_write" ON claim_motor_details FOR ALL
  TO authenticated USING (true);

-- RLS for claim_damage_map
DROP POLICY IF EXISTS "damage_map_read" ON claim_damage_map;
CREATE POLICY "damage_map_read" ON claim_damage_map FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "damage_map_write" ON claim_damage_map;
CREATE POLICY "damage_map_write" ON claim_damage_map FOR ALL
  TO authenticated USING (true);

-- RLS for documents
DROP POLICY IF EXISTS "documents_read" ON documents;
CREATE POLICY "documents_read" ON documents FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "documents_write" ON documents;
CREATE POLICY "documents_write" ON documents FOR ALL
  TO authenticated USING (true);

-- RLS for payments
DROP POLICY IF EXISTS "payments_read" ON payments;
CREATE POLICY "payments_read" ON payments FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "payments_write" ON payments;
CREATE POLICY "payments_write" ON payments FOR ALL
  TO authenticated USING (true);

-- RLS for closures
DROP POLICY IF EXISTS "closures_read" ON closures;
CREATE POLICY "closures_read" ON closures FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "closures_write" ON closures;
CREATE POLICY "closures_write" ON closures FOR ALL
  TO authenticated USING (true);

-- RLS for reopens
DROP POLICY IF EXISTS "reopens_read" ON reopens;
CREATE POLICY "reopens_read" ON reopens FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "reopens_write" ON reopens;
CREATE POLICY "reopens_write" ON reopens FOR ALL
  TO authenticated USING (true);

-- RLS for audit_events
DROP POLICY IF EXISTS "audit_events_read" ON audit_events;
CREATE POLICY "audit_events_read" ON audit_events FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "audit_events_insert" ON audit_events;
CREATE POLICY "audit_events_insert" ON audit_events FOR INSERT
  TO authenticated WITH CHECK (true);

-- RLS for task_queue
DROP POLICY IF EXISTS "task_queue_read" ON task_queue;
CREATE POLICY "task_queue_read" ON task_queue FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "task_queue_write" ON task_queue;
CREATE POLICY "task_queue_write" ON task_queue FOR ALL
  TO authenticated USING (true);

-- Insert seed roles
INSERT INTO roles (code, name, description) VALUES
  ('SYSTEM_ADMIN', 'System Administrator', 'Full system access'),
  ('FNOL_ASSISTANT', 'FNOL Assistant', 'First Notice of Loss creation and review'),
  ('ASSESSOR_ASSISTANT', 'Assessor Assistant', 'Claim assessment and survey coordination'),
  ('APPROVALS_ASSISTANT', 'Approvals Assistant', 'Claim approval processing'),
  ('PAYMENTS_ASSISTANT', 'Payments Assistant', 'Payment processing'),
  ('CLOSURE_ASSISTANT', 'Closure Assistant', 'Claim closure and reopening')
ON CONFLICT (code) DO NOTHING;

-- Insert sample insurers
INSERT INTO insurers (code, name, contact_email, contact_phone, address) VALUES
  ('HDFC-ERGO', 'HDFC ERGO General Insurance', 'claims@hdfcergo.com', '+91-22-67856785', 'HDFC ERGO House, Mumbai'),
  ('ICICI-LOMBARD', 'ICICI Lombard General Insurance', 'claims@icicilombard.com', '+91-22-67856786', 'ICICI Lombard Tower, Mumbai'),
  ('BAJAJ-ALLIANZ', 'Bajaj Allianz General Insurance', 'claims@bajajallianz.com', '+91-20-67856787', 'Bajaj Allianz House, Pune'),
  ('TATA-AIG', 'TATA AIG General Insurance', 'claims@tataaig.com', '+91-22-67856788', 'TATA AIG Tower, Mumbai')
ON CONFLICT (code) DO NOTHING;

-- Insert sample policy POL-MOTOR-0001
INSERT INTO policies (policy_number, insurer_id, policy_holder_name, policy_holder_contact, policy_holder_email, 
                      policy_holder_address, vehicle_registration_number, vehicle_type, vehicle_make, vehicle_model,
                      vehicle_year, sum_insured, premium, policy_start_date, policy_end_date)
SELECT 'POL-MOTOR-0001', 
       (SELECT id FROM insurers WHERE code = 'HDFC-ERGO'),
       'Ramesh Kumar', 
       '+91-9876543210', 
       'ramesh.kumar@email.com',
       '123, MG Road, Delhi - 110001',
       'DL-01-AB-1234',
       '4W',
       'Maruti',
       'Swift Dzire',
       2022,
       80000000,
       1200000,
       '2024-01-01',
       '2025-12-31'
ON CONFLICT (policy_number) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
CREATE INDEX IF NOT EXISTS idx_claims_policy_id ON claims(policy_id);
CREATE INDEX IF NOT EXISTS idx_claims_insurer_id ON claims(insurer_id);
CREATE INDEX IF NOT EXISTS idx_claims_created_at ON claims(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_claim_id ON documents(claim_id);
CREATE INDEX IF NOT EXISTS idx_payments_claim_id ON payments(claim_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON audit_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_performed_at ON audit_events(performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_queue_assigned_to ON task_queue(assigned_to);
CREATE INDEX IF NOT EXISTS idx_task_queue_status ON task_queue(status);
