import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject, tap } from 'rxjs';
import { API_CONFIG } from './api.config';
import { AuthResponse, LoginRequest, RegisterRequest, MessageResponse, ForgotPasswordRequest, ResetPasswordRequest } from '../models/auth.model';
import { skipGlobalErrorHandler } from '../interceptors/http-context';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly apiUrl = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.auth}`;
  private currentUserSubject = new BehaviorSubject<AuthResponse | null>(this.getStoredUser());
  currentUser$ = this.currentUserSubject.asObservable();

  /** Emite en cada logout, para que los servicios con cache compartido (paciente, turnos, etc.) la limpien. */
  private readonly loggedOutSubject = new Subject<void>();
  readonly loggedOut$ = this.loggedOutSubject.asObservable();

  constructor(private http: HttpClient) {}

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, request, {
      context: skipGlobalErrorHandler()
    }).pipe(
      tap(response => this.setSession(response))
    );
  }

  register(request: RegisterRequest): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.apiUrl}/register`, request, {
      context: skipGlobalErrorHandler()
    });
  }

  verifyEmail(token: string): Observable<MessageResponse> {
    return this.http.get<MessageResponse>(`${this.apiUrl}/verify`, {
      params: { token },
      context: skipGlobalErrorHandler()
    });
  }

  resendVerification(request: ForgotPasswordRequest): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.apiUrl}/resend-verification`, request, {
      context: skipGlobalErrorHandler()
    });
  }

  forgotPassword(request: ForgotPasswordRequest): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.apiUrl}/forgot-password`, request, {
      context: skipGlobalErrorHandler()
    });
  }

  resetPassword(request: ResetPasswordRequest): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.apiUrl}/reset-password`, request, {
      context: skipGlobalErrorHandler()
    });
  }

  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    this.currentUserSubject.next(null);
    this.loggedOutSubject.next();
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const isExpired = Date.now() >= payload.exp * 1000;
      if (isExpired) {
        this.logout();
        return false;
      }
      return true;
    } catch {
      this.logout();
      return false;
    }
  }

  getCurrentUser(): AuthResponse | null {
    return this.currentUserSubject.value;
  }

  hasRole(role: string): boolean {
    return this.currentUserSubject.value?.role === role;
  }

  hasModule(code: string): boolean {
    return this.currentUserSubject.value?.modules?.includes(code) ?? false;
  }

  private setSession(response: AuthResponse): void {
    localStorage.setItem('auth_token', response.token);
    localStorage.setItem('auth_user', JSON.stringify(response));
    this.currentUserSubject.next(response);
  }

  private getStoredUser(): AuthResponse | null {
    const user = localStorage.getItem('auth_user');
    return user ? JSON.parse(user) : null;
  }
}
