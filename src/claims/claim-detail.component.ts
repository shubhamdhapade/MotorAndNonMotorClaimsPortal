import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import type { Claim, ClaimMotorDetails, ClaimDamageMap, Document, Payment, AuditEvent, Reopen, ClaimStatus, STATUS_TRANSITIONS } from '../models';

@Component({
  selector: 'app-claim-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatExpansionModule,
    MatListModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <div class="claim-detail-container">
      @if (isLoading()) {
        <div class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else if (claim()) {
        <div class="claim-header">
          <div class="header-left">
            <button mat-icon-button routerLink="/claims" class="back-btn">
              <mat-icon>arrow_back</mat-icon>
            </button>
            <div class="claim-info">
              <h1>{{ claim()?.claim_number }}</h1>
              <mat-chip [color]="getStatusColor(claim()!.status)" selected>
                {{ formatStatus(claim()!.status) }}
              </mat-chip>
            </div>
          </div>
          <div class="header-actions">
            @if (canTransition()) {
              <button mat-raised-button color="primary" (click)="showTransitionDialog = true">
                <mat-icon>swap_horiz</mat-icon>
                Change Status
              </button>
            }
            @if (canReopen()) {
              <button mat-raised-button color="accent" (click)="showReopenDialog = true">
                <mat-icon>reopen_in_new</mat-icon>
                Reopen
              </button>
            }
            @if (canAssess()) {
              <button mat-raised-button color="primary" [routerLink]="['/assessment', claim()?.id]">
                <mat-icon>assignment</mat-icon>
                Assess
              </button>
            }
            @if (canApprove()) {
              <button mat-raised-button color="primary" [routerLink]="['/approvals', claim()?.id]">
                <mat-icon>check_circle</mat-icon>
                Approve
              </button>
            }
            @if (canPay()) {
              <button mat-raised-button color="primary" [routerLink]="['/payments', claim()?.id]">
                <mat-icon>payment</mat-icon>
                Process Payment
              </button>
            }
          </div>
        </div>

        <div class="claim-content">
          <div class="left-column">
            <!-- Claim Summary Card -->
            <mat-card class="summary-card">
              <mat-card-header>
                <mat-card-title>Claim Summary</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="info-grid">
                  <div class="info-item">
                    <span class="label">Policy Number</span>
                    <span class="value">{{ claim()?.policy?.policy_number }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Insurer</span>
                    <span class="value">{{ claim()?.insurer?.name }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Policy Holder</span>
                    <span class="value">{{ claim()?.policy?.policy_holder_name }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Vehicle Type</span>
                    <span class="value">{{ claim()?.vehicle_type }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Registration No.</span>
                    <span class="value">{{ claim()?.vehicle_registration_number }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Loss Type</span>
                    <span class="value">{{ claim()?.loss_type }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Loss Date</span>
                    <span class="value">{{ claim()?.loss_date | date:'dd MMM yyyy HH:mm' }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Loss Location</span>
                    <span class="value">{{ claim()?.loss_location || 'N/A' }}</span>
                  </div>
                  <div class="info-item full-width">
                    <span class="label">Loss Description</span>
                    <span class="value">{{ claim()?.loss_description || 'N/A' }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Estimated Loss</span>
                    <span class="value">{{ formatAmount(claim()?.estimated_loss_amount) }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Approved Amount</span>
                    <span class="value">{{ formatAmount(claim()?.approved_amount) }}</span>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>

            <!-- Motor Details Card -->
            @if (motorDetails()) {
              <mat-card class="motor-details-card">
                <mat-card-header>
                  <mat-card-title>Motor Details</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="info-grid">
                    <div class="info-item">
                      <span class="label">Driver Name</span>
                      <span class="value">{{ motorDetails()?.driver_name || 'N/A' }}</span>
                    </div>
                    <div class="info-item">
                      <span class="label">License No.</span>
                      <span class="value">{{ motorDetails()?.driver_license_number || 'N/A' }}</span>
                    </div>
                    <div class="info-item">
                      <span class="label">FIR Number</span>
                      <span class="value">{{ motorDetails()?.fir_number || 'N/A' }}</span>
                    </div>
                    <div class="info-item">
                      <span class="label">Third Party</span>
                      <span class="value">{{ motorDetails()?.third_party_involved ? 'Yes' : 'No' }}</span>
                    </div>
                    <div class="info-item">
                      <span class="label">Passengers</span>
                      <span class="value">{{ motorDetails()?.passengers_count }}</span>
                    </div>
                    <div class="info-item">
                      <span class="label">Injuries</span>
                      <span class="value">{{ motorDetails()?.injuries }}</span>
                    </div>
                    <div class="info-item">
                      <span class="label">Fatalities</span>
                      <span class="value">{{ motorDetails()?.fatalities }}</span>
                    </div>
                    <div class="info-item">
                      <span class="label">Garage</span>
                      <span class="value">{{ motorDetails()?.garage_name || 'N/A' }}</span>
                    </div>
                    <div class="info-item">
                      <span class="label">Surveyor</span>
                      <span class="value">{{ motorDetails()?.surveyor_name || 'N/A' }}</span>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>
            }

            <!-- Damage Parts Card -->
            @if (damages()?.length) {
              <mat-card class="damages-card">
                <mat-card-header>
                  <mat-card-title>Damage Parts ({{ damages()?.length }})</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="damages-list">
                    @for (damage of damages(); track damage.id) {
                      <div class="damage-item">
                        <mat-chip>{{ damage.part_name }}</mat-chip>
                        <span class="damage-side">{{ damage.side }}</span>
                        <span class="damage-severity">{{ damage.damage_severity }}</span>
                        <span class="damage-cost">{{ formatAmount(damage.estimated_repair_cost) }}</span>
                      </div>
                    }
                  </div>
                </mat-card-content>
              </mat-card>
            }
          </div>

          <div class="right-column">
            <!-- Documents Card -->
            <mat-card class="documents-card">
              <mat-card-header>
                <mat-card-title>Documents ({{ documents()?.length || 0 }})</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                @if (documents()?.length) {
                  <mat-list>
                    @for (doc of documents(); track doc.id) {
                      <mat-list-item>
                        <mat-icon matListItemIcon>{{ doc.is_verified ? 'check_circle' : 'description' }}</mat-icon>
                        <span matListItemTitle>{{ doc.document_name }}</span>
                        <span matListItemLine>{{ doc.document_type }}</span>
                      </mat-list-item>
                    }
                  </mat-list>
                } @else {
                  <p class="no-data">No documents uploaded</p>
                }
              </mat-card-content>
            </mat-card>

            <!-- Payments Card -->
            @if (payments()?.length) {
              <mat-card class="payments-card">
                <mat-card-header>
                  <mat-card-title>Payments</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  @for (payment of payments(); track payment.id) {
                    <div class="payment-item">
                      <div class="payment-header">
                        <span class="payment-number">{{ payment.payment_number }}</span>
                        <mat-chip [color]="payment.status === 'SUCCESS' ? 'accent' : payment.status === 'FAILED' ? 'warn' : 'primary'" selected>
                          {{ payment.status }}
                        </mat-chip>
                      </div>
                      <div class="payment-details">
                        <span>Amount: {{ formatAmount(payment.amount) }}</span>
                        <span>Beneficiary: {{ payment.beneficiary_name }}</span>
                        @if (payment.utr_number) {
                          <span>UTR: {{ payment.utr_number }}</span>
                        }
                      </div>
                    </div>
                  }
                </mat-card-content>
              </mat-card>
            }

            <!-- Reopens Card -->
            @if (reopens()?.length) {
              <mat-card class="reopens-card">
                <mat-card-header>
                  <mat-card-title>Reopen History</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  @for (reopen of reopens(); track reopen.id) {
                    <div class="reopen-item">
                      <div class="reopen-header">
                        <span>Reason: {{ reopen.reason_text }}</span>
                        <mat-chip [color]="reopen.checker_status === 'APPROVED' ? 'accent' : 'warn'" selected>
                          {{ reopen.checker_status }}
                        </mat-chip>
                      </div>
                      <small>Requested: {{ reopen.requested_at | date:'dd MMM yyyy' }}</small>
                    </div>
                  }
                </mat-card-content>
              </mat-card>
            }
          </div>
        </div>

        <!-- Audit Timeline -->
        <mat-card class="audit-card">
          <mat-card-header>
            <mat-card-title>Audit Trail</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @if (auditEvents()?.length) {
              <div class="timeline">
                @for (event of auditEvents(); track event.id; let i = $index) {
                  <div class="timeline-item" [class.first]="i === 0">
                    <div class="timeline-marker"></div>
                    <div class="timeline-content">
                      <div class="timeline-header">
                        <span class="timeline-action">{{ event.action }}</span>
                        <span class="timeline-date">{{ event.performed_at | date:'dd MMM yyyy HH:mm' }}</span>
                      </div>
                      <div class="timeline-details">
                        <span>{{ event.entity_type }}</span>
                        @if (event.new_values) {
                          <pre class="timeline-values">{{ event.new_values | json }}</pre>
                        }
                      </div>
                    </div>
                  </div>
                }
              </div>
            } @else {
              <p class="no-data">No audit events found</p>
            }
          </mat-card-content>
        </mat-card>

        <!-- Transition Dialog -->
        @if (showTransitionDialog) {
          <div class="dialog-overlay" (click)="showTransitionDialog = false">
            <div class="dialog-content" (click)="$event.stopPropagation()">
              <h3>Change Status</h3>
              <mat-list>
                @for (status of availableTransitions(); track status) {
                  <mat-list-item (click)="transitionStatus(status)" style="cursor: pointer;">
                    <mat-icon matListItemIcon>arrow_forward</mat-icon>
                    <span matListItemTitle>{{ formatStatus(status) }}</span>
                  </mat-list-item>
                }
              </mat-list>
              <button mat-stroked-button (click)="showTransitionDialog = false">Cancel</button>
            </div>
          </div>
        }

        <!-- Reopen Dialog -->
        @if (showReopenDialog) {
          <div class="dialog-overlay" (click)="showReopenDialog = false">
            <div class="dialog-content" (click)="$event.stopPropagation()">
              <h3>Reopen Claim</h3>
              <div class="reopen-form">
                <mat-form-field appearance="outline">
                  <mat-label>Reason Code</mat-label>
                  <mat-select [(ngModel)]="reopenReasonCode">
                    @for (item of reasonCodes | keyvalue; track item.key) {
                      <mat-option [value]="item.key">{{ item.key }}: {{ item.value }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Reason Text</mat-label>
                  <textarea matInput [(ngModel)]="reopenReasonText" rows="3"></textarea>
                </mat-form-field>
              </div>
              <div class="dialog-actions">
                <button mat-stroked-button (click)="showReopenDialog = false">Cancel</button>
                <button mat-raised-button color="primary" (click)="submitReopen()" [disabled]="!reopenReasonCode || !reopenReasonText">
                  Submit
                </button>
              </div>
            </div>
          </div>
        }
      } @else {
        <mat-card>
          <mat-card-content>
            <p class="no-data">Claim not found</p>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .claim-detail-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 400px;
    }

    .claim-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .claim-info {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .claim-info h1 {
      margin: 0;
      font-size: 28px;
    }

    .back-btn {
      background: white;
    }

    .header-actions {
      display: flex;
      gap: 12px;
    }

    .claim-content {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 24px;
    }

    @media (max-width: 992px) {
      .claim-content {
        grid-template-columns: 1fr;
      }
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
    }

    .info-item.full-width {
      grid-column: 1 / -1;
    }

    .info-item .label {
      font-size: 12px;
      color: #666;
      margin-bottom: 4px;
    }

    .info-item .value {
      font-size: 14px;
      font-weight: 500;
    }

    .damages-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .damage-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px;
      background: #f5f5f5;
      border-radius: 4px;
    }

    .damage-side, .damage-severity {
      font-size: 12px;
      color: #666;
    }

    .damage-cost {
      margin-left: auto;
      font-weight: 500;
    }

    .payment-item, .reopen-item {
      padding: 12px;
      border-bottom: 1px solid #eee;
    }

    .payment-header, .reopen-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .payment-number {
      font-weight: 600;
    }

    .payment-details {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 12px;
      color: #666;
    }

    .timeline {
      position: relative;
      padding-left: 24px;
    }

    .timeline-item {
      position: relative;
      padding: 8px 0 24px 24px;
      border-left: 2px solid #e0e0e0;
    }

    .timeline-item.first {
      border-left-color: #1a237e;
    }

    .timeline-marker {
      position: absolute;
      left: -8px;
      top: 12px;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #1a237e;
    }

    .timeline-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .timeline-action {
      font-weight: 600;
    }

    .timeline-date {
      font-size: 12px;
      color: #666;
    }

    .timeline-values {
      background: #f5f5f5;
      padding: 8px;
      border-radius: 4px;
      font-size: 11px;
      overflow-x: auto;
    }

    .no-data {
      text-align: center;
      color: #999;
      padding: 24px;
    }

    .dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }

    .dialog-content {
      background: white;
      padding: 24px;
      border-radius: 8px;
      min-width: 400px;
      max-width: 500px;
    }

    .dialog-content h3 {
      margin: 0 0 16px;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 16px;
    }

    .reopen-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
  `],
})
export class ClaimDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  claim = signal<Claim | null>(null);
  motorDetails = signal<ClaimMotorDetails | null>(null);
  damages = signal<ClaimDamageMap[]>([]);
  documents = signal<Document[]>([]);
  payments = signal<Payment[]>([]);
  reopens = signal<Reopen[]>([]);
  auditEvents = signal<AuditEvent[]>([]);

  isLoading = signal(true);
  showTransitionDialog = false;
  showReopenDialog = false;

  reopenReasonCode: number = 1;
  reopenReasonText = '';

  reasonCodes = {
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

  availableTransitions = signal<ClaimStatus[]>([]);

  async ngOnInit() {
    const claimId = this.route.snapshot.paramMap.get('id');
    if (!claimId) {
      this.snackBar.open('Invalid claim ID', 'Close', { duration: 3000 });
      this.router.navigate(['/claims']);
      return;
    }

    await this.loadClaimData(claimId);
  }

  async loadClaimData(claimId: string) {
    this.isLoading.set(true);

    const [claimRes, motorRes, damagesRes, docsRes, paymentsRes, reopensRes, auditRes] = await Promise.all([
      this.api.getClaimById(claimId),
      this.api.getClaimMotorDetails(claimId),
      this.api.getClaimDamages(claimId),
      this.api.getDocuments(claimId),
      this.api.getPayments(claimId),
      this.api.getReopens(claimId),
      this.api.getClaimAuditTrail(claimId),
    ]);

    if (claimRes.data) {
      this.claim.set(claimRes.data);
      this.updateAvailableTransitions(claimRes.data.status);
    }

    if (motorRes.data) this.motorDetails.set(motorRes.data);
    if (damagesRes.data) this.damages.set(damagesRes.data);
    if (docsRes.data) this.documents.set(docsRes.data);
    if (paymentsRes.data) this.payments.set(paymentsRes.data);
    if (reopensRes.data) this.reopens.set(reopensRes.data);
    if (auditRes.data) this.auditEvents.set(auditRes.data);

    this.isLoading.set(false);
  }

  private updateAvailableTransitions(status: ClaimStatus) {
    const transitions: Record<ClaimStatus, ClaimStatus[]> = {
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
    this.availableTransitions.set(transitions[status] || []);
  }

  canTransition(): boolean {
    return this.availableTransitions().length > 0 && this.auth.hasRole(['SYSTEM_ADMIN', 'FNOL_ASSISTANT']);
  }

  canReopen(): boolean {
    return this.claim()?.status === 'CLOSED' && this.auth.hasRole(['CLOSURE_ASSISTANT', 'SYSTEM_ADMIN']);
  }

  canAssess(): boolean {
    const status = this.claim()?.status;
    return (status === 'ASSESSMENT_PENDING' || status === 'REOPENED') &&
           this.auth.hasRole(['ASSESSOR_ASSISTANT', 'SYSTEM_ADMIN']);
  }

  canApprove(): boolean {
    return this.claim()?.status === 'APPROVAL_PENDING' &&
           this.auth.hasRole(['APPROVALS_ASSISTANT', 'SYSTEM_ADMIN']);
  }

  canPay(): boolean {
    return this.claim()?.status === 'PAYMENT_PENDING' &&
           this.auth.hasRole(['PAYMENTS_ASSISTANT', 'SYSTEM_ADMIN']);
  }

  async transitionStatus(newStatus: ClaimStatus) {
    const claimId = this.claim()?.id;
    if (!claimId) return;

    const result = await this.api.transitionClaimStatus(claimId, newStatus);

    if (result.success) {
      this.snackBar.open(`Status changed to ${this.formatStatus(newStatus)}`, 'Close', { duration: 3000 });
      this.showTransitionDialog = false;
      await this.loadClaimData(claimId);
    } else {
      this.snackBar.open(result.error || 'Failed to change status', 'Close', { duration: 5000 });
    }
  }

  async submitReopen() {
    const claimId = this.claim()?.id;
    if (!claimId) return;

    const result = await this.api.requestReopen(claimId, this.reopenReasonCode, this.reopenReasonText);

    if (result.data) {
      this.snackBar.open('Reopen request submitted for maker-checker approval', 'Close', { duration: 3000 });
      this.showReopenDialog = false;
      await this.loadClaimData(claimId);
    } else {
      this.snackBar.open(result.error || 'Failed to submit reopen request', 'Close', { duration: 5000 });
    }
  }

  formatStatus(status: ClaimStatus): string {
    return status.replace(/_/g, ' ').replace(/\w\S*/g, txt =>
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  }

  getStatusColor(status: ClaimStatus): 'primary' | 'accent' | 'warn' {
    const greenStatuses = ['APPROVED', 'PAYMENT_SUCCESS', 'CLOSED'];
    const redStatuses = ['REJECTED', 'PAYMENT_FAILED'];

    if (greenStatuses.includes(status)) return 'accent';
    if (redStatuses.includes(status)) return 'warn';
    return undefined as unknown as 'primary';
  }

  formatAmount(paise?: number | null): string {
    return this.api.formatAmount(paise);
  }
}
