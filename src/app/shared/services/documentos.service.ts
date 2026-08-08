import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { API_CONFIG } from '../../core/services/api.config';
import { DocumentoAdjunto, TipoEntidadDocumento } from '../../core/models/documento.model';

/** Endpoint nested por tipo de entidad — el alta y el listado viven en cada controller (permite capacidad estática). */
const ENDPOINT_POR_TIPO: Record<TipoEntidadDocumento, string> = {
  APPOINTMENT: API_CONFIG.endpoints.appointments,
  PATIENT: API_CONFIG.endpoints.patients,
  PROFESIONAL: API_CONFIG.endpoints.profesionales
};

/**
 * Documentos genéricos linkeados a un turno, paciente o profesional.
 * Mismo patrón que CoberturasService (multipart directo, sin presigned URLs — ver
 * bakend-proyecto-turnos/docs/DESARROLLOS_FUTUROS.md § 4).
 */
@Injectable({ providedIn: 'root' })
export class DocumentosService {
  constructor(private http: HttpClient) {}

  listar(tipoEntidad: TipoEntidadDocumento, entidadId: string): Observable<DocumentoAdjunto[]> {
    return this.http.get<DocumentoAdjunto[]>(this.urlEntidad(tipoEntidad, entidadId));
  }

  subir(tipoEntidad: TipoEntidadDocumento, entidadId: string, file: File, tipoDocumento?: string): Observable<DocumentoAdjunto> {
    const formData = new FormData();
    formData.append('file', file);
    if (tipoDocumento) {
      formData.append('tipoDocumento', tipoDocumento);
    }
    return this.http.post<DocumentoAdjunto>(this.urlEntidad(tipoEntidad, entidadId), formData);
  }

  eliminar(documentoId: string): Observable<void> {
    return this.http.delete<void>(`${API_CONFIG.baseUrl}/documentos/${documentoId}`);
  }

  descargar(documentoId: string, nombreArchivo: string): Observable<Blob> {
    return this.http.get(`${API_CONFIG.baseUrl}/documentos/${documentoId}/descarga`, { responseType: 'blob' }).pipe(
      tap(blob => this.triggerBrowserDownload(blob, nombreArchivo))
    );
  }

  private urlEntidad(tipoEntidad: TipoEntidadDocumento, entidadId: string): string {
    return `${API_CONFIG.baseUrl}${ENDPOINT_POR_TIPO[tipoEntidad]}/${entidadId}/documentos`;
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
