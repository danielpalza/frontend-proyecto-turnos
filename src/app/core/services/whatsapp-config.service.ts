import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, of, tap } from 'rxjs';
import { API_CONFIG } from './api.config';

const DEFAULT_TEMPLATE = 'Hola {paciente}, te hablamos de la clinica, te recordamos tu turno del {fecha} a las {hora} con el doctor {doctor}.';

interface MensajeriaResponse {
  id: number;
  mensaje: string;
  userId: number;
}

@Injectable({ providedIn: 'root' })
export class WhatsappConfigService {

  private readonly apiUrl = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.mensajeria}`;
  private template$ = new BehaviorSubject<string>(DEFAULT_TEMPLATE);
  private loaded = false;

  constructor(private http: HttpClient) {
    this.loadFromApi();
  }

  getTemplate(): Observable<string> {
    if (!this.loaded) {
      this.loadFromApi();
    }
    return this.template$.asObservable();
  }

  getTemplateValue(): string {
    return this.template$.getValue();
  }

  setTemplate(template: string): Observable<MensajeriaResponse> {
    const trimmed = template.trim();
    return this.http.put<MensajeriaResponse>(this.apiUrl, { mensaje: trimmed }).pipe(
      tap(response => {
        this.template$.next(response.mensaje);
      })
    );
  }

  resetToDefault(): Observable<MensajeriaResponse> {
    return this.setTemplate(DEFAULT_TEMPLATE);
  }

  buildMessage(hora: string, fecha: string, doctor: string, paciente: string): string {
    let msg = this.getTemplateValue();
    if (!msg) {
      msg = DEFAULT_TEMPLATE;
    }
    msg = msg.replace(/\{hora\}/g, hora);
    msg = msg.replace(/\{fecha\}/g, fecha);
    msg = msg.replace(/\{doctor\}/g, doctor);
    msg = msg.replace(/\{paciente\}/g, paciente);
    return msg;
  }

  private loadFromApi(): void {
    this.http.get<MensajeriaResponse>(this.apiUrl).pipe(
      catchError(() => {
        return of({ id: 0, mensaje: DEFAULT_TEMPLATE, userId: 0 } as MensajeriaResponse);
      })
    ).subscribe(response => {
      this.template$.next(response.mensaje || DEFAULT_TEMPLATE);
      this.loaded = true;
    });
  }
}
