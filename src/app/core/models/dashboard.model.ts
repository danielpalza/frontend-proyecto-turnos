export interface DashboardSummary {
  ingresosTotales: number;
  ingresosPendientes: number;
  turnosCompletados: number;
  turnosPendientes: number;
  turnosCancelados: number;
}

export interface ProfessionalStats {
  profesionalId: string | null;
  profesionalNombre: string;
  profesionalApellido: string;
  completados: number;
  pendientes: number;
  cancelados: number;
  facturacion: number;
}

export interface DailyPoint {
  day: string;
  realized: number;
  pending: number;
}

export interface DateRange {
  from: string;
  to: string;
}
