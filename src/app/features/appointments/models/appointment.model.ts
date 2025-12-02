export interface Appointment {
  id: string;
  date: string;
  nombreApellido: string;
  fechaNacimiento: string;
  edad: string;
  dni: string;
  telefono: string;
  email: string;
  domicilio: string;
  localidad: string;
  contactoEmergencia: string;
  anamnesis: string;
  obraSocialNombre: string;
  planCategoria: string;
  obraSocialNumero: string;
  esTitular: boolean;
  nombreTitular?: string;
  dniTitular?: string;
  parentesco?: string;
  profesional: string;
  precioBono: string;
  precioTratamiento: string;
  extras: string;
  montoPago: string;
  observaciones: string;
}

