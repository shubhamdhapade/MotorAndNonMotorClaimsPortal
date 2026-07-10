// Enums matching database types
export type ClaimStatus =
  | 'DRAFT'
  | 'FNOL_SUBMITTED'
  | 'FNOL_REVIEW'
  | 'ASSESSMENT_PENDING'
  | 'ASSESSMENT_IN_PROGRESS'
  | 'ASSESSMENT_COMPLETED'
  | 'APPROVAL_PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_PROCESSING'
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_FAILED'
  | 'CLOSED'
  | 'REOPENED';

export type VehicleType = '2W' | '4W' | 'CV';

export type LossType = 'ACCIDENT' | 'THEFT' | 'FIRE' | 'NATURAL_CALAMITY' | 'OTHER';

export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';

export type ApprovalLevel = 'AUTO' | 'SUPERVISOR' | 'MANAGER';

export type RoleCode =
  | 'SYSTEM_ADMIN'
  | 'FNOL_ASSISTANT'
  | 'ASSESSOR_ASSISTANT'
  | 'APPROVALS_ASSISTANT'
  | 'PAYMENTS_ASSISTANT'
  | 'CLOSURE_ASSISTANT';

// Base interfaces
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at?: string;
}

// Role and User interfaces
export interface Role extends BaseEntity {
  code: RoleCode;
  name: string;
  description?: string;
}

export interface UserRole extends BaseEntity {
  user_id: string;
  role_id: string;
  assigned_by?: string;
  assigned_at: string;
}

export interface AppUser extends BaseEntity {
  employee_id?: string;
  full_name: string;
  email: string;
  department?: string;
  is_active: boolean;
}

export interface UserWithRoles extends AppUser {
  roles: Role[];
}

// Insurer interface
export interface Insurer extends BaseEntity {
  code: string;
  name: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  is_active: boolean;
}

// Policy interface
export interface Policy extends BaseEntity {
  policy_number: string;
  insurer_id: string;
  insurer?: Insurer;
  policy_holder_name: string;
  policy_holder_contact?: string;
  policy_holder_email?: string;
  policy_holder_address?: string;
  vehicle_registration_number: string;
  vehicle_type: VehicleType;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  engine_number?: string;
  chassis_number?: string;
  sum_insured: number; // in paise
  premium: number; // in paise
  policy_start_date: string;
  policy_end_date: string;
  is_active: boolean;
}

// Claim interface
export interface Claim extends BaseEntity {
  claim_number: string;
  policy_id: string;
  policy?: Policy;
  insurer_id: string;
  insurer?: Insurer;
  status: ClaimStatus;
  current_version: number;
  vehicle_type: VehicleType;
  vehicle_registration_number: string;
  loss_type: LossType;
  loss_date: string;
  loss_location?: string;
  loss_description?: string;
  estimated_loss_amount?: number;
  approved_amount?: number;
  settlement_amount?: number;
  fnol_submitted_at?: string;
  fnol_submitted_by?: string;
  fnol_submitted_by_user?: AppUser;
  assessment_assigned_to?: string;
  assessment_assigned_to_user?: AppUser;
  assessment_started_at?: string;
  assessment_completed_at?: string;
  approval_assigned_to?: string;
  approval_assigned_to_user?: AppUser;
  approval_level?: ApprovalLevel;
  approved_at?: string;
  approved_by?: string;
  approved_by_user?: AppUser;
  rejected_at?: string;
  rejected_by?: string;
  rejected_by_user?: AppUser;
  rejection_reason?: string;
  payment_initiated_at?: string;
  payment_completed_at?: string;
  settlement_letter_sent: boolean;
  closed_at?: string;
  closed_by?: string;
  closed_by_user?: AppUser;
  closure_reason?: string;
}

// Claim Motor Details
export interface ClaimMotorDetails extends BaseEntity {
  claim_id: string;
  driver_name?: string | null;
  driver_license_number?: string | null;
  driver_license_expiry?: string | null;
  fir_number?: string | null;
  fir_station?: string | null;
  fir_date?: string | null;
  third_party_involved: boolean;
  third_party_details?: Record<string, unknown> | null;
  passengers_count?: number | null;
  fatalities?: number | null;
  injuries?: number | null;
  garage_name?: string | null;
  garage_address?: string | null;
  garage_contact?: string | null;
  surveyor_name?: string | null;
  surveyor_contact?: string | null;
  survey_scheduled_date?: string | null;
  survey_completed_date?: string | null;
  reserve_recommendation?: number | null;
}

// Damage mapping
export interface ClaimDamageMap extends BaseEntity {
  claim_id: string;
  vehicle_type: VehicleType;
  part_name: string;
  part_category?: string;
  side?: string;
  position?: string;
  damage_severity?: string;
  estimated_repair_cost?: number;
}

// Document interface
export interface Document extends BaseEntity {
  claim_id?: string;
  document_type: string;
  document_name: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  is_mandatory: boolean;
  is_conditional: boolean;
  is_verified: boolean;
  verified_by?: string;
  verified_at?: string;
  uploaded_by: string;
  uploaded_at: string;
}

// Payment interface
export interface Payment extends BaseEntity {
  claim_id: string;
  payment_number: string;
  amount: number;
  beneficiary_name: string;
  beneficiary_account_number: string;
  beneficiary_ifsc_code: string;
  beneficiary_bank_name?: string;
  status: PaymentStatus;
  utr_number?: string;
  neft_initiated_at?: string;
  neft_completed_at?: string;
  failure_reason?: string;
  settlement_letter_generated: boolean;
  settlement_letter_path?: string;
  initiated_by: string;
}

// Closure interface
export interface Closure extends BaseEntity {
  claim_id: string;
  closure_type: string;
  closed_by: string;
  closure_reason?: string;
  closure_date: string;
  settlement_letter_sent: boolean;
}

// Reopen interface
export interface Reopen extends BaseEntity {
  claim_id: string;
  reason_code: number;
  reason_text: string;
  requested_by: string;
  requested_at: string;
  maker_status: string;
  maker_comments?: string;
  maker_approved_by?: string;
  maker_approved_at?: string;
  checker_status: string;
  checker_comments?: string;
  checker_approved_by?: string;
  checker_approved_at?: string;
}

// Audit Event interface
export interface AuditEvent extends BaseEntity {
  entity_type: string;
  entity_id: string;
  action: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  performed_by: string;
  performed_at: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, unknown>;
}

// Task Queue interface
export interface TaskQueue extends BaseEntity {
  claim_id: string;
  task_type: string;
  assigned_to?: string;
  assigned_role?: string;
  priority: number;
  status: string;
  due_date?: string;
  completed_at?: string;
  claim?: Claim;
}

// Auth related interfaces
export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  roles: Role[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Form interfaces
export interface MotorFNOLForm {
  policy_number: string;
  loss_type: LossType;
  loss_date: string | null;
  loss_location: string | null;
  loss_description: string | null;
  vehicle_type: VehicleType;
  vehicle_registration_number: string;
  driver_name: string;
  driver_license_number: string;
  driver_license_expiry: string | null;
  fir_number?: string | null;
  fir_station?: string | null;
  fir_date?: string | null;
  third_party_involved: boolean;
  third_party_details?: string | null;
  passengers_count: number | null;
  fatalities: number | null;
  injuries: number | null;
  garage_name?: string | null;
  garage_address?: string | null;
  garage_contact?: string | null;
  damages: DamagePart[];
}

export interface DamagePart {
  part_name: string;
  part_category?: string;
  side?: string;
  position?: string;
  damage_severity?: string;
  estimated_repair_cost?: number;
}

export interface PaymentForm {
  amount: number;
  beneficiary_name: string;
  beneficiary_account_number: string;
  beneficiary_ifsc_code: string;
  beneficiary_bank_name?: string;
}

export interface ReopenForm {
  reason_code: number;
  reason_text: string;
}

// Dashboard statistics
export interface DashboardStats {
  total_claims: number;
  pending_assessment: number;
  pending_approval: number;
  pending_payment: number;
  closed_this_month: number;
  reopened_this_month: number;
  total_claim_amount: number;
  average_processing_time: number;
}

// Status transition mapping
export const STATUS_TRANSITIONS: Record<ClaimStatus, ClaimStatus[]> = {
  DRAFT: ['FNOL_SUBMITTED'],
  FNOL_SUBMITTED: ['FNOL_REVIEW', 'ASSESSMENT_PENDING'],
  FNOL_REVIEW: ['ASSESSMENT_PENDING', 'DRAFT'],
  ASSESSMENT_PENDING: ['ASSESSMENT_IN_PROGRESS'],
  ASSESSMENT_IN_PROGRESS: ['ASSESSMENT_COMPLETED'],
  ASSESSMENT_COMPLETED: ['APPROVAL_PENDING'],
  APPROVAL_PENDING: ['APPROVED', 'REJECTED'],
  APPROVED: ['PAYMENT_PENDING'],
  REJECTED: ['APPROVAL_PENDING'],
  PAYMENT_PENDING: ['PAYMENT_PROCESSING'],
  PAYMENT_PROCESSING: ['PAYMENT_SUCCESS', 'PAYMENT_FAILED'],
  PAYMENT_SUCCESS: ['CLOSED'],
  PAYMENT_FAILED: ['PAYMENT_PENDING'],
  CLOSED: ['REOPENED'],
  REOPENED: ['ASSESSMENT_PENDING'],
};

// Reason codes for reopen
export const REOPEN_REASON_CODES: Record<number, string> = {
  1: 'New evidence/documents discovered',
  2: 'Claim amount disputed by claimant',
  3: 'Payment not received',
  4: 'Additional damages identified',
  5: 'Incorrect claim assessment',
  6: 'Fraud suspicion cleared',
  7: 'Legal directive',
  8: 'IRDA complaint received',
  9: 'Technical error in processing',
  10: 'Other (specify in reason text)',
};

// Document checklist
export interface DocumentChecklist {
  id: string;
  document_type: string;
  document_name: string;
  is_mandatory: boolean;
  is_conditional: boolean;
  condition?: string;
  description?: string;
}

export const MANDATORY_DOCUMENTS: DocumentChecklist[] = [
  { id: '1', document_type: 'FIR', document_name: 'FIR Copy', is_mandatory: true, is_conditional: false },
  { id: '2', document_type: 'DRIVING_LICENSE', document_name: 'Driving License Copy', is_mandatory: true, is_conditional: false },
  { id: '3', document_type: 'RC', document_name: 'Registration Certificate', is_mandatory: true, is_conditional: false },
  { id: '4', document_type: 'CLAIM_FORM', document_name: 'Filled Claim Form', is_mandatory: true, is_conditional: false },
  { id: '5', document_type: 'POLICY_COPY', document_name: 'Policy Document Copy', is_mandatory: true, is_conditional: false },
];

export const CONDITIONAL_DOCUMENTS: DocumentChecklist[] = [
  { id: '6', document_type: 'DEATH_CERTIFICATE', document_name: 'Death Certificate', is_mandatory: false, is_conditional: true, condition: 'Required if fatalities > 0' },
  { id: '7', document_type: 'MEDICAL_REPORT', document_name: 'Medical Report', is_mandatory: false, is_conditional: true, condition: 'Required if injuries > 0' },
  { id: '8', document_type: 'THIRD_PARTY_CLAIM', document_name: 'Third Party Claim Documents', is_mandatory: false, is_conditional: true, condition: 'Required if third_party_involved' },
  { id: '9', document_type: 'REPAIR_ESTIMATE', document_name: 'Repair Estimate from Garage', is_mandatory: false, is_conditional: true, condition: 'Required for accident claims' },
  { id: '10', document_type: 'SURVEY_REPORT', document_name: 'Survey Report', is_mandatory: false, is_conditional: true, condition: 'Required after survey completion' },
];

// Vehicle parts for damage selection
export const VEHICLE_PARTS_2W: Record<string, string[]> = {
  FRONT: ['HEADLIGHT', 'FORK', 'FRONT_FENDER', 'FRONT_WHEEL', 'FRONT_BRAKE'],
  REAR: ['TAILLIGHT', 'REAR_FENDER', 'REAR_WHEEL', 'REAR_BRAKE', 'SEAT'],
  LEFT: ['LEFT_INDICATOR', 'LEFT_MIRROR', 'LEFT_PANNEL', 'TANK_LEFT'],
  RIGHT: ['RIGHT_INDICATOR', 'RIGHT_MIRROR', 'RIGHT_PANNEL', 'TANK_RIGHT'],
  ENGINE: ['ENGINE_BLOCK', 'CARBURETOR', 'SILENCER', 'KICK_LEVER'],
  ELECTRICAL: ['BATTERY', 'WIRING_HARNESS', 'CDI_UNIT', 'REGULATOR'],
};

export const VEHICLE_PARTS_4W: Record<string, string[]> = {
  FRONT: ['FRONT_BUMPER', 'HEADLIGHT_LEFT', 'HEADLIGHT_RIGHT', 'GRILLE', 'HOOD', 'WINDSHIELD', 'FRONT_FENDER_LEFT', 'FRONT_FENDER_RIGHT'],
  REAR: ['REAR_BUMPER', 'TAILLIGHT_LEFT', 'TAILLIGHT_RIGHT', 'TRUNK', 'REAR_WINDSHIELD', 'REAR_FENDER_LEFT', 'REAR_FENDER_RIGHT'],
  LEFT: ['DOOR_FRONT_LEFT', 'DOOR_REAR_LEFT', 'LEFT_MIRROR', 'LEFT_RUNNING_BOARD', 'LEFT_PILLAR_A', 'LEFT_PILLAR_B', 'LEFT_PILLAR_C'],
  RIGHT: ['DOOR_FRONT_RIGHT', 'DOOR_REAR_RIGHT', 'RIGHT_MIRROR', 'RIGHT_RUNNING_BOARD', 'RIGHT_PILLAR_A', 'RIGHT_PILLAR_B', 'RIGHT_PILLAR_C'],
  TOP: ['ROOF', 'SUNROOF'],
  INTERIOR: ['DASHBOARD', 'STEERING', 'SEATS', 'CARPET', 'HEADLINER'],
  ENGINE: ['ENGINE', 'TRANSMISSION', 'RADIATOR', 'BATTERY', 'ALTERNATOR'],
  WHEELS: ['WHEEL_FRONT_LEFT', 'WHEEL_FRONT_RIGHT', 'WHEEL_REAR_LEFT', 'WHEEL_REAR_RIGHT'],
};

export const VEHICLE_PARTS_CV: Record<string, string[]> = {
  FRONT: ['FRONT_BUMPER', 'HEADLIGHTS', 'GRILLE', 'WINDSHIELD', 'HOOD'],
  REAR: ['REAR_BUMPER', 'TAILLIGHTS', 'CARGO_DOOR_LEFT', 'CARGO_DOOR_RIGHT', 'REAR_AXLE'],
  LEFT: ['CABIN_DOOR', 'LEFT_MIRROR', 'FUEL_TANK', 'LEFT_GUARD'],
  RIGHT: ['PASSENGER_DOOR', 'RIGHT_MIRROR', 'RIGHT_GUARD'],
  CARGO: ['CARGO_AREA', 'CARGO_FLOOR', 'CARGO_WALLS', 'CARGO_ROOF'],
  ENGINE: ['ENGINE', 'TRANSMISSION', 'DIFFERENTIAL', 'SUSPENSION'],
  WHEELS: ['FRONT_WHEELS', 'REAR_WHEELS', 'SPARE_WHEEL'],
};
