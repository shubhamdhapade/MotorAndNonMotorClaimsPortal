import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../services/api.service';
import type { Claim, Payment } from '../models';

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
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
    <div class="payments-container">
      @if (isLoading()) {
        <div class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else if (claim()) {
        <div class="payments-header">
          <div class="header-left">
            <button mat-icon-button routerLink="/claims" class="back-btn">
              <mat-icon>arrow_back</mat-icon>
            </button>
            <div class="claim-info">
              <h1>Payment Processing: {{ claim()?.claim_number }}</h1>
              <span class="policy-info">Policy: {{ claim()?.policy?.policy_number }}</span>
            </div>
          </div>
        </div>

        <div class="payments-content">
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
                    <span class="label">Approved Amount</span>
                    <span class="value highlight">{{ formatAmount(claim()?.approved_amount) }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Approval Level</span>
                    <mat-chip [color]="claim()?.approval_level === 'AUTO' ? 'primary' : 'accent'" selected>
                      {{ claim()?.approval_level }}
                    </mat-chip>
                  </div>
                  <div class="info-item">
                    <span class="label">Approved On</span>
                    <span class="value">{{ claim()?.approved_at | date:'dd MMM yyyy' }}</span>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>

            <!-- NEFT Payment Form -->
            <mat-card class="payment-form-card">
              <mat-card-header>
                <mat-card-title>NEFT Payment Details</mat-card-title>
                <mat-card-subtitle>Only NEFT transfers are supported</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                @if (existingPayment()) {
                  <div class="existing-payment">
                    <h4>Payment Status</h4>
                    <div class="payment-status-card" [class.success]="existingPayment()?.status === 'SUCCESS'" [class.failed]="existingPayment()?.status === 'FAILED'">
                      <div class="status-header">
                        <mat-icon [color]="existingPayment()?.status === 'SUCCESS' ? 'primary' : existingPayment()?.status === 'FAILED' ? 'warn' : 'accent'">
                          {{ existingPayment()?.status === 'SUCCESS' ? 'check_circle' : existingPayment()?.status === 'FAILED' ? 'cancel' : 'schedule' }}
                        </mat-icon>
                        <span class="status-text">{{ existingPayment()?.status }}</span>
                      </div>
                      <div class="payment-details">
                        <p><strong>Payment Number:</strong> {{ existingPayment()?.payment_number }}</p>
                        <p><strong>Amount:</strong> {{ formatAmount(existingPayment()?.amount) }}</p>
                        <p><strong>Beneficiary:</strong> {{ existingPayment()?.beneficiary_name }}</p>
                        <p><strong>Account:</strong> ****{{ existingPayment()?.beneficiary_account_number?.slice(-4) }}</p>
                        <p><strong>Bank:</strong> {{ existingPayment()?.beneficiary_bank_name }}</p>
                        @if (existingPayment()?.utr_number) {
                          <p><strong>UTR Number:</strong> {{ existingPayment()?.utr_number }}</p>
                        }
                        @if (existingPayment()?.failure_reason) {
                          <p class="failure-reason"><strong>Failure Reason:</strong> {{ existingPayment()?.failure_reason }}</p>
                        }
                      </div>

                      @if (existingPayment()?.status === 'PROCESSING') {
                        <div class="simulate-actions">
                          <p>Simulate payment result:</p>
                          <button mat-raised-button color="primary" (click)="simulatePaymentResult(true)">
                            <mat-icon>check</mat-icon>
                            Simulate Success
                          </button>
                          <button mat-stroked-button color="warn" (click)="simulatePaymentResult(false)">
                            <mat-icon>close</mat-icon>
                            Simulate Failure
                          </button>
                        </div>
                      }

                      @if (existingPayment()?.status === 'FAILED') {
                        <button mat-raised-button color="primary" (click)="retryPayment()" style="margin-top: 16px;">
                          <mat-icon>refresh</mat-icon>
                          Retry Payment
                        </button>
                      }
                    </div>
                  </div>
                } @else {
                  <form [formGroup]="paymentForm" class="payment-form">
                    <div class="beneficiary-section">
                      <h4>Beneficiary Details</h4>
                      <mat-form-field appearance="outline" class="full-width">
                        <mat-label>Beneficiary Name</mat-label>
                        <input matInput formControlName="beneficiary_name" placeholder="Account holder name">
                        <mat-error *ngIf="paymentForm.get('beneficiary_name')?.hasError('required')">Required</mat-error>
                      </mat-form-field>

                      <div class="form-row">
                        <mat-form-field appearance="outline">
                          <mat-label>Account Number</mat-label>
                          <input matInput formControlName="beneficiary_account_number" type="text">
                          <mat-error *ngIf="paymentForm.get('beneficiary_account_number')?.hasError('required')">Required</mat-error>
                          <mat-error *ngIf="paymentForm.get('beneficiary_account_number')?.hasError('minlength')">Must be 9-18 digits</mat-error>
                        </mat-form-field>

                        <mat-form-field appearance="outline">
                          <mat-label>Confirm Account Number</mat-label>
                          <input matInput formControlName="confirm_account_number" type="text">
                          <mat-error *ngIf="paymentForm.get('confirm_account_number')?.hasError('required')">Required</mat-error>
                          <mat-error *ngIf="paymentForm.get('confirm_account_number')?.hasError('accountMismatch')">Account numbers do not match</mat-error>
                        </mat-form-field>
                      </div>

                      <div class="form-row">
                        <mat-form-field appearance="outline">
                          <mat-label>IFSC Code</mat-label>
                          <input matInput formControlName="beneficiary_ifsc_code" placeholder="e.g., HDFC0001234" uppercase>
                          <mat-error *ngIf="paymentForm.get('beneficiary_ifsc_code')?.hasError('required')">Required</mat-error>
                          <mat-error *ngIf="paymentForm.get('beneficiary_ifsc_code')?.hasError('pattern')">Invalid IFSC format</mat-error>
                          <mat-hint>Format: ABCD0123456</mat-hint>
                        </mat-form-field>

                        <mat-form-field appearance="outline">
                          <mat-label>Bank Name</mat-label>
                          <input matInput formControlName="beneficiary_bank_name">
                          <mat-hint>Auto-filled from IFSC (demo)</mat-hint>
                        </mat-form-field>
                      </div>
                    </div>

                    <div class="amount-section">
                      <h4>Payment Amount</h4>
                      <mat-form-field appearance="outline" class="amount-field">
                        <mat-label>Amount (INR)</mat-label>
                        <input matInput formControlName="amount" placeholder="Enter amount">
                        <mat-icon matPrefix>currency_rupee</mat-icon>
                        <mat-error *ngIf="paymentForm.get('amount')?.hasError('required')">Required</mat-error>
                        <mat-error *ngIf="paymentForm.get('amount')?.hasError('max')">Exceeds approved amount</mat-error>
                        <mat-hint>Maximum: {{ formatAmount(claim()?.approved_amount) }}</mat-hint>
                      </mat-form-field>
                    </div>

                    <div class="bank-verification">
                      <mat-chip color="accent" selected>
                        <mat-icon>verified_user</mat-icon>
                        Bank Account Verification (Stub)
                      </mat-chip>
                      <p class="verification-hint">Account will be verified before NEFT transfer</p>
                    </div>

                    <div class="form-actions">
                      <button mat-stroked-button type="button" routerLink="/claims/{{ claim()?.id }}">
                        Cancel
                      </button>
                      <button mat-raised-button color="primary" type="button" (click)="initiatePayment()" [disabled]="paymentForm.invalid || isSubmitting()">
                        @if (isSubmitting()) {
                          <mat-spinner diameter="20"></mat-spinner>
                        } @else {
                          <mat-icon>send</mat-icon>
                          <span>Initiate NEFT</span>
                        }
                      </button>
                    </div>
                  </form>
                }
              </mat-card-content>
            </mat-card>
          </div>

          <div class="side-column">
            <!-- Payment Info -->
            <mat-card class="info-card">
              <mat-card-header>
                <mat-card-title>NEFT Information</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <ul class="info-list">
                  <li>NEFT transfers only</li>
                  <li>Settlement in 24-48 hours</li>
                  <li>UTR number will be generated</li>
                  <li>Settlement letter will be sent</li>
                </ul>
              </mat-card-content>
            </mat-card>

            <!-- Settlement Letter -->
            @if (existingPayment()?.status === 'SUCCESS') {
              <mat-card class="settlement-card">
                <mat-card-header>
                  <mat-card-title>Settlement Letter</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <p>Settlement letter will be sent to:</p>
                  <div class="recipient-info">
                    <p><strong>{{ claim()?.policy?.policy_holder_name }}</strong></p>
                    <p>{{ claim()?.policy?.policy_holder_address }}</p>
                    <p>{{ claim()?.policy?.policy_holder_email }}</p>
                  </div>
                  <button mat-stroked-button color="primary" class="full-width" (click)="settlementLetterSent()">
                    <mat-icon>mail</mat-icon>
                    Mark as Sent
                  </button>
                </mat-card-content>
              </mat-card>
            }
          </div>
        </div>
      } @else {
        <mat-card>
          <mat-card-content>
            <p>Claim not found or not approved for payment</p>
            <button mat-raised-button routerLink="/claims">Back to Claims</button>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .payments-container {
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

    .payments-header {
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

    .payments-content {
      display: grid;
      grid-template-columns: 1fr 350px;
      gap: 24px;
    }

    @media (max-width: 992px) {
      .payments-content {
        grid-template-columns: 1fr;
      }
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

    .highlight {
      font-size: 20px;
      color: #1a237e;
    }

    .payment-form h4 {
      margin: 16px 0;
      color: #424242;
    }

    .form-row {
      display: flex;
      gap: 16px;
    }

    .form-row mat-form-field {
      flex: 1;
    }

    .full-width {
      width: 100%;
    }

    .amount-field {
      width: 300px;
    }

    .bank-verification {
      margin: 24px 0;
      padding: 16px;
      background: #e3f2fd;
      border-radius: 8px;
    }

    .verification-hint {
      margin: 8px 0 0;
      font-size: 12px;
      color: #666;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 16px;
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid #e0e0e0;
    }

    .payment-status-card {
      padding: 24px;
      background: #f5f5f5;
      border-radius: 8px;
      border-left: 4px solid #ff9800;
    }

    .payment-status-card.success {
      background: #e8f5e9;
      border-left-color: #4caf50;
    }

    .payment-status-card.failed {
      background: #ffebee;
      border-left-color: #f44336;
    }

    .status-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .status-header mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .status-text {
      font-size: 18px;
      font-weight: 600;
    }

    .payment-details p {
      margin: 8px 0;
    }

    .failure-reason {
      color: #f44336;
    }

    .simulate-actions {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
    }

    .simulate-actions p {
      margin-bottom: 12px;
      font-weight: 500;
    }

    .simulate-actions button {
      margin-right: 12px;
    }

    .info-list {
      font-size: 14px;
      line-height: 1.8;
      padding-left: 20px;
    }

    .recipient-info {
      background: #f5f5f5;
      padding: 12px;
      border-radius: 4px;
      margin: 12px 0;
    }

    .recipient-info p {
      margin: 4px 0;
    }
  `],
})
export class PaymentsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private snackBar = inject(MatSnackBar);

  claim = signal<Claim | null>(null);
  existingPayment = signal<Payment | null>(null);

  isLoading = signal(true);
  isSubmitting = signal(false);

  paymentForm = this.fb.group({
    beneficiary_name: ['', Validators.required],
    beneficiary_account_number: ['', [Validators.required, Validators.minLength(9), Validators.maxLength(18)]],
    confirm_account_number: ['', Validators.required],
    beneficiary_ifsc_code: ['', [Validators.required, Validators.pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)]],
    beneficiary_bank_name: [''],
    amount: ['', [Validators.required]],
  }, { validators: this.accountMatchValidator });

  accountMatchValidator(group: any) {
    const account = group.get('beneficiary_account_number')?.value;
    const confirm = group.get('confirm_account_number')?.value;
    return account === confirm ? null : { accountMismatch: true };
  }

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

    const [claimRes, paymentsRes] = await Promise.all([
      this.api.getClaimById(claimId),
      this.api.getPayments(claimId),
    ]);

    if (claimRes.data) {
      this.claim.set(claimRes.data);

      if (claimRes.data.approved_amount) {
        this.paymentForm.patchValue({
          amount: (claimRes.data.approved_amount / 100).toString(),
          beneficiary_name: claimRes.data.policy?.policy_holder_name,
        });
      }
    }

    if (paymentsRes.data && paymentsRes.data.length > 0) {
      this.existingPayment.set(paymentsRes.data[0]);
    }

    this.isLoading.set(false);
  }

  onIfscChange() {
    const ifsc = this.paymentForm.get('beneficiary_ifsc_code')?.value;
    if (ifsc && ifsc.length === 11) {
      const bankMap: Record<string, string> = {
        'HDFC': 'HDFC Bank',
        'ICIC': 'ICICI Bank',
        'SBIN': 'State Bank of India',
        'AXIS': 'Axis Bank',
        'KKBK': 'Kotak Mahindra Bank',
      };
      const bankCode = ifsc.substring(0, 4);
      const bankName = bankMap[bankCode] || 'Bank (Auto-detected)';
      this.paymentForm.patchValue({ beneficiary_bank_name: bankName });
    }
  }

  async initiatePayment() {
    if (this.paymentForm.invalid) return;

    const claimId = this.claim()?.id;
    if (!claimId) return;

    this.isSubmitting.set(true);

    const formValue = this.paymentForm.value;
    const amountPaise = parseFloat(formValue.amount || '0') * 100;

    const result = await this.api.initiatePayment(claimId, {
      amount: amountPaise,
      beneficiary_name: formValue.beneficiary_name!,
      beneficiary_account_number: formValue.beneficiary_account_number!,
      beneficiary_ifsc_code: formValue.beneficiary_ifsc_code!,
      beneficiary_bank_name: formValue.beneficiary_bank_name || undefined,
    });

    if (result.data) {
      this.existingPayment.set(result.data);
      this.snackBar.open('NEFT payment initiated. Awaiting bank response.', 'Close', { duration: 5000 });
    } else {
      this.snackBar.open(result.error || 'Failed to initiate payment', 'Close', { duration: 5000 });
    }

    this.isSubmitting.set(false);
  }

  async simulatePaymentResult(success: boolean) {
    const paymentId = this.existingPayment()?.id;
    if (!paymentId) return;

    this.isSubmitting.set(true);

    const result = await this.api.simulatePaymentResult(paymentId, success);

    if (result.success) {
      const message = success ? 'Payment successful! Claim will be auto-closed.' : 'Payment failed. Please retry.';
      this.snackBar.open(message, 'Close', { duration: 5000 });

      await this.loadData(this.claim()!.id);

      if (success) {
        this.router.navigate(['/claims', this.claim()?.id]);
      }
    } else {
      this.snackBar.open(result.error || 'Failed to simulate payment', 'Close', { duration: 5000 });
    }

    this.isSubmitting.set(false);
  }

  async retryPayment() {
    this.existingPayment.set(null);
    this.snackBar.open('Please re-enter payment details to retry', 'Close', { duration: 3000 });
  }

  async settlementLetterSent() {
    const claimId = this.claim()?.id;
    if (!claimId) return;

    this.snackBar.open('Settlement letter marked as sent to policy holder', 'Close', { duration: 3000 });

    // Update the claim
    await this.api.supabase
      .from('claims')
      .update({ settlement_letter_sent: true })
      .eq('id', claimId);
  }

  formatAmount(paise?: number | null): string {
    return this.api.formatAmount(paise);
  }
}
