import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { API_CONFIG } from './api.config';
import { ClinicalModuleRule, ModuleRulesResponse } from '../models/module-rules.model';

/**
 * Consume GET /api/modules/rules — sin capacidad requerida, describe el sistema de permisos, no
 * datos de la organización. Usado por el selector obligatorio de módulo clínico en el alta de turno,
 * la redirección dinámica de "Iniciar turno" y el navbar.
 */
@Injectable({ providedIn: 'root' })
export class ModuleRulesService {
  private rules$?: Observable<ModuleRulesResponse>;

  constructor(private http: HttpClient) {}

  getRules(): Observable<ModuleRulesResponse> {
    if (!this.rules$) {
      this.rules$ = this.http
        .get<ModuleRulesResponse>(`${API_CONFIG.baseUrl}/modules/rules`)
        .pipe(shareReplay(1));
    }
    return this.rules$;
  }

  getClinicalModules(): Observable<ClinicalModuleRule[]> {
    return this.getRules().pipe(map(r => r.clinicalModules));
  }
}
