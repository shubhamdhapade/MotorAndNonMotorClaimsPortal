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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatListModule } from '@angular/material/list';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { ApiService } from '../services/api.service';
import type { Claim, ClaimMotorDetails, Document, ClaimDamageMap, MANDATORY_DOCUMENTS, CONDITIONAL_DOCUMENTS } from '../models';

const MANDATORY_DOCS = [
  { id: '1', document_type: 'FIR', document_name: 'FIR Copy', is_mandatory: true },
  { id: '2', document_type: 'DRIVING_LICENSE', document_name: 'Driving License', is_mandatory: true },
  { id: '3', document_type: 'RC', document_name: 'Registration Certificate', is_mandatory: true },
  { id: '4', document_type: 'CLAIM_FORM', document_name: 'Claim Form', is_mandatory: true },
  { id: '5', document_type: 'POLICY_COPY', document_name: 'Policy Document', is_mandatory: true },
];

const CONDITIONAL_DOCS = [
  { id: '6', document_type: 'DEATH_CERTIFICATE', document_name: 'Death Certificate', condition: 'Required if fatalities > 0' },
  { id: '7', document_type: 'MEDICAL_REPORT', document_name: 'Medical Report', condition: 'Required if injuries > 0' },
  { id: '8', document_type: 'THIRD_PARTY_CLAIM', document_name: 'Third Party Claim', condition: 'Required if third party involved' },
  { id: '9', document_type: 'REPAIR_ESTIMATE', document_name: 'Repair Estimate', condition: 'Required for accidents' },
  { id: '10', document_type: 'SURVEY_REPORT', document_name: 'Survey Report', condition: 'Required after survey' },
];

@Component({
  selector: 'app-assessment',
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
    MatCheckboxModule,
    MatListModule,
    MatExpansionModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  template: `
    <div class="assessment-container">
      @if (isLoading()) {
        <div class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else if (claim()) {
        <div class="assessment-header">
          <div class="header-left">
            <button mat-icon-button routerLink="/claims" class="back-btn">
              <mat-icon>arrow_back</mat-icon>
            </button>
            <div class="claim-info">
              <h1>Assessment: {{ claim()?.claim_number }}</h1>
              <span class="policy-info">Policy: {{ claim()?.policy?.policy_number }}</span>
            </div>
          </div>
          <div class="header-actions">
            <button mat-raised-button color="primary" (click)="saveAssessment()" [disabled]="isSubmitting()">
              @if (isSubmitting()) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                <span>Complete Assessment</span>
              }
            </button>
          </div>
        </div>

        <div class="assessment-content">
          <div class="left-column">
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
                </div>
              </mat-card-content>
            </mat-card>

            <!-- Survey Booking -->
            <mat-card class="survey-card">
              <mat-card-header>
                <mat-card-title>Survey Booking</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <form [formGroup]="surveyForm" class="survey-form">
                  <div class="form-row">
                    <mat-form-field appearance="outline">
                      <mat-label>Surveyor Name</mat-label>
                      <input matInput formControlName="surveyor_name">
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Surveyor Contact</mat-label>
                      <input matInput formControlName="surveyor_contact">
                    </mat-form-field>
                  </div>

                  <div class="form-row">
                    <mat-form-field appearance="outline">
                      <mat-label>Scheduled Date</mat-label>
                      <input matInput [matDatepicker]="surveyPicker" formControlName="survey_scheduled_date">
                      <mat-datepicker-toggle matSuffix [for]="surveyPicker"></mat-datepicker-toggle>
                      <mat-datepicker #surveyPicker></mat-datepicker>
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Survey Completed Date</mat-label>
                      <input matInput [matDatepicker]="completedPicker" formControlName="survey_completed_date">
                      <mat-datepicker-toggle matSuffix [for]="completedPicker"></mat-datepicker-toggle>
                      <mat-datepicker #completedPicker></mat-datepicker>
                    </mat-form-field>
                  </div>

                  <button mat-stroked-button color="primary" type="button" (click)="bookSurvey()">
                    <mat-icon>schedule</mat-icon>
                    Auto-Assign Surveyor
                  </button>
                  <p class="hint-text">System will auto-assign surveyor based on pincode and workload</p>
                </form>
              </mat-card-content>
            </mat-card>

            <!-- Reserve Recommendation -->
            <mat-card class="reserve-card">
              <mat-card-header>
                <mat-card-title>Reserve Recommendation</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <form [formGroup]="reserveForm" class="reserve-form">
                  <div class="form-row">
                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Recommended Reserve Amount</mat-label>
                      <input matInput formControlName="reserve_recommendation" placeholder="Enter amount in INR">
                      <mat-icon matPrefix>currency_rupee</mat-icon>
                      <mat-hint>Based on assessment findings</mat-hint>
                    </mat-form-field>
                  </div>

                  <div class="damage-summary">
                    <h5>Damage Parts Analysis</h5>
                    <div class="damage-list">
                      @for (damage of damages(); track damage.id) {
                        <div class="damage-item">
                          <span class="part-name">{{ damage.part_name }} ({{ damage.side }})</span>
                          <span class="severity">{{ damage.damage_severity }}</span>
                          <span class="cost">{{ formatAmount(damage.estimated_repair_cost) }}</span>
                        </div>
                      }
                    </div>
                    <div class="total-row">
                      <span>Total Estimated:</span>
                      <span class="total-amount">{{ formatAmount(totalDamageCost()) }}</span>
                    </div>
                  </div>
                </form>
              </mat-card-content>
            </mat-card>
          </div>

          <div class="right-column">
            <!-- Document Checklist -->
            <mat-card class="documents-card">
              <mat-card-header>
                <mat-card-title>Document Checklist</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <mat-accordion>
                  <mat-expansion-panel>
                    <mat-expansion-panel-header>
                      <mat-panel-title>Mandatory Documents</mat-panel-title>
                      <mat-panel-description>{{ verifiedMandatory() }} / {{ mandatoryDocs.length }}</mat-panel-description>
                    </mat-expansion-panel-header>

                    <mat-list>
                      @for (doc of mandatoryDocs; track doc.id) {
                        <mat-list-item>
                          <mat-checkbox [checked]="isDocVerified(doc.document_type)" (change)="toggleDocVerification(doc.document_type, $event.checked)">
                            {{ doc.document_name }}
                          </mat-checkbox>
                          @if (getUploadedDoc(doc.document_type)) {
                            <mat-icon matListItemIcon [color]="'primary'">check_circle</mat-icon>
                          } @else {
                            <mat-icon matListItemIcon [color]="'warn'">error_outline</mat-icon>
                          }
                        </mat-list-item>
                      }
                    </mat-list>
                  </mat-expansion-panel>

                  <mat-expansion-panel>
                    <mat-expansion-panel-header>
                      <mat-panel-title>Conditional Documents</mat-panel-title>
                      <mat-panel-description>Based on claim type</mat-panel-description>
                    </mat-expansion-panel-header>

                    <mat-list>
                      @for (doc of conditionalDocs; track doc.id) {
                        <mat-list-item>
                          <mat-checkbox [checked]="isDocVerified(doc.document_type)" (change)="toggleDocVerification(doc.document_type, $event.checked)">
                            {{ doc.document_name }}
                          </mat-checkbox>
                          <span class="condition-text">{{ doc.condition }}</span>
                        </mat-list-item>
                      }
                    </mat-list>
                  </mat-expansion-panel>
                </mat-accordion>

                <div class="upload-section">
                  <h5>Upload Document</h5>
                  <div class="upload-form">
                    <mat-form-field appearance="outline">
                      <mat-label>Document Type</mat-label>
                      <mat-select [value]="selectedDocType" (selectionChange)="selectedDocType = $event.value">
                        @for (doc of allDocTypes; track doc) {
                          <mat-option [value]="doc">{{ doc }}</mat-option>
                        }
                      </mat-select>
                    </mat-form-field>
                    <button mat-raised-button color="primary" (click)="uploadDocument()" [disabled]="!selectedDocType">
                      <mat-icon>upload</mat-icon>
                      Upload
                    </button>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>

            <!-- Uploaded Documents -->
            <mat-card class="uploaded-docs-card">
              <mat-card-header>
                <mat-card-title>Uploaded Documents ({{ documents()?.length || 0 }})</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                @if (documents()?.length) {
                  <mat-list>
                    @for (doc of documents(); track doc.id) {
                      <mat-list-item>
                        <mat-icon matListItemIcon [color]="doc.is_verified ? 'primary' : 'accent'">
                          {{ doc.is_verified ? 'verified' : 'description' }}
                        </mat-icon>
                        <span matListItemTitle>{{ doc.document_name }}</span>
                        <span matListItemLine>{{ doc.document_type }} - {{ doc.uploaded_at | date:'dd MMM yyyy' }}</span>
                        <button mat-icon-button (click)="verifyDoc(doc.id)" [disabled]="doc.is_verified">
                          <mat-icon>done</mat-icon>
                        </button>
                      </mat-list-item>
                    }
                  </mat-list>
                } @else {
                  <p class="no-docs">No documents uploaded yet</p>
                }
              </mat-card-content>
            </mat-card>
          </div>
        </div>
      } @else {
        <mat-card>
          <mat-card-content>
            <p>Claim not found or not available for assessment</p>
            <button mat-raised-button routerLink="/claims">Back to Claims</button>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .assessment-container {
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

    .assessment-header {
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

    .assessment-content {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }

    @media (max-width: 992px) {
      .assessment-content {
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

    .form-row {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
    }

    .form-row mat-form-field {
      flex: 1;
    }

    .full-width {
      width: 100%;
    }

    .hint-text {
      font-size: 12px;
      color: #666;
      margin-top: 8px;
    }

    .damage-summary h5 {
      margin: 24px 0 12px;
    }

    .damage-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .damage-item {
      display: flex;
      justify-content: space-between;
      padding: 8px;
      background: #f5f5f5;
      border-radius: 4px;
    }

    .severity {
      font-size: 12px;
      color: #666;
    }

    .cost {
      font-weight: 500;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 12px;
      background: #e3f2fd;
      border-radius: 4px;
      margin-top: 12px;
      font-weight: 600;
    }

    .condition-text {
      font-size: 11px;
      color: #666;
      font-style: italic;
    }

    .upload-section {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
    }

    .upload-form {
      display: flex;
      gap: 16px;
      align-items: center;
    }

    .no-docs {
      text-align: center;
      color: #999;
      padding: 24px;
    }
  `],
})
export class AssessmentComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private snackBar = inject(MatSnackBar);

  claim = signal<Claim | null>(null);
  motorDetails = signal<ClaimMotorDetails | null>(null);
  damages = signal<ClaimDamageMap[]>([]);
  documents = signal<Document[]>([]);

  isLoading = signal(true);
  isSubmitting = signal(false);

  mandatoryDocs = MANDATORY_DOCS;
  conditionalDocs = CONDITIONAL_DOCS;
  allDocTypes = ['FIR', 'DRIVING_LICENSE', 'RC', 'CLAIM_FORM', 'POLICY_COPY', 'DEATH_CERTIFICATE', 'MEDICAL_REPORT', 'THIRD_PARTY_CLAIM', 'REPAIR_ESTIMATE', 'SURVEY_REPORT'];
  selectedDocType = '';

  surveyForm = this.fb.group({
    surveyor_name: [''],
    surveyor_contact: [''],
    survey_scheduled_date: [''],
    survey_completed_date: [''],
  });

  reserveForm = this.fb.group({
    reserve_recommendation: [''],
  });

  verifiedDocs = new Set<string>();

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

    const [claimRes, motorRes, damagesRes, docsRes] = await Promise.all([
      this.api.getClaimById(claimId),
      this.api.getClaimMotorDetails(claimId),
      this.api.getClaimDamages(claimId),
      this.api.getDocuments(claimId),
    ]);

    if (claimRes.data) {
      this.claim.set(claimRes.data);

      if (claimRes.data.status === 'ASSESSMENT_PENDING' || claimRes.data.status === 'REOPENED') {
        await this.api.transitionClaimStatus(claimId, 'ASSESSMENT_IN_PROGRESS');
      }
    }

    if (motorRes.data) {
      this.motorDetails.set(motorRes.data);
      this.surveyForm.patchValue({
        surveyor_name: motorRes.data.surveyor_name,
        surveyor_contact: motorRes.data.surveyor_contact,
        survey_scheduled_date: motorRes.data.survey_scheduled_date,
        survey_completed_date: motorRes.data.survey_completed_date,
      });
      this.reserveForm.patchValue({
        reserve_recommendation: motorRes.data.reserve_recommendation ? (motorRes.data.reserve_recommendation / 100).toString() : '',
      });
    }

    if (damagesRes.data) this.damages.set(damagesRes.data);
    if (docsRes.data) {
      this.documents.set(docsRes.data);
      docsRes.data.filter(d => d.is_verified).forEach(d => this.verifiedDocs.add(d.document_type));
    }

    this.isLoading.set(false);
  }

  totalDamageCost = () => this.damages().reduce((sum, d) => sum + (d.estimated_repair_cost || 0), 0);

  verifiedMandatory = () => this.mandatoryDocs.filter(d => this.verifiedDocs.has(d.document_type)).length;

  isDocVerified(docType: string): boolean {
    return this.verifiedDocs.has(docType);
  }

  getUploadedDoc(docType: string): Document | undefined {
    return this.documents().find(d => d.document_type === docType);
  }

  toggleDocVerification(docType: string, checked: boolean) {
    if (checked) {
      this.verifiedDocs.add(docType);
    } else {
      this.verifiedDocs.delete(docType);
    }
  }

  async uploadDocument() {
    const claimId = this.claim()?.id;
    if (!claimId || !this.selectedDocType) return;

    const result = await this.api.uploadDocument(claimId, {
      document_type: this.selectedDocType,
      document_name: `${this.selectedDocType} - Uploaded`,
      file_path: `/uploads/${claimId}/${this.selectedDocType}.pdf`,
      is_mandatory: this.mandatoryDocs.some(d => d.document_type === this.selectedDocType),
      is_conditional: this.conditionalDocs.some(d => d.document_type === this.selectedDocType),
    });

    if (result.data) {
      this.snackBar.open('Document uploaded successfully', 'Close', { duration: 3000 });
      this.documents.update(docs => [result.data!, ...docs]);
    }

    this.selectedDocType = '';
  }

  async verifyDoc(docId: string) {
    const result = await this.api.verifyDocument(docId);
    if (result.success) {
      this.snackBar.open('Document verified', 'Close', { duration: 2000 });
      await this.loadData(this.claim()!.id);
    }
  }

  bookSurvey() {
    const surveyor = this.autoAssignSurveyor();

    this.surveyForm.patchValue({
      surveyor_name: surveyor.name,
      surveyor_contact: surveyor.contact,
      survey_scheduled_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });

    this.snackBar.open('Surveyor auto-assigned based on location and workload', 'Close', { duration: 3000 });
  }

  autoAssignSurveyor(): { name: string; contact: string } {
    const surveyors = [
      { name: 'Rajesh Kumar', contact: '+91-9876543211', pincodes: ['110', '111', '112'], workload: 3 },
      { name: 'Sunil Sharma', contact: '+91-9876543212', pincodes: ['400', '401', '402'], workload: 5 },
      { name: 'Anil Verma', contact: '+91-9876543213', pincodes: ['110', '400', '500'], workload: 2 },
    ];

    const lowestWorkload = surveyors.sort((a, b) => a.workload - b.workload)[0];

    return { name: lowestWorkload.name, contact: lowestWorkload.contact };
  }

  async saveAssessment() {
    const claimId = this.claim()?.id;
    if (!claimId) return;

    this.isSubmitting.set(true);

    const reserveAmount = this.reserveForm.get('reserve_recommendation')?.value;
    const reservePaise = reserveAmount ? Math.round(parseFloat(reserveAmount) * 100) : this.totalDamageCost();

    const surveyData = {
      surveyor_name: this.surveyForm.get('surveyor_name')?.value,
      surveyor_contact: this.surveyForm.get('surveyor_contact')?.value,
      survey_scheduled_date: this.surveyForm.get('survey_scheduled_date')?.value,
      survey_completed_date: this.surveyForm.get('survey_completed_date')?.value,
      reserve_recommendation: reservePaise,
    };

    await this.api.updateClaimMotorDetails(claimId, surveyData);

    const transitionResult = await this.api.transitionClaimStatus(claimId, 'ASSESSMENT_COMPLETED', {
      reserve_recommendation: reservePaise,
      estimated_loss_amount: reservePaise,
    });

    this.isSubmitting.set(false);

    if (transitionResult.success) {
      this.snackBar.open('Assessment completed successfully', 'Close', { duration: 3000 });
      this.router.navigate(['/claims', claimId]);
    } else {
      this.snackBar.open(transitionResult.error || 'Failed to complete assessment', 'Close', { duration: 5000 });
    }
  }

  formatAmount(paise?: number | null): string {
    return this.api.formatAmount(paise);
  }
}
