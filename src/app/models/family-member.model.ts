export interface FamilyMember {
  pacienteId: string;
  nombre: string;
  apellidos: string;
  relacion: string;
  puedeAgendarCitas: boolean;
  puedeVerHistorial: boolean;
  fechaAgregado: Date;
  fechaNacimiento?: string;
  tipoSangre?: string;
  numeroCelular?: string;
  contactoEmergencia?: string;
  enfermedades?: string[];
  alergias?: string[];
  fechaRegistro?: Date;
}
