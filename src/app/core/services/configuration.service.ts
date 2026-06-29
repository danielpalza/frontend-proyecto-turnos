import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, tap } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { API_CONFIG } from './api.config';
import { Configuration } from '../models';

const DEFAULT_TEMPLATE = 'Hola {paciente}, te hablamos de la clinica, te recordamos tu turno del {fecha} a las {hora} con {doctor}.';

@Injectable({ providedIn: 'root' })
export class ConfigurationService {

  private readonly apiUrl = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.configuration}`;
  private config$ = new BehaviorSubject<Configuration | null>(null);

  constructor(private http: HttpClient) {
    this.loadConfig().subscribe();
  }

  getConfig(): Observable<Configuration | null> {
    return this.config$.asObservable();
  }

  getConfigValue(): Configuration | null {
    return this.config$.getValue();
  }

  getMensajeWhatsapp(): string {
    return this.config$.getValue()?.mensajeWhatsapp || DEFAULT_TEMPLATE;
  }

  loadConfig(): Observable<Configuration | null> {
    return this.http.get<Configuration>(this.apiUrl).pipe(
      tap(c => this.config$.next(c)),
      catchError(() => {
        this.config$.next({ mensajeWhatsapp: DEFAULT_TEMPLATE });
        return of(null);
      })
    );
  }

  saveMensajeWhatsapp(mensajeWhatsapp: string): Observable<Configuration> {
    const trimmed = mensajeWhatsapp.trim();
    return this.http.put<Configuration>(this.apiUrl, { mensajeWhatsapp: trimmed }).pipe(
      tap(c => this.config$.next(c))
    );
  }

  resetToDefault(): Observable<Configuration> {
    return this.saveMensajeWhatsapp(DEFAULT_TEMPLATE);
  }

  buildMessage(hora: string, fecha: string, doctor: string, paciente: string): string {
    let msg = this.getMensajeWhatsapp();
    if (!msg) {
      msg = DEFAULT_TEMPLATE;
    }
    msg = msg.replace(/\{hora\}/g, hora);
    msg = msg.replace(/\{fecha\}/g, fecha);
    msg = msg.replace(/\{doctor\}/g, doctor);
    msg = msg.replace(/\{paciente\}/g, paciente);
    return msg;
  }

  buildWhatsAppLink(
    telefono: string | undefined,
    params: { hora: string; fecha: string; doctor: string; paciente: string }
  ): string | null {
    if (!telefono?.trim()) return null;
    const phone = telefono.replace(/[\s\-\(\)\+]/g, '');
    if (!phone) return null;
    const message = this.buildMessage(params.hora, params.fecha, params.doctor, params.paciente);
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }

  formatAppointmentDate(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00');
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
}