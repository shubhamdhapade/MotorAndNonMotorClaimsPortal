import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatListModule,
    MatToolbarModule,
    MatMenuModule,
    MatDividerModule,
  ],
  template: `
    <mat-sidenav-container class="app-container">
      <mat-sidenav #sidenav mode="side" opened class="app-sidenav">
        <div class="sidenav-content">
          <div class="logo-section">
            <mat-icon class="logo-icon">security</mat-icon>
            <span class="logo-text">Motor Claims</span>
          </div>

          <mat-nav-list>
            <a mat-list-item routerLink="/dashboard" routerLinkActive="active">
              <mat-icon matListItemIcon>dashboard</mat-icon>
              <span matListItemTitle>Dashboard</span>
            </a>

            <a mat-list-item routerLink="/claims" routerLinkActive="active">
              <mat-icon matListItemIcon>list_alt</mat-icon>
              <span matListItemTitle>Claims List</span>
            </a>

            <a mat-list-item routerLink="/motor-fnol" routerLinkActive="active">
              <mat-icon matListItemIcon>add_circle</mat-icon>
              <span matListItemTitle>New FNOL</span>
            </a>

            <mat-divider></mat-divider>

            <h3 mat-subheader>Workflow</h3>

            <a mat-list-item routerLink="/claims" [queryParams]="{status: 'ASSESSMENT_PENDING'}" routerLinkActive="active">
              <mat-icon matListItemIcon>assignment</mat-icon>
              <span matListItemTitle>Assessment</span>
            </a>

            <a mat-list-item routerLink="/claims" [queryParams]="{status: 'APPROVAL_PENDING'}" routerLinkActive="active">
              <mat-icon matListItemIcon>gavel</mat-icon>
              <span matListItemTitle>Approvals</span>
            </a>

            <a mat-list-item routerLink="/claims" [queryParams]="{status: 'PAYMENT_PENDING'}" routerLinkActive="active">
              <mat-icon matListItemIcon>payment</mat-icon>
              <span matListItemTitle>Payments</span>
            </a>

            <a mat-list-item routerLink="/claims" [queryParams]="{status: 'CLOSED'}" routerLinkActive="active">
              <mat-icon matListItemIcon>lock</mat-icon>
              <span matListItemTitle>Closure</span>
            </a>

            @if (isAdmin()) {
              <mat-divider></mat-divider>
              <h3 mat-subheader>Administration</h3>

              <a mat-list-item routerLink="/admin/users" routerLinkActive="active">
                <mat-icon matListItemIcon>people</mat-icon>
                <span matListItemTitle>Users</span>
              </a>

              <a mat-list-item routerLink="/admin/insurers" routerLinkActive="active">
                <mat-icon matListItemIcon>business</mat-icon>
                <span matListItemTitle>Insurers</span>
              </a>
            }
          </mat-nav-list>
        </div>
      </mat-sidenav>

      <mat-sidenav-content class="main-content">
        <mat-toolbar class="app-toolbar">
          <button mat-icon-button (click)="sidenav.toggle()" class="menu-toggle">
            <mat-icon>menu</mat-icon>
          </button>

          <span class="toolbar-title">{{ pageTitle() }}</span>

          <span class="spacer"></span>

          <button mat-button [matMenuTriggerFor]="userMenu" class="user-menu-btn">
            <mat-icon>account_circle</mat-icon>
            <span class="user-name">{{ userName() }}</span>
          </button>

          <mat-menu #userMenu="matMenu">
            <button mat-menu-item disabled>
              <mat-icon>person</mat-icon>
              <span>{{ userEmail() }}</span>
            </button>
            <mat-divider></mat-divider>
            <button mat-menu-item routerLink="/profile">
              <mat-icon>settings</mat-icon>
              <span>Settings</span>
            </button>
            <button mat-menu-item (click)="logout()">
              <mat-icon>logout</mat-icon>
              <span>Logout</span>
            </button>
          </mat-menu>
        </mat-toolbar>

        <div class="page-content">
          <router-outlet></router-outlet>
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .app-container {
      height: 100vh;
      background: #f5f5f5;
    }

    .app-sidenav {
      width: 260px;
      background: #1a237e;
      color: white;
    }

    .sidenav-content {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .logo-section {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 20px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .logo-icon {
      font-size: 32px;
      height: 32px;
      width: 32px;
      color: white;
    }

    .logo-text {
      font-size: 18px;
      font-weight: 600;
    }

    mat-nav-list {
      padding-top: 8px;
    }

    mat-nav-list a[mat-list-item] {
      color: white;
      transition: background 0.2s;
    }

    mat-nav-list a[mat-list-item]:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    mat-nav-list a[mat-list-item].active {
      background: rgba(255, 255, 255, 0.2);
    }

    mat-nav-list mat-icon[matListItemIcon] {
      color: rgba(255, 255, 255, 0.7);
    }

    h3[mat-subheader] {
      color: rgba(255, 255, 255, 0.5);
      font-size: 12px;
      margin-top: 16px;
    }

    mat-divider {
      margin: 8px 0;
      border-top-color: rgba(255, 255, 255, 0.1);
    }

    .app-toolbar {
      position: sticky;
      top: 0;
      z-index: 100;
      background: white;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .menu-toggle {
      margin-right: 8px;
    }

    .toolbar-title {
      font-size: 18px;
      font-weight: 500;
    }

    .spacer {
      flex: 1;
    }

    .user-menu-btn {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .user-name {
      font-weight: 500;
    }

    .page-content {
      padding: 0;
      min-height: calc(100vh - 64px);
    }

    @media (max-width: 768px) {
      .app-sidenav {
        width: 200px;
      }

      .logo-text {
        font-size: 14px;
      }

      .user-name {
        display: none;
      }
    }
  `],
})
export class AppLayoutComponent {
  private auth = inject(AuthService);

  userName = computed(() => this.auth.user()?.full_name || 'User');
  userEmail = computed(() => this.auth.user()?.email || '');
  isAdmin = computed(() => this.auth.hasRole('SYSTEM_ADMIN'));

  pageTitle = signal('Motor Claims Portal');

  logout() {
    this.auth.logout();
  }
}
