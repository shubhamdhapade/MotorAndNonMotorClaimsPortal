import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../services/api.service';
import type { Claim, ClaimStatus } from '../models';

@Component({
  selector: 'app-claim-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="claim-list-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Claims List</mat-card-title>
          <mat-card-subtitle>Manage motor claims across all stages</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="filters-row">
            <mat-form-field appearance="outline" class="filter-field">
              <mat-label>Search</mat-label>
              <input matInput (input)="applyFilter($event)" placeholder="Search claims...">
              <mat-icon matPrefix>search</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="outline" class="filter-field">
              <mat-label>Status</mat-label>
              <mat-select (selectionChange)="onStatusFilter($event.value)">
                <mat-option value="">All Statuses</mat-option>
                @for (status of statusList; track status) {
                  <mat-option [value]="status">{{ formatStatus(status) }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <button mat-raised-button color="primary" routerLink="/motor-fnol" class="create-btn">
              <mat-icon>add</mat-icon>
              New FNOL
            </button>
          </div>

          <div class="table-container">
            <table mat-table [dataSource]="dataSource()" matSort>
              <ng-container matColumnDef="claim_number">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Claim Number</th>
                <td mat-cell *matCellDef="let claim">
                  <a [routerLink]="['/claims', claim.id]" class="claim-link">{{ claim.claim_number }}</a>
                </td>
              </ng-container>

              <ng-container matColumnDef="policy_number">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Policy</th>
                <td mat-cell *matCellDef="let claim">{{ claim.policy?.policy_number }}</td>
              </ng-container>

              <ng-container matColumnDef="insurer">
                <th mat-header-cell *matHeaderCellDef>Insurer</th>
                <td mat-cell *matCellDef="let claim">{{ claim.insurer?.name }}</td>
              </ng-container>

              <ng-container matColumnDef="vehicle_type">
                <th mat-header-cell *matHeaderCellDef>Vehicle</th>
                <td mat-cell *matCellDef="let claim">{{ claim.vehicle_type }} - {{ claim.vehicle_registration_number }}</td>
              </ng-container>

              <ng-container matColumnDef="loss_type">
                <th mat-header-cell *matHeaderCellDef>Loss Type</th>
                <td mat-cell *matCellDef="let claim">{{ claim.loss_type }}</td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let claim">
                  <mat-chip [color]="getStatusColor(claim.status)" selected>
                    {{ formatStatus(claim.status) }}
                  </mat-chip>
                </td>
              </ng-container>

              <ng-container matColumnDef="created_at">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Created</th>
                <td mat-cell *matCellDef="let claim">{{ claim.created_at | date:'dd MMM yyyy' }}</td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Actions</th>
                <td mat-cell *matCellDef="let claim">
                  <button mat-icon-button [routerLink]="['/claims', claim.id]" matTooltip="View Details">
                    <mat-icon>visibility</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>
          </div>

          <mat-paginator
            [length]="totalClaims()"
            [pageSize]="pageSize()"
            [pageSizeOptions]="[10, 25, 50]"
            (page)="onPageChange($event)">
          </mat-paginator>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .claim-list-container {
      padding: 24px;
    }

    mat-card-title {
      font-size: 24px;
      font-weight: 600;
    }

    .filters-row {
      display: flex;
      gap: 16px;
      align-items: center;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .filter-field {
      flex: 1;
      min-width: 200px;
    }

    .create-btn {
      height: 52px;
    }

    .table-container {
      overflow-x: auto;
      margin-bottom: 16px;
    }

    .claim-link {
      color: #1a237e;
      text-decoration: none;
      font-weight: 500;
    }

    .claim-link:hover {
      text-decoration: underline;
    }

    table {
      width: 100%;
    }

    .mat-mdc-row:hover {
      background: #f5f5f5;
    }
  `],
})
export class ClaimListComponent implements OnInit {
  private api = inject(ApiService);
  private snackBar = inject(MatSnackBar);

  claims = signal<Claim[]>([]);
  totalClaims = signal(0);
  pageSize = signal(10);
  currentFilter = signal<string>('');
  currentStatus = signal<string>('');

  displayedColumns = ['claim_number', 'policy_number', 'insurer', 'vehicle_type', 'loss_type', 'status', 'created_at', 'actions'];

  statusList: ClaimStatus[] = [
    'DRAFT', 'FNOL_SUBMITTED', 'FNOL_REVIEW', 'ASSESSMENT_PENDING',
    'ASSESSMENT_IN_PROGRESS', 'ASSESSMENT_COMPLETED', 'APPROVAL_PENDING',
    'APPROVED', 'REJECTED', 'PAYMENT_PENDING', 'PAYMENT_PROCESSING',
    'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'CLOSED', 'REOPENED'
  ];

  dataSource = computed(() => {
    const data = this.claims();
    const ds = new MatTableDataSource(data);
    ds.filter = this.currentFilter();
    return ds;
  });

  async ngOnInit() {
    await this.loadClaims();
  }

  async loadClaims() {
    const result = await this.api.getClaims({
      status: this.currentStatus() || undefined,
      limit: this.pageSize(),
    });

    if (result.error) {
      this.snackBar.open(result.error, 'Close', { duration: 5000 });
      return;
    }

    this.claims.set(result.data || []);
    this.totalClaims.set(result.count || 0);
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value.toLowerCase();
    this.currentFilter.set(filterValue);
  }

  onStatusFilter(status: string) {
    this.currentStatus.set(status);
    this.loadClaims();
  }

  onPageChange(event: PageEvent) {
    this.pageSize.set(event.pageSize);
    this.loadClaims();
  }

  formatStatus(status: ClaimStatus): string {
    return status.replace(/_/g, ' ').replace(/\w\S*/g, txt =>
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  }

  getStatusColor(status: ClaimStatus): 'primary' | 'accent' | 'warn' {
    const greenStatuses = ['APPROVED', 'PAYMENT_SUCCESS', 'CLOSED'];
    const redStatuses = ['REJECTED', 'PAYMENT_FAILED'];
    const yellowStatuses = ['FNOL_SUBMITTED', 'ASSESSMENT_IN_PROGRESS', 'PAYMENT_PROCESSING', 'REOPENED'];

    if (greenStatuses.includes(status)) return 'accent';
    if (redStatuses.includes(status)) return 'warn';
    if (yellowStatuses.includes(status)) return 'primary';
    return undefined as unknown as 'primary';
  }
}
