export interface Receta {
  id?: string;
  medico_id: number;
  paciente_id: number;
  cita_id?: number;
  medicamentos: Medicamento[];
  instrucciones: string;
  fecha_emision: Date;
  fecha_vencimiento: Date;
  estado: 'activa' | 'utilizada' | 'vencida' | 'cancelada';
  codigo_validacion: string; // Código único para validar la receta
  farmacia_utilizada?: string;
  farmaceutico_responsable?: string;
  fecha_utilizacion?: Date;
  observaciones_farmacia?: string;
  medico_nombre?: string;
  paciente_nombre?: string;
  observaciones?: string;
  fecha_cancelacion?: Date;
  motivo_cancelacion?: string;
}

export interface Medicamento {
  nombre: string;
  concentracion: string;
  forma_farmaceutica: string; // tabletas, jarabe, gotas, etc.
  cantidad: string;
  via_administracion: string;
  frecuencia: string;
  duracion: string;
  indicaciones_especiales?: string;
}

export interface ValidacionReceta {
  codigo: string;
  valida: boolean;
  receta?: Receta;
  razon_invalidez?: string;
}