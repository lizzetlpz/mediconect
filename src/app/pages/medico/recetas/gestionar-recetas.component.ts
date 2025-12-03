import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { RecetaService } from '../../../services/receta.service';
import { AuthService } from '../../../services/auth.service';
import { CitasService } from '../../../services/citas.service';
import { Receta, Medicamento } from '../../../models/receta.model';
import { DoctorSidebarComponent } from '../../../barraLateral/doctor/BarraD.component';

@Component({
  selector: 'app-gestionar-recetas',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, DoctorSidebarComponent],
  templateUrl: './gestionar-recetas.component.html',
  styleUrls: ['./gestionar-recetas.component.css']
})
export class GestionarRecetasComponent implements OnInit, OnDestroy {
  recetaForm!: FormGroup;
  recetas: Receta[] = [];
  pacientes: any[] = [];
  citas: any[] = [];
  mostrarFormulario = false;
  cargando = false;

  // Nuevos campos para foto y autenticación
  fotoReceta: File | null = null;
  previewFotoReceta: string | null = null;
  firmaDigital: string = '';
  codigoMedico: string = '';
  autenticacionMedica = false;

  formasFarmaceuticas = [
    'Tabletas', 'Cápsulas', 'Jarabe', 'Suspensión', 'Gotas',
    'Crema', 'Pomada', 'Gel', 'Inyección', 'Supositorio'
  ];

  viasAdministracion = [
    'Oral', 'Tópica', 'Intramuscular', 'Intravenosa',
    'Subcutánea', 'Rectal', 'Oftálmica', 'Ótica'
  ];

  private subscriptions: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    private recetaService: RecetaService,
    private authService: AuthService,
    private citasService: CitasService
  ) {
    this.inicializarFormulario();
  }

  ngOnInit(): void {
    this.cargarRecetas();
    this.cargarCitas();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  inicializarFormulario(): void {
    this.recetaForm = this.fb.group({
      paciente_id: ['', Validators.required],
      cita_id: [''],
      instrucciones: ['', [Validators.required, Validators.minLength(10)]],
      observaciones: [''],
      dias_validez: [30, [Validators.required, Validators.min(1), Validators.max(365)]],
      // Nuevos campos para autenticación médica
      firma_digital: ['', Validators.required],
      codigo_medico: ['', [Validators.required, Validators.minLength(6)]],
      foto_receta: [''],
      medicamentos: this.fb.array([this.crearMedicamento()])
    });
  }

  crearMedicamento(): FormGroup {
    return this.fb.group({
      nombre: ['', Validators.required],
      concentracion: ['', Validators.required],
      forma_farmaceutica: ['', Validators.required],
      cantidad: ['', Validators.required],
      via_administracion: ['', Validators.required],
      frecuencia: ['', Validators.required],
      duracion: ['', Validators.required],
      indicaciones_especiales: ['']
    });
  }

  get medicamentos(): FormArray {
    return this.recetaForm.get('medicamentos') as FormArray;
  }

  agregarMedicamento(): void {
    this.medicamentos.push(this.crearMedicamento());
  }

  eliminarMedicamento(index: number): void {
    if (this.medicamentos.length > 1) {
      this.medicamentos.removeAt(index);
    }
  }

  cargarRecetas(): void {
    this.cargando = true;
    const sub = this.recetaService.obtenerRecetasMedico().subscribe({
      next: (recetas) => {
        this.recetas = recetas;
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error cargando recetas:', error);
        this.cargando = false;
      }
    });
    this.subscriptions.push(sub);
  }

  cargarCitas(): void {
    const sub = this.citasService.obtenerCitasMedico().subscribe({
      next: (citas: any[]) => {
        this.citas = citas;
        // Extraer pacientes únicos de las citas
        const pacientesMap = new Map();
        citas.forEach((cita: any) => {
          if (cita.paciente && !pacientesMap.has(cita.paciente.id)) {
            pacientesMap.set(cita.paciente.id, {
              id: cita.paciente.id,
              nombre: cita.paciente.nombre,
              telefono: cita.paciente.telefono
            });
          }
        });
        this.pacientes = Array.from(pacientesMap.values());
      },
      error: (error: any) => {
        console.error('Error cargando citas:', error);
      }
    });
    this.subscriptions.push(sub);
  }

  onPacienteSeleccionado(): void {
    const pacienteId = this.recetaForm.get('paciente_id')?.value;
    if (pacienteId) {
      // Filtrar citas del paciente seleccionado
      const citasPaciente = this.citas.filter(cita =>
        cita.paciente && cita.paciente.id == pacienteId
      );
      console.log('Citas del paciente:', citasPaciente);
    }
  }

  crearReceta(): void {
    if (this.recetaForm.invalid) {
      this.marcarCamposComoTocados();
      alert('Por favor complete todos los campos obligatorios');
      return;
    }

    if (!this.validarAutenticacionMedica()) {
      alert('La autenticación médica es obligatoria. Complete la firma digital y código médico.');
      return;
    }

    this.cargando = true;
    const formValue = this.recetaForm.value;

    // Preparar datos de la receta
    const recetaData = {
      paciente_id: formValue.paciente_id,
      cita_id: formValue.cita_id,
      instrucciones: formValue.instrucciones,
      observaciones: formValue.observaciones,
      dias_validez: formValue.dias_validez,
      medicamentos: formValue.medicamentos,
      // Datos de autenticación médica
      firma_digital: formValue.firma_digital,
      codigo_medico: formValue.codigo_medico,
      tiene_foto: this.fotoReceta ? true : false
    };

    // Si hay foto, usar FormData para el envío
    if (this.fotoReceta) {
      const formData = new FormData();

      // Agregar campos individuales a FormData
      formData.append('paciente_id', formValue.paciente_id.toString());
      formData.append('cita_id', formValue.cita_id?.toString() || '');
      formData.append('instrucciones', formValue.instrucciones);
      formData.append('observaciones', formValue.observaciones || '');
      formData.append('dias_validez', formValue.dias_validez.toString());
      formData.append('medicamentos', JSON.stringify(formValue.medicamentos));
      formData.append('firma_digital', formValue.firma_digital);
      formData.append('codigo_medico', formValue.codigo_medico);
      formData.append('foto_receta', this.fotoReceta);

      const sub = this.recetaService.crearRecetaConFoto(formData).subscribe({
        next: (receta) => {
          console.log('✅ Receta con foto creada exitosamente:', receta);
          alert('✅ Receta con foto creada exitosamente con autenticación médica');
          this.mostrarFormulario = false;
          this.reiniciarFormulario();
          this.actualizarRecetas();
        },
        error: (error) => {
          console.error('❌ Error al crear receta con foto:', error);
          alert('❌ Error al crear la receta con foto: ' + (error.error?.message || 'Error desconocido'));
        },
        complete: () => {
          this.cargando = false;
        }
      });
      this.subscriptions.push(sub);

    } else {
      // Sin foto, usar método normal
      const sub = this.recetaService.crearReceta(recetaData).subscribe({
        next: (receta) => {
          console.log('✅ Receta creada exitosamente:', receta);
          alert('✅ Receta creada exitosamente con autenticación médica');
          this.mostrarFormulario = false;
          this.recetaForm.reset();
          this.inicializarFormulario();
          this.eliminarFoto();
          this.cargarRecetas();

          // Mostrar mensaje de éxito con código
          alert(`✅ Receta creada exitosamente!\n\nCódigo de validación: ${receta.codigo_validacion}\n\n¿Desea descargar la receta?`);
          this.recetaService.descargarReceta(receta);
        },
        error: (error) => {
          console.error('❌ Error creando receta:', error);
          alert('Error al crear la receta. Intente nuevamente.');
        },
        complete: () => {
          this.cargando = false;
        }
      });
      this.subscriptions.push(sub);
    }
  }

  cancelarReceta(receta: Receta): void {
    const motivo = prompt('Ingrese el motivo de cancelación:');
    if (!motivo) return;

    const sub = this.recetaService.cancelarReceta(receta.id!, motivo).subscribe({
      next: () => {
        alert('Receta cancelada exitosamente');
        this.cargarRecetas();
      },
      error: (error: any) => {
        console.error('Error cancelando receta:', error);
        alert('Error al cancelar la receta');
      }
    });
    this.subscriptions.push(sub);
  }

  descargarReceta(receta: Receta): void {
    this.recetaService.descargarReceta(receta);
  }

  private marcarCamposComoTocados(): void {
    Object.keys(this.recetaForm.controls).forEach(key => {
      const control = this.recetaForm.get(key);
      if (control) {
        control.markAsTouched();
        if (control instanceof FormArray) {
          control.controls.forEach(subControl => {
            Object.keys(subControl.value).forEach(subKey => {
              const subSubControl = subControl.get(subKey);
              if (subSubControl) {
                subSubControl.markAsTouched();
              }
            });
          });
        }
      }
    });
  }

  // Métodos de utilidad para el template
  getEstadoColor(estado: string): string {
    const colores = {
      'activa': 'green',
      'utilizada': 'blue',
      'vencida': 'red',
      'cancelada': 'gray'
    };
    return colores[estado as keyof typeof colores] || 'black';
  }

  getEstadoTexto(estado: string): string {
    const textos = {
      'activa': 'Activa',
      'utilizada': 'Utilizada',
      'vencida': 'Vencida',
      'cancelada': 'Cancelada'
    };
    return textos[estado as keyof typeof textos] || estado;
  }

  puedeEditarse(receta: Receta): boolean {
    return receta.estado === 'activa' && !this.recetaService.estaVencida(receta);
  }

  formatearFecha(fecha: string | Date): string {
    const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
    return fechaObj.toLocaleDateString('es-ES');
  }

  // ============== MÉTODOS PARA FOTO Y AUTENTICACIÓN ==============

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validar que sea una imagen
      if (!file.type.startsWith('image/')) {
        alert('Por favor seleccione un archivo de imagen válido');
        return;
      }

      // Validar tamaño (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('La imagen debe ser menor a 5MB');
        return;
      }

      this.fotoReceta = file;

      // Crear preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.previewFotoReceta = e.target.result;
      };
      reader.readAsDataURL(file);

      console.log('Foto seleccionada:', file.name);
    }
  }

  eliminarFoto(): void {
    this.fotoReceta = null;
    this.previewFotoReceta = null;

    // Limpiar input file
    const fileInput = document.getElementById('fotoReceta') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  validarAutenticacionMedica(): boolean {
    const firmaDigital = this.recetaForm.get('firma_digital')?.value;
    const codigoMedico = this.recetaForm.get('codigo_medico')?.value;

    if (!firmaDigital || !codigoMedico) {
      return false;
    }

    // Validación básica de código médico (puedes expandir esto)
    const currentUser = this.authService.getCurrentUser();
    if (codigoMedico.length < 6) {
      return false;
    }

    this.autenticacionMedica = true;
    return true;
  }

  generarFirmaDigital(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      const timestamp = new Date().toISOString();
      const datos = `${currentUser.nombre}-${currentUser.email}-${timestamp}`;

      // Generar una firma digital simple (en producción usar criptografía real)
      this.firmaDigital = btoa(datos).substring(0, 20);
      this.recetaForm.patchValue({
        firma_digital: this.firmaDigital
      });

      console.log('Firma digital generada:', this.firmaDigital);
    }
  }

  reiniciarFormulario(): void {
    this.recetaForm.reset();
    this.inicializarFormulario();
    this.eliminarFoto();
  }

  actualizarRecetas(): void {
    this.cargarRecetas();
  }
}
