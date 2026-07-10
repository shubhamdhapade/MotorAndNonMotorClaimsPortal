import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import type { Claim } from '../models';

@Component({
  selector: 'app-approvals',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="approvals-container">
      @if (isLoading()) {
        <div class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else if (claim()) {
        <div class="approvals-header">
          <div class="header-left">
            <button mat-icon-button routerLink="/claims" class="back-btn">
              <mat-icon>arrow_back</mat-icon>
            </button>
            <div class="claim-info">
              <h1>Approval Review: {{ claim()?.claim_number }}</h1>
              <span class="policy-info">Policy: {{ claim()?.policy?.policy_number }}</span>
            </div>
          </div>
        </div>

        <div class="approvals-content">
          <div class="main-column">
            <!-- Claim Summary -->
            <mat-card class="summary-card">
              <mat-card-header>
                <mat-card-title>Claim Summary</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="info-grid">
                  <div class="info-item">
                    <span class="label">Insurer</span>
                    <span class="value">{{ claim()?.insurer?.name }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Policy Holder</span>
                    <span class="value">{{ claim()?.policy?.policy_holder_name }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Vehicle</span>
                    <span class="value">{{ claim()?.vehicle_type }} - {{ claim()?.vehicle_registration_number }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Loss Type</span>
                    <span class="value">{{ claim()?.loss_type }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Loss Date</span>
                    <span class="value">{{ claim()?.loss_date | date:'dd MMM yyyy' }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Assessment Status</span>
                    <mat-chip color="primary" selected>Completed</mat-chip>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>

            <!-- Assessment Details -->
            <mat-card class="assessment-card">
              <mat-card-header>
                <mat-card-title>Assessment Details</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="assessment-info">
                  <div class="info-row">
                    <span class="label">Estimated Loss Amount</span>
                    <span class="value highlight">{{ formatAmount(claim()?.estimated_loss_amount) }}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Assessment Completed On</span>
                    <span class="value">{{ claim()?.assessment_completed_at | date:'dd MMM yyyy' }}</span>
                  </div>
                  @if (motorDetails()?.surveyor_name) {
                    <div class="info-row">
                      <span class="label">Surveyor</span>
                      <span class="value">{{ motorDetails()?.surveyor_name }}</span>
                    </div>
                  }
                  @if (motorDetails()?.garage_name) {
                    <div class="info-row">
                      <span class="label">Garage</span>
                      <span class="value">{{ motorDetails()?.garage_name }}</span>
                    </div>
                  }
                </div>

                <div class="loss-details">
                  <h4>Loss Description</h4>
                  <p>{{ claim()?.loss_description }}</p>
                </div>
              </mat-card-content>
            </mat-card>

            <!-- Approval Threshold Indicator -->
            <mat-card class="threshold-card">
              <mat-card-header>
                <mat-card-title>Approval Threshold Analysis</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="threshold-visualization">
                  <div class="threshold-bar">
                    <div class="threshold-segment auto" [style.width.%]="(100 / 500) * 100">
                      <span>Auto (&lt;₹1L)</span>
                    </div>
                    <div class="threshold-segment supervisor" [style.width.%]="(400 / 500) * 100">
                      <span>Supervisor (₹1L-5L)</span>
                    </div>
                    <div class="threshold-segment manager" [style.width.%]="0">
                      <span>Manager (&gt;₹5L)</span>
                    </div>
                  </div>

                  <div class="amount-marker" [style.left.%]="getMarkerPosition()">
                    <div class="marker-line"></div>
                    <div class="marker-label">{{ formatAmount(claim()?.estimated_loss_amount) }}</div>
                  </div>
                </div>

                <div class="threshold-result">
                  <mat-icon [color]="approvalLevel() === 'AUTO' ? 'primary' : 'accent'">
                    {{ approvalLevel() === 'AUTO' ? 'check_circle' : 'gavel' }}
                  </mat-icon>
                  <div class="result-text">
                    <h4>{{ approvalLevel() === 'AUTO' ? 'Auto Approval Eligible' : 'Manual Approval Required' }}</h4>
                    <p>{{ getApprovalMessage() }}</p>
                  </div>
                </div>

                @if (approvalLevel() !== 'AUTO') {
                  <div class="special-approval">
                    <h5>Special Approval Markers</h5>
                    <div class="markers-list">
                      @if (claim()?.loss_type === 'THEFT') {
                        <mat-chip color="warn" selected>Theft Claim</mat-chip>
                      }
                      @if (motorDetails()?.fatalities! > 0) {
                        <mat-chip color="warn" selected>Fatality Involved</mat-chip>
                      }
                      @if (motorDetails()?.third_party_involved) {
                        <mat-chip color="accent" selected>Third Party Involved</mat-chip>
                      }
                    </div>
                  </div>
                }
              </mat-card-content>
            </mat-card>

            <!-- Approval Form -->
            <mat-card class="approval-form-card">
              <mat-card-header>
                <mat-card-title>Approval Decision</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <form [formGroup]="approvalForm" class="approval-form">
                  <div class="amount-section">
                    <mat-form-field appearance="outline" class="amount-field">
                      <mat-label>Approved Amount</mat-label>
                      <input matInput formControlName="approved_amount" placeholder="Enter approved amount">
                      <mat-icon matPrefix>currency_rupee</mat-icon>
                      <mat-hint>Maximum claimable: {{ formatAmount(claim()?.estimated_loss_amount) }}</mat-hint>
                      <mat-error *ngIf="approvalForm.get('approved_amount')?.hasError('required')">Required</mat-error>
                      <mat-error *ngIf="approvalForm.get('approved_amount')?.hasError('max')">Exceeds estimated amount</mat-error>
                    </mat-form-field>
                  </div>

                  <div class="decision-section">
                    <h4>Decision</h4>
                    <div class="decision-buttons">
                      <button mat-raised-button color="primary" (click)="approveClaim()" [disabled]="approvalForm.invalid || isSubmitting()">
                        @if (isSubmitting()) {
                          <mat-spinner diameter="20"></mat-spinner>
                        } @else {
                          <mat-icon>check_circle</mat-icon>
                          <span>Approve</span>
                        }
                      </button>

                      <button mat-stroked-button color="warn" (click)="showRejectDialog = true">
                        <mat-icon>cancel</mat-icon>
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>

                  <div class="notes-section">
                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Approval Notes (Optional)</mat-label>
                      <textarea matInput formControlName="approval_notes" rows="3"></textarea>
                    </mat-form-field>
                  </div>
                </form>
              </mat-card-content>
            </mat-card>
          </div>

          <div class="side-column">
            <!-- Quick Stats -->
            <mat-card class="stats-card">
              <mat-card-header>
                <mat-card-title>Quick Stats</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="stat-item">
                  <span class="stat-label">Claim Age</span>
                  <span class="stat-value">{{ getClaimAge() }} days</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Sum Insured</span>
                  <span class="stat-value">{{ formatAmount(claim()?.policy?.sum_insured) }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Premium</span>
                  <span class="stat-value">{{ formatAmount(claim()?.policy?.premium) }}</span>
                </div>
              </mat-card-content>
            </mat-card>

            <!-- Approval History -->
            <mat-card class="history-card">
              <mat-card-header>
                <mat-card-title>Workflow History</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="timeline">
                  <div class="timeline-item">
                    <span class="timeline-status">FNOL Submitted</span>
                    <span class="timeline-date">{{ claim()?.fnol_submitted_at | date:'dd MMM' }}</span>
                  </div>
                  <div class="timeline-item">
                    <span class="timeline-status">Assessment Completed</span>
                    <span class="timeline-date">{{ claim()?.assessment_completed_at | date:'dd MMM' }}</span>
                  </div>
                  <div class="timeline-item current">
                    <span class="timeline-status">Pending Approval</span>
                    <span class="timeline-date">Today</span>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </div>

        <!-- Reject Dialog -->
        @if (showRejectDialog) {
          <div class="dialog-overlay" (click)="showRejectDialog = false">
            <div class="dialog-content" (click)="$event.stopPropagation()">
              <h3>Reject Claim</h3>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Rejection Reason</mat-label>
                <textarea matInput [(ngModel)]="rejectionReason" rows="4" placeholder="Provide detailed reason for rejection..."></textarea>
              </mat-form-field>
              <div class="dialog-actions">
                <button mat-stroked-button (click)="showRejectDialog = false">Cancel</button>
                <button mat-raised-button color="warn" (click)="rejectClaim()" [disabled]="!rejectionReason">
                  Reject Claim
                </button>
              </div>
            </div>
          </div>
        }
      } @else {
        <mat-card>
          <mat-card-content>
            <p>Claim not found or not pending approval</p>
            <button mat-raised-button routerLink="/claims">Back to Claims</button>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .approvals-container {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 400px;
    }

    .approvals-header {
      margin-bottom: 24px;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .back-btn {
      background: white;
    }

    .claim-info h1 {
      margin: 0;
      font-size: 24px;
    }

    .policy-info {
      color: #666;
    }

    .approvals-content {
      display: grid;
      grid-template-columns: 1fr 300px;
      gap: 24px;
    }

    @media (max-width: 992px) {
      .approvals-content {
        grid-template-columns: 1fr;
      }
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    .info-item .label, .info-row .label {
      font-size: 12px;
      color: #666;
    }

    .info-item .value, .info-row .value {
      font-weight: 500;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #eee;
    }

    .highlight {
      font-size: 20px;
      color: #1a237e;
    }

    .threshold-visualization {
      position: relative;
      height: 60px;
      margin-bottom: 24px;
    }

    .threshold-bar {
      display: flex;
      height: 40px;
      border-radius: 4px;
      overflow: hidden;
    }

    .threshold-segment {
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 12px;
    }

    .threshold-segment.auto {
      background: #4caf50;
    }

    .threshold-segment.supervisor {
      background: #ff9800;
    }

    .threshold-segment.manager {
      background: #f44336;
    }

    .amount-marker {
      position: absolute;
      top: 0;
      transform: translateX(-50%);
    }

    .marker-line {
      width: 2px;
      height: 50px;
      background: #1a237e;
      margin: 0 auto;
    }

    .marker-label {
      background: #1a237e;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }

    .threshold-result {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: #e8f5e9;
      border-radius: 8px;
      margin-bottom: 24px;
    }

    .threshold-result mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .result-text h4 {
      margin: 0;
    }

    .result-text p {
      margin: 4px 0 0;
      color: #666;
    }

    .special-approval {
      padding: 16px;
      background: #fff3e0;
      border-radius: 8px;
    }

    .special-approval h5 {
      margin: 0 0 12px;
    }

    .markers-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .amount-section {
      margin-bottom: 24px;
    }

    .amount-field {
      width: 100%;
    }

    .decision-section h4 {
      margin-bottom: 16px;
    }

    .decision-buttons {
      display: flex;
      gap: 16px;
    }

    .decision-buttons button {
      padding: 12px 24px;
    }

    .notes-section {
      margin-top: 24px;
    }

    .full-width {
      width: 100%;
    }

    .stat-item {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #eee;
    }

    .stat-label {
      color: #666;
    }

    .stat-value {
      font-weight: 600;
    }

    .timeline-item {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-left: 2px solid #e0e0e0;
      padding-left: 16px;
      margin-left: 8px;
    }

    .timeline-item.current {
      border-left-color: #1a237e;
    }

    .timeline-status {
      font-weight: 500;
    }

    .timeline-date {
      font-size: 12px;
      color: #666;
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
  `],
})
export class ApprovalsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  claim = signal<Claim | null>(null);
  motorDetails = signal<any>(null);

  isLoading = signal(true);
  isSubmitting = signal(false);
  showRejectDialog = false;
  rejectionReason = '';

  approvalForm = this.fb.group({
    approved_amount: ['', [Validators.required]],
    approval_notes: [''],
  });

  approvalLevel = computed<'AUTO' | 'SUPERVISOR' | 'MANAGER'>(() => {
    const claim = this.claim();
    if (!claim) return 'SUPERVISOR';

    const amount = (claim.estimated_loss_amount || 0) / 100; // Convert from paise to rupees

    if (amount < 100000) return 'AUTO';
    if (amount <= 500000) return 'SUPERVISOR';
    return 'MANAGER';
  });

  async ngOnInit() {
    const claimId = this.route.snapshot.paramMap.get('id');
    if (!claimId) {
      this.router.navigate(['/claims']);
      return;
    }

    await this.loadData(claimId);
  }

  async loadData(claimId: string) {
    this.isLoading.set(true);

    const [claimRes, motorRes] = await Promise.all([
      this.api.getClaimById(claimId),
      this.api.getClaimMotorDetails(claimId),
    ]);

    if (claimRes.data) {
      this.claim.set(claimRes.data);

      if (claimRes.data.estimated_loss_amount) {
        this.approvalForm.patchValue({
          approved_amount: (claimRes.data.estimated_loss_amount / 100).toString(),
        });
      }
    }

    if (motorRes.data) {
      this.motorDetails.set(motorRes.data);
    }

    this.isLoading.set(false);
  }

  getMarkerPosition(): number {
    const amount = (this.claim()?.estimated_loss_amount || 0) / 100;
    const maxAmount = 10000000; // 1 crore max scale
    return Math.min((amount / maxAmount) * 100, 100);
  }

  getApprovalMessage(): string {
    const level = this.approvalLevel();
    const amount = (this.claim()?.estimated_loss_amount || 0) / 100;

    switch (level) {
      case 'AUTO':
        return 'Claims below INR 1 lakh are eligible for automatic approval.';
      case 'SUPERVISOR':
        return `Claims between INR 1-5 lakhs require supervisor approval. Current amount: INR ${amount.toLocaleString('en-IN')}.`;
      case 'MANAGER':
        return `Claims above INR 5 lakhs require manager approval. Additional documentation may be required.`;
      default:
        return '';
    }
  }

  getClaimAge(): number {
    const claimDate = this.claim()?.created_at;
    if (!claimDate) return 0;

    const created = new Date(claimDate);
    const now = new Date();
    const diff = now.getTime() - created.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  async approveClaim() {
    if (this.approvalForm.invalid) return;

    const claimId = this.claim()?.id;
    if (!claimId) return;

    this.isSubmitting.set(true);

    const approvedAmount = parseFloat(this.approvalForm.get('approved_amount')?.value || '0') * 100;
    const notes = this.approvalForm.get('approval_notes')?.value;

    const result = await this.api.transitionClaimStatus(claimId, 'APPROVED', {
      approved_amount: approvedAmount,
      approval_level: this.approvalLevel(),
    });

    if (result.success) {
      this.snackBar.open('Claim approved successfully!', 'Close', { duration: 3000 });
      this.router.navigate(['/claims', claimId]);
    } else {
      this.snackBar.open(result.error || 'Failed to approve claim', 'Close', { duration: 5000 });
    }

    this.isSubmitting.set(false);
  }

  async rejectClaim() {
    if (!this.rejectionReason.trim()) return;

    const claimId = this.claim()?.id;
    if (!claimId) return;

    this.isSubmitting.set(true);

    const result = await this.api.transitionClaimStatus(claimId, 'REJECTED', {
      rejection_reason: this.rejectionReason,
    });

    if (result.success) {
      this.snackBar.open('Claim rejected', 'Close', { duration: 3000 });
      this.router.navigate(['/claims', claimId]);
    } else {
      this.snackBar.open(result.error || 'Failed to reject claim', 'Close', { duration: 5000 });
    }

    this.isSubmitting.set(false);
    this.showRejectDialog = false;
  }

  formatAmount(paise?: number | null): string {
    return this.api.formatAmount(paise);
  }
}
