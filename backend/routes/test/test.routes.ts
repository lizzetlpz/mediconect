import { Router } from 'express';
import resendService from '../../src/services/resend.service';

const router = Router();

// Endpoint para probar la configuración de email
router.get('/test-email', async (req, res): Promise<void> => {
  try {
    console.log('🧪 Probando configuración de email con Resend...');

    // Enviar email de prueba
    const testEmail = (req.query['email'] as string) || 'medicoomx@gmail.com';

    const emailEnviado = await resendService.enviarEmail({
      to: testEmail,
      subject: '✅ Test de Email - MediConnect',
      html: `
        <h1>Test exitoso!</h1>
        <p>El servicio de email con Resend está funcionando correctamente.</p>
        <p>Fecha: ${new Date().toLocaleString()}</p>
      `
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
