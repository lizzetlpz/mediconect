import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PatientSidebarComponent } from '../../../barraLateral/paciente/Barrap.component';
import { RegistrarFamiliarComponent } from './registarF/registrarF.component';
import { EditarFamiliarComponent } from './editarF/editarF.component';
import { FamilyService } from '../../../services/family.service';

interface StatCard {
  title: string;
  value: number;
  icon: string;
  colorClass: string;
}

interface Benefit {
  icon: string;
  text: string;
}

interface FamilyMember {
  pacienteId: string;
  nombre: string;
  apellidos: string;
  relacion: string;
  puedeAgendarCitas: boolean;
  puedeVerHistorial: boolean;
  fechaAgregado?: Date;
  fechaNacimiento?: string;
  tipoSangre?: string;
  numeroCelular?: string;
  contactoEmergencia?: string | null;
  enfermedades?: string[];
  alergias?: string[];
  fechaRegistro?: Date;
}

@Component({
  selector: 'app-family-plan',
  standalone: true,
  imports: [
    CommonModule,
    PatientSidebarComponent,
    RegistrarFamiliarComponent,
    EditarFamiliarComponent
  ],
  templateUrl: './familiaP.component.html',
  styleUrls: ['./familiaP.component.css']
})
export class FamilyPlanComponent implements OnInit, AfterViewInit {
  @ViewChild(RegistrarFamiliarComponent, { static: false }) modalRegistrarFamiliar!: RegistrarFamiliarComponent;
  @ViewChild(EditarFamiliarComponent, { static: false }) modalEditarFamiliar!: EditarFamiliarComponent;

  statCards: StatCard[] = [];
  benefits: Benefit[] = [];
  familiares: FamilyMember[] = [];

  constructor(private router: Router, private familyService: FamilyService) {}

  ngOnInit(): void {
    console.log('FamilyPlanComponent inicializado');
    this.loadFamiliares();
    this.loadStatCards();
    this.loadBenefits();
  }

  ngAfterViewInit(): void {
    console.log('Modal Registrar Familiar disponible:', this.modalRegistrarFamiliar);
  }

  private loadStatCards(): void {
    this.statCards = [
      {
        title: 'Total Familiares',
        value: this.familiares.length,
        icon: '👥',
        colorClass: 'blue'
      },
      {
        title: 'Niños',
        value: 0,
        icon: '👶',
        colorClass: 'pink'
      },
      {
        title: 'Adultos',
        value: 0,
        icon: '👤',
        colorClass: 'purple'
      },
      {
        title: 'Citas Próximas',
        value: 0,
        icon: '📅',
        colorClass: 'green'
      }
    ];
  }

  private loadBenefits(): void {
    this.benefits = [
      {
        icon: '❤️',
        text: 'Gestiona la salud de hasta 10 familiares'
      },
      {
        icon: '📅',
        text: 'Agenda citas para todos desde tu cuenta'
      },
      {
        icon: '📋',
        text: 'Acceso a todos los historiales médicos'
      },
      {
        icon: '👶',
        text: 'Perfecto para familias con niños pequeños'
      }
    ];
  }

  registrarFamiliar(): void {
    console.log('Abriendo modal para agregar familiar...');
    if (this.modalRegistrarFamiliar) {
      this.modalRegistrarFamiliar.abrir();
    } else {
      console.error('Modal no disponible');
    }
  }

  onFamiliarAgregado(familiar: FamilyMember): void {
    console.log('Familiar agregado desde modal:', familiar);
    // Crear en backend y recargar lista
    const payload: any = {
      nombre: familiar.nombre,
      apellido_paterno: familiar.apellidos || '',
      relacion: familiar.relacion,
      fecha_nacimiento: familiar.fechaNacimiento || null,
      telefono: familiar.numeroCelular || null,
      tipo_sangre: familiar.tipoSangre || null,
      puede_agendar: familiar.puedeAgendarCitas ? 1 : 0,
      puede_ver_historial: familiar.puedeVerHistorial ? 1 : 0,
      notas: null,
      enfermedades_cronicas: familiar.enfermedades || [],
      alergias: familiar.alergias || []
    };

    console.log('📤 Payload para backend:', payload);
    this.familyService.addFamily(payload).subscribe({
      next: (res) => {
        console.log('✅ Familiar creado exitosamente:', res);
        this.loadFamiliares();
      },
      error: (err) => {
        console.error('❌ Error creando familiar en backend:', err);
        if (err.error) {
          console.error('Error details:', err.error);
        }
      }
    });
  }

  onFamiliarActualizado(familiar: FamilyMember): void {
    console.log('Familiar actualizado desde modal:', familiar);
    
    // Separar nombre y apellido
    const nombreCompleto = familiar.nombre.split(' ');
    const nombre = nombreCompleto[0];
    
    const payload: any = {
      nombre: nombre,
      apellido_paterno: familiar.apellidos || '',
      relacion: familiar.relacion,
      fecha_nacimiento: familiar.fechaNacimiento || null,
      telefono: familiar.numeroCelular || null,
      tipo_sangre: familiar.tipoSangre || null,
      puede_agendar: familiar.puedeAgendarCitas ? 1 : 0,
      puede_ver_historial: familiar.puedeVerHistorial ? 1 : 0,
      notas: null,
      enfermedades_cronicas: familiar.enfermedades || [],
      alergias: familiar.alergias || []
    };

    console.log('📤 Payload actualización:', payload);
    this.familyService.updateFamily(parseInt(familiar.pacienteId), payload).subscribe({
      next: (res) => {
        console.log('✅ Familiar actualizado exitosamente:', res);
        this.loadFamiliares();
      },
      error: (err) => {
        console.error('❌ Error actualizando familiar:', err);
        alert('Error al actualizar familiar');
      }
    });
  }

  private actualizarEstadisticas(): void {
    const totalFamiliares = this.familiares.length;
    this.statCards = [
      {
        title: 'Total Familiares',
        value: totalFamiliares,
        icon: '👥',
        colorClass: 'blue'
      },
      {
        title: 'Niños',
        value: 0,
        icon: '👶',
        colorClass: 'pink'
      },
      {
        title: 'Adultos',
        value: 0,
        icon: '👤',
        colorClass: 'purple'
      },
      {
        title: 'Citas Próximas',
        value: 0,
        icon: '📅',
        colorClass: 'green'
      }
    ];
  }

  editarFamiliar(familiar: FamilyMember): void {
    console.log('✏️ Editando familiar:', familiar);
    if (this.modalEditarFamiliar) {
      this.modalEditarFamiliar.abrir(familiar);
    }
  }

  eliminarFamiliar(familiar: FamilyMember): void {
    console.log('🗑️ Eliminando familiar:', familiar);
    if (confirm(`¿Estás seguro de que deseas eliminar a ${familiar.nombre}?`)) {
      this.familyService.deleteFamily(parseInt(familiar.pacienteId)).subscribe({
        next: (res) => {
          console.log('✅ Familiar eliminado:', res);
          this.loadFamiliares();
        },
        error: (err) => {
          console.error('❌ Error eliminando familiar:', err);
          alert('Error al eliminar familiar');
        }
      });
    }
  }

  private loadFamiliares(): void {
    console.log('📋 Cargando familiares desde backend...');
    this.familyService.getFamily().subscribe({
      next: (res) => {
        console.log('✅ Respuesta del backend:', res);
        if (res && res.data && Array.isArray(res.data)) {
          // Mapear a la interfaz local
          this.familiares = (res.data as any[]).map(f => ({
            pacienteId: String(f.familiar_id),
            nombre: `${f.nombre} ${f.apellido_paterno || ''}`.trim(),
            apellidos: f.apellido_paterno || '',
            relacion: f.relacion || '',
            puedeAgendarCitas: !!f.puede_agendar,
            puedeVerHistorial: !!f.puede_ver_historial,
            fechaAgregado: f.creado_en ? new Date(f.creado_en) : new Date(),
            fechaNacimiento: f.fecha_nacimiento || null,
            tipoSangre: f.tipo_sangre || null,
            numeroCelular: f.telefono || null,
            contactoEmergencia: null,
            enfermedades: f.enfermedades_cronicas ? (typeof f.enfermedades_cronicas === 'string' ? JSON.parse(f.enfermedades_cronicas) : f.enfermedades_cronicas) : [],
            alergias: f.alergias ? (typeof f.alergias === 'string' ? JSON.parse(f.alergias) : f.alergias) : [],
            fechaRegistro: f.creado_en ? new Date(f.creado_en) : new Date()
          }));
          console.log('📊 Familiares cargados:', this.familiares);
          this.actualizarEstadisticas();
        } else {
          console.warn('⚠️ Respuesta sin datos:', res);
          this.familiares = [];
        }
      },
      error: (err) => {
        console.error('❌ Error cargando familiares:', err);
        this.familiares = [];
      }
    });
  }
}
