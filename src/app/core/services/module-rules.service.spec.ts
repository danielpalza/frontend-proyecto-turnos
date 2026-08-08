import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ModuleRulesService } from './module-rules.service';
import { API_CONFIG } from './api.config';
import { ModuleRulesResponse } from '../models/module-rules.model';

const url = `${API_CONFIG.baseUrl}/modules/rules`;

function rulesResponse(): ModuleRulesResponse {
  return { clinicalModules: [{ id: 'm1', codigo: 'ODONTOGRAMA', nombre: 'Odontograma', rutaClinica: 'odontograma' }] } as ModuleRulesResponse;
}

describe('ModuleRulesService', () => {
  let service: ModuleRulesService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ModuleRulesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getRules() memoiza: llamarlo varias veces solo hace UNA request HTTP', () => {
    service.getRules().subscribe();
    service.getRules().subscribe();
    service.getRules().subscribe();

    httpMock.expectOne(url).flush(rulesResponse());
  });

  it('getClinicalModules() delega en getRules() y comparte la misma memoización', () => {
    service.getRules().subscribe();
    service.getClinicalModules().subscribe();

    httpMock.expectOne(url).flush(rulesResponse());
  });

  it('getClinicalModules() proyecta solo el campo clinicalModules de la respuesta', () => {
    let clinicalModules: unknown;
    service.getClinicalModules().subscribe(m => (clinicalModules = m));
    httpMock.expectOne(url).flush(rulesResponse());

    expect(clinicalModules).toEqual(rulesResponse().clinicalModules);
  });
});
