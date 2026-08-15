import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, tap, switchMap, filter, shareReplay, finalize } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { API_CONFIG } from './api.config';
import { PlanCatalogItem, PlanType, Subscription, SubscriptionPaymentRow } from '../models';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class SubscriptionService {

  private readonly apiUrl = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.subscription}`;
  private subscription$ = new BehaviorSubject<Subscription | null>(null);

  /**
   * Comparte el GET en vuelo. Al iniciar sesión lo piden a la vez este servicio y la vista de
   * Configuraciones, y el endpoint tiene efectos secundarios (crea la suscripción y abre períodos
   * de forma perezosa): dos llamadas en paralelo de una organización nueva chocaban contra los
   * unique de la base.
   */
  private enVuelo$: Observable<Subscription | null> | null = null;

  /** El catálogo es estático en la práctica; se cachea para no pedirlo en cada apertura del modal. */
  private planes$: Observable<PlanCatalogItem[]> | null = null;

  constructor(private http: HttpClient, private auth: AuthService) {
    this.auth.currentUser$.pipe(
      filter(user => user !== null),
      switchMap(() => this.loadSubscription())
    ).subscribe();

    this.auth.loggedOut$.subscribe(() => {
      this.subscription$.next(null);
      this.planes$ = null;
    });
  }

  getSubscription(): Observable<Subscription | null> {
    return this.subscription$.asObservable();
  }

  getSubscriptionValue(): Subscription | null {
    return this.subscription$.getValue();
  }

  loadSubscription(): Observable<Subscription | null> {
    if (!this.enVuelo$) {
      this.enVuelo$ = this.http.get<Subscription>(this.apiUrl).pipe(
        tap(s => this.subscription$.next(s)),
        catchError(() => of(null)),
        finalize(() => { this.enVuelo$ = null; }),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.enVuelo$;
  }

  getPlanes(): Observable<PlanCatalogItem[]> {
    if (!this.planes$) {
      this.planes$ = this.http.get<PlanCatalogItem[]>(`${this.apiUrl}/planes`).pipe(
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.planes$;
  }

  getHistorialPagos(): Observable<SubscriptionPaymentRow[]> {
    return this.http.get<SubscriptionPaymentRow[]>(`${this.apiUrl}/pagos`);
  }

  /**
   * Mejorar de plan se aplica al instante; bajar de plan queda agendado para el cierre del período
   * en curso y viene reflejado en `planPendiente` / `planPendienteDesde`.
   */
  changePlan(plan: PlanType): Observable<Subscription> {
    return this.http.put<Subscription>(`${this.apiUrl}/plan`, { plan }).pipe(
      tap(s => this.subscription$.next(s))
    );
  }

  cancelarCambioPendiente(): Observable<Subscription> {
    return this.http.delete<Subscription>(`${this.apiUrl}/plan-pendiente`).pipe(
      tap(s => this.subscription$.next(s))
    );
  }
}
