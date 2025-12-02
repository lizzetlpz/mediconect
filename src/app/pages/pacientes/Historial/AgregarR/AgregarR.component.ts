import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';

interface HistorialRecord {
    id: string;
    motivo: string;
    fecha: string;
    paciente: string | null;
    medico: string | null;
    sintomas: string;
    diagnostico: string;
    medicamentos: MedicamentoSimple[];
}

interface MedicamentoSimple {
    nombre: string;
    tipo: 'primary' | 'secondary';
}

interface Estudio {
  nombre: string;
  tipo: string;
  descripcion: string;
  archivo?: File;
}

@Component({
  selector: 'app-AgregarRegistro',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './AgregarR.component.html',
  styleUrls: ['./AgregarR.component.css']
})
export class RegistroComponent implements OnInit {
  @Output() cerrar = new EventEmitter<void>();
  @Output() registroCreado = new EventEmitter<HistorialRecord>();

  // Form data
  fotoReceta: File | null = null;
  previewFotoReceta: string | null = null;
  estudios: Estudio[] = [];
  cargando: boolean = false;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    // Inicializar si es necesario
  }

  agregarEstudio(): void {
    this.estudios.push({
      nombre: '',
      tipo: '',
      descripcion: ''
    });
  }

  eliminarEstudio(index: number): void {
    this.estudios.splice(index, 1);
  }

  onFileSelect(event: any, type: 'receta' | 'estudio', index?: number): void {
    const file = event.target.files[0];
    if (file) {
      if (type === 'receta') {
        this.fotoReceta = file;
        // Crear preview
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.previewFotoReceta = e.target.result;
        };
        reader.readAsDataURL(file);
      } else if (type === 'estudio' && index !== undefined) {
        this.estudios[index].archivo = file;
      }
    }
  }

  cancelar(): void {
    this.cerrar.emit();
  }

  crearRegistro(): void {
    // Validación: solo requiere foto
    if (!this.fotoReceta) {
      alert('Por favor sube una foto de la receta');
      return;
    }

    this.cargando = true;

    // Crear FormData para enviar archivo
    const formData = new FormData();
    formData.append('foto_receta', this.fotoReceta);
    
    // Agregar estudios si existen
    if (this.estudios.length > 0) {
      formData.append('estudios', JSON.stringify(this.estudios));
    }

    // Obtener token del localStorage
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    // Enviar al backend
    this.http.post('http://localhost:3000/api/historial/paciente/registro', formData, { headers }).subscribe({
      next: (response: any) => {
        console.log('✅ Registro creado exitosamente:', response);
        alert('Registro médico guardado correctamente');
        
        this.registroCreado.emit({
          id: response.id || '',
          motivo: 'Registro de laboratorios',
          fecha: new Date().toLocaleDateString('es-ES'),
          paciente: null,
          medico: null,
          sintomas: '',
          diagnostico: '',
          medicamentos: []
        });
        
        this.cargando = false;
        this.cancelar();
      },
      error: (error: any) => {
        console.error('❌ Error creando registro:', error);
        alert('Error al guardar el registro: ' + (error.error?.message || error.message));
        this.cargando = false;
      }
    });
  }
}

