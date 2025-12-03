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
    // Forzar recarga completa de datos en cada navegación
    this.refreshDashboard();
  }

  refreshDashboard(): void {
    // Limpiar datos existentes
    this.currentUser = null;
    this.quickActions = [];
    this.activityData = [];
    this.recentRecords = [];
    this.nextAppointment = null;

    setTimeout(() => {
      this.checkUserRole();
      
      const user = this.authService.getCurrentUser();
      if (user && (user.rol_id === 1 || user.rol_id === 2 || user.rol_id === 3)) {
        this.currentUser = user; // Actualizar usuario actual
        this.loadQuickActions();
        this.loadActivityData();
        this.loadRecentRecords();
        this.loadNextAppointment();
      }
    }, 100);
  }  private checkUserRole(): void {
    const user = this.authService.getCurrentUser();
    console.log('🔍 Verificando rol del usuario:', user);

    if (!user) {
      console.log('❌ Usuario no encontrado, redirigiendo a login');
      this.router.navigate(['/login']);
      return;
    }

    switch (user.rol_id) {
      case 2: // Doctor
        console.log('👨‍⚕️ Usuario es doctor, redirigiendo a dashboard de doctor');
        this.router.navigate(['/doctor/dashboard']);
        break;
      case 3: // Paciente
        console.log('🙋‍♂️ Usuario es paciente, puede permanecer aquí');
        break;
      case 1: // Admin
        console.log('👑 Usuario es admin, puede permanecer aquí');
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
        route: '/paciente/buscar-medico',
        iconColor: '#3b82f6',
        bgColor: '#eff6ff'
      },
      {
        title: 'Iniciar Consulta',
        subtitle: 'Habla con tu médico.',
        icon: '💬',
        route: '/paciente/consultas',
        iconColor: '#10b981',
        bgColor: '#f0fdf4'
      },
      {
        title: 'Mi Salud',
        subtitle: 'Revisa tu historial.',
        icon: '💜',
        route: '/paciente/historial',
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
    this.recentRecords = [];
  }

  loadNextAppointment(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !currentUser.usuario_id) {
      console.log('⚠️ No hay usuario o usuario_id para cargar citas');
      return;
    }

    console.log('📅 Cargando próxima cita para usuario:', currentUser.usuario_id);

    this.appointmentService.getAppointmentsByPatient(currentUser.usuario_id.toString()).subscribe({
      next: (appointments: any[]) => {
        console.log('📅 Citas recibidas:', appointments);
        if (appointments && appointments.length > 0) {
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
            console.log('📅 No hay citas próximas');
            this.nextAppointment = null;
          }
        } else {
          console.log('📅 No hay citas registradas');
          this.nextAppointment = null;
        }
      },
      error: (error: any) => {
        console.error('❌ Error cargando próxima cita:', error);
        this.nextAppointment = null;
      }
    });
  }

  goTo(route: string): void {
    this.router.navigate([route]);
  }

  searchSpecialist(): void {
    this.router.navigate(['/paciente/buscar-medico']);
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
