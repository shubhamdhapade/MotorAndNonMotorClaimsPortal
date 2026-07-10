import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from './services/api.service';
import { AuthService } from './services/auth.service';
import type { DashboardStats, Claim, TaskQueue } from './models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="dashboard-container">
      <div class="welcome-section">
        <h1>Welcome, {{ userName() }}</h1>
      </div>

      @if (isLoading()) {
        <div class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else {
        <!-- Stats Cards -->
        <div class="stats-section">
          <div class="stats-grid">
            <mat-card class="stat-card">
              <mat-card-content>
                <div class="stat-content">
                  <mat-icon class="stat-icon blue">list_alt</mat-icon>
                  <div class="stat-text">
                    <span class="stat-value">{{ stats()?.total_claims || 0 }}</span>
                    <span class="stat-label">Total Claims</span>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>

            <mat-card class="stat-card">
              <mat-card-content>
                <div class="stat-content">
                  <mat-icon class="stat-icon orange">assignment</mat-icon>
                  <div class="stat-text">
                    <span class="stat-value">{{ stats()?.pending_assessment || 0 }}</span>
                    <span class="stat-label">Pending Assessment</span>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>

            <mat-card class="stat-card">
              <mat-card-content>
                <div class="stat-content">
                  <mat-icon class="stat-icon green">gavel</mat-icon>
                  <div class="stat-text">
                    <span class="stat-value">{{ stats()?.pending_approval || 0 }}</span>
                    <span class="stat-label">Pending Approval</span>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>

            <mat-card class="stat-card">
              <mat-card-content>
                <div class="stat-content">
                  <mat-icon class="stat-icon purple">payment</mat-icon>
                  <div class="stat-text">
                    <span class="stat-value">{{ stats()?.pending_payment || 0 }}</span>
                    <span class="stat-label">Pending Payment</span>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="actions-section">
          <h2>Quick Actions</h2>
          <div class="actions-grid">
            <mat-card class="action-card" routerLink="/motor-fnol">
              <mat-card-content>
                <mat-icon class="action-icon">add_circle</mat-icon>
                <h3>Create New FNOL</h3>
                <p>Register a new motor claim</p>
              </mat-card-content>
            </mat-card>

            <mat-card class="action-card" routerLink="/claims">
              <mat-card-content>
                <mat-icon class="action-icon">list</mat-icon>
                <h3>View All Claims</h3>
                <p>Browse and manage claims</p>
              </mat-card-content>
            </mat-card>

            <mat-card class="action-card" routerLink="/claims" [queryParams]="{status: 'ASSESSMENT_PENDING'}">
              <mat-card-content>
                <mat-icon class="action-icon">assignment</mat-icon>
                <h3>Pending Assessment</h3>
                <p>Claims awaiting assessment</p>
              </mat-card-content>
            </mat-card>

            <mat-card class="action-card" routerLink="/claims" [queryParams]="{status: 'APPROVAL_PENDING'}">
              <mat-card-content>
                <mat-icon class="action-icon">gavel</mat-icon>
                <h3>Pending Approvals</h3>
                <p>Claims awaiting approval</p>
              </mat-card-content>
            </mat-card>
          </div>
        </div>

        <!-- Recent Claims -->
        <div class="recent-section">
          <div class="section-header">
            <h2>Recent Claims</h2>
            <button mat-stroked-button routerLink="/claims">View All</button>
          </div>

          <div class="claims-list">
            @for (claim of recentClaims(); track claim.id) {
              <mat-card class="claim-card" [routerLink]="['/claims', claim.id]">
                <mat-card-header>
                  <mat-card-title>{{ claim.claim_number }}</mat-card-title>
                  <mat-card-subtitle>{{ claim.policy?.policy_holder_name }}</mat-card-subtitle>
                  <mat-chip [color]="getStatusColor(claim.status)" selected class="status-chip">
                    {{ formatStatus(claim.status) }}
                  </mat-chip>
                </mat-card-header>
                <mat-card-content>
                  <div class="claim-info">
                    <span><mat-icon>directions_car</mat-icon> {{ claim.vehicle_type }} - {{ claim.vehicle_registration_number }}</span>
                    <span><mat-icon>event</mat-icon> {{ claim.loss_date | date:'dd MMM yyyy' }}</span>
                    <span><mat-icon>business</mat-icon> {{ claim.insurer?.name }}</span>
                  </div>
                </mat-card-content>
              </mat-card>
            } @empty {
              <mat-card class="empty-card">
                <mat-card-content>
                  <mat-icon>inbox</mat-icon>
                  <p>No recent claims found</p>
                </mat-card-content>
              </mat-card>
            }
          </div>
        </div>

        <!-- My Tasks -->
        @if (myTasks()?.length) {
          <div class="tasks-section">
            <h2>My Tasks</h2>
            <div class="tasks-list">
              @for (task of myTasks(); track task.id) {
                <mat-card class="task-card" [routerLink]="['/claims', task.claim_id]">
                  <mat-card-content>
                    <div class="task-content">
                      <mat-icon [color]="getTaskColor(task.task_type)">{{ getTaskIcon(task.task_type) }}</mat-icon>
                      <div class="task-text">
                        <span class="task-type">{{ task.task_type }}</span>
                        <span class="task-claim">{{ task.claim?.claim_number }}</span>
                      </div>
                      <mat-chip [color]="task.priority <= 3 ? 'warn' : 'primary'" selected small>
                        P{{ task.priority }}
                      </mat-chip>
                    </div>
                  </mat-card-content>
                </mat-card>
              }
            </div>
          </div>
        }

        <!-- Summary Cards -->
        <div class="summary-section">
          <mat-card class="summary-card">
            <mat-card-header>
              <mat-card-title>This Month</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="summary-grid">
                <div class="summary-item">
                  <span class="summary-value">{{ stats()?.closed_this_month || 0 }}</span>
                  <span class="summary-label">Claims Closed</span>
                </div>
                <div class="summary-item">
                  <span class="summary-value">{{ stats()?.reopened_this_month || 0 }}</span>
                  <span class="summary-label">Claims Reopened</span>
                </div>
                <div class="summary-item">
                  <span class="summary-value">{{ formatAmount(stats()?.total_claim_amount) }}</span>
                  <span class="summary-label">Total Claim Amount</span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      }
    </div>
  `,
  styles: [`
    .dashboard-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .welcome-section {
      margin-bottom: 32px;
    }

    .welcome-section h1 {
      margin: 0;
      font-size: 32px;
      font-weight: 600;
    }

    .subtitle {
      color: #666;
      margin: 8px 0 0;
    }

    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 400px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }

    @media (max-width: 992px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 600px) {
      .stats-grid {
        grid-template-columns: 1fr;
      }
    }

    .stat-card {
      border-radius: 12px;
    }

    .stat-content {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 8px;
    }

    .stat-icon {
      font-size: 48px;
      height: 48px;
      width: 48px;
    }

    .stat-icon.blue { color: #2196f3; }
    .stat-icon.orange { color: #ff9800; }
    .stat-icon.green { color: #4caf50; }
    .stat-icon.purple { color: #9c27b0; }

    .stat-text {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-size: 32px;
      font-weight: 600;
      color: #1a237e;
    }

    .stat-label {
      font-size: 14px;
      color: #666;
    }

    .actions-section, .recent-section, .tasks-section, .summary-section {
      margin-top: 32px;
    }

    .actions-section h2, .recent-section h2, .tasks-section h2 {
      margin-bottom: 16px;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .section-header h2 {
      margin: 0;
    }

    .actions-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }

    @media (max-width: 992px) {
      .actions-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 600px) {
      .actions-grid {
        grid-template-columns: 1fr;
      }
    }

    .action-card {
      cursor: pointer;
      text-align: center;
      transition: all 0.2s;
      border-radius: 12px;
    }

    .action-card:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transform: translateY(-2px);
    }

    .action-icon {
      font-size: 48px;
      height: 48px;
      width: 48px;
      color: #1a237e;
      margin-bottom: 8px;
    }

    .action-card h3 {
      margin: 8px 0;
      font-size: 16px;
    }

    .action-card p {
      color: #666;
      font-size: 13px;
      margin: 0;
    }

    .claims-list {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    @media (max-width: 992px) {
      .claims-list {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 600px) {
      .claims-list {
        grid-template-columns: 1fr;
      }
    }

    .claim-card {
      cursor: pointer;
      transition: all 0.2s;
      border-radius: 12px;
    }

    .claim-card:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .status-chip {
      position: absolute;
      right: 16px;
      top: 16px;
    }

    .claim-info {
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: 13px;
      color: #666;
    }

    .claim-info span {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .claim-info mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .empty-card {
      text-align: center;
      padding: 48px;
    }

    .empty-card mat-icon {
      font-size: 48px;
      color: #ddd;
    }

    .empty-card p {
      color: #999;
      margin-top: 8px;
    }

    .tasks-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .task-card {
      cursor: pointer;
      border-radius: 8px;
    }

    .task-content {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .task-text {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .task-type {
      font-weight: 600;
    }

    .task-claim {
      font-size: 12px;
      color: #666;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
      text-align: center;
    }

    @media (max-width: 600px) {
      .summary-grid {
        grid-template-columns: 1fr;
      }
    }

    .summary-item {
      display: flex;
      flex-direction: column;
    }

    .summary-value {
      font-size: 24px;
      font-weight: 600;
      color: #1a237e;
    }

    .summary-label {
      font-size: 14px;
      color: #666;
    }
  `],
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  isLoading = signal(true);
  stats = signal<DashboardStats | null>(null);
  recentClaims = signal<Claim[]>([]);
  myTasks = signal<TaskQueue[]>([]);

  userName = () => this.auth.user()?.full_name || 'User';

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    this.isLoading.set(true);

    const [statsRes, claimsRes, tasksRes] = await Promise.all([
      this.api.getDashboardStats(),
      this.api.getClaims({ limit: 6 }),
      this.api.getTasks(), // Would filter by user
    ]);

    if (statsRes.data) this.stats.set(statsRes.data);
    if (claimsRes.data) this.recentClaims.set(claimsRes.data);
    if (tasksRes.data) this.myTasks.set(tasksRes.data);

    this.isLoading.set(false);
  }

  formatStatus(status: string): string {
    return status.replace(/_/g, ' ').replace(/\w\S*/g, txt =>
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  }

  getStatusColor(status: string): 'primary' | 'accent' | 'warn' {
    const greenStatuses = ['APPROVED', 'PAYMENT_SUCCESS', 'CLOSED'];
    const redStatuses = ['REJECTED', 'PAYMENT_FAILED'];

    if (greenStatuses.includes(status)) return 'accent';
    if (redStatuses.includes(status)) return 'warn';
    return undefined as unknown as 'primary';
  }

  getTaskIcon(type: string): string {
    const icons: Record<string, string> = {
      FNOL_REVIEW: 'assignment',
      ASSESSMENT: 'build',
      APPROVAL: 'gavel',
      PAYMENT: 'payment',
      CLOSURE: 'lock',
    };
    return icons[type] || 'task';
  }

  getTaskColor(type: string): string {
    const colors: Record<string, string> = {
      FNOL_REVIEW: 'primary',
      ASSESSMENT: 'accent',
      APPROVAL: 'warn',
      PAYMENT: 'primary',
      CLOSURE: 'accent',
    };
    return colors[type] || '';
    return '';
  }

  formatAmount(paise?: number | null): string {
    return this.api.formatAmount(paise);
  }
}
