import { Injectable, inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuardService {
  private authService = inject(AuthService);
  private router = inject(Router);

  canActivate(): ReturnType<CanActivateFn> {
    return this.checkAuth();
  }

  canMatch(): ReturnType<CanMatchFn> {
    return this.checkAuth();
  }

  private async checkAuth(): Promise<boolean | any> {
    // Wait for loading to complete
    while (this.authService.isLoading()) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    if (this.authService.isAuthenticated()) {
      return true;
    }
    return this.router.createUrlTree(['/login']);
  }
}

@Injectable({ providedIn: 'root' })
export class RoleGuardService {
  private authService = inject(AuthService);
  private router = inject(Router);

  canActivate(roles: string[]): ReturnType<CanActivateFn> {
    return this.checkRole(roles);
  }

  canMatch(roles: string[]): ReturnType<CanMatchFn> {
    return this.checkRole(roles);
  }

  private async checkRole(roles: string[]): Promise<boolean | any> {
    // Wait for loading to complete
    while (this.authService.isLoading()) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    if (!this.authService.isAuthenticated()) {
      return this.router.createUrlTree(['/login']);
    }
    if (this.authService.hasRole('SYSTEM_ADMIN') || this.authService.hasRole(roles)) {
      return true;
    }
    return this.router.createUrlTree(['/dashboard'], { queryParams: { unauthorized: true } });
  }
}

// Functional guards for use in route config
export const authGuard: CanActivateFn = () => inject(AuthGuardService).canActivate();
export const roleGuard = (roles: string[]): CanActivateFn => () => inject(RoleGuardService).canActivate(roles);
