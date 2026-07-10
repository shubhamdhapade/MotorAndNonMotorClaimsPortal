import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from './supabase.service';
import type { AuthUser, Role, RoleCode, LoginCredentials } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _user = signal<AuthUser | null>(null);
  private _isLoading = signal(true);

  readonly user = this._user.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly isAuthenticated = computed(() => !!this._user());
  readonly userRoles = computed(() => this._user()?.roles.map(r => r.code as string) || []);

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {
    this.initializeAuth();
  }

  private async initializeAuth() {
    const { data: { session } } = await this.supabaseService.auth.getSession();

    if (session?.user) {
      await this.loadUserWithRoles(session.user.id);
    }

    this.supabaseService.auth.onAuthStateChange((event, session) => {
      (async () => {
        if (event === 'SIGNED_IN' && session?.user) {
          await this.loadUserWithRoles(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          this._user.set(null);
        }
      })();
    });

    this._isLoading.set(false);
  }

  private async loadUserWithRoles(userId: string) {
    try {
      const { data: appUser, error: userError } = await this.supabaseService
        .from('app_users')
        .select('id, employee_id, full_name, email, department, is_active')
        .eq('id', userId)
        .maybeSingle();

      if (userError || !appUser) {
        console.error('Error loading user profile:', userError);
        return;
      }

      const { data: userRoles, error: rolesError } = await this.supabaseService
        .from('user_roles')
        .select('role_id, roles(id, code, name, description)')
        .eq('user_id', userId);

      if (rolesError) {
        console.error('Error loading user roles:', rolesError);
        return;
      }

      const roles: Role[] = [];
      if (userRoles) {
        for (const ur of userRoles) {
          const roleData = ur.roles as any;
          if (roleData && roleData.id && roleData.code) {
            roles.push({
              id: roleData.id,
              code: roleData.code as RoleCode,
              name: roleData.name,
              description: roleData.description,
              created_at: roleData.created_at || new Date().toISOString(),
            });
          }
        }
      }

      this._user.set({
        id: appUser.id,
        email: appUser.email,
        full_name: appUser.full_name,
        roles,
      });
    } catch (err) {
      console.error('Exception loading user:', err);
    }
  }

  async login(credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> {
    this._isLoading.set(true);

    try {
      const { data, error } = await this.supabaseService.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        return { success: false, error: this.getErrorMessage(error.message) };
      }

      if (data.user) {
        await this.loadUserWithRoles(data.user.id);
        return { success: true };
      }

      return { success: false, error: 'Login failed. Please try again.' };
    } catch (err) {
      return { success: false, error: 'An unexpected error occurred.' };
    } finally {
      this._isLoading.set(false);
    }
  }

  async logout(): Promise<void> {
    await this.supabaseService.auth.signOut();
    this._user.set(null);
    this.router.navigate(['/login']);
  }

  private getErrorMessage(error: string): string {
    const errorMap: Record<string, string> = {
      'Invalid login credentials': 'Invalid email or password.',
      'Email not confirmed': 'Please verify your email address.',
      'Too many requests': 'Too many attempts. Please try again later.',
    };
    return errorMap[error] || error;
  }

  hasRole(role: string | string[]): boolean {
    const roles = this.userRoles();
    if (Array.isArray(role)) {
      return role.some(r => roles.includes(r));
    }
    return roles.includes(role);
  }

  hasAnyRole(roles: string[]): boolean {
    return this.hasRole(roles);
  }

  canAccessModule(moduleType: string): boolean {
    if (this.hasRole('SYSTEM_ADMIN')) return true;

    const moduleRoleMap: Record<string, string[]> = {
      fnol: ['FNOL_ASSISTANT'],
      assessment: ['ASSESSOR_ASSISTANT'],
      approvals: ['APPROVALS_ASSISTANT'],
      payments: ['PAYMENTS_ASSISTANT'],
      closure: ['CLOSURE_ASSISTANT'],
    };

    return this.hasRole(moduleRoleMap[moduleType] || []);
  }
}
