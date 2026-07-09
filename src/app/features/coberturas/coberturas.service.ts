import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { API_CONFIG } from '../../core/services/api.config';
import { DocumentoAdjunto, Cobertura } from './coberturas.models';

@Injectable({ providedIn: 'root' })
export class CoberturasService {
  private readonly apiUrl = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.coberturas}`;

  constructor(private http: HttpClient) {}

  listar(paises: string[]): Observable<Cobertura[]> {
    let params = new HttpParams();
    for (const pais of paises) {
      params = params.append('pais', pais);
    }
    return this.http.get<Cobertura[]>(this.apiUrl, { params });
  }

  /** Países con al menos una entidad real cargada (excluye placeholders). */
  listarPaisesConDatos(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/paises`);
  }

  actualizarFavorito(coberturaId: string, favorito: boolean): Observable<Cobertura> {
    return this.http.put<Cobertura>(`${this.apiUrl}/${coberturaId}/favorito`, { favorito });
  }

  actualizarNota(coberturaId: string, notasPropias: string): Observable<Cobertura> {
    return this.http.put<Cobertura>(`${this.apiUrl}/${coberturaId}/notas`, { notasPropias });
  }

  subirArchivo(coberturaId: string, file: File, tipoDocumento?: string): Observable<DocumentoAdjunto> {
    const formData = new FormData();
    formData.append('file', file);
    if (tipoDocumento) {
      formData.append('tipoDocumento', tipoDocumento);
    }
    return this.http.post<DocumentoAdjunto>(`${this.apiUrl}/${coberturaId}/archivos`, formData);
  }

  eliminarArchivo(archivoId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/archivos/${archivoId}`);
  }

  descargarArchivo(archivoId: string, nombreArchivo: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/archivos/${archivoId}/descarga`, { responseType: 'blob' }).pipe(
      tap(blob => this.triggerBrowserDownload(blob, nombreArchivo))
    );
  }

  reportarLinkRoto(linkId: string, mensaje: string, infoContacto?: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/links/${linkId}/reportes`, { mensaje, infoContacto });
  }

  private triggerBrowserDownload(blob: Blob, nombreArchivo: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivo;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}
