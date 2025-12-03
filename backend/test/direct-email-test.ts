// Script directo para probar el servicio de email
import dotenv from 'dotenv';
import emailService from '../src/services/email.service';

// Cargar variables de entorno
dotenv.config({ path: '../.env' });

async function probarEmail() {
  try {
    console.log('🧪 Probando configuración de email...');
    console.log('📧 EMAIL_USER:', process.env.EMAIL_USER);
    console.log('🔑 EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '***configurado***' : 'NO CONFIGURADO');

    const emailDestino = 'medicoomx@gmail.com';
    console.log(`📨 Enviando email de prueba a: ${emailDestino}`);

    const resultado = await emailService.testearEnvioEmail(emailDestino);

    if (resultado) {
      console.log('✅ TEST EXITOSO: Email enviado correctamente');
    } else {
      console.log('❌ TEST FALLIDO: Error enviando email');
    }
  } catch (error) {
    console.error('💥 Error en el test:', error);
  }
}

probarEmail();
