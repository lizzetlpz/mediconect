import { Router } from 'express';
import { getConnection } from '../../BD/SQLite/database';
import { AuthRequest, verificarToken } from '../../middleware/auth.middleware';

const router = Router();

console.log('📋 Registrando rutas de medicos');

// Proteger la ruta con token
router.use(verificarToken);

// GET / - obtener todos los médicos activos
router.get('/', async (req: AuthRequest, res) => {
  try {
    console.log('📡 GET /api/medicos - Token verificado. Usuario ID:', req.usuario_id);
    const pool = getConnection();
    const [rows]: any = await pool.query(
      `SELECT usuario_id, nombre, apellido_paterno, apellido_materno, email, telefono
       FROM usuarios
       WHERE rol_id = 3 AND activo = 1`
    );

    console.log(`✅ Médicos encontrados: ${rows.length}`);
    console.log('Médicos:', JSON.stringify(rows, null, 2));
    return res.status(200).json(rows);
  } catch (error) {
    console.error('❌ Error obteniendo medicos:', error);
    return res.status(500).json({ message: 'Error en el servidor' });
  }
});

// GET /profiles - obtener todos los médicos con perfiles completos
router.get('/profiles', async (req: AuthRequest, res) => {
  try {
    console.log('📡 GET /api/medicos/profiles - Obteniendo perfiles completos de médicos');
    const pool = getConnection();

    const [rows]: any = await pool.query(
      `SELECT
        u.usuario_id, u.nombre, u.apellido_paterno, u.apellido_materno,
        u.email, u.telefono,
        mp.especialidad, mp.anos_experiencia, mp.universidad,
        mp.cedula_profesional, mp.descripcion, mp.tarifa_consulta
      FROM usuarios u
      LEFT JOIN medicos_profesionales mp ON u.usuario_id = mp.usuario_id
      WHERE u.rol_id = 3 AND u.activo = 1`
    );

    console.log(`✅ Perfiles de médicos obtenidos: ${rows.length}`);
    return res.status(200).json(rows);
  } catch (error) {
    console.error('❌ Error obteniendo perfiles de médicos:', error);
    return res.status(500).json({ message: 'Error en el servidor' });
  }
});

// GET /:medico_id - obtener perfil de un médico específico
router.get('/:medico_id', async (req: AuthRequest, res) => {
  try {
    const { medico_id } = req.params;
    console.log('📡 GET /api/medicos/:medico_id - Obteniendo perfil del médico:', medico_id);

    const pool = getConnection();

    // Obtener datos del usuario
    const [usuarios]: any = await pool.query(
      `SELECT usuario_id, nombre, apellido_paterno, email, telefono, activo
       FROM usuarios
       WHERE usuario_id = ? AND rol_id = 3`,
      [medico_id]
    );

    if (usuarios.length === 0) {
      console.log('❌ Médico no encontrado:', medico_id);
      return res.status(404).json({ message: 'Médico no encontrado' });
    }

    const usuario = usuarios[0];

    // Obtener datos profesionales si existen
    const [profesionales]: any = await pool.query(
      `SELECT especialidad, anos_experiencia, universidad, cedula_profesional, descripcion, tarifa_consulta
       FROM medicos_profesionales
       WHERE usuario_id = ?`,
      [medico_id]
    );

    const perfil = {
      usuario_id: usuario.usuario_id,
      nombre: usuario.nombre,
      apellido_paterno: usuario.apellido_paterno,
      email: usuario.email,
      telefono: usuario.telefono,
      especialidad: profesionales.length > 0 ? profesionales[0].especialidad : '',
      anos_experiencia: profesionales.length > 0 ? profesionales[0].anos_experiencia : 0,
      universidad: profesionales.length > 0 ? profesionales[0].universidad : '',
      cedula_profesional: profesionales.length > 0 ? profesionales[0].cedula_profesional : '',
      descripcion: profesionales.length > 0 ? profesionales[0].descripcion : '',
      tarifa_consulta: profesionales.length > 0 ? profesionales[0].tarifa_consulta : 0
    };

    console.log('✅ Perfil del médico obtenido:', perfil);
    return res.status(200).json(perfil);
  } catch (error) {
    console.error('❌ Error obteniendo perfil:', error);
    return res.status(500).json({ message: 'Error en el servidor' });
  }
});

// PUT /:medico_id - actualizar perfil del médico
router.put('/:medico_id', async (req: AuthRequest, res) => {
  try {
    const { medico_id } = req.params;
    const { especialidad, anos_experiencia, universidad, cedula_profesional, descripcion, tarifa_consulta } = req.body;

    console.log('📝 PUT /api/medicos/:medico_id - Actualizando perfil del médico:', medico_id);
    console.log('Datos recibidos:', {
      especialidad,
      anos_experiencia,
      universidad,
      cedula_profesional,
      descripcion,
      tarifa_consulta
    });

    // Verificar que el usuario sea médico y esté actualizando su propio perfil
    if (req.usuario_id !== parseInt(medico_id)) {
      console.log('❌ Intento de actualizar perfil de otro usuario');
      return res.status(403).json({ message: 'No tienes permiso para actualizar este perfil' });
    }

    const pool = getConnection();

    // Verificar que el usuario existe y es médico
    const [usuarios]: any = await pool.query(
      `SELECT usuario_id FROM usuarios WHERE usuario_id = ? AND rol_id = 3`,
      [medico_id]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ message: 'Médico no encontrado' });
    }

    // Verificar si existe registro en medicos_profesionales
    const [existentes]: any = await pool.query(
      `SELECT * FROM medicos_profesionales WHERE usuario_id = ?`,
      [medico_id]
    );

    let resultado;

    if (existentes.length > 0) {
      // Actualizar registro existente
      console.log('🔄 Actualizando registro existente...');
      [resultado] = await pool.query(
        `UPDATE medicos_profesionales
         SET especialidad = ?, anos_experiencia = ?, universidad = ?, cedula_profesional = ?, descripcion = ?, tarifa_consulta = ?
         WHERE usuario_id = ?`,
        [especialidad, anos_experiencia, universidad, cedula_profesional, descripcion || null, tarifa_consulta || 0, medico_id]
      );
    } else {
      // Crear nuevo registro
      console.log('✨ Creando nuevo registro profesional...');
      [resultado] = await pool.query(
        `INSERT INTO medicos_profesionales
         (usuario_id, especialidad, anos_experiencia, universidad, cedula_profesional, descripcion, tarifa_consulta)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [medico_id, especialidad, anos_experiencia, universidad, cedula_profesional, descripcion || null, tarifa_consulta || 0]
      );
    }

    console.log('✅ Perfil actualizado exitosamente');
    return res.status(200).json({
      message: 'Perfil actualizado exitosamente',
      medico_id: medico_id
    });
  } catch (error) {
    console.error('❌ Error actualizando perfil:', error);
    return res.status(500).json({
      message: 'Error al actualizar el perfil',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

export default router;
