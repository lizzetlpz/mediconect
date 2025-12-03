import axios from 'axios';

async function checkRailwayHealth() {
  const baseUrl = 'https://mediconect-production.up.railway.app';
  
  console.log('🔍 Verificando estado de Railway...\n');
  
  // 1. Verificar si el servidor responde
  try {
    console.log('1️⃣ Probando conexión básica...');
    const response = await axios.get(`${baseUrl}/`, { timeout: 10000 });
    console.log('✅ Servidor responde:', response.status);
  } catch (error: any) {
    console.error('❌ Servidor no responde:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('   El servidor está apagado o desplegándose');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('   Timeout - El servidor no responde a tiempo');
    }
  }

  // 2. Verificar endpoint de registro
  try {
    console.log('\n2️⃣ Probando endpoint de registro...');
    const response = await axios.post(`${baseUrl}/api/auth/register`, {
      nombre: 'Test',
      apellido_paterno: 'Test',
      email: 'test@test.com',
      password: 'Test123',
      rol: 'paciente'
    }, { 
      timeout: 15000,
      validateStatus: () => true // Aceptar cualquier status
    });
    
    console.log('✅ Endpoint responde con status:', response.status);
    if (response.status === 400) {
      console.log('   (400 es normal si el email ya existe)');
    }
    console.log('   Respuesta:', response.data);
  } catch (error: any) {
    console.error('❌ Error en endpoint de registro:', error.message);
    if (error.code === 'ETIMEDOUT') {
      console.error('   ⏱️ TIMEOUT: El endpoint tarda más de 15 segundos');
      console.error('   Posible causa: Railway está desplegando o el servidor está lento');
    }
  }

  // 3. Verificar endpoint de login
  try {
    console.log('\n3️⃣ Probando endpoint de login...');
    const response = await axios.post(`${baseUrl}/api/auth/login`, {
      email: 'test@test.com',
      password: 'test'
    }, { 
      timeout: 10000,
      validateStatus: () => true
    });
    
    console.log('✅ Endpoint de login responde con status:', response.status);
    console.log('   Mensaje:', response.data.message);
  } catch (error: any) {
    console.error('❌ Error en endpoint de login:', error.message);
  }

  console.log('\n🏁 Verificación completa');
}

checkRailwayHealth();
