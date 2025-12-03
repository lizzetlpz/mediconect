import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AppointmentService } from '../../services/appointment.service';
import { ConsultationService } from '../../services/consulation.service';
import { NavbarComponent } from '../../components/navbar/nav/navbar.component';
import { User } from '../../models/user.model';
import { PatientSidebarComponent } from '../../barraLateral/paciente/Barrap.component';
import { MedicalAIChatComponent } from '../../components/medical-ai-chat/medical-ai-chat.component';

interface QuickAction {
  title: string;
  subtitle: string;
  icon: string;
  route: string;
  iconColor: string;
  bgColor: string;
}

interface ActivityData {
  month: string;
  value: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NavbarComponent, PatientSidebarComponent, MedicalAIChatComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  currentUser: User | null = this.authService.getCurrentUser();
  quickActions: QuickAction[] = [];
  activityData: ActivityData[] = [];
  recentRecords: any[] = [];
  nextAppointment: any = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private appointmentService: AppointmentService,
    private consultationService: ConsultationService
  ) {}

  ngOnInit(): void {
    // Verificar rol del usuario y redirigir si es necesario
    this.checkUserRole();

    this.loadQuickActions();
    this.loadActivityData();
    this.loadRecentRecords();
    this.loadNextAppointment();
  }

  private checkUserRole(): void {
    const user = this.authService.getCurrentUser();
    console.log('🔍 Verificando rol del usuario:', user);

    if (!user) {
      console.log('❌ Usuario no encontrado, redirigiendo a login');
      this.router.navigate(['/login']);
      return;
    }

    // Verificar rol_id como estaba originalmente
    switch (user.rol_id) {
      case 3: // Doctor
        console.log('👨‍⚕️ Usuario es doctor, redirigiendo a dashboard de doctor');
        this.router.navigate(['/doctor/dashboard']);
        break;
      case 2: // Paciente
        console.log('🙋‍♂️ Usuario es paciente, puede permanecer aquí');
        // Los pacientes pueden quedarse en este dashboard
        break;
      case 1: // Admin
        console.log('👑 Usuario es admin, puede permanecer aquí');
        // Los admins pueden quedarse aquí
        break;
      default:
        console.log('❓ Rol no reconocido:', user.rol_id);
        break;
    }
  }

    loadQuickActions(): void {
    this.quickActions = [
      {
        title: 'Buscar un Médico',
        subtitle: 'Encuentra un especialista.',
        icon: '🩺',
        route: '/paciente/buscar-medico',  // Cambiado de '/buscar-medicos' a '/paciente/buscar-medico'
        iconColor: '#3b82f6',
        bgColor: '#eff6ff'
      },
      {
        title: 'Iniciar Consulta',
        subtitle: 'Habla con tu médico.',
        icon: '💬',
        route: '/paciente/consultas',  // Ya está correcto
        iconColor: '#10b981',
        bgColor: '#f0fdf4'
      },
      {
        title: 'Mi Salud',
        subtitle: 'Revisa tu historial.',
        icon: '💜',
        route: '/paciente/historial',  // Cambiado de '/historial' a '/paciente/historial'
        iconColor: '#a855f7',
        bgColor: '#faf5ff'
      }
    ];
  }

  loadActivityData(): void {
    this.activityData = [
      { month: 'Ene', value: 1 },
      { month: 'Feb', value: 2 },
      { month: 'Mar', value: 1 },
      { month: 'Abr', value: 3 },
      { month: 'May', value: 2 },
      { month: 'Jun', value: 4 }
    ];
  }

  loadRecentRecords(): void {
    // Por ahora vacío - "No hay registros médicos"
    this.recentRecords = [];
  }

  loadNextAppointment(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return;

    // Obtener próxima cita del paciente
    this.appointmentService.getAppointmentsByPatient(currentUser.id.toString()).subscribe({
      next: (appointments: any[]) => {
        if (appointments.length > 0) {
          // Ordenar por fecha y obtener la próxima
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const upcomingAppointments = appointments.filter((apt: any) => {
            const appointmentDate = new Date(apt.fecha_cita);
            return appointmentDate >= today;
          }).sort((a: any, b: any) =>
            new Date(a.fecha_cita).getTime() - new Date(b.fecha_cita).getTime()
          );

          if (upcomingAppointments.length > 0) {
            this.nextAppointment = upcomingAppointments[0];
            console.log('✅ Próxima cita cargada:', this.nextAppointment);
          } else {
            this.nextAppointment = null;
            console.log('ℹ️ No hay citas próximas');
          }
        }
      },
      error: (error: any) => {
        console.error('❌ Error cargando cita:', error);
        this.nextAppointment = null;
      }
    });
  }

  goTo(route: string): void {
    this.router.navigate([route]);
  }

  searchSpecialist(): void {
  this.router.navigate(['/paciente/buscar-medico']);  // Cambiado de '/buscar-medicos'
}

  getChartMaxValue(): number {
    return Math.max(...this.activityData.map(d => d.value)) + 1;
  }

  getChartHeight(value: number): string {
    const max = this.getChartMaxValue();
    return `${(value / max) * 100}%`;
  }

  getUserInitial(): string {
    return this.currentUser?.nombre?.charAt(0).toUpperCase() || 'U';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
