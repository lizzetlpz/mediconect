import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Verificar variables de entorno de email
console.log('🔍 Verificando variables de entorno de email:');
console.log('   Ruta .env:', path.join(__dirname, '..', '.env'));
console.log('   EMAIL_USER:', process.env.EMAIL_USER || 'NO CONFIGURADO');
console.log('   EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '***configurado***' : 'NO CONFIGURADO');
import { getConnection } from '../BD/SQLite/database';
import { ChatWebSocketServer } from './websocket/ChatWebSocketServer';
import authRoutes from '../routes/login/login.routes';
import historialRoutes from '../routes/medico/historial.routes';
import agregarPacienteRoutes from '../routes/medico/agregarPaciente.route';
import consultasRoutes from '../routes/consultas/consultas.routes';
import prescripcionesRoutes from '../routes/prescripciones/prescripciones.routes';
import citasRoutes from '../routes/citas/citas.routes';
import pruebasMedicasRoutes from '../routes/pruebas-medicas/pruebas-medicas.routes';
import facturacionRoutes from '../routes/facturacion/facturacion.routes';
import familiaresRoutes from '../routes/familiares/familiares.routes';
import pagosRoutes from '../routes/pagos/pagos.routes';
import medicosRoutes from '../routes/medicos/medicos.routes';
import pacientesRoutes from '../routes/pacientes/pacientes.routes';
import recetasRoutes from '../routes/recetas/recetas.routes';

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🔧 PUERTO CONFIGURADO:', PORT);
console.log('🔧 NODE_ENV:', process.env.NODE_ENV);
console.log('🔧 process.env.PORT:', process.env.PORT);

// Configurar multer para subida de archivos
const uploadsDir = path.join(process.cwd(), 'backend', 'uploads', 'recetas');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Solo aceptar imágenes
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se aceptan imágenes'));
    }
  }
});

// Middlewares
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? [
        'https://mediconect.vercel.app',
        'https://mediconect-lake.vercel.app',
        'https://mediconect-production.up.railway.app',
        'https://vercel.app',
        'https://*.vercel.app'
      ]
    : ['http://localhost:4200', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'backend', 'uploads')));
app.use('/facturas', express.static(path.join(process.cwd(), 'backend', 'uploads', 'facturas')));

// Verificar conexión a la base de datos
const verificarConexion = async () => {
  try {
    const pool = getConnection();
    await pool.query('SELECT 1');
    console.log('✅ Conexión a MySQL establecida correctamente');
  } catch (err: any) {
    console.error('❌ Error al conectar a MySQL:', err.message);
  }
};

verificarConexion();

// ✅ Rutas
app.use('/api/auth', authRoutes);
app.use('/api/historial', historialRoutes);
app.use('/api/agregar-paciente', agregarPacienteRoutes); // POST / (crear historial)
app.use('/api/pacientes', agregarPacienteRoutes); // POST /registrar (registrar paciente completo)
app.use('/api/consultas', consultasRoutes);
app.use('/api/prescripciones', prescripcionesRoutes);
app.use('/api/citas', citasRoutes);
app.use('/api/pruebas-medicas', pruebasMedicasRoutes);
app.use('/api/facturacion', facturacionRoutes);
app.use('/api/familiares', familiaresRoutes);
app.use('/api/pagos', pagosRoutes);
app.use('/api/medicos', medicosRoutes);
app.use('/api/pacientes', pacientesRoutes); // GET /api/pacientes para listar pacientes
app.use('/api/recetas', recetasRoutes); // Sistema de recetas médicas

// BACKEND MODO API-ONLY - Frontend servido por Vercel
console.log('🚀 Servidor configurado en modo API-only');
console.log('📡 Frontend servido por Vercel: https://mediconect.vercel.app');

// Ruta catch-all para rutas no API - devolver 404 JSON
app.get('*', (req, res) => {
  // Si es una ruta de API que no existe, devolver 404 JSON
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      error: 'Ruta de API no encontrada',
      path: req.path,
      availableRoutes: [
        '/api/auth',
        '/api/historial', 
        '/api/pacientes',
        '/api/consultas',
        '/api/citas',
        '/api/medicos',
        '/api/recetas'
      ]
    });
  }
  
  // Para rutas no API, redirigir al frontend en Vercel
  res.status(302).redirect('https://mediconect.vercel.app' + req.path);
});

// Ruta de prueba API (mantener para compatibilidad)
app.get('/api', (req, res) => {
  res.json({
    mensaje: 'API MediConnect funcionando ✅',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Health check para Railway
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Endpoint público para probar email
app.get('/test-email', async (req, res) => {
  try {
    console.log('🧪 Probando configuración de email...');

    // Importar el servicio de email dinámicamente
    const { default: emailService } = await import('../src/services/email.service');

    const emailDestino = (req.query['email'] as string) || 'medicoomx@gmail.com';
    const resultado = await emailService.testearEnvioEmail(emailDestino);

    if (resultado) {
      res.status(200).json({
        success: true,
        message: `✅ Email de prueba enviado correctamente a: ${emailDestino}`,
        email_destino: emailDestino
      });
    } else {
      res.status(500).json({
        success: false,
        message: `❌ Error enviando email de prueba a: ${emailDestino}`
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

// Iniciar servidor HTTP
app.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📋 API disponible en http://localhost:${PORT}/api`);
  console.log(`🌐 Frontend disponible en https://mediconect.vercel.app`);
  console.log(`🔧 NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`📡 Modo: API-only (Backend separado)`);
  console.log(`${'='.repeat(60)}`);
});

// Iniciar servidor WebSocket para chat en tiempo real
const chatServer = new ChatWebSocketServer();
console.log('🔌 Servidor de chat WebSocket iniciado en puerto 3001');

export { upload };

// Cerrar conexiones al terminar
process.on('SIGINT', async () => {
  console.log('\n🔴 Cerrando servidor...');
  try {
    const pool = getConnection();
    await pool.end();
    console.log('✅ Conexiones cerradas correctamente');
  } catch (error) {
    console.error('❌ Error al cerrar conexiones:', error);
  }
  process.exit(0);
});
