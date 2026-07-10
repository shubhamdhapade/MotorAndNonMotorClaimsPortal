import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../services/api.service';
import type { Policy, VehicleType, LossType, DamagePart } from '../models';

@Component({
  selector: 'app-motor-fnol',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatStepperModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatCardModule,
    MatChipsModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="fnol-container">
      <mat-card class="fnol-card">
        <mat-card-header>
          <mat-card-title>Motor First Notice of Loss (FNOL)</mat-card-title>
          <mat-card-subtitle>Create a new motor insurance claim</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <mat-stepper [linear]="true" [selectedIndex]="currentStep()">
            <!-- Step 1: Policy Lookup -->
            <mat-step [stepControl]="policyForm" label="Policy Lookup">
              <form [formGroup]="policyForm" class="step-form">
                <div class="step-content">
                  <h4>Enter Policy Number</h4>
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Policy Number</mat-label>
                    <input matInput formControlName="policy_number" placeholder="e.g., POL-MOTOR-0001">
                    <mat-error *ngIf="policyForm.get('policy_number')?.hasError('required')">Policy number is required</mat-error>
                  </mat-form-field>

                  <button mat-raised-button color="primary" type="button" (click)="lookupPolicy()" [disabled]="policyForm.invalid || isLookingUp()">
                    @if (isLookingUp()) {
                      <mat-spinner diameter="20"></mat-spinner>
                    } @else {
                      <span>Look Up Policy</span>
                    }
                  </button>

                  @if (policy()) {
                    <mat-card class="policy-info-card">
                      <mat-card-header>
                        <mat-card-title>Policy Found</mat-card-title>
                      </mat-card-header>
                      <mat-card-content>
                        <div class="policy-info-grid">
                          <div class="info-item">
                            <span class="label">Policy Holder</span>
                            <span class="value">{{ policy()?.policy_holder_name }}</span>
                          </div>
                          <div class="info-item">
                            <span class="label">Insurance Company</span>
                            <span class="value">{{ policy()?.insurer?.name }}</span>
                          </div>
                          <div class="info-item">
                            <span class="label">Vehicle Type</span>
                            <span class="value">{{ policy()?.vehicle_type }}</span>
                          </div>
                          <div class="info-item">
                            <span class="label">Registration No.</span>
                            <span class="value">{{ policy()?.vehicle_registration_number }}</span>
                          </div>
                          <div class="info-item">
                            <span class="label">Make / Model</span>
                            <span class="value">{{ policy()?.vehicle_make }} {{ policy()?.vehicle_model }}</span>
                          </div>
                          <div class="info-item">
                            <span class="label">Sum Insured</span>
                            <span class="value">{{ formatAmount(policy()?.sum_insured) }}</span>
                          </div>
                          <div class="info-item">
                            <span class="label">Policy Period</span>
                            <span class="value">{{ policy()?.policy_start_date | date:'MMM yyyy' }} - {{ policy()?.policy_end_date | date:'MMM yyyy' }}</span>
                          </div>
                        </div>
                      </mat-card-content>
                    </mat-card>
                  }

                  @if (lookupError()) {
                    <div class="error-message">{{ lookupError() }}</div>
                  }
                </div>

                <div class="step-actions">
                  <button mat-button type="button" routerLink="/claims">Cancel</button>
                  <button mat-raised-button color="primary" matStepperNext [disabled]="!policy()">Next</button>
                </div>
              </form>
            </mat-step>

            <!-- Step 2: Loss Details -->
            <mat-step [stepControl]="lossForm" label="Loss Details">
              <form [formGroup]="lossForm" class="step-form">
                <div class="step-content">
                  <h4>Loss / Incident Details</h4>
                  <div class="form-row">
                    <mat-form-field appearance="outline">
                      <mat-label>Loss Type</mat-label>
                      <mat-select formControlName="loss_type">
                        <mat-option value="ACCIDENT">Accident</mat-option>
                        <mat-option value="THEFT">Theft</mat-option>
                        <mat-option value="FIRE">Fire</mat-option>
                        <mat-option value="NATURAL_CALAMITY">Natural Calamity</mat-option>
                        <mat-option value="OTHER">Other</mat-option>
                      </mat-select>
                      <mat-error *ngIf="lossForm.get('loss_type')?.hasError('required')">Required</mat-error>
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Loss Date & Time</mat-label>
                      <input matInput [matDatepicker]="picker" formControlName="loss_date">
                      <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
                      <mat-datepicker #picker></mat-datepicker>
                      <mat-error *ngIf="lossForm.get('loss_date')?.hasError('required')">Required</mat-error>
                    </mat-form-field>
                  </div>

                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Loss Location</mat-label>
                    <input matInput formControlName="loss_location" placeholder="e.g., MG Road, Delhi">
                    <mat-error *ngIf="lossForm.get('loss_location')?.hasError('required')">Required</mat-error>
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Description of Incident</mat-label>
                    <textarea matInput formControlName="loss_description" rows="4" placeholder="Describe what happened..."></textarea>
                    <mat-error *ngIf="lossForm.get('loss_description')?.hasError('required')">Required</mat-error>
                  </mat-form-field>

                  <div class="form-row">
                    <mat-form-field appearance="outline">
                      <mat-label>Estimated Loss Amount</mat-label>
                      <input matInput formControlName="estimated_loss_amount" placeholder="e.g., 50000">
                      <mat-icon matPrefix>currency_rupee</mat-icon>
                    </mat-form-field>
                  </div>
                </div>

                <div class="step-actions">
                  <button mat-button matStepperPrevious>Back</button>
                  <button mat-raised-button color="primary" matStepperNext [disabled]="lossForm.invalid">Next</button>
                </div>
              </form>
            </mat-step>

            <!-- Step 3: Driver & FIR Details -->
            <mat-step [stepControl]="driverForm" label="Driver & FIR">
              <form [formGroup]="driverForm" class="step-form">
                <div class="step-content">
                  <h4>Driver Details</h4>
                  <div class="form-row">
                    <mat-form-field appearance="outline">
                      <mat-label>Driver Name</mat-label>
                      <input matInput formControlName="driver_name">
                      <mat-error *ngIf="driverForm.get('driver_name')?.hasError('required')">Required</mat-error>
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Driver License Number</mat-label>
                      <input matInput formControlName="driver_license_number">
                      <mat-error *ngIf="driverForm.get('driver_license_number')?.hasError('required')">Required</mat-error>
                    </mat-form-field>
                  </div>

                  <div class="form-row">
                    <mat-form-field appearance="outline">
                      <mat-label>License Expiry Date</mat-label>
                      <input matInput [matDatepicker]="licensePicker" formControlName="driver_license_expiry">
                      <mat-datepicker-toggle matSuffix [for]="licensePicker"></mat-datepicker-toggle>
                      <mat-datepicker #licensePicker></mat-datepicker>
                    </mat-form-field>
                  </div>

                  <h4>FIR Details (if applicable)</h4>
                  <div class="form-row">
                    <mat-form-field appearance="outline">
                      <mat-label>FIR Number</mat-label>
                      <input matInput formControlName="fir_number">
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>FIR Station</mat-label>
                      <input matInput formControlName="fir_station">
                    </mat-form-field>
                  </div>

                  <mat-form-field appearance="outline" class="half-width">
                    <mat-label>FIR Date</mat-label>
                    <input matInput [matDatepicker]="firPicker" formControlName="fir_date">
                    <mat-datepicker-toggle matSuffix [for]="firPicker"></mat-datepicker-toggle>
                    <mat-datepicker #firPicker></mat-datepicker>
                  </mat-form-field>

                  <div class="form-row checkbox-row">
                    <mat-checkbox formControlName="third_party_involved">Third Party Involved</mat-checkbox>
                  </div>

                  @if (driverForm.get('third_party_involved')?.value) {
                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Third Party Details</mat-label>
                      <textarea matInput formControlName="third_party_details" rows="3"></textarea>
                    </mat-form-field>
                  }

                  <h4>Casualty Information</h4>
                  <div class="form-row">
                    <mat-form-field appearance="outline">
                      <mat-label>Passengers Count</mat-label>
                      <input matInput type="number" formControlName="passengers_count" min="0">
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Injuries</mat-label>
                      <input matInput type="number" formControlName="injuries" min="0">
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Fatalities</mat-label>
                      <input matInput type="number" formControlName="fatalities" min="0">
                    </mat-form-field>
                  </div>
                </div>

                <div class="step-actions">
                  <button mat-button matStepperPrevious>Back</button>
                  <button mat-raised-button color="primary" matStepperNext [disabled]="driverForm.invalid">Next</button>
                </div>
              </form>
            </mat-step>

            <!-- Step 4: Garage Information -->
            <mat-step [stepControl]="garageForm" label="Garage Info">
              <form [formGroup]="garageForm" class="step-form">
                <div class="step-content">
                  <h4>Garage / Workshop Details</h4>
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Garage Name</mat-label>
                    <input matInput formControlName="garage_name">
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Garage Address</mat-label>
                    <textarea matInput formControlName="garage_address" rows="2"></textarea>
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="half-width">
                    <mat-label>Contact Number</mat-label>
                    <input matInput formControlName="garage_contact">
                  </mat-form-field>
                </div>

                <div class="step-actions">
                  <button mat-button matStepperPrevious>Back</button>
                  <button mat-raised-button color="primary" matStepperNext>Next</button>
                </div>
              </form>
            </mat-step>

            <!-- Step 5: Damage Selection -->
            <mat-step label="Damage Parts">
              <div class="step-form">
                <div class="step-content">
                  <h4>Select Damaged Parts</h4>
                  <p class="subtitle">Vehicle Type: <strong>{{ policy()?.vehicle_type }}</strong></p>

                  @for (side of getSides(); track side) {
                    <div class="side-section">
                      <h5>{{ side }}</h5>
                      <div class="parts-grid">
                        @for (part of getPartsForSide(side); track part) {
                          <mat-chip [class.selected]="isPartSelected(part)" (click)="togglePart(part)" class="part-chip">
                            <mat-icon *ngIf="isPartSelected(part)">check</mat-icon>
                            {{ part }}
                          </mat-chip>
                        }
                      </div>
                    </div>
                  }

                  @if (selectedDamages().length > 0) {
                    <div class="selected-damages">
                      <h5>Selected Damages ({{ selectedDamages().length }})</h5>
                      <div class="damages-list">
                        @for (damage of selectedDamages(); track damage.part_name) {
                          <div class="damage-item">
                            <span>{{ damage.part_name }}</span>
                            <mat-form-field appearance="outline" class="severity-field">
                              <mat-label>Severity</mat-label>
                              <mat-select [(ngModel)]="damage.damage_severity">
                                <mat-option value="MINOR">Minor</mat-option>
                                <mat-option value="MODERATE">Moderate</mat-option>
                                <mat-option value="SEVERE">Severe</mat-option>
                                <mat-option value="TOTAL_LOSS">Total Loss</mat-option>
                              </mat-select>
                            </mat-form-field>
                            <mat-form-field appearance="outline" class="cost-field">
                              <mat-label>Est. Cost</mat-label>
                              <input matInput type="number" [(ngModel)]="damage.estimated_repair_cost">
                            </mat-form-field>
                          </div>
                        }
                      </div>
                    </div>
                  }
                </div>

                <div class="step-actions">
                  <button mat-button matStepperPrevious>Back</button>
                  <button mat-raised-button color="primary" matStepperNext [disabled]="selectedDamages().length === 0">Next</button>
                </div>
              </div>
            </mat-step>

            <!-- Step 6: Review & Submit -->
            <mat-step label="Review & Submit">
              <div class="step-form">
                <div class="step-content review-content">
                  <h4>Review Claim Details</h4>

                  <mat-card class="review-card">
                    <mat-card-content>
                      <div class="review-grid">
                        <div class="review-section">
                          <h6>Policy Information</h6>
                          <p><strong>Policy:</strong> {{ policy()?.policy_number }}</p>
                          <p><strong>Insurer:</strong> {{ policy()?.insurer?.name }}</p>
                          <p><strong>Vehicle:</strong> {{ policy()?.vehicle_type }} - {{ policy()?.vehicle_registration_number }}</p>
                        </div>

                        <div class="review-section">
                          <h6>Loss Information</h6>
                          <p><strong>Type:</strong> {{ lossForm.get('loss_type')?.value }}</p>
                          <p><strong>Date:</strong> {{ lossForm.get('loss_date')?.value | date }}</p>
                          <p><strong>Location:</strong> {{ lossForm.get('loss_location')?.value }}</p>
                        </div>

                        <div class="review-section">
                          <h6>Driver</h6>
                          <p><strong>Name:</strong> {{ driverForm.get('driver_name')?.value }}</p>
                          <p><strong>License:</strong> {{ driverForm.get('driver_license_number')?.value }}</p>
                        </div>

                        <div class="review-section">
                          <h6>Damages ({{ selectedDamages().length }} parts)</h6>
                          <p>{{ damagePartsList() }}</p>
                        </div>
                      </div>
                    </mat-card-content>
                  </mat-card>
                </div>

                <div class="step-actions">
                  <button mat-button matStepperPrevious>Back</button>
                  <button mat-raised-button color="primary" (click)="submitFNOL()" [disabled]="isSubmitting()">
                    @if (isSubmitting()) {
                      <mat-spinner diameter="20"></mat-spinner>
                    } @else {
                      <span>Submit FNOL</span>
                    }
                  </button>
                </div>
              </div>
            </mat-step>
          </mat-stepper>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .fnol-container {
      padding: 24px;
      max-width: 1000px;
      margin: 0 auto;
    }

    .fnol-card {
      margin-top: 16px;
    }

    mat-card-title {
      font-size: 24px;
      font-weight: 600;
    }

    .step-form {
      padding: 24px 0;
    }

    .step-content {
      min-height: 300px;
    }

    .step-content h4 {
      margin-bottom: 24px;
      color: #1a237e;
    }

    .step-content h5 {
      margin: 16px 0 8px;
      color: #424242;
    }

    .step-content h6 {
      margin: 0 0 8px;
      color: #666;
    }

    .form-row {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
    }

    .form-row mat-form-field {
      flex: 1;
    }

    .checkbox-row {
      margin: 16px 0;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .half-width {
      width: 48%;
    }

    .step-actions {
      display: flex;
      justify-content: flex-end;
      gap: 16px;
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid #e0e0e0;
    }

    .policy-info-card {
      margin-top: 24px;
      background: #e8f5e9;
    }

    .policy-info-grid, .review-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .info-item, .review-section {
      display: flex;
      flex-direction: column;
    }

    .info-item .label, .review-section h6 {
      font-size: 12px;
      color: #666;
      margin-bottom: 4px;
    }

    .info-item .value {
      font-weight: 500;
    }

    .side-section {
      margin-bottom: 24px;
    }

    .parts-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .part-chip {
      cursor: pointer;
      transition: all 0.2s;
    }

    .part-chip:hover {
      background: #e3f2fd;
    }

    .damages-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 16px;
    }

    .damage-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: #f5f5f5;
      border-radius: 8px;
    }

    .severity-field {
      width: 120px;
    }

    .cost-field {
      width: 150px;
    }

    .review-card {
      margin-top: 16px;
    }

    .review-section p {
      margin: 4px 0;
      font-size: 14px;
    }

    .error-message {
      color: #f44336;
      padding: 12px;
      background: #ffebee;
      border-radius: 4px;
      margin-top: 16px;
    }

    .subtitle {
      color: #666;
      margin-bottom: 16px;
    }
  `],
})
export class MotorFNOLComponent {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  currentStep = signal(0);
  isLookingUp = signal(false);
  isSubmitting = signal(false);
  lookupError = signal<string | null>(null);
  policy = signal<Policy | null>(null);

  selectedDamages = signal<DamagePart[]>([]);

  damagePartsList = () => this.selectedDamages().map(d => d.part_name).join(', ');

  // Step 1: Policy Lookup
  policyForm = this.fb.group({
    policy_number: ['', Validators.required],
  });

  // Step 2: Loss Details
  lossForm = this.fb.group({
    loss_type: ['', Validators.required],
    loss_date: ['', Validators.required],
    loss_location: ['', Validators.required],
    loss_description: ['', Validators.required],
    estimated_loss_amount: [''],
  });

  // Step 3: Driver & FIR Details
  driverForm = this.fb.group({
    driver_name: ['', Validators.required],
    driver_license_number: ['', Validators.required],
    driver_license_expiry: [''],
    fir_number: [''],
    fir_station: [''],
    fir_date: [''],
    third_party_involved: [false],
    third_party_details: [''],
    passengers_count: [0],
    injuries: [0],
    fatalities: [0],
  });

  // Step 4: Garage Info
  garageForm = this.fb.group({
    garage_name: [''],
    garage_address: [''],
    garage_contact: [''],
  });

  async lookupPolicy() {
    const policyNumber = this.policyForm.get('policy_number')?.value;
    if (!policyNumber) return;

    this.isLookingUp.set(true);
    this.lookupError.set(null);

    const result = await this.api.getPolicyByNumber(policyNumber);

    this.isLookingUp.set(false);

    if (result.error) {
      this.lookupError.set(result.error);
    } else if (result.data) {
      this.policy.set(result.data);
      // Auto-populate vehicle details
      this.lossForm.patchValue({
        estimated_loss_amount: (result.data.sum_insured / 100).toString(),
      });
    } else {
      this.lookupError.set('Policy not found');
    }
  }

  getSides(): string[] {
    const vehicleType = this.policy()?.vehicle_type;
    if (vehicleType === '2W') return ['FRONT', 'REAR', 'LEFT', 'RIGHT', 'ENGINE', 'ELECTRICAL'];
    if (vehicleType === '4W') return ['FRONT', 'REAR', 'LEFT', 'RIGHT', 'TOP', 'INTERIOR', 'ENGINE', 'WHEELS'];
    if (vehicleType === 'CV') return ['FRONT', 'REAR', 'LEFT', 'RIGHT', 'CARGO', 'ENGINE', 'WHEELS'];
    return ['FRONT', 'REAR', 'LEFT', 'RIGHT'];
  }

  getPartsForSide(side: string): string[] {
    const vehicleType = this.policy()?.vehicle_type;
    if (vehicleType === '2W') {
      const parts: Record<string, string[]> = {
        FRONT: ['HEADLIGHT', 'FORK', 'FRONT_FENDER', 'FRONT_WHEEL', 'FRONT_BRAKE'],
        REAR: ['TAILLIGHT', 'REAR_FENDER', 'REAR_WHEEL', 'REAR_BRAKE', 'SEAT'],
        LEFT: ['LEFT_INDICATOR', 'LEFT_MIRROR', 'LEFT_PANNEL', 'TANK_LEFT'],
        RIGHT: ['RIGHT_INDICATOR', 'RIGHT_MIRROR', 'RIGHT_PANNEL', 'TANK_RIGHT'],
        ENGINE: ['ENGINE_BLOCK', 'CARBURETOR', 'SILENCER', 'KICK_LEVER'],
        ELECTRICAL: ['BATTERY', 'WIRING_HARNESS', 'CDI_UNIT', 'REGULATOR'],
      };
      return parts[side] || [];
    }
    if (vehicleType === '4W') {
      const parts: Record<string, string[]> = {
        FRONT: ['FRONT_BUMPER', 'HEADLIGHT_LEFT', 'HEADLIGHT_RIGHT', 'GRILLE', 'HOOD', 'WINDSHIELD', 'FRONT_FENDER_LEFT', 'FRONT_FENDER_RIGHT'],
        REAR: ['REAR_BUMPER', 'TAILLIGHT_LEFT', 'TAILLIGHT_RIGHT', 'TRUNK', 'REAR_WINDSHIELD', 'REAR_FENDER_LEFT', 'REAR_FENDER_RIGHT'],
        LEFT: ['DOOR_FRONT_LEFT', 'DOOR_REAR_LEFT', 'LEFT_MIRROR', 'LEFT_RUNNING_BOARD'],
        RIGHT: ['DOOR_FRONT_RIGHT', 'DOOR_REAR_RIGHT', 'RIGHT_MIRROR', 'RIGHT_RUNNING_BOARD'],
        TOP: ['ROOF', 'SUNROOF'],
        INTERIOR: ['DASHBOARD', 'STEERING', 'SEATS', 'CARPET', 'HEADLINER'],
        ENGINE: ['ENGINE', 'TRANSMISSION', 'RADIATOR', 'BATTERY', 'ALTERNATOR'],
        WHEELS: ['WHEEL_FRONT_LEFT', 'WHEEL_FRONT_RIGHT', 'WHEEL_REAR_LEFT', 'WHEEL_REAR_RIGHT'],
      };
      return parts[side] || [];
    }
    if (vehicleType === 'CV') {
      const parts: Record<string, string[]> = {
        FRONT: ['FRONT_BUMPER', 'HEADLIGHTS', 'GRILLE', 'WINDSHIELD', 'HOOD'],
        REAR: ['REAR_BUMPER', 'TAILLIGHTS', 'CARGO_DOOR_LEFT', 'CARGO_DOOR_RIGHT', 'REAR_AXLE'],
        LEFT: ['CABIN_DOOR', 'LEFT_MIRROR', 'FUEL_TANK', 'LEFT_GUARD'],
        RIGHT: ['PASSENGER_DOOR', 'RIGHT_MIRROR', 'RIGHT_GUARD'],
        CARGO: ['CARGO_AREA', 'CARGO_FLOOR', 'CARGO_WALLS', 'CARGO_ROOF'],
        ENGINE: ['ENGINE', 'TRANSMISSION', 'DIFFERENTIAL', 'SUSPENSION'],
        WHEELS: ['FRONT_WHEELS', 'REAR_WHEELS', 'SPARE_WHEEL'],
      };
      return parts[side] || [];
    }
    return [];
  }

  isPartSelected(part: string): boolean {
    return this.selectedDamages().some(d => d.part_name === part);
  }

  togglePart(part: string) {
    const damages = this.selectedDamages();
    const index = damages.findIndex(d => d.part_name === part);

    if (index >= 0) {
      damages.splice(index, 1);
    } else {
      damages.push({
        part_name: part,
        damage_severity: 'MODERATE',
        side: '', // determined in submit
      });
    }

    this.selectedDamages.set([...damages]);
  }

  async submitFNOL() {
    if (!this.policy() || this.selectedDamages().length === 0) return;

    this.isSubmitting.set(true);

    const damages = this.selectedDamages().map(d => {
      // Find which side the part belongs to
      let side = '';
      for (const s of this.getSides()) {
        if (this.getPartsForSide(s).includes(d.part_name)) {
          side = s;
          break;
        }
      }
      return { ...d, side };
    });

    const fnolData = {
      policy_number: this.policy()!.policy_number,
      loss_type: this.lossForm.get('loss_type')?.value as LossType,
      loss_date: this.lossForm.get('loss_date')?.value || null,
      loss_location: this.lossForm.get('loss_location')?.value || null,
      loss_description: this.lossForm.get('loss_description')?.value || null,
      vehicle_type: this.policy()!.vehicle_type,
      vehicle_registration_number: this.policy()!.vehicle_registration_number,
      driver_name: this.driverForm.get('driver_name')?.value || '',
      driver_license_number: this.driverForm.get('driver_license_number')?.value || '',
      driver_license_expiry: this.driverForm.get('driver_license_expiry')?.value || null,
      fir_number: this.driverForm.get('fir_number')?.value || null,
      fir_station: this.driverForm.get('fir_station')?.value || null,
      fir_date: this.driverForm.get('fir_date')?.value || null,
      third_party_involved: this.driverForm.get('third_party_involved')?.value || false,
      third_party_details: this.driverForm.get('third_party_details')?.value || null,
      passengers_count: this.driverForm.get('passengers_count')?.value ?? 0,
      injuries: this.driverForm.get('injuries')?.value ?? 0,
      fatalities: this.driverForm.get('fatalities')?.value ?? 0,
      garage_name: this.garageForm.get('garage_name')?.value || null,
      garage_address: this.garageForm.get('garage_address')?.value || null,
      garage_contact: this.garageForm.get('garage_contact')?.value || null,
      damages,
    };

    const result = await this.api.createMotorFNOL(fnolData);

    this.isSubmitting.set(false);

    if (result.error) {
      this.snackBar.open(result.error, 'Close', { duration: 5000 });
    } else if (result.data) {
      this.snackBar.open(`FNOL submitted successfully! Claim: ${result.data.claim_number}`, 'Close', { duration: 5000 });
      this.router.navigate(['/claims', result.data.id]);
    }
  }

  formatAmount(paise?: number | null): string {
    return this.api.formatAmount(paise);
  }
}
