import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../services/api.service';
import type { Claim, Reopen, REOPEN_REASON_CODES } from '../models';

const REOPEN_REASONS: Record<number, string> = {
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

@Component({
  selector: 'app-closure',
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
    MatSelectModule,
    MatChipsModule,
    MatListModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="closure-container">
      @if (isLoading()) {
        <div class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else if (claim()) {
        <div class="closure-header">
          <div class="header-left">
            <button mat-icon-button routerLink="/claims" class="back-btn">
              <mat-icon>arrow_back</mat-icon>
            </button>
            <div class="claim-info">
              <h1>Closure Management: {{ claim()?.claim_number }}</h1>
              <span class="policy-info">Status: {{ claim()?.status }}</span>
            </div>
          </div>
        </div>

        <div class="closure-content">
          <!-- Claim Summary -->
          <mat-card class="summary-card">
            <mat-card-header>
              <mat-card-title>Claim Summary</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="info-grid">
                <div class="info-item">
                  <span class="label">Claim Number</span>
                  <span class="value">{{ claim()?.claim_number }}</span>
                </div>
                <div class="info-item">
                  <span class="label">Policy Number</span>
                  <span class="value">{{ claim()?.policy?.policy_number }}</span>
                </div>
                <div class="info-item">
                  <span class="label">Policy Holder</span>
                  <span class="value">{{ claim()?.policy?.policy_holder_name }}</span>
                </div>
                <div class="info-item">
                  <span class="label">Insurer</span>
                  <span class="value">{{ claim()?.insurer?.name }}</span>
                </div>
                <div class="info-item">
                  <span class="label">Approved Amount</span>
                  <span class="value">{{ formatAmount(claim()?.approved_amount) }}</span>
                </div>
                <div class="info-item">
                  <span class="label">Payment Status</span>
                  <mat-chip [color]="claim()?.status === 'PAYMENT_SUCCESS' ? 'accent' : 'warn'" selected>
                    {{ claim()?.status }}
                  </mat-chip>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Auto-Close Info -->
          @if (claim()?.status === 'PAYMENT_SUCCESS') {
            <mat-card class="auto-close-card">
              <mat-card-header>
                <mat-card-title>
                  <mat-icon color="primary">check_circle</mat-icon>
                  Auto-Close Eligible
                </mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <p>Payment was successful. This claim is eligible for automatic closure.</p>

                @if (!claim()?.settlement_letter_sent) {
                  <div class="settlement-alert">
                    <mat-icon color="warn">warning</mat-icon>
                    <span>Settlement letter needs to be sent before closure.</span>
                  </div>
                }

                <div class="closure-section">
                  <button mat-raised-button color="primary" (click)="autoClose()" [disabled]="isSubmitting() || !claim()?.settlement_letter_sent">
                    @if (isSubmitting()) {
                      <mat-spinner diameter="20"></mat-spinner>
                    }
                    <mat-icon>lock</mat-icon>
                    <span>Auto-Close Claim</span>
                  </button>

                  @if (!claim()?.settlement_letter_sent) {
                    <button mat-stroked-button (click)="sendSettlementLetter()" style="margin-left: 12px;">
                      <mat-icon>mail</mat-icon>
                      Mark Settlement Letter as Sent
                    </button>
                  }
                </div>
              </mat-card-content>
            </mat-card>
          }

          <!-- Manual Close Option -->
          @if (claim()?.status !== 'CLOSED') {
            <mat-card class="manual-close-card">
              <mat-card-header>
                <mat-card-title>Manual Closure</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <form [formGroup]="closureForm" class="closure-form">
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Closure Reason</mat-label>
                    <textarea matInput formControlName="closure_reason" rows="3" placeholder="Enter reason for manual closure..."></textarea>
                    <mat-error *ngIf="closureForm.get('closure_reason')?.hasError('required')">Required for manual closure</mat-error>
                  </mat-form-field>

                  <button mat-stroked-button color="warn" (click)="manualClose()" [disabled]="closureForm.invalid || isSubmitting()">
                    <mat-icon>lock</mat-icon>
                    Manually Close
                  </button>
                </form>
              </mat-card-content>
            </mat-card>
          }

          <!-- Reopen Section -->
          @if (claim()?.status === 'CLOSED') {
            <mat-card class="reopen-card">
              <mat-card-header>
                <mat-card-title>
                  <mat-icon color="warn">lock_open</mat-icon>
                  Reopen Closed Claim
                </mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <p>This claim is closed. You can request to reopen it with maker-checker approval.</p>

                <form [formGroup]="reopenForm" class="reopen-form">
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Reason Code</mat-label>
                    <mat-select formControlName="reason_code">
                      @for (item of reasonCodes | keyvalue; track item.key) {
                        <mat-option [value]="+item.key">{{ item.key }}: {{ item.value }}</mat-option>
                      }
                    </mat-select>
                    <mat-error *ngIf="reopenForm.get('reason_code')?.hasError('required')">Required</mat-error>
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Detailed Reason</mat-label>
                    <textarea matInput formControlName="reason_text" rows="4" placeholder="Provide detailed explanation for reopening..."></textarea>
                    <mat-error *ngIf="reopenForm.get('reason_text')?.hasError('required')">Required</mat-error>
                  </mat-form-field>

                  <div class="maker-checker-info">
                    <h5>Maker-Checker Process</h5>
                    <p>Reopen requests require approval from both Maker and Checker.</p>
                    <ul>
                      <li><strong>Maker:</strong> Initial reviewer validates the request</li>
                      <li><strong>Checker:</strong> Secondary reviewer gives final approval</li>
                    </ul>
                  </div>

                  <div class="form-actions">
                    <button mat-raised-button color="accent" (click)="submitReopen()" [disabled]="reopenForm.invalid || isSubmitting()">
                      @if (isSubmitting()) {
                        <mat-spinner diameter="20"></mat-spinner>
                      }
                      <mat-icon>reopen_in_new</mat-icon>
                      <span>Submit Reopen Request</span>
                    </button>
                  </div>
                </form>
              </mat-card-content>
            </mat-card>
          }

          <!-- Reopen History -->
          @if (reopens()?.length) {
            <mat-card class="history-card">
              <mat-card-header>
                <mat-card-title>Reopen History</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <mat-list>
                  @for (reopen of reopens(); track reopen.id) {
                    <mat-list-item>
                      <div mat-list-item-content class="reopen-item">
                        <div class="reopen-header">
                          <strong>Reason Code {{ reopen.reason_code }}</strong>
                          <div class="status-badges">
                            <mat-chip [color]="reopen.maker_status === 'APPROVED' ? 'accent' : reopen.maker_status === 'REJECTED' ? 'warn' : 'primary'" selected small>
                              Maker: {{ reopen.maker_status }}
                            </mat-chip>
                            <mat-chip [color]="reopen.checker_status === 'APPROVED' ? 'accent' : reopen.checker_status === 'REJECTED' ? 'warn' : 'primary'" selected small>
                              Checker: {{ reopen.checker_status }}
                            </mat-chip>
                          </div>
                        </div>
                        <p class="reopen-reason">{{ reopen.reason_text }}</p>
                        <div class="reopen-meta">
                          <span>Requested: {{ reopen.requested_at | date:'dd MMM yyyy HH:mm' }}</span>
                        </div>

                        @if (reopen.maker_status === 'PENDING') {
                          <button mat-stroked-button color="primary" (click)="approveAsMaker(reopen.id)" size="small">
                            Approve as Maker
                          </button>
                        }

                        @if (reopen.maker_status === 'APPROVED' && reopen.checker_status === 'PENDING') {
                          <button mat-raised-button color="primary" (click)="approveAsChecker(reopen.id)" size="small">
                            Final Approval (Checker)
                          </button>
                        }
                      </div>
                    </mat-list-item>
                    <mat-divider></mat-divider>
                  }
                </mat-list>
              </mat-card-content>
            </mat-card>
          }

          <!-- Previous Closures -->
          @if (closures()?.length) {
            <mat-card class="closures-card">
              <mat-card-header>
                <mat-card-title>Closure Records</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                @for (closure of closures(); track closure.id) {
                  <div class="closure-record">
                    <div class="closure-type">
                      <mat-chip [color]="closure.closure_type === 'AUTO_CLOSE' ? 'accent' : 'primary'" selected>
                        {{ closure.closure_type }}
                      </mat-chip>
                    </div>
                    <div class="closure-details">
                      <p><strong>Date:</strong> {{ closure.closure_date | date:'dd MMM yyyy HH:mm' }}</p>
                      @if (closure.closure_reason) {
                        <p><strong>Reason:</strong> {{ closure.closure_reason }}</p>
                      }
                      <p><strong>Settlement Letter:</strong> {{ closure.settlement_letter_sent ? 'Sent' : 'Pending' }}</p>
                    </div>
                  </div>
                }
              </mat-card-content>
            </mat-card>
          }

          <!-- Audit Trail -->
          <mat-card class="audit-card">
            <mat-card-header>
              <mat-card-title>Recent Activity</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="timeline">
                @for (event of auditEvents(); track event.id) {
                  <div class="timeline-item">
                    <div class="timeline-action">{{ event.action }}</div>
                    <div class="timeline-date">{{ event.performed_at | date:'dd MMM HH:mm' }}</div>
                  </div>
                }
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      } @else {
        <mat-card>
          <mat-card-content>
            <p>Claim not found</p>
            <button mat-raised-button routerLink="/claims">Back to Claims</button>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .closure-container {
      padding: 24px;
      max-width: 1000px;
      margin: 0 auto;
    }

    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 400px;
    }

    .closure-header {
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

    .closure-content {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    .info-item .label {
      font-size: 12px;
      color: #666;
    }

    .info-item .value {
      font-weight: 500;
    }

    .auto-close-card mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .settlement-alert {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: #fff3e0;
      border-radius: 8px;
      margin: 16px 0;
    }

    .closure-section {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-top: 16px;
    }

    .closure-form, .reopen-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .full-width {
      width: 100%;
    }

    .maker-checker-info {
      background: #e3f2fd;
      padding: 16px;
      border-radius: 8px;
    }

    .maker-checker-info h5 {
      margin: 0 0 8px;
    }

    .maker-checker-info ul {
      margin: 0;
      padding-left: 20px;
    }

    .maker-checker-info li {
      margin: 4px 0;
      font-size: 14px;
    }

    .form-actions {
      margin-top: 8px;
    }

    .reopen-item {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .reopen-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .status-badges {
      display: flex;
      gap: 8px;
    }

    .reopen-reason {
      color: #666;
      margin: 0;
    }

    .reopen-meta {
      font-size: 12px;
      color: #999;
    }

    .closure-record {
      display: flex;
      gap: 16px;
      padding: 16px;
      background: #f5f5f5;
      border-radius: 8px;
      margin-bottom: 12px;
    }

    .closure-details p {
      margin: 4px 0;
      font-size: 14px;
    }

    .timeline {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .timeline-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 12px;
      background: #f5f5f5;
      border-radius: 4px;
    }

    .timeline-action {
      font-weight: 500;
    }

    .timeline-date {
      font-size: 12px;
      color: #666;
    }
  `],
})
export class ClosureComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private snackBar = inject(MatSnackBar);

  claim = signal<Claim | null>(null);
  reopens = signal<Reopen[]>([]);
  closures = signal<any[]>([]);
  auditEvents = signal<any[]>([]);

  isLoading = signal(true);
  isSubmitting = signal(false);

  reasonCodes = REOPEN_REASONS;

  closureForm = this.fb.group({
    closure_reason: ['', Validators.required],
  });

  reopenForm = this.fb.group({
    reason_code: [null, Validators.required],
    reason_text: ['', Validators.required],
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

    const [claimRes, reopensRes, auditRes] = await Promise.all([
      this.api.getClaimById(claimId),
      this.api.getReopens(claimId),
      this.api.getClaimAuditTrail(claimId),
    ]);

    if (claimRes.data) {
      this.claim.set(claimRes.data);
    }

    if (reopensRes.data) this.reopens.set(reopensRes.data);

    if (auditRes.data) {
      this.auditEvents.set(auditRes.data.slice(-10));
    }

    // Get closures
    const { data: closuresData } = await this.api.supabase
      .from('closures')
      .select('*')
      .eq('claim_id', claimId);

    if (closuresData) this.closures.set(closuresData);

    this.isLoading.set(false);
  }

  async sendSettlementLetter() {
    const claimId = this.claim()?.id;
    if (!claimId) return;

    await this.api.supabase
      .from('claims')
      .update({ settlement_letter_sent: true })
      .eq('id', claimId);

    this.claim.update(c => c ? { ...c, settlement_letter_sent: true } : null);
    this.snackBar.open('Settlement letter marked as sent', 'Close', { duration: 3000 });
  }

  async autoClose() {
    const claimId = this.claim()?.id;
    if (!claimId) return;

    this.isSubmitting.set(true);

    const result = await this.api.autoCloseClaim(claimId);

    this.isSubmitting.set(false);

    if (result.success) {
      this.snackBar.open('Claim auto-closed successfully', 'Close', { duration: 3000 });
      await this.loadData(claimId);
    } else {
      this.snackBar.open(result.error || 'Failed to close claim', 'Close', { duration: 5000 });
    }
  }

  async manualClose() {
    if (this.closureForm.invalid) return;

    const claimId = this.claim()?.id;
    if (!claimId) return;

    this.isSubmitting.set(true);

    const reason = this.closureForm.get('closure_reason')?.value || '';
    const result = await this.api.closeClaim(claimId, reason);

    this.isSubmitting.set(false);

    if (result.success) {
      this.snackBar.open('Claim closed manually', 'Close', { duration: 3000 });
      await this.loadData(claimId);
    } else {
      this.snackBar.open(result.error || 'Failed to close claim', 'Close', { duration: 5000 });
    }
  }

  async submitReopen() {
    if (this.reopenForm.invalid) return;

    const claimId = this.claim()?.id;
    if (!claimId) return;

    this.isSubmitting.set(true);

    const reasonCode = this.reopenForm.get('reason_code')?.value || 0;
    const reasonText = this.reopenForm.get('reason_text')?.value || '';

    const result = await this.api.requestReopen(claimId, reasonCode, reasonText);

    this.isSubmitting.set(false);

    if (result.data) {
      this.snackBar.open('Reopen request submitted for maker-checker approval', 'Close', { duration: 3000 });
      await this.loadData(claimId);
      this.reopenForm.reset();
    } else {
      this.snackBar.open(result.error || 'Failed to submit reopen request', 'Close', { duration: 5000 });
    }
  }

  async approveAsMaker(reopenId: string) {
    this.isSubmitting.set(true);
    const result = await this.api.approveReopenMaker(reopenId);

    if (result.success) {
      this.snackBar.open('Maker approval granted', 'Close', { duration: 3000 });
      await this.loadData(this.claim()!.id);
    } else {
      this.snackBar.open(result.error || 'Failed', 'Close', { duration: 5000 });
    }

    this.isSubmitting.set(false);
  }

  async approveAsChecker(reopenId: string) {
    this.isSubmitting.set(true);
    const result = await this.api.approveReopenChecker(reopenId);

    if (result.success) {
      this.snackBar.open('Checker approval granted. Claim reopened!', 'Close', { duration: 5000 });
      await this.loadData(this.claim()!.id);
      this.router.navigate(['/assessment', this.claim()?.id]);
    } else {
      this.snackBar.open(result.error || 'Failed', 'Close', { duration: 5000 });
    }

    this.isSubmitting.set(false);
  }

  formatAmount(paise?: number | null): string {
    return this.api.formatAmount(paise);
  }
}
