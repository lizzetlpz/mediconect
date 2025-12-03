// consultation.component.ts
import { Component, OnInit } from '@angular/core';
import { environment } from '../../../environments/environment';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NavbarComponent } from '../../components/navbar/nav/navbar.component';
import { ConsultationService } from '../../services/consulation.service';
import { Consultation } from '../../models/consulation.model';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-consultations',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NavbarComponent],
  templateUrl: './consultation.component.html',
  styleUrls: ['./consultation.component.css']
})
export class ConsultationsComponent implements OnInit {
  consultations: Consultation[] = [];
  consultationForm!: FormGroup;
  isModalOpen = false;
  isLoading = false;
  selectedConsultation: Consultation | null = null;
  userRole: number = 0;

  constructor(
    private consultationService: ConsultationService,
    private fb: FormBuilder,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    this.userRole = currentUser?.rol_id || 0;

    console.log('👤 Usuario actual rol_id:', this.userRole); // Debug

    this.initForm();
    this.loadConsultations();
  }

  initForm(): void {
    this.consultationForm = this.fb.group({
      titulo: ['', [Validators.required, Validators.minLength(3)]],
      descripcion: ['', [Validators.minLength(5)]],
      tipo: ['videollamada', Validators.required],
      programada_en: ['', Validators.required]
    });
  }

  loadConsultations(): void {
    this.consultationService.getConsultations().subscribe({
      next: (data: Consultation[]) => {
        console.log('✅ Consultas cargadas:', data);
        this.consultations = data;
      },
      error: (error: any) => {
        console.error('❌ Error cargando consultas:', error);
      }
    });
  }

  openModal(): void {
    if (this.userRole !== 3) { // 3 = Paciente
      alert('Solo los pacientes pueden agendar consultas');
      return;
    }
    this.isModalOpen = true;
    this.selectedConsultation = null;
    this.consultationForm.reset({ tipo: 'videollamada' });
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  onSubmit(): void {
    if (this.consultationForm.invalid) {
      console.log('❌ Formulario inválido');
      Object.keys(this.consultationForm.controls).forEach(key => {
        this.consultationForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isLoading = true;
    const currentUser = this.authService.getCurrentUser();

    if (!currentUser) {
      console.error('❌ No hay usuario autenticado');
      this.isLoading = false;
      return;
    }

    const consultationData = {
      doctor_id: 1, // TODO: Seleccionar doctor
      paciente_id: currentUser.id,
      tipo: this.consultationForm.value.tipo,
      estado: 'programada',
      titulo: this.consultationForm.value.titulo,
      descripcion: this.consultationForm.value.descripcion,
      programada_en: this.consultationForm.value.programada_en
    };

    console.log('📤 Creando consulta:', consultationData);

    this.consultationService.createConsultation(consultationData).subscribe({
      next: (response) => {
        console.log('✅ Consulta creada:', response);
        this.loadConsultations();
        this.closeModal();
        this.isLoading = false;
        alert('Consulta agendada exitosamente');
      },
      error: (error: any) => {
        console.error('❌ Error creando consulta:', error);
        this.isLoading = false;
        alert('Error al agendar la consulta');
      }
    });
  }

  selectConsultation(consultation: Consultation): void {
    this.selectedConsultation = consultation;
  }

  startConsultation(event: Event, id: string): void {
    event.stopPropagation();
    console.log('🎥 Iniciando consulta:', id);
    // TODO: Implementar lógica para iniciar videollamada
  }

  deleteConsultation(event: Event, id: string): void {
    event.stopPropagation();
    if (confirm('¿Deseas cancelar esta consulta?')) {
      this.consultationService.deleteConsultation(id).subscribe({
        next: () => {
          console.log('✅ Consulta eliminada');
          this.loadConsultations();
          alert('Consulta cancelada');
        },
        error: (error: any) => {
          console.error('❌ Error eliminando:', error);
        }
      });
    }
  }

  isPatient(): boolean {
    return this.userRole === 3; // 3 = Paciente
  }

  isDoctor(): boolean {
    return this.userRole === 2; // 2 = Doctor
  }

  // Getters para el formulario
  get titulo() {
    return this.consultationForm.get('titulo');
  }

  get descripcion() {
    return this.consultationForm.get('descripcion');
  }

  get tipo() {
    return this.consultationForm.get('tipo');
  }

  get programada_en() {
    return this.consultationForm.get('programada_en');
  }
}
