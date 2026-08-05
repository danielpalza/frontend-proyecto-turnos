import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { API_CONFIG } from '../../core/services/api.config';
import { DocumentoAdjunto, Intermediario, IntermediarioRequest } from './coberturas.models';

@Injectable({ providedIn: 'root' })
export class IntermediariosService {
  private readonly apiUrl = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.intermediarios}`;

  constructor(private http: HttpClient) {}

  listar(): Observable<Intermediario[]> {
    return this.http.get<Intermediario[]>(this.apiUrl);
  }

  crear(request: IntermediarioRequest): Observable<Intermediario> {
    return this.http.post<Intermediario>(this.apiUrl, request);
  }

  actualizar(id: string, request: IntermediarioRequest): Observable<Intermediario> {
    return this.http.put<Intermediario>(`${this.apiUrl}/${id}`, request);
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  subirArchivo(intermediarioId: string, file: File, tipoDocumento?: string): Observable<DocumentoAdjunto> {
    const formData = new FormData();
    formData.append('file', file);
    if (tipoDocumento) {
      formData.append('tipoDocumento', tipoDocumento);
    }
    return this.http.post<DocumentoAdjunto>(`${this.apiUrl}/${intermediarioId}/archivos`, formData);
  }

  eliminarArchivo(archivoId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/archivos/${archivoId}`);
  }

  descargarArchivo(archivoId: string, nombreArchivo: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/archivos/${archivoId}/descarga`, { responseType: 'blob' }).pipe(
      tap(blob => this.triggerBrowserDownload(blob, nombreArchivo))
    );
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
