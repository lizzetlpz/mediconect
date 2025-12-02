const PDFDocument = require('pdfkit');
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';

interface FacturaData {
  id: number;
  monto: number;
  paciente_nombre: string;
  medico_nombre: string;
  medico_apellido?: string;
  medico_especialidad?: string;
  concepto: string;
  fecha_pago: string;
  metodo_pago: string;
  estado: string;
  email?: string;
  transaccion?: string;
}

export class FacturaService {
  private invoicesDir = resolve(__dirname, '../../uploads/facturas');

  constructor() {
    // Crear directorio si no existe
    if (!existsSync(this.invoicesDir)) {
      mkdirSync(this.invoicesDir, { recursive: true });
    }
  }

  /**
   * Generar factura en PDF
   */
  async generarFactura(data: FacturaData): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const fileName = `Factura-${data.id}-${Date.now()}.pdf`;
        const filePath = `${this.invoicesDir}/${fileName}`;

        const doc = new PDFDocument({
          margin: 40,
          size: 'A4'
        });

        const stream = createWriteStream(filePath);

        doc.pipe(stream);

        // Header
        doc.fontSize(24)
          .font('Helvetica-Bold')
          .text('FACTURA MÉDICA', { align: 'center' });

        doc.moveDown(0.5);
        doc.fontSize(10)
          .font('Helvetica')
          .text('MediConnect - Sistema de Gestión Médica', { align: 'center' })
          .text('Consultas Médicas en Línea', { align: 'center' });

        doc.moveTo(40, doc.y)
          .lineTo(555, doc.y)
          .stroke();

        doc.moveDown(1);

        // Información de la factura
        doc.fontSize(11)
          .font('Helvetica-Bold')
          .text('DETALLES DE LA FACTURA', 40);

        doc.fontSize(10)
          .font('Helvetica');

        const infoStartY = doc.y;

        // Columna izquierda
        doc.text(`ID Factura: ${data.id}`, 40);
        doc.text(`Fecha: ${this.formatDate(data.fecha_pago)}`, 40);
        doc.text(`Estado: ${this.formatEstado(data.estado)}`, 40);

        // Columna derecha
        doc.fontSize(10)
          .text(`Monto: $${data.monto.toFixed(2)}`, 300);

        doc.moveDown(1);

        // Información del paciente
        doc.fontSize(11)
          .font('Helvetica-Bold')
          .text('INFORMACIÓN DEL PACIENTE');

        doc.fontSize(10)
          .font('Helvetica')
          .text(`Paciente: ${data.paciente_nombre}`, 40)
          .text(`Email: ${data.email || 'No proporcionado'}`, 40);

        doc.moveDown(0.5);

        // Información del médico
        doc.fontSize(11)
          .font('Helvetica-Bold')
          .text('MÉDICO RESPONSABLE');

        const medicoNombre = data.medico_apellido
          ? `${data.medico_nombre} ${data.medico_apellido}`
          : data.medico_nombre;

        doc.fontSize(10)
          .font('Helvetica')
          .text(`Doctor/a: ${medicoNombre}`, 40);

        if (data.medico_especialidad) {
          doc.text(`Especialidad: ${data.medico_especialidad}`, 40);
        }

        if (data.transaccion) {
          doc.text(`ID Transacción: ${data.transaccion}`, 40);
        }

        doc.moveDown(1);

        // Tabla de concepto
        this.drawTable(doc, data);

        doc.moveDown(1);

        // Total
        doc.fontSize(12)
          .font('Helvetica-Bold')
          .text(`MONTO TOTAL: $${data.monto.toFixed(2)}`, 40);

        // Pie de página
        doc.moveDown(2);
        doc.moveTo(40, doc.y)
          .lineTo(555, doc.y)
          .stroke();

        doc.moveDown(0.5);
        doc.fontSize(9)
          .font('Helvetica')
          .text('Esta factura es un comprobante de pago por servicios médicos prestados.', { align: 'center' })
          .text('Para más información, contacta a soporte: soporte@mediconnect.com', { align: 'center' });

        doc.fontSize(8)
          .text(`Generado: ${new Date().toLocaleString()}`, { align: 'center' });

        doc.end();

        stream.on('finish', () => {
          console.log(`✅ Factura generada: ${fileName}`);
          resolve(fileName);
        });

        stream.on('error', (err) => {
          console.error('❌ Error escribiendo PDF:', err);
          reject(err);
        });
      } catch (error) {
        console.error('❌ Error generando factura:', error);
        reject(error);
      }
    });
  }

  /**
   * Dibujar tabla con detalles del concepto
   */
  private drawTable(doc: any, data: FacturaData): void {
    const startX = 40;
    const startY = doc.y;
    const colWidths = [300, 100, 100];
    const rowHeight = 40;

    // Header
    doc.rect(startX, startY, colWidths[0], 25)
      .fillAndStroke('#667eea', '#667eea');

    doc.fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('white')
      .text('Concepto', startX + 10, startY + 5, { width: colWidths[0] - 20 });

    doc.text('Método Pago', startX + colWidths[0] + 10, startY + 5, { width: colWidths[1] - 20 });
    doc.text('Monto', startX + colWidths[0] + colWidths[1] + 10, startY + 5, { width: colWidths[2] - 20 });

    // Datos
    doc.fontSize(10)
      .font('Helvetica')
      .fillColor('black')
      .text(data.concepto.substring(0, 50), startX + 10, startY + 35, { width: colWidths[0] - 20 });

    doc.text(data.metodo_pago, startX + colWidths[0] + 10, startY + 35, { width: colWidths[1] - 20 });
    doc.text(`$${data.monto.toFixed(2)}`, startX + colWidths[0] + colWidths[1] + 10, startY + 35, { width: colWidths[2] - 20 });

    doc.y = startY + rowHeight;
  }

  /**
   * Formatear estado
   */
  private formatEstado(estado: string): string {
    const estados: { [key: string]: string } = {
      'completado': '✓ Completado',
      'pendiente': '⏳ Pendiente',
      'cancelado': '✗ Cancelado'
    };
    return estados[estado.toLowerCase()] || estado;
  }

  /**
   * Formatear fecha
   */
  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Obtener ruta de factura
   */
  getFacturaPath(fileName: string): string {
    return `${this.invoicesDir}/${fileName}`;
  }

  /**
   * Verificar si factura existe
   */
  facturaExists(fileName: string): boolean {
    return existsSync(`${this.invoicesDir}/${fileName}`);
  }
}

export default new FacturaService();
