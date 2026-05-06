export interface CrmRecord {
  id: number;
  NOMBRE: string;
  CEDULA: string | number;
  TELEFONO: string | number;
  MUNICIPIO: string;
  DEPARTAMENTO: string;
  EDAD: number;
  ESTADO: string;
  COMPROMISO: string;
  PERFILES: string;
  PERFILES_CONFIRMADOS: string;
  FECHA_CONTACTO: string;
  FECHA_RECORDATORIO: string;
  ULTIMA_INTERACCION: string;
  INGRESO_AL_GRUPO: string;
  OBSERVACION: string;
  AGENTE_ASIGNADO: string;
  FECHA_ASIGNACION: string;
  _displayedStatus?: string;
  _originalMunicipio?: string;
  _originalDepartamento?: string;
  _originalEdad?: number;
  _reminderSent?: boolean;
}
