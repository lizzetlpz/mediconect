import nodemailer from 'nodemailer';

interface EmailData {
  to: string;
  subject: string;
  html: string;
}

interface CitaEmailData {
  paciente_nombre: string;
  paciente_email: string;
  medico_nombre: string;
  especialidad?: string;
  fecha_cita: string;
  hora_cita: string;
  motivo: string;
  modalidad: string;
  cita_id: number;
}

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    console.log('🔧 Inicializando EmailService...');
    console.log('   EMAIL_USER:', process.env.EMAIL_USER || 'NO CONFIGURADO');
    console.log('   EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '***configurado***' : 'NO CONFIGURADO');

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  /**
   * Enviar email genérico
   */
  async enviarEmail(data: EmailData): Promise<boolean> {
    try {
      console.log(`📧 Enviando email a: ${data.to}`);

      const info = await this.transporter.sendMail({
        from: `"MediConnect" <${process.env.EMAIL_USER}>`,
        to: data.to,
        subject: data.subject,
        html: data.html
      });

      console.log('✅ Email enviado:', info.messageId);
      return true;
    } catch (error) {
      console.error('❌ Error enviando email:', error);
      return false;
    }
  }

  /**
   * Enviar notificación de cita agendada
   */
  async enviarNotificacionCita(data: CitaEmailData): Promise<boolean> {
    const html = this.generarHTMLCita(data);

    return this.enviarEmail({
      to: data.paciente_email,
      subject: '✅ Cita Médica Confirmada - MediConnect',
      html
    });
  }

  /**
   * Enviar email de verificación de cuenta
   */
  async enviarVerificacionCuenta(email: string, nombre: string, tokenVerificacion: string): Promise<boolean> {
    const html = this.generarHTMLVerificacion(nombre, tokenVerificacion);

    return this.enviarEmail({
      to: email,
      subject: '📧 Verifica tu cuenta - MediConnect',
      html
    });
  }

  /**
   * Generar HTML para email de cita
   */
  private generarHTMLCita(data: CitaEmailData): string {
    const fechaFormateada = this.formatearFecha(data.fecha_cita);

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirmación de Cita</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
          }
          .container {
            background-color: #ffffff;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 10px 10px 0 0;
            text-align: center;
            margin: -30px -30px 30px -30px;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
          }
          .icon {
            font-size: 50px;
            margin-bottom: 10px;
          }
          .info-box {
            background-color: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #e0e0e0;
          }
          .info-row:last-child {
            border-bottom: none;
          }
          .label {
            font-weight: bold;
            color: #667eea;
          }
          .value {
            color: #333;
          }
          .highlight {
            background-color: #fff3cd;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
            border-left: 4px solid #ffc107;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #e0e0e0;
            color: #666;
            font-size: 14px;
          }
          .btn {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="icon">📅</div>
            <h1>Cita Confirmada</h1>
            <p style="margin: 5px 0 0 0;">Tu cita médica ha sido agendada exitosamente</p>
          </div>

          <p>Hola <strong>${data.paciente_nombre}</strong>,</p>

          <p>Tu cita médica ha sido confirmada. A continuación encontrarás los detalles:</p>

          <div class="info-box">
            <div class="info-row">
              <span class="label">📋 ID de Cita:</span>
              <span class="value">#${data.cita_id}</span>
            </div>
            <div class="info-row">
              <span class="label">👨‍⚕️ Médico:</span>
              <span class="value">${data.medico_nombre}</span>
            </div>
            ${data.especialidad ? `
            <div class="info-row">
              <span class="label">🏥 Especialidad:</span>
              <span class="value">${data.especialidad}</span>
            </div>
            ` : ''}
            <div class="info-row">
              <span class="label">📅 Fecha:</span>
              <span class="value">${fechaFormateada}</span>
            </div>
            <div class="info-row">
              <span class="label">🕐 Hora:</span>
              <span class="value">${data.hora_cita}</span>
            </div>
            <div class="info-row">
              <span class="label">📝 Motivo:</span>
              <span class="value">${data.motivo}</span>
            </div>
            <div class="info-row">
              <span class="label">💻 Modalidad:</span>
              <span class="value">${data.modalidad === 'video' ? '📹 Videollamada' : '💬 Chat de Texto'}</span>
            </div>
          </div>

          <div class="highlight">
            <strong>⏰ Recordatorio:</strong> Por favor, conéctate 5 minutos antes de tu cita para verificar tu conexión.
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 20px; display: inline-block;">
              <h3 style="margin: 0 0 10px 0; color: #0369a1;">📱 Accede a tu cita</h3>
              <p style="margin: 0; color: #0369a1;">Ingresa a la plataforma MediConnect con tu usuario y contraseña para unirte a tu videoconsulta.</p>
            </div>
          </div>

          <div class="footer">
            <p><strong>MediConnect</strong> - Tu salud, nuestra prioridad</p>
            <p>📧 Soporte: soporte@mediconnect.com</p>
            <p>Este es un correo automático, por favor no responder.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generar HTML para email de verificación
   */
  private generarHTMLVerificacion(nombre: string, tokenVerificacion: string): string {
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verificación de Cuenta</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
          }
          .container {
            background-color: #ffffff;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 10px 10px 0 0;
            text-align: center;
            margin: -30px -30px 30px -30px;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
          }
          .icon {
            font-size: 50px;
            margin-bottom: 10px;
          }
          .verification-box {
            background-color: #f8f9fa;
            border-left: 4px solid #28a745;
            padding: 20px;
            margin: 20px 0;
            border-radius: 5px;
            text-align: center;
          }
          .btn-verify {
            display: inline-block;
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white !important;
            padding: 15px 40px;
            text-decoration: none;
            border-radius: 8px;
            margin: 20px 0;
            font-weight: bold;
            font-size: 16px;
            border: none;
            transition: transform 0.2s;
          }
          .btn-verify:hover {
            transform: translateY(-2px);
          }
          .warning {
            background-color: #fff3cd;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
            border-left: 4px solid #ffc107;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #e0e0e0;
            color: #666;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="icon">📧</div>
            <h1>¡Bienvenido a MediConnect!</h1>
            <p style="margin: 5px 0 0 0;">Verifica tu cuenta para continuar</p>
          </div>

          <p>Hola <strong>${nombre}</strong>,</p>

          <p>¡Gracias por registrarte en MediConnect! Para completar tu registro y comenzar a usar nuestra plataforma, necesitamos verificar tu dirección de correo electrónico.</p>

          <div class="verification-box">
            <h3 style="margin-top: 0; color: #28a745;">🔐 Código de Verificación</h3>
            <p>Para verificar tu cuenta, ingresa a la plataforma MediConnect y utiliza el siguiente código:</p>

            <div style="background: #f8f9fa; border: 2px dashed #28a745; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
              <h2 style="margin: 0; font-size: 32px; letter-spacing: 4px; color: #28a745; font-family: 'Courier New', monospace;">${tokenVerificacion}</h2>
            </div>

            <div style="background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0;">
              <h4 style="margin: 0 0 10px 0; color: #1976d2;">📱 Cómo verificar tu cuenta:</h4>
              <ol style="margin: 0; padding-left: 20px; color: #1976d2;">
                <li>Inicia sesión en la plataforma MediConnect</li>
                <li>Busca la sección "Verificar Cuenta"</li>
                <li>Ingresa el código de arriba</li>
                <li>¡Listo! Tu cuenta estará verificada</li>
              </ol>
            </div>
          </div>

          <div class="warning">
            <strong>⚠️ Importante:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Este código es válido por <strong>24 horas</strong></li>
              <li>Si no verificas tu cuenta, no podrás acceder a todas las funciones</li>
              <li>Si no solicitaste esta cuenta, puedes ignorar este email</li>
            </ul>
          </div>

          <p>Una vez verificada tu cuenta, podrás:</p>
          <ul>
            <li>📅 Agendar citas médicas</li>
            <li>💬 Chat en tiempo real con profesionales</li>
            <li>📋 Acceder a tu historial médico</li>
            <li>👥 Gestionar información familiar</li>
          </ul>

          <div class="footer">
            <p><strong>MediConnect</strong> - Tu salud, nuestra prioridad</p>
            <p>📧 Soporte: soporte@mediconnect.com</p>
            <p>Este es un correo automático, por favor no responder directamente.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Formatear fecha
   */
  private formatearFecha(fecha: string): string {
    const date = new Date(fecha);
    const opciones: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return date.toLocaleDateString('es-ES', opciones);
  }

  /**
   * Verificar configuración del servicio
   */
  async verificarConfiguracion(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('✅ Configuración de email verificada correctamente');
      return true;
    } catch (error) {
      console.error('❌ Error en configuración de email:', error);
      return false;
    }
  }

  async testearEnvioEmail(emailDestino: string = 'medicoomx@gmail.com'): Promise<boolean> {
    try {
      console.log(`🧪 Probando envío de email a: ${emailDestino}`);

      const configOk = await this.verificarConfiguracion();
      if (!configOk) {
        console.error('❌ Error en la configuración de email');
        return false;
      }

      const resultado = await this.enviarNotificacionCita({
        paciente_nombre: 'Usuario de Prueba',
        paciente_email: emailDestino,
        medico_nombre: 'Dr. Test',
        especialidad: 'Medicina General',
        fecha_cita: '2025-12-02',
        hora_cita: '10:00',
        motivo: 'Consulta de prueba del sistema',
        modalidad: 'texto',
        cita_id: 999
      });

      if (resultado) {
        console.log(`✅ Email de prueba enviado exitosamente a: ${emailDestino}`);
        return true;
      } else {
        console.error(`❌ Error enviando email de prueba a: ${emailDestino}`);
        return false;
      }
    } catch (error) {
      console.error('❌ Error en test de email:', error);
      return false;
    }
  }
}

export default new EmailService();
