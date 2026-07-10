import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { authGuard } from './shared/guards/auth.guard';
import { RoleGuardService } from './shared/guards/auth.guard';

// Components
import { LoginComponent } from './auth/login.component';
import { DashboardComponent } from './dashboard.component';
import { ClaimListComponent } from './claims/claim-list.component';
import { ClaimDetailComponent } from './claims/claim-detail.component';
import { MotorFNOLComponent } from './motor-fnol/motor-fnol.component';
import { AssessmentComponent } from './assessment/assessment.component';
import { ApprovalsComponent } from './approvals/approvals.component';
import { PaymentsComponent } from './payments/payments.component';
import { ClosureComponent } from './closure/closure.component';
import { AppLayoutComponent } from './shared/components/app-layout.component';

export const APP_ROUTES: Routes = [
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: '',
    component: AppLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        component: DashboardComponent,
      },
      {
        path: 'claims',
        component: ClaimListComponent,
      },
      {
        path: 'claims/:id',
        component: ClaimDetailComponent,
      },
      {
        path: 'motor-fnol',
        component: MotorFNOLComponent,
        canActivate: [() => inject(RoleGuardService).canActivate(['FNOL_ASSISTANT', 'SYSTEM_ADMIN'])],
      },
      {
        path: 'assessment/:id',
        component: AssessmentComponent,
        canActivate: [() => inject(RoleGuardService).canActivate(['ASSESSOR_ASSISTANT', 'SYSTEM_ADMIN'])],
      },
      {
        path: 'approvals/:id',
        component: ApprovalsComponent,
        canActivate: [() => inject(RoleGuardService).canActivate(['APPROVALS_ASSISTANT', 'SYSTEM_ADMIN'])],
      },
      {
        path: 'payments/:id',
        component: PaymentsComponent,
        canActivate: [() => inject(RoleGuardService).canActivate(['PAYMENTS_ASSISTANT', 'SYSTEM_ADMIN'])],
      },
      {
        path: 'closure/:id',
        component: ClosureComponent,
        canActivate: [() => inject(RoleGuardService).canActivate(['CLOSURE_ASSISTANT', 'SYSTEM_ADMIN'])],
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
