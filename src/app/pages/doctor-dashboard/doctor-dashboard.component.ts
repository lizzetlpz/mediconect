// ============================================
// ARCHIVO: doctor-dashboard.component.ts
// ============================================

import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AppointmentService } from '../../services/appointment.service';
import { ConsultationService } from '../../services/consulation.service';
import { User } from '../../models/user.model';
import { DoctorSidebarComponent } from '../../barraLateral/doctor/BarraD.component';
import { EditarPerfilMedicoComponent } from './editar-perfil-medico/editar-perfil-medico.component';

interface QuickAction {
  title: string;
  subtitle: string;
  icon: string;
  route: string;
  iconColor: string;
  bgColor: string;
}

interface StatCard {
  title: string;
  value: number;
  icon: string;
  bgColor: string;
}

@Component({
  selector: 'app-doctor-dashboard',
  standalone: true,
  imports: [CommonModule, DoctorSidebarComponent, EditarPerfilMedicoComponent],
  templateUrl: './doctor-dashboard.component.html',
  styleUrls: ['./doctor-dashboard.component.css']
})
export class DoctorDashboardComponent implements OnInit {
  @ViewChild(EditarPerfilMedicoComponent) modalEditarPerfil!: EditarPerfilMedicoComponent;

  currentUser: User | null = this.authService.getCurrentUser();
  quickActions: QuickAction[] = [];
  statCards: StatCard[] = [];
  todayAppointments: any[] = [];
  currentDate: string = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private appointmentService: AppointmentService,
    private consultationService: ConsultationService
  ) {}

  ngOnInit(): void {
    this.loadStatCards();
    this.loadQuickActions();
    this.loadTodayAppointments();
    this.setCurrentDate();
  }

  // ============================================
  // FUNCIONES USADAS EN EL HTML
  // ============================================

  goTo(route: string): void {
    this.router.navigate([route]);
  }

  viewCompleteAgenda(): void {
    this.router.navigate(['/doctor/agenda']);
  }

  manageAgenda(): void {
    this.router.navigate(['/doctor/agenda']);
  }

  abrirEditarPerfil(): void {
    if (this.modalEditarPerfil) {
      this.modalEditarPerfil.abrir();
    }
  }

  // ============================================
  // FUNCIONES DE CARGA DE DATOS
  // ============================================

  private loadStatCards(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return;

    this.statCards = [
      {
        title: 'Citas para Hoy',
        value: 0,
        icon: '📅',
        bgColor: '#eff6ff'
      },
      {
        title: 'Total de Pacientes',
        value: 0,
        icon: '👥',
        bgColor: '#f0fdf4'
      },
      {
        title: 'Citas Pendientes',
        value: 0,
        icon: '⏰',
        bgColor: '#fefce8'
      }
    ];

    // Cargar citas del doctor
    this.appointmentService.getAppointments().subscribe({
      next: (appointments: any[]) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayAppointments = appointments.filter((apt: any) => {
          const aptDate = new Date(apt.fecha_cita);
          aptDate.setHours(0, 0, 0, 0);
          return aptDate.getTime() === today.getTime();
        });

        const pendingAppointments = appointments.filter((apt: any) => apt.estado === 'pendiente');

        this.statCards[0].value = todayAppointments.length;
        this.statCards[1].value = appointments.length;
        this.statCards[2].value = pendingAppointments.length;

        console.log('✅ Estadísticas del doctor cargadas:', this.statCards);
      },
      error: (error: any) => {
        console.error('❌ Error cargando estadísticas:', error);
      }
    });
  }

  private loadQuickActions(): void {
    this.quickActions = [
      {
        title: 'Gestionar Agenda',
        subtitle: 'Organiza tus horarios.',
        icon: '📅',
        route: '/doctor/agenda',
        iconColor: '#3b82f6',
        bgColor: '#eff6ff'
      },
      {
        title: 'Iniciar una Consulta',
        subtitle: 'Atiende a un paciente.',
        icon: '💬',
        route: '/doctor/consultas',
        iconColor: '#10b981',
        bgColor: '#f0fdf4'
      },
      {
        title: 'Ver Mis Pacientes',
        subtitle: 'Revisa tu lista.',
        icon: '👥',
        route: '/doctor/pacientes',
        iconColor: '#a855f7',
        bgColor: '#faf5ff'
      },
      {
        title: 'Gestionar Recetas',
        subtitle: 'Crear y administrar recetas médicas.',
        icon: '💊',
        route: '/doctor/recetas',
        iconColor: '#dc2626',
        bgColor: '#fef2f2'
      }
    ];
  }

  private loadTodayAppointments(): void {
    this.appointmentService.getAppointments().subscribe({
      next: (appointments: any[]) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        this.todayAppointments = appointments.filter((apt: any) => {
          const aptDate = new Date(apt.fecha_cita);
          aptDate.setHours(0, 0, 0, 0);
          return aptDate.getTime() === today.getTime();
        });

        console.log('✅ Citas de hoy cargadas:', this.todayAppointments);
      },
      error: (error: any) => {
        console.error('❌ Error cargando citas de hoy:', error);
        this.todayAppointments = [];
      }
    });
  }

  private setCurrentDate(): void {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    this.currentDate = new Date().toLocaleDateString('es-ES', options);
  }
}

