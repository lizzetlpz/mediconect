import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent) },
  { path: 'verify-email', loadComponent: () => import('./pages/verify-email/verify-email.component').then(m => m.VerifyEmailComponent) },
  { path: 'validar-receta', loadComponent: () => import('./components/validar-receta/validar-receta.component').then(m => m.ValidarRecetaComponent) },

  // Ruta dashboard principal (redirige según tipo de usuario)
  { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent), canActivate: [AuthGuard] },

  // Rutas generales (compatibilidad)
  { path: 'consultations', loadComponent: () => import('./pages/consultations/consultation.component').then(m => m.ConsultationsComponent), canActivate: [AuthGuard] },
  { path: 'patients', loadComponent: () => import('./pages/patients/patients.component').then(m => m.PatientsComponent), canActivate: [AuthGuard] },
  { path: 'profile', loadComponent: () => import('./pages/profile/profile.component').then(m => m.ProfileComponent), canActivate: [AuthGuard] },

  // ============================================
  // RUTAS DEL DOCTOR
  // ============================================
  {
    path: 'doctor/dashboard',
    loadComponent: () => import('./pages/doctor-dashboard/doctor-dashboard.component').then(m => m.DoctorDashboardComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'doctor/agenda',
    loadComponent: () => import('./pages/medico/agenda/agendaM.component').then(m => m.CitasMedicasComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'doctor/consultas',
    loadComponent: () => import('./pages/medico/consultas/consultasM.component').then(m => m.ConsultasMedicasComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'doctor/pacientes',
    loadComponent: () => import('./pages/medico/misPacientes/pacientesM.component').then(m => m.GestionPacientesComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'doctor/historiales',
    loadComponent: () => import('./pages/medico/historial/historialM.component').then(m => m.HistorialPComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'doctor/recetas',
    loadComponent: () => import('./pages/medico/recetas/gestionar-recetas.component').then(m => m.GestionarRecetasComponent),
    canActivate: [AuthGuard]
  },

  // ============================================
  // RUTAS DEL PACIENTE
  // ============================================
  {
    path: 'paciente/dashboard',
    redirectTo: '/dashboard', // Redirigir a la ruta principal
    pathMatch: 'full'
  },
  {
    path: 'paciente/buscar-medico',
    loadComponent: () => import('./pages/pacientes/BuscarMedico/BuscarMedicoP.component').then(m => m.BuscarMedicoComponent), // ← Cambiar aquí
    canActivate: [AuthGuard]
  },
  {
    path: 'paciente/citas',
    loadComponent: () => import('./pages/pacientes/citas/citas.component').then(m => m.CitasComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'paciente/familia',
    loadComponent: () => import('./pages/pacientes/familia/familiaP.component').then(m => m.FamilyPlanComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'paciente/historial',
    loadComponent: () => import('./pages/pacientes/Historial/historialP.component').then(m => m.HistorialPComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'paciente/pagos',
    loadComponent: () => import('./pages/pacientes/Pagos/pagosP.component').then(m => m.MisPagosComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'paciente/consultas',
    loadComponent: () => import('./pages/pacientes/consultas/consultasP.component').then(m => m.ConsultasPacienteComponent),
    canActivate: [AuthGuard]
  },

  // Redirecciones alternativas
  { path: 'doctor-dashboard', redirectTo: 'doctor/dashboard', pathMatch: 'full' },
  { path: 'patient-dashboard', redirectTo: 'dashboard', pathMatch: 'full' } // Cambio aquí
];
