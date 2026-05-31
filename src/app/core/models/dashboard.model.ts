export interface DashboardSummary {
  ingresosTotales: number;
  ingresosPendientes: number;
  turnosRealizados: number;
  turnosCancelados: number;
}

export interface ProfessionalPerformance {
  profesionalId: number;
  profesionalName: string;
  turnos: number;
  facturacion: number;
}

export interface DashboardResponse {
  summary: DashboardSummary;
  professionals: ProfessionalPerformance[];
  incomeDistribution: {
    cobrado: number;
    pendiente: number;
  };
  appointmentsStatus: {
    completados: number;
    perdidos: number;
  };
}

export type DateRangePreset =
  | 'HOY'
  | 'ULTIMOS_7_DIAS'
  | 'ULTIMOS_30_DIAS'
  | 'MES_ACTUAL'
  | 'MES_ANTERIOR'
  | 'PERSONALIZADO';

export interface DateRange {
  from: string;
  to: string;
  preset: DateRangePreset;
}
