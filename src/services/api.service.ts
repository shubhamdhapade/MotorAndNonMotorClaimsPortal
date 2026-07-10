import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import type {
  Claim,
  Policy,
  Insurer,
  ClaimMotorDetails,
  ClaimDamageMap,
  Document,
  Payment,
  Closure,
  Reopen,
  AuditEvent,
  TaskQueue,
  MotorFNOLForm,
  DamagePart,
  DashboardStats,
} from '../models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(
    public supabase: SupabaseService,
    private authService: AuthService
  ) {}

  // Policy operations
  async getPolicyByNumber(policyNumber: string): Promise<{ data: Policy | null; error: string | null }> {
    const { data, error } = await this.supabase
      .from('policies')
      .select('*, insurer:insurers(*)')
      .eq('policy_number', policyNumber)
      .maybeSingle();

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  }

  async getPolicies(): Promise<{ data: Policy[] | null; error: string | null }> {
    const { data, error } = await this.supabase
      .from('policies')
      .select('*, insurer:insurers(*)')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  }

  // Insurer operations
  async getInsurers(): Promise<{ data: Insurer[] | null; error: string | null }> {
    const { data, error } = await this.supabase
      .from('insurers')
      .select('*')
      .eq('is_active', true);

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  }

  // Claim operations
  async getClaims(params?: {
    status?: string;
    insurer_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: Claim[] | null; error: string | null; count?: number }> {
    let query = this.supabase
      .from('claims')
      .select('*, policy:policies(*), insurer:insurers(*)', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (params?.status) query = query.eq('status', params.status);
    if (params?.insurer_id) query = query.eq('insurer_id', params.insurer_id);
    if (params?.limit) query = query.limit(params.limit);
    if (params?.offset) query = query.range(params.offset, params.offset + (params.limit || 10) - 1);

    const { data, error, count } = await query;

    if (error) return { data: null, error: error.message };
    return { data, error: null, count: count ?? undefined };
  }

  async getClaimById(id: string): Promise<{ data: Claim | null; error: string | null }> {
    const { data, error } = await this.supabase
      .from('claims')
      .select('*, policy:policies(*, insurer:insurers(*)), insurer:insurers(*)')
      .eq('id', id)
      .maybeSingle();

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  }

  async createMotorFNOL(form: MotorFNOLForm): Promise<{ data: Claim | null; error: string | null }> {
    const userId = this.authService.user()?.id;
    if (!userId) return { data: null, error: 'Not authenticated' };

    // Get policy
    const { data: policy, error: policyError } = await this.getPolicyByNumber(form.policy_number);
    if (policyError || !policy) {
      return { data: null, error: policyError || 'Policy not found' };
    }

    // Create claim
    const claimData = {
      policy_id: policy.id,
      insurer_id: policy.insurer_id,
      status: 'FNOL_SUBMITTED',
      vehicle_type: form.vehicle_type,
      vehicle_registration_number: form.vehicle_registration_number,
      loss_type: form.loss_type,
      loss_date: form.loss_date,
      loss_location: form.loss_location,
      loss_description: form.loss_description,
      fnol_submitted_at: new Date().toISOString(),
      fnol_submitted_by: userId,
    };

    const { data: claim, error: claimError } = await this.supabase
      .from('claims')
      .insert(claimData)
      .select()
      .single();

    if (claimError || !claim) {
      return { data: null, error: claimError?.message || 'Failed to create claim' };
    }

    // Create motor details
    const motorDetails = {
      claim_id: claim.id,
      driver_name: form.driver_name,
      driver_license_number: form.driver_license_number,
      driver_license_expiry: form.driver_license_expiry,
      fir_number: form.fir_number,
      fir_station: form.fir_station,
      fir_date: form.fir_date,
      third_party_involved: form.third_party_involved,
      third_party_details: form.third_party_details ? JSON.parse(form.third_party_details) : null,
      passengers_count: form.passengers_count,
      fatalities: form.fatalities,
      injuries: form.injuries,
      garage_name: form.garage_name,
      garage_address: form.garage_address,
      garage_contact: form.garage_contact,
    };

    await this.supabase.from('claim_motor_details').insert(motorDetails);

    // Create damage mappings
    if (form.damages && form.damages.length > 0) {
      const damageMaps = form.damages.map(d => ({
        claim_id: claim.id,
        vehicle_type: form.vehicle_type,
        part_name: d.part_name,
        part_category: d.part_category,
        side: d.side,
        position: d.position,
        damage_severity: d.damage_severity,
        estimated_repair_cost: d.estimated_repair_cost,
      }));

      await this.supabase.from('claim_damage_map').insert(damageMaps);
    }

    // Create audit event
    await this.createAuditEvent('CLAIM', claim.id, 'CREATE', null, claim);

    // Create task
    await this.supabase.from('task_queue').insert({
      claim_id: claim.id,
      task_type: 'FNOL_REVIEW',
      assigned_role: 'FNOL_ASSISTANT',
      priority: 5,
    });

    return { data: claim, error: null };
  }

  async transitionClaimStatus(
    claimId: string,
    newStatus: string,
    metadata?: Record<string, unknown>
  ): Promise<{ success: boolean; error: string | null }> {
    const userId = this.authService.user()?.id;
    if (!userId) return { success: false, error: 'Not authenticated' };

    const { data: oldClaim } = await this.supabase
      .from('claims')
      .select('*')
      .eq('id', claimId)
      .maybeSingle();

    if (!oldClaim) return { success: false, error: 'Claim not found' };

    const updateData: Record<string, unknown> = { status: newStatus, updated_at: new Date().toISOString() };

    // Add status-specific fields
    switch (newStatus) {
      case 'ASSESSMENT_IN_PROGRESS':
        updateData['assessment_started_at'] = new Date().toISOString();
        updateData['assessment_assigned_to'] = userId;
        break;
      case 'ASSESSMENT_COMPLETED':
        updateData['assessment_completed_at'] = new Date().toISOString();
        if (metadata && 'reserve_recommendation' in metadata) {
          updateData['estimated_loss_amount'] = metadata['reserve_recommendation'];
        }
        break;
      case 'APPROVED':
        updateData['approved_at'] = new Date().toISOString();
        updateData['approved_by'] = userId;
        if (metadata && 'approved_amount' in metadata) {
          updateData['approved_amount'] = metadata['approved_amount'];
        }
        if (metadata && 'approval_level' in metadata) {
          updateData['approval_level'] = metadata['approval_level'];
        }
        break;
      case 'REJECTED':
        updateData['rejected_at'] = new Date().toISOString();
        updateData['rejected_by'] = userId;
        if (metadata && 'rejection_reason' in metadata) {
          updateData['rejection_reason'] = metadata['rejection_reason'];
        }
        break;
      case 'PAYMENT_SUCCESS':
        updateData['payment_completed_at'] = new Date().toISOString();
        break;
    }

    const { error } = await this.supabase
      .from('claims')
      .update(updateData)
      .eq('id', claimId);

    if (error) return { success: false, error: error.message };

    // Create audit event
    await this.createAuditEvent('CLAIM', claimId, 'STATUS_CHANGE', { status: oldClaim.status }, { status: newStatus });

    // Update task
    await this.supabase
      .from('task_queue')
      .update({ status: 'COMPLETED', completed_at: new Date().toISOString() })
      .eq('claim_id', claimId)
      .eq('status', 'PENDING');

    // Create next task based on status
    if (newStatus === 'ASSESSMENT_COMPLETED') {
      await this.supabase.from('task_queue').insert({
        claim_id: claimId,
        task_type: 'APPROVAL',
        assigned_role: 'APPROVALS_ASSISTANT',
        priority: 4,
      });
    }

    return { success: true, error: null };
  }

  // Claim motor details
  async getClaimMotorDetails(claimId: string): Promise<{ data: ClaimMotorDetails | null; error: string | null }> {
    const { data, error } = await this.supabase
      .from('claim_motor_details')
      .select('*')
      .eq('claim_id', claimId)
      .maybeSingle();

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  }

  async updateClaimMotorDetails(
    claimId: string,
    details: Partial<ClaimMotorDetails>
  ): Promise<{ success: boolean; error: string | null }> {
    const { error } = await this.supabase
      .from('claim_motor_details')
      .update({ ...details, updated_at: new Date().toISOString() })
      .eq('claim_id', claimId);

    if (error) return { success: false, error: error.message };
    await this.createAuditEvent('MOTOR_DETAILS', claimId, 'UPDATE', null, details);
    return { success: true, error: null };
  }

  // Damage maps
  async getClaimDamages(claimId: string): Promise<{ data: ClaimDamageMap[] | null; error: string | null }> {
    const { data, error } = await this.supabase
      .from('claim_damage_map')
      .select('*')
      .eq('claim_id', claimId);

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  }

  // Documents
  async getDocuments(claimId: string): Promise<{ data: Document[] | null; error: string | null }> {
    const { data, error } = await this.supabase
      .from('documents')
      .select('*')
      .eq('claim_id', claimId)
      .order('uploaded_at', { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  }

  async uploadDocument(
    claimId: string,
    document: Partial<Document>
  ): Promise<{ data: Document | null; error: string | null }> {
    const userId = this.authService.user()?.id;
    if (!userId) return { data: null, error: 'Not authenticated' };

    const docData = {
      ...document,
      claim_id: claimId,
      uploaded_by: userId,
      uploaded_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase
      .from('documents')
      .insert(docData)
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    await this.createAuditEvent('DOCUMENT', data.id, 'UPLOAD', null, { document_type: document.document_type });
    return { data, error: null };
  }

  async verifyDocument(
    documentId: string
  ): Promise<{ success: boolean; error: string | null }> {
    const userId = this.authService.user()?.id;

    const { error } = await this.supabase
      .from('documents')
      .update({
        is_verified: true,
        verified_by: userId,
        verified_at: new Date().toISOString(),
      })
      .eq('id', documentId);

    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  }

  // Payments
  async getPayments(claimId: string): Promise<{ data: Payment[] | null; error: string | null }> {
    const { data, error } = await this.supabase
      .from('payments')
      .select('*')
      .eq('claim_id', claimId);

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  }

  async initiatePayment(
    claimId: string,
    paymentData: Partial<Payment>
  ): Promise<{ data: Payment | null; error: string | null }> {
    const userId = this.authService.user()?.id;
    if (!userId) return { data: null, error: 'Not authenticated' };

    const payment = {
      ...paymentData,
      claim_id: claimId,
      initiated_by: userId,
      status: 'PROCESSING',
      neft_initiated_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase
      .from('payments')
      .insert(payment)
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    await this.createAuditEvent('PAYMENT', data.id, 'INITIATE', null, { amount: paymentData.amount });

    // Update claim status
    await this.transitionClaimStatus(claimId, 'PAYMENT_PROCESSING');

    return { data, error: null };
  }

  async simulatePaymentResult(
    paymentId: string,
    success: boolean
  ): Promise<{ success: boolean; error: string | null }> {
    const { data: payment } = await this.supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .maybeSingle();

    if (!payment) return { success: false, error: 'Payment not found' };

    const updateData: Partial<Payment> = {
      status: success ? 'SUCCESS' : 'FAILED',
      neft_completed_at: new Date().toISOString(),
    };

    if (success) {
      updateData.utr_number = 'UTR' + Date.now();
    } else {
      updateData.failure_reason = 'Bank verification failed - Incorrect account details';
    }

    const { error } = await this.supabase
      .from('payments')
      .update(updateData)
      .eq('id', paymentId);

    if (error) return { success: false, error: error.message };

    // Update claim status
    const claimStatus = success ? 'PAYMENT_SUCCESS' : 'PAYMENT_FAILED';
    await this.transitionClaimStatus(payment.claim_id, claimStatus);

    // Auto-close on success
    if (success) {
      await this.autoCloseClaim(payment.claim_id);
    }

    await this.createAuditEvent('PAYMENT', paymentId, success ? 'SUCCESS' : 'FAILED', { status: 'PROCESSING' }, { status: updateData.status });

    return { success: true, error: null };
  }

  // Closure
  async autoCloseClaim(claimId: string): Promise<{ success: boolean; error: string | null }> {
    const userId = this.authService.user()?.id;

    const closureData = {
      claim_id: claimId,
      closure_type: 'AUTO_CLOSE',
      closed_by: userId,
      closure_date: new Date().toISOString(),
      settlement_letter_sent: true,
    };

    const { error: closureError } = await this.supabase
      .from('closures')
      .insert(closureData);

    if (closureError) return { success: false, error: closureError.message };

    await this.supabase
      .from('claims')
      .update({
        status: 'CLOSED',
        closed_at: new Date().toISOString(),
        closed_by: userId,
        settlement_letter_sent: true,
      })
      .eq('id', claimId);

    await this.createAuditEvent('CLAIM', claimId, 'AUTO_CLOSE', null, null);

    return { success: true, error: null };
  }

  async closeClaim(
    claimId: string,
    reason: string
  ): Promise<{ success: boolean; error: string | null }> {
    const userId = this.authService.user()?.id;

    const closureData = {
      claim_id: claimId,
      closure_type: 'MANUAL_CLOSE',
      closed_by: userId,
      closure_reason: reason,
      closure_date: new Date().toISOString(),
    };

    const { error } = await this.supabase.from('closures').insert(closureData);

    if (error) return { success: false, error: error.message };

    await this.supabase
      .from('claims')
      .update({
        status: 'CLOSED',
        closed_at: new Date().toISOString(),
        closed_by: userId,
        closure_reason: reason,
      })
      .eq('id', claimId);

    await this.createAuditEvent('CLAIM', claimId, 'MANUAL_CLOSE', null, { reason });

    return { success: true, error: null };
  }

  // Reopen
  async requestReopen(
    claimId: string,
    reasonCode: number,
    reasonText: string
  ): Promise<{ data: Reopen | null; error: string | null }> {
    const userId = this.authService.user()?.id;
    if (!userId) return { data: null, error: 'Not authenticated' };

    const reopenData = {
      claim_id: claimId,
      reason_code: reasonCode,
      reason_text: reasonText,
      requested_by: userId,
      requested_at: new Date().toISOString(),
      maker_status: 'PENDING',
      checker_status: 'PENDING',
    };

    const { data, error } = await this.supabase
      .from('reopens')
      .insert(reopenData)
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    await this.createAuditEvent('REOPEN', data.id, 'REQUEST', null, { reasonCode, reasonText });

    return { data, error: null };
  }

  async approveReopenMaker(
    reopenId: string,
    comments?: string
  ): Promise<{ success: boolean; error: string | null }> {
    const userId = this.authService.user()?.id;

    const { error } = await this.supabase
      .from('reopens')
      .update({
        maker_status: 'APPROVED',
        maker_comments: comments,
        maker_approved_by: userId,
        maker_approved_at: new Date().toISOString(),
      })
      .eq('id', reopenId);

    if (error) return { success: false, error: error.message };

    await this.createAuditEvent('REOPEN', reopenId, 'MAKER_APPROVE', null, { comments });
    return { success: true, error: null };
  }

  async approveReopenChecker(
    reopenId: string,
    comments?: string
  ): Promise<{ success: boolean; error: string | null }> {
    const userId = this.authService.user()?.id;

    const { data: reopen } = await this.supabase
      .from('reopens')
      .select('*')
      .eq('id', reopenId)
      .maybeSingle();

    if (!reopen) return { success: false, error: 'Reopen request not found' };
    if (reopen.maker_status !== 'APPROVED') {
      return { success: false, error: 'Maker approval required first' };
    }

    const { error } = await this.supabase
      .from('reopens')
      .update({
        checker_status: 'APPROVED',
        checker_comments: comments,
        checker_approved_by: userId,
        checker_approved_at: new Date().toISOString(),
      })
      .eq('id', reopenId);

    if (error) return { success: false, error: error.message };

    // Update claim status
    await this.supabase
      .from('claims')
      .update({ status: 'REOPENED', updated_at: new Date().toISOString() })
      .eq('id', reopen.claim_id);

    await this.createAuditEvent('REOPEN', reopenId, 'CHECKER_APPROVE', null, { comments });
    await this.createAuditEvent('CLAIM', reopen.claim_id, 'REOPENED', { status: 'CLOSED' }, { status: 'REOPENED' });

    return { success: true, error: null };
  }

  async getReopens(claimId: string): Promise<{ data: Reopen[] | null; error: string | null }> {
    const { data, error } = await this.supabase
      .from('reopens')
      .select('*')
      .eq('claim_id', claimId)
      .order('requested_at', { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  }

  // Audit events
  async getAuditEvents(
    entityType: string,
    entityId: string
  ): Promise<{ data: AuditEvent[] | null; error: string | null }> {
    const { data, error } = await this.supabase
      .from('audit_events')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('performed_at', { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  }

  async getClaimAuditTrail(claimId: string): Promise<{ data: AuditEvent[] | null; error: string | null }> {
    // Get all audit events for a claim including related entities
    const { data, error } = await this.supabase
      .from('audit_events')
      .select('*')
      .or(`entity_id.eq.${claimId},metadata->claim_id.eq.${claimId}`)
      .order('performed_at', { ascending: true });

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  }

  private async createAuditEvent(
    entityType: string,
    entityId: string,
    action: string,
    oldValues: Record<string, unknown> | null,
    newValues: Record<string, unknown> | null
  ): Promise<void> {
    const userId = this.authService.user()?.id;
    if (!userId) return;

    await this.supabase.from('audit_events').insert({
      entity_type: entityType,
      entity_id: entityId,
      action,
      old_values: oldValues,
      new_values: newValues,
      performed_by: userId,
      performed_at: new Date().toISOString(),
    });
  }

  // Tasks
  async getTasks(userId?: string): Promise<{ data: TaskQueue[] | null; error: string | null }> {
    let query = this.supabase
      .from('task_queue')
      .select('*, claim:claims(*)')
      .eq('status', 'PENDING')
      .order('priority', { ascending: true });

    if (userId) {
      query = query.eq('assigned_to', userId);
    }

    const { data, error } = await query;

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  }

  // Dashboard stats
  async getDashboardStats(): Promise<{ data: DashboardStats | null; error: string | null }> {
    const [
      { count: totalClaims },
      { count: pendingAssessment },
      { count: pendingApproval },
      { count: pendingPayment },
      { data: closedThisMonth },
      { data: reopenedThisMonth },
      { data: claims },
    ] = await Promise.all([
      this.supabase.from('claims').select('*', { count: 'exact', head: true }),
      this.supabase.from('claims').select('*', { count: 'exact', head: true }).eq('status', 'ASSESSMENT_PENDING'),
      this.supabase.from('claims').select('*', { count: 'exact', head: true }).eq('status', 'APPROVAL_PENDING'),
      this.supabase.from('claims').select('*', { count: 'exact', head: true }).eq('status', 'PAYMENT_PENDING'),
      this.supabase.from('closures').select('*').gte('closure_date', new Date(new Date().setDate(1)).toISOString()),
      this.supabase.from('reopens').select('*').gte('requested_at', new Date(new Date().setDate(1)).toISOString()),
      this.supabase.from('claims').select('approved_amount, settlement_amount'),
    ]);

    const totalClaimAmount = claims?.reduce((sum, c) => sum + (c.approved_amount || c.settlement_amount || 0), 0) || 0;

    return {
      data: {
        total_claims: totalClaims || 0,
        pending_assessment: pendingAssessment || 0,
        pending_approval: pendingApproval || 0,
        pending_payment: pendingPayment || 0,
        closed_this_month: closedThisMonth?.length || 0,
        reopened_this_month: reopenedThisMonth?.length || 0,
        total_claim_amount: totalClaimAmount,
        average_processing_time: 0,
      },
      error: null,
    };
  }

  // Helper: Format amount in paise to rupees
  formatAmount(paise: number | undefined | null): string {
    if (!paise) return '₹0';
    return '₹' + (paise / 100).toLocaleString('en-IN');
  }

  // Helper: Parse amount from rupees to paise
  parseAmount(rupees: string): number {
    const cleanAmount = rupees.replace(/[^0-9.]/g, '');
    return Math.round(parseFloat(cleanAmount) * 100);
  }
}
