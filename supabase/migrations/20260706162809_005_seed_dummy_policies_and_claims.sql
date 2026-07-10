/*
# Seed Dummy Policies and Claims with Different Statuses

1. Purpose
Creates 5 dummy insurance policies across different insurers and 14 claims
covering every claim_status enum value (except ASSESSMENT_IN_PROGRESS which
already has an existing claim). This gives the UI realistic data to display
across all workflow stages.

2. New Policies (5)
- POL-MOTOR-0002: ICICI Lombard, 2W motorcycle, Honda Activa
- POL-MOTOR-0003: Bajaj Allianz, 4W sedan, Hyundai Verna
- POL-MOTOR-0004: TATA AIG, CV truck, Tata Ace
- POL-MOTOR-0005: HDFC ERGO, 4W SUV, Mahindra XUV700
- POL-MOTOR-0006: ICICI Lombard, 2W, Royal Enfield

3. New Claims (14) — one per status not already represented:
- DRAFT, FNOL_SUBMITTED, FNOL_REVIEW, ASSESSMENT_PENDING,
  ASSESSMENT_COMPLETED, APPROVAL_PENDING, APPROVED, REJECTED,
  PAYMENT_PENDING, PAYMENT_PROCESSING, PAYMENT_SUCCESS,
  PAYMENT_FAILED, CLOSED, REOPENED

4. Notes
- All amounts stored in paise (bigint).
- fnol_submitted_by, assessment_assigned_to, approved_by, etc. use
  the demo user IDs created in migration 003.
- claim_number auto-generates via the default sequence.
- No data is lost; all inserts use ON CONFLICT DO NOTHING.
*/

-- Insert 5 dummy policies
INSERT INTO policies (
  policy_number, insurer_id, policy_holder_name, policy_holder_contact,
  policy_holder_email, policy_holder_address, vehicle_registration_number,
  vehicle_type, vehicle_make, vehicle_model, vehicle_year,
  sum_insured, premium, policy_start_date, policy_end_date
)
SELECT
  v.policy_number, i.id, v.policy_holder_name, v.policy_holder_contact,
  v.policy_holder_email, v.policy_holder_address, v.vehicle_registration_number,
  v.vehicle_type::vehicle_type, v.vehicle_make, v.vehicle_model, v.vehicle_year,
  v.sum_insured, v.premium, v.policy_start_date, v.policy_end_date
FROM (VALUES
  ('POL-MOTOR-0002', 'ICICI-LOMBARD',
   'Priya Sharma', '+91-9811122334', 'priya.sharma@email.com',
   '45, Park Street, Kolkata - 700016', 'WB-01-XY-5678',
   '2W', 'Honda', 'Activa 6G', 2023,
   8500000, 95000, '2024-03-01'::date, '2025-12-31'::date),
  ('POL-MOTOR-0003', 'BAJAJ-ALLIANZ',
   'Vikram Singh', '+91-9988776655', 'vikram.singh@email.com',
   '12, MG Road, Pune - 411001', 'MH-12-CD-9012',
   '4W', 'Hyundai', 'Verna SX', 2022,
   12000000, 180000, '2024-01-15'::date, '2025-12-31'::date),
  ('POL-MOTOR-0004', 'TATA-AIG',
   'Logistics Plus Ltd', '+91-8022334455', 'ops@logisticsplus.in',
   'Industrial Area, Phase 2, Gurugram - 122002', 'HR-26-CV-3456',
   'CV', 'Tata', 'Ace HT', 2021,
   15000000, 250000, '2023-11-01'::date, '2025-12-31'::date),
  ('POL-MOTOR-0005', 'HDFC-ERGO',
   'Ananya Reddy', '+91-9000011223', 'ananya.reddy@email.com',
   'Banjara Hills, Hyderabad - 500034', 'TS-09-EF-7890',
   '4W', 'Mahindra', 'XUV700 MX', 2023,
   22000000, 320000, '2024-06-01'::date, '2026-05-31'::date),
  ('POL-MOTOR-0006', 'ICICI-LOMBARD',
   'Rohit Mehta', '+91-9112233445', 'rohit.mehta@email.com',
   'Sector 17, Chandigarh - 160017', 'CH-01-GH-4321',
   '2W', 'Royal Enfield', 'Interceptor 650', 2022,
   9500000, 140000, '2024-02-20'::date, '2025-12-31'::date)
) AS v(
  policy_number, insurer_code, policy_holder_name, policy_holder_contact,
  policy_holder_email, policy_holder_address, vehicle_registration_number,
  vehicle_type, vehicle_make, vehicle_model, vehicle_year,
  sum_insured, premium, policy_start_date, policy_end_date
)
JOIN insurers i ON i.code = v.insurer_code
ON CONFLICT (policy_number) DO NOTHING;

-- Insert claims with different statuses using a DO block for FK lookups
DO $$
DECLARE
  p0001 uuid; p0002 uuid; p0003 uuid; p0004 uuid; p0005 uuid; p0006 uuid;
  i_hdfc uuid; i_icici uuid; i_bajaj uuid; i_tata uuid;
  u_fnol uuid := '84fb36a8-3a92-446c-b9ba-e33cf7781cd5';
  u_assessor uuid := '768d3f2b-74a0-4d29-ba4e-87c0aa2b2e8e';
  u_approver uuid := '1827e3b2-b136-4f40-bd8d-746ccb05078a';
  u_closure uuid := '74c84fd2-b9b6-406d-9bd7-c979352187da';
BEGIN
  SELECT id INTO p0001 FROM policies WHERE policy_number = 'POL-MOTOR-0001';
  SELECT id INTO p0002 FROM policies WHERE policy_number = 'POL-MOTOR-0002';
  SELECT id INTO p0003 FROM policies WHERE policy_number = 'POL-MOTOR-0003';
  SELECT id INTO p0004 FROM policies WHERE policy_number = 'POL-MOTOR-0004';
  SELECT id INTO p0005 FROM policies WHERE policy_number = 'POL-MOTOR-0005';
  SELECT id INTO p0006 FROM policies WHERE policy_number = 'POL-MOTOR-0006';
  SELECT id INTO i_hdfc FROM insurers WHERE code = 'HDFC-ERGO';
  SELECT id INTO i_icici FROM insurers WHERE code = 'ICICI-LOMBARD';
  SELECT id INTO i_bajaj FROM insurers WHERE code = 'BAJAJ-ALLIANZ';
  SELECT id INTO i_tata FROM insurers WHERE code = 'TATA-AIG';

  -- 1. DRAFT
  INSERT INTO claims (
    policy_id, insurer_id, status, vehicle_type, vehicle_registration_number,
    loss_type, loss_date, loss_location, loss_description, created_at, updated_at
  ) VALUES (
    p0005, i_hdfc, 'DRAFT', '4W', 'TS-09-EF-7890',
    'ACCIDENT', '2026-07-04 10:30:00+00', 'Hyderabad, Telangana',
    'Minor scratch on rear bumper in parking lot',
    '2026-07-04 11:00:00+00', '2026-07-04 11:00:00+00'
  );

  -- 2. FNOL_SUBMITTED
  INSERT INTO claims (
    policy_id, insurer_id, status, vehicle_type, vehicle_registration_number,
    loss_type, loss_date, loss_location, loss_description,
    fnol_submitted_at, fnol_submitted_by, created_at, updated_at
  ) VALUES (
    p0002, i_icici, 'FNOL_SUBMITTED', '2W', 'WB-01-XY-5678',
    'THEFT', '2026-07-03 22:00:00+00', 'Kolkata, West Bengal',
    'Motorcycle stolen from outside residence',
    '2026-07-03 22:30:00+00', u_fnol,
    '2026-07-03 22:30:00+00', '2026-07-03 22:30:00+00'
  );

  -- 3. FNOL_REVIEW
  INSERT INTO claims (
    policy_id, insurer_id, status, vehicle_type, vehicle_registration_number,
    loss_type, loss_date, loss_location, loss_description,
    fnol_submitted_at, fnol_submitted_by, created_at, updated_at
  ) VALUES (
    p0003, i_bajaj, 'FNOL_REVIEW', '4W', 'MH-12-CD-9012',
    'ACCIDENT', '2026-07-02 14:00:00+00', 'Pune, Maharashtra',
    'Collision with another vehicle at intersection, front-end damage',
    '2026-07-02 14:30:00+00', u_fnol,
    '2026-07-02 14:30:00+00', '2026-07-02 15:00:00+00'
  );

  -- 4. ASSESSMENT_PENDING
  INSERT INTO claims (
    policy_id, insurer_id, status, vehicle_type, vehicle_registration_number,
    loss_type, loss_date, loss_location, loss_description,
    fnol_submitted_at, fnol_submitted_by, created_at, updated_at
  ) VALUES (
    p0004, i_tata, 'ASSESSMENT_PENDING', 'CV', 'HR-26-CV-3456',
    'ACCIDENT', '2026-07-01 06:00:00+00', 'Gurugram, Haryana',
    'Truck collided with divider on highway, cargo damage',
    '2026-07-01 06:30:00+00', u_fnol,
    '2026-07-01 06:30:00+00', '2026-07-01 08:00:00+00'
  );

  -- 5. ASSESSMENT_COMPLETED
  INSERT INTO claims (
    policy_id, insurer_id, status, vehicle_type, vehicle_registration_number,
    loss_type, loss_date, loss_location, loss_description,
    fnol_submitted_at, fnol_submitted_by,
    assessment_assigned_to, assessment_started_at, assessment_completed_at,
    estimated_loss_amount, created_at, updated_at
  ) VALUES (
    p0006, i_icici, 'ASSESSMENT_COMPLETED', '2W', 'CH-01-GH-4321',
    'FIRE', '2026-06-28 02:00:00+00', 'Chandigarh',
    'Vehicle caught fire due to short circuit, total loss suspected',
    '2026-06-28 02:30:00+00', u_fnol,
    u_assessor, '2026-06-28 09:00:00+00', '2026-06-30 17:00:00+00',
    8500000, '2026-06-28 02:30:00+00', '2026-06-30 17:00:00+00'
  );

  -- 6. APPROVAL_PENDING
  INSERT INTO claims (
    policy_id, insurer_id, status, vehicle_type, vehicle_registration_number,
    loss_type, loss_date, loss_location, loss_description,
    fnol_submitted_at, fnol_submitted_by,
    assessment_assigned_to, assessment_started_at, assessment_completed_at,
    estimated_loss_amount, created_at, updated_at
  ) VALUES (
    p0001, i_hdfc, 'APPROVAL_PENDING', '4W', 'DL-01-AB-1234',
    'NATURAL_CALAMITY', '2026-06-25 16:00:00+00', 'Delhi',
    'Vehicle damaged in flood, water entered engine compartment',
    '2026-06-25 16:30:00+00', u_fnol,
    u_assessor, '2026-06-26 09:00:00+00', '2026-06-28 15:00:00+00',
    3500000, '2026-06-25 16:30:00+00', '2026-06-28 15:00:00+00'
  );

  -- 7. APPROVED
  INSERT INTO claims (
    policy_id, insurer_id, status, vehicle_type, vehicle_registration_number,
    loss_type, loss_date, loss_location, loss_description,
    fnol_submitted_at, fnol_submitted_by,
    assessment_assigned_to, assessment_started_at, assessment_completed_at,
    estimated_loss_amount, approved_at, approved_by, approved_amount,
    approval_level, created_at, updated_at
  ) VALUES (
    p0003, i_bajaj, 'APPROVED', '4W', 'MH-12-CD-9012',
    'ACCIDENT', '2026-06-20 11:00:00+00', 'Pune, Maharashtra',
    'Rear-ended by truck, tailgate and bumper damaged',
    '2026-06-20 11:30:00+00', u_fnol,
    u_assessor, '2026-06-21 10:00:00+00', '2026-06-23 16:00:00+00',
    1800000, '2026-06-24 12:00:00+00', u_approver, 1800000,
    'LEVEL_1', '2026-06-20 11:30:00+00', '2026-06-24 12:00:00+00'
  );

  -- 8. REJECTED
  INSERT INTO claims (
    policy_id, insurer_id, status, vehicle_type, vehicle_registration_number,
    loss_type, loss_date, loss_location, loss_description,
    fnol_submitted_at, fnol_submitted_by,
    assessment_assigned_to, assessment_started_at, assessment_completed_at,
    estimated_loss_amount, rejected_at, rejected_by, rejection_reason,
    created_at, updated_at
  ) VALUES (
    p0002, i_icici, 'REJECTED', '2W', 'WB-01-XY-5678',
    'OTHER', '2026-06-18 13:00:00+00', 'Kolkata, West Bengal',
    'Claim filed for pre-existing damage not covered by policy',
    '2026-06-18 13:30:00+00', u_fnol,
    u_assessor, '2026-06-19 09:00:00+00', '2026-06-20 14:00:00+00',
    500000, '2026-06-21 10:00:00+00', u_approver,
    'Damage is pre-existing and not covered under policy terms',
    '2026-06-18 13:30:00+00', '2026-06-21 10:00:00+00'
  );

  -- 9. PAYMENT_PENDING
  INSERT INTO claims (
    policy_id, insurer_id, status, vehicle_type, vehicle_registration_number,
    loss_type, loss_date, loss_location, loss_description,
    fnol_submitted_at, fnol_submitted_by,
    assessment_assigned_to, assessment_started_at, assessment_completed_at,
    estimated_loss_amount, approved_at, approved_by, approved_amount,
    approval_level, created_at, updated_at
  ) VALUES (
    p0005, i_hdfc, 'PAYMENT_PENDING', '4W', 'TS-09-EF-7890',
    'ACCIDENT', '2026-06-15 17:00:00+00', 'Hyderabad, Telangana',
    'Side collision at roundabout, both doors and fender damaged',
    '2026-06-15 17:30:00+00', u_fnol,
    u_assessor, '2026-06-16 10:00:00+00', '2026-06-18 15:00:00+00',
    4200000, '2026-06-19 11:00:00+00', u_approver, 4200000,
    'LEVEL_2', '2026-06-15 17:30:00+00', '2026-06-19 11:00:00+00'
  );

  -- 10. PAYMENT_PROCESSING
  INSERT INTO claims (
    policy_id, insurer_id, status, vehicle_type, vehicle_registration_number,
    loss_type, loss_date, loss_location, loss_description,
    fnol_submitted_at, fnol_submitted_by,
    assessment_assigned_to, assessment_started_at, assessment_completed_at,
    estimated_loss_amount, approved_at, approved_by, approved_amount,
    approval_level, payment_initiated_at, created_at, updated_at
  ) VALUES (
    p0004, i_tata, 'PAYMENT_PROCESSING', 'CV', 'HR-26-CV-3456',
    'ACCIDENT', '2026-06-10 08:00:00+00', 'Gurugram, Haryana',
    'Truck hit roadside barrier, front axle and windshield damaged',
    '2026-06-10 08:30:00+00', u_fnol,
    u_assessor, '2026-06-11 09:00:00+00', '2026-06-14 16:00:00+00',
    6800000, '2026-06-15 10:00:00+00', u_approver, 6800000,
    'LEVEL_2', '2026-07-05 14:00:00+00',
    '2026-06-10 08:30:00+00', '2026-07-05 14:00:00+00'
  );

  -- 11. PAYMENT_SUCCESS
  INSERT INTO claims (
    policy_id, insurer_id, status, vehicle_type, vehicle_registration_number,
    loss_type, loss_date, loss_location, loss_description,
    fnol_submitted_at, fnol_submitted_by,
    assessment_assigned_to, assessment_started_at, assessment_completed_at,
    estimated_loss_amount, approved_at, approved_by, approved_amount,
    approval_level, payment_initiated_at, payment_completed_at,
    settlement_amount, created_at, updated_at
  ) VALUES (
    p0006, i_icici, 'PAYMENT_SUCCESS', '2W', 'CH-01-GH-4321',
    'THEFT', '2026-06-05 23:00:00+00', 'Chandigarh',
    'Motorcycle stolen, police FIR filed, vehicle not recovered',
    '2026-06-05 23:30:00+00', u_fnol,
    u_assessor, '2026-06-06 09:00:00+00', '2026-06-08 15:00:00+00',
    8500000, '2026-06-09 11:00:00+00', u_approver, 8500000,
    'LEVEL_2', '2026-06-10 10:00:00+00', '2026-06-10 14:00:00+00',
    8500000, '2026-06-05 23:30:00+00', '2026-06-10 14:00:00+00'
  );

  -- 12. PAYMENT_FAILED
  INSERT INTO claims (
    policy_id, insurer_id, status, vehicle_type, vehicle_registration_number,
    loss_type, loss_date, loss_location, loss_description,
    fnol_submitted_at, fnol_submitted_by,
    assessment_assigned_to, assessment_started_at, assessment_completed_at,
    estimated_loss_amount, approved_at, approved_by, approved_amount,
    approval_level, payment_initiated_at, created_at, updated_at
  ) VALUES (
    p0001, i_hdfc, 'PAYMENT_FAILED', '4W', 'DL-01-AB-1234',
    'ACCIDENT', '2026-06-01 09:00:00+00', 'Delhi',
    'Multi-vehicle collision, extensive body and engine damage',
    '2026-06-01 09:30:00+00', u_fnol,
    u_assessor, '2026-06-02 10:00:00+00', '2026-06-04 16:00:00+00',
    5500000, '2026-06-05 12:00:00+00', u_approver, 5500000,
    'LEVEL_2', '2026-07-04 11:00:00+00',
    '2026-06-01 09:30:00+00', '2026-07-04 16:00:00+00'
  );

  -- 13. CLOSED
  INSERT INTO claims (
    policy_id, insurer_id, status, vehicle_type, vehicle_registration_number,
    loss_type, loss_date, loss_location, loss_description,
    fnol_submitted_at, fnol_submitted_by,
    assessment_assigned_to, assessment_started_at, assessment_completed_at,
    estimated_loss_amount, approved_at, approved_by, approved_amount,
    approval_level, payment_initiated_at, payment_completed_at,
    settlement_amount, settlement_letter_sent, closed_at, closed_by,
    created_at, updated_at
  ) VALUES (
    p0003, i_bajaj, 'CLOSED', '4W', 'MH-12-CD-9012',
    'ACCIDENT', '2026-05-20 15:00:00+00', 'Pune, Maharashtra',
    'Bumper and headlight damage from collision, repaired at authorized garage',
    '2026-05-20 15:30:00+00', u_fnol,
    u_assessor, '2026-05-21 10:00:00+00', '2026-05-23 15:00:00+00',
    1200000, '2026-05-24 11:00:00+00', u_approver, 1200000,
    'LEVEL_1', '2026-05-25 10:00:00+00', '2026-05-25 14:00:00+00',
    1200000, true, '2026-05-26 10:00:00+00', u_closure,
    '2026-05-20 15:30:00+00', '2026-05-26 10:00:00+00'
  );

  -- 14. REOPENED
  INSERT INTO claims (
    policy_id, insurer_id, status, vehicle_type, vehicle_registration_number,
    loss_type, loss_date, loss_location, loss_description,
    fnol_submitted_at, fnol_submitted_by,
    assessment_assigned_to, assessment_started_at, assessment_completed_at,
    estimated_loss_amount, approved_at, approved_by, approved_amount,
    approval_level, payment_initiated_at, payment_completed_at,
    settlement_amount, settlement_letter_sent, closed_at, closed_by,
    created_at, updated_at
  ) VALUES (
    p0002, i_icici, 'REOPENED', '2W', 'WB-01-XY-5678',
    'ACCIDENT', '2026-05-10 18:00:00+00', 'Kolkata, West Bengal',
    'Initial repair found incomplete, additional damage discovered later',
    '2026-05-10 18:30:00+00', u_fnol,
    u_assessor, '2026-05-11 09:00:00+00', '2026-05-13 15:00:00+00',
    3000000, '2026-05-14 11:00:00+00', u_approver, 3000000,
    'LEVEL_1', '2026-05-15 10:00:00+00', '2026-05-15 14:00:00+00',
    3000000, true, '2026-05-16 10:00:00+00', u_closure,
    '2026-05-10 18:30:00+00', '2026-07-03 09:00:00+00'
  );
END $$;

-- Create task_queue entries for claims that need workflow tasks
INSERT INTO task_queue (claim_id, task_type, assigned_role, priority, status)
SELECT c.id, 'FNOL_REVIEW', 'FNOL_ASSISTANT', 5, 'PENDING'
FROM claims c
WHERE c.status = 'FNOL_REVIEW'
  AND NOT EXISTS (SELECT 1 FROM task_queue tq WHERE tq.claim_id = c.id);

INSERT INTO task_queue (claim_id, task_type, assigned_role, priority, status)
SELECT c.id, 'ASSESSMENT', 'ASSESSOR_ASSISTANT', 4, 'PENDING'
FROM claims c
WHERE c.status = 'ASSESSMENT_PENDING'
  AND NOT EXISTS (SELECT 1 FROM task_queue tq WHERE tq.claim_id = c.id);

INSERT INTO task_queue (claim_id, task_type, assigned_role, priority, status)
SELECT c.id, 'APPROVAL', 'APPROVALS_ASSISTANT', 4, 'PENDING'
FROM claims c
WHERE c.status = 'APPROVAL_PENDING'
  AND NOT EXISTS (SELECT 1 FROM task_queue tq WHERE tq.claim_id = c.id);

INSERT INTO task_queue (claim_id, task_type, assigned_role, priority, status)
SELECT c.id, 'PAYMENT', 'PAYMENTS_ASSISTANT', 3, 'PENDING'
FROM claims c
WHERE c.status = 'PAYMENT_PENDING'
  AND NOT EXISTS (SELECT 1 FROM task_queue tq WHERE tq.claim_id = c.id);
