import { Router } from 'express';
import { getConnection } from '../../BD/SQLite/database';
import { AuthRequest, verificarToken } from '../../middleware/auth.middleware';

const router = Router();

console.log('👥 Registrando rutas de pacientes');

// Proteger rutas con token
router.use(verificarToken);

// GET - Obtener todos los pacientes (rol_id = 2)
router.get('/', async (req: AuthRequest, res) => {
  try {
    console.log('📋 GET /api/pacientes - Obteniendo pacientes');
    const pool = getConnection();

    const [pacientes]: any = await pool.query(
      `SELECT usuario_id, nombre, apellido_paterno, apellido_materno, email, telefono, 
              fecha_nacimiento, rol_id, activo, fecha_registro
       FROM usuarios
       WHERE rol_id = 2 AND activo = 1
       ORDER BY nombre ASC`
    );

    console.log(`✅ Pacientes encontrados: ${pacientes.length}`);
    return res.status(200).json(pacientes);
  } catch (error) {
    console.error('❌ Error obteniendo pacientes:', error);
    return res.status(500).json({
      message: 'Error en el servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// GET - Obtener paciente por ID
router.get('/:usuario_id', async (req: AuthRequest, res) => {
  try {
    const { usuario_id } = req.params;
    console.log(`📋 GET /api/pacientes/${usuario_id}`);
    
    const pool = getConnection();

    const [pacientes]: any = await pool.query(
      `SELECT usuario_id, nombre, apellido_paterno, apellido_materno, email, telefono,
              fecha_nacimiento, rol_id, activo, fecha_registro
       FROM usuarios
       WHERE usuario_id = ? AND rol_id = 2 AND activo = 1`,
      [usuario_id]
    );

    if (pacientes.length === 0) {
      return res.status(404).json({ message: 'Paciente no encontrado' });
    }

    return res.status(200).json(pacientes[0]);
  } catch (error) {
    console.error('❌ Error obteniendo paciente:', error);
    return res.status(500).json({
      message: 'Error en el servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

export default router;
