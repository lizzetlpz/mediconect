// C:\Users\lizze\medicos\nombre-proyecto\src\app\pages\patients\patients.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../components/navbar/nav/navbar.component';
import { PatientService } from '../../services/patient.service';
import { AuthService } from '../../services/auth.service';
import { Patient } from '../../models/consulation.model';
import { DoctorSidebarComponent } from '../../barraLateral/doctor/BarraD.component';

@Component({
  selector: 'app-patients',
  standalone: true,
  imports: [CommonModule, NavbarComponent, FormsModule, DoctorSidebarComponent],
  templateUrl: './patients.component.html',
  styleUrls: ['./patients.component.css']
})
export class PatientsComponent implements OnInit {
  patients: Patient[] = [];
  searchTerm = '';
  selectedPatient: Patient | null = null;
  userRole: number = 0;  // ✅ Cambiar a number

  constructor(
    private patientService: PatientService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    this.userRole = currentUser?.rol_id || 0;  // ✅ Usar rol_id

    console.log('👤 Usuario actual:', currentUser);
    console.log('🎭 Rol del usuario:', this.userRole);

    // Solo cargar pacientes si es doctor (rol_id = 3) o admin (rol_id = 1)
    if (this.userRole === 3 || this.userRole === 1) {
      this.loadPatients();
    } else {
      console.log('⚠️ Usuario no autorizado para ver pacientes');
    }
  }

  loadPatients(): void {
    console.log('📋 Cargando lista de pacientes...');
    this.patientService.getPatients().subscribe({
      next: (data) => {
        console.log('✅ Pacientes cargados:', data);
        this.patients = data;
      },
      error: (error) => {
        console.error('❌ Error cargando pacientes:', error);
      }
    });
  }

  get filteredPatients(): Patient[] {
    if (!this.searchTerm) {
      return this.patients;
    }

    return this.patients.filter(p => {
      const fullName = `${p.nombre} ${p.apellido_paterno} ${p.apellido_materno || ''}`.toLowerCase();
      const email = (p.email || '').toLowerCase();
      const search = this.searchTerm.toLowerCase();

      return fullName.includes(search) || email.includes(search);
    });
  }

  selectPatient(patient: Patient): void {
    console.log('✅ Paciente seleccionado:', patient);
    this.selectedPatient = patient;
  }

  calculateAge(dateOfBirth: string | undefined): number | null {
    if (!dateOfBirth) return null;

    try {
      const today = new Date();
      const birth = new Date(dateOfBirth);

      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }

      return age;
    } catch (error) {
      console.error('❌ Error calculando edad:', error);
      return null;
    }
  }

  // Helper para verificar si es doctor
  isDoctor(): boolean {
    return this.userRole === 3;
  }

  // Helper para verificar si es admin
  isAdmin(): boolean {
    return this.userRole === 1;
  }

  // Formatear nombre completo
  getFullName(patient: Patient): string {
    const parts = [
      patient.nombre,
      patient.apellido_paterno,
      patient.apellido_materno
    ].filter(Boolean);
    return parts.join(' ');
  }
}
