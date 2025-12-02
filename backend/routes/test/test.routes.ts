import { Router } from 'express';
import emailService from '../../src/services/email.service';

const router = Router();

// Endpoint para probar la configuración de email
router.get('/test-email', async (req, res): Promise<void> => {
  try {
    console.log('🧪 Probando configuración de email...');
    
    // Verificar configuración
    const configOk = await emailService.verificarConfiguracion();
    
    if (!configOk) {
      res.status(500).json({
        success: false,
        message: 'Error en la configuración de email',
        details: 'Revisa EMAIL_USER y EMAIL_PASSWORD en .env'
      });
      return;
    }

    // Enviar email de prueba
    const testEmail = (req.query['email'] as string) || 'medicoomx@gmail.com';
    
    const emailEnviado = await emailService.enviarNotificacionCita({
      paciente_nombre: 'Usuario de Prueba',
      paciente_email: testEmail,
      medico_nombre: 'Dr. Test',
      especialidad: 'Medicina General',
      fecha_cita: '2025-12-02',
      hora_cita: '10:00',
      motivo: 'Consulta de prueba',
      modalidad: 'texto',
      cita_id: 999
    });

    if (emailEnviado) {
      res.json({
        success: true,
        message: `✅ Email de prueba enviado correctamente a: ${testEmail}`,
        email_destino: testEmail
      });
    } else {
      res.status(500).json({
        success: false,
        message: '❌ Error enviando email de prueba'
      });
    }
  } catch (error) {
    console.error('❌ Error en test de email:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

export default router;