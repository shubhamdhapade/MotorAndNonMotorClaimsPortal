import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="login-container">
      <mat-card class="login-card">
        <mat-card-header>
          <mat-card-title>
            <div class="logo-container">
              <mat-icon class="logo-icon">security</mat-icon>
              <span>Motor Claims Portal</span>
            </div>
          </mat-card-title>

        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput formControlName="email" type="email" placeholder="Enter your email">
              <mat-error *ngIf="loginForm.get('email')?.hasError('required')">Email is required</mat-error>
              <mat-error *ngIf="loginForm.get('email')?.hasError('email')">Invalid email format</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Password</mat-label>
              <input matInput formControlName="password" [type]="hidePassword() ? 'password' : 'text'" placeholder="Enter your password">
              <button mat-icon-button matSuffix type="button" (click)="hidePassword.set(!hidePassword())">
                <mat-icon>{{ hidePassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              <mat-error *ngIf="loginForm.get('password')?.hasError('required')">Password is required</mat-error>
            </mat-form-field>

            @if (errorMessage()) {
              <div class="error-message">{{ errorMessage() }}</div>
            }

            <button mat-raised-button color="primary" type="submit" class="login-button" [disabled]="loginForm.invalid || isSubmitting()">
              @if (isSubmitting()) {
                <mat-spinner diameter="20" class="spinner"></mat-spinner>
              }
              <span>{{ isSubmitting() ? 'Signing in...' : 'Sign In' }}</span>
            </button>
          </form>
        </mat-card-content>

        <mat-card-actions>
          <div class="demo-credentials">
            <p class="demo-title">Demo Credentials:</p>
            <div class="credential-list">
              <div class="credential-item" (click)="fillCredentials('admin&#64;motorclaims.com', 'admin123')">
                <span>Admin: admin&#64;motorclaims.com / admin123</span>
              </div>
              <div class="credential-item" (click)="fillCredentials('fnol1&#64;motorclaims.com', 'admin123')">
                <span>FNOL: fnol1&#64;motorclaims.com / admin123</span>
              </div>
              <div class="credential-item" (click)="fillCredentials('assessor1&#64;motorclaims.com', 'admin123')">
                <span>Assessor: assessor1&#64;motorclaims.com / admin123</span>
              </div>
            </div>
          </div>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #1a237e 0%, #0d47a1 100%);
      padding: 20px;
    }

    .login-card {
      width: 100%;
      max-width: 420px;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    }

    .logo-container {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }

    .logo-icon {
      font-size: 36px;
      height: 36px;
      width: 36px;
      color: #1a237e;
    }

    mat-card-title {
      font-size: 24px;
      font-weight: 600;
    }

    mat-card-subtitle {
      font-size: 14px;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .login-button {
      width: 100%;
      height: 48px;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .spinner {
      margin-right: 8px;
    }

    .error-message {
      color: #f44336;
      font-size: 14px;
      margin-bottom: 16px;
      padding: 12px;
      background: #ffebee;
      border-radius: 4px;
    }

    .demo-credentials {
      width: 100%;
      padding: 16px;
      background: #f5f5f5;
      border-radius: 8px;
      margin-top: 16px;
    }

    .demo-title {
      font-weight: 600;
      margin-bottom: 12px;
      color: #424242;
    }

    .credential-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .credential-item {
      padding: 8px 12px;
      background: white;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      transition: background 0.2s;
    }

    .credential-item:hover {
      background: #e3f2fd;
    }
  `],
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  hidePassword = signal(true);
  isSubmitting = signal(false);
  errorMessage = signal<string | null>(null);

  async onSubmit() {
    if (this.loginForm.invalid) return;

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.loginForm.value;

    const result = await this.authService.login({
      email: email!,
      password: password!,
    });

    this.isSubmitting.set(false);

    if (result.success) {
      this.snackBar.open('Login successful!', 'Close', { duration: 3000 });
      this.router.navigate(['/dashboard']);
    } else {
      this.errorMessage.set(result.error || 'Login failed');
    }
  }

  fillCredentials(email: string, password: string) {
    this.loginForm.patchValue({ email, password });
    this.errorMessage.set(null);
  }
}
