// src/app/models/consulation.model.ts

export interface Patient {
  usuario_id: number;        // ✅ Cambiar de "id" a "usuario_id"
  nombre: string;            // ✅ Cambiar de "firstName" a "nombre"
  apellido_paterno: string;  // ✅ Cambiar de "lastName" a "apellido_paterno"
  apellido_materno?: string; // ✅ Agregar apellido_materno
  email: string;
  telefono?: string;         // ✅ Cambiar de "phone" a "telefono"
  fecha_nacimiento?: string; // ✅ Cambiar de "dateOfBirth" a "fecha_nacimiento"
  rol_id: number;
  activo: number;
  fecha_registro?: string;
}

export interface Consultation {
  consulta_id?: number;
  doctor_id: number;
  paciente_id: number;
  tipo: string;
  estado: string;
  titulo?: string;
  descripcion?: string;
  programada_en: string;
  creado_en?: string;
}

export interface Doctor {
  usuario_id: number;
  nombre: string;
  apellido_paterno: string;
  apellido_materno?: string;
  email: string;
  telefono?: string;
  fecha_nacimiento?: string;
  rol_id: number;
  activo: number;
  fecha_registro?: string;
}

export interface Appointment {
  cita_id?: number;
  paciente_id: number;
  medico_id: number;
  fecha_cita: string;
  hora_cita: string;
  motivo?: string;
  estado: string;
  creado_en?: string;
  actualizado_en?: string;
}

export interface Prescription {
  prescripcion_id?: number;
  consulta_id?: number;
  paciente_id: number;
  medico_id: number;
  medicamentos: any[];
  notas?: string;
  expira_en?: string;
  creado_en?: string;
  actualizado_en?: string;
}

export interface MedicalTest {
  prueba_id?: number;
  paciente_id: number;
  medico_id?: number;
  tipo_prueba: string;
  descripcion?: string;
  resultado?: string;
  estado: string;
  creado_en?: string;
  actualizado_en?: string;
}

export interface BillingRecord {
  factura_id?: number;
  paciente_id: number;
  consulta_id?: number;
  monto: number;
  concepto: string;
  estado: string;
  fecha_vencimiento?: string;
  creado_en?: string;
  actualizado_en?: string;
}
