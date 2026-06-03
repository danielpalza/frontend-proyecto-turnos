export interface PeriodontogramaDienteDelta {
  numeroDiente: number;
  mobility?: number;
  furcation?: number;
  vestPsM?: number;
  vestPsC?: number;
  vestPsD?: number;
  vestMgM?: number;
  vestMgC?: number;
  vestMgD?: number;
  vestSangradoM?: boolean;
  vestSangradoC?: boolean;
  vestSangradoD?: boolean;
  vestPlacaM?: boolean;
  vestPlacaC?: boolean;
  vestPlacaD?: boolean;
  vestSupuracionM?: boolean;
  vestSupuracionC?: boolean;
  vestSupuracionD?: boolean;
  vestCalculoM?: boolean;
  vestCalculoC?: boolean;
  vestCalculoD?: boolean;
  lingPsM?: number;
  lingPsC?: number;
  lingPsD?: number;
  lingMgM?: number;
  lingMgC?: number;
  lingMgD?: number;
  lingSangradoM?: boolean;
  lingSangradoC?: boolean;
  lingSangradoD?: boolean;
  lingPlacaM?: boolean;
  lingPlacaC?: boolean;
  lingPlacaD?: boolean;
  lingSupuracionM?: boolean;
  lingSupuracionC?: boolean;
  lingSupuracionD?: boolean;
  lingCalculoM?: boolean;
  lingCalculoC?: boolean;
  lingCalculoD?: boolean;
}

export interface PeriodontogramaEstadoActual {
  dientes: PeriodontogramaDienteDelta[];
}

export interface PeriodontogramaDeltaRequest {
  notas?: string;
  dientes?: PeriodontogramaDienteDelta[];
}

export interface PeriodontogramaResponse {
  appointmentId: number;
  patientId: number;
  notas?: string;
  creadoEn?: string;
  estadoActual: PeriodontogramaEstadoActual;
  cambiosTurno: PeriodontogramaEstadoActual;
}

export interface PerioFaceMvp {
  probing: [number, number, number];
  mg: [number, number, number];
  bleeding: [boolean, boolean, boolean];
  plaque: [boolean, boolean, boolean];
  suppuration: [boolean, boolean, boolean];
  calculus: [boolean, boolean, boolean];
}

export interface PerioToothMvp {
  id: number;
  present: boolean;
  vestibular: PerioFaceMvp;
  lingual: PerioFaceMvp;
  mobility: number;
  furcation: number;
}
