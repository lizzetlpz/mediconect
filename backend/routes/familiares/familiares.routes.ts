import { Router, Response } from 'express';
import { getConnection } from '../../BD/SQLite/database';
import { AuthRequest, verificarToken } from '../../middleware/auth.middleware';

const router = Router();

router.use(verificarToken);

// GET /api/familiares - obtener familiares del usuario autenticado
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const ownerId = req.usuario_id;
    if (!ownerId) return res.status(401).json({ success: false, message: 'No autenticado' });

    const pool = getConnection();
    const [rows] = await pool.query(
      `SELECT * FROM familiares WHERE owner_id = ? ORDER BY creado_en DESC`,
      [ownerId]
    );

    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Error obteniendo familiares:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener familiares' });
  }
});

// POST /api/familiares - crear nuevo familiar
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const ownerId = req.usuario_id;
    if (!ownerId) return res.status(401).json({ success: false, message: 'No autenticado' });

    console.log('📥 Recibiendo POST /api/familiares');
    console.log('Owner ID:', ownerId);
    console.log('Body recibido:', req.body);

    const {
      nombre,
      apellido_paterno,
      relacion,
      fecha_nacimiento,
      telefono,
      tipo_sangre,
      puede_agendar,
      puede_ver_historial,
      notas,
      enfermedades_cronicas,
      alergias
    } = req.body;

    if (!nombre) {
      console.warn('❌ Nombre no proporcionado');
      return res.status(400).json({ success: false, message: 'Nombre es requerido' });
    }

    // Convertir fecha ISO a formato YYYY-MM-DD
    let fechaFormato = fecha_nacimiento;
    if (fecha_nacimiento && typeof fecha_nacimiento === 'string' && fecha_nacimiento.includes('T')) {
      fechaFormato = fecha_nacimiento.split('T')[0];
    }

    console.log('✅ Validación pasada. Insertando familiar:', {
      nombre,
      apellido_paterno,
      relacion,
      puede_agendar,
      puede_ver_historial
    });

    const pool = getConnection();
    const [result] = await pool.query(
      `INSERT INTO familiares (owner_id, nombre, apellido_paterno, relacion, fecha_nacimiento, telefono, tipo_sangre, puede_agendar, puede_ver_historial, notas, enfermedades_cronicas, alergias)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [ownerId, nombre, apellido_paterno || null, relacion || null, fechaFormato || null, telefono || null, tipo_sangre || null, puede_agendar ? 1 : 0, puede_ver_historial ? 1 : 0, notas || null, enfermedades_cronicas ? JSON.stringify(enfermedades_cronicas) : null, alergias ? JSON.stringify(alergias) : null]
    );

    const insertId = (result as any).insertId;
    console.log('✅ Familiar creado exitosamente. ID:', insertId);
    return res.status(201).json({ success: true, familiar_id: insertId });
  } catch (error) {
    console.error('❌ Error creando familiar:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return res.status(500).json({ success: false, message: 'Error al crear familiar', error: (error as any).message });
  }
});

// GET /api/familiares/:id - obtener un familiar si pertenece al usuario
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const ownerId = req.usuario_id;
    const { id } = req.params;

    const pool = getConnection();
    const [rows] = await pool.query(`SELECT * FROM familiares WHERE familiar_id = ?`, [id]);
    if ((rows as any[]).length === 0) return res.status(404).json({ success: false, message: 'Familiar no encontrado' });
    const fam = (rows as any[])[0];
    if (fam.owner_id !== ownerId) return res.status(403).json({ success: false, message: 'Acceso denegado' });

    return res.status(200).json({ success: true, data: fam });
  } catch (error) {
    console.error('❌ Error obteniendo familiar:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener familiar' });
  }
});

// PUT /api/familiares/:id - actualizar si pertenece al usuario
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const ownerId = req.usuario_id;
    const { id } = req.params;

    const pool = getConnection();
    const [rows] = await pool.query(`SELECT owner_id FROM familiares WHERE familiar_id = ?`, [id]);
    if ((rows as any[]).length === 0) return res.status(404).json({ success: false, message: 'Familiar no encontrado' });
    if ((rows as any[])[0].owner_id !== ownerId) return res.status(403).json({ success: false, message: 'Acceso denegado' });

    const {
      nombre,
      apellido_paterno,
      relacion,
      fecha_nacimiento,
      telefono,
      tipo_sangre,
      puede_agendar,
      puede_ver_historial,
      notas,
      enfermedades_cronicas,
      alergias
    } = req.body;

    // Convertir fecha ISO a formato YYYY-MM-DD
    let fechaFormato = fecha_nacimiento;
    if (fecha_nacimiento && typeof fecha_nacimiento === 'string' && fecha_nacimiento.includes('T')) {
      fechaFormato = fecha_nacimiento.split('T')[0];
    }

    console.log('📤 Actualizando familiar ID:', id);
    console.log('Datos:', { nombre, apellido_paterno, relacion, fecha_nacimiento, fechaFormato });

    await pool.query(
      `UPDATE familiares SET nombre = ?, apellido_paterno = ?, relacion = ?, fecha_nacimiento = ?, telefono = ?, tipo_sangre = ?, puede_agendar = ?, puede_ver_historial = ?, notas = ?, enfermedades_cronicas = ?, alergias = ?, actualizado_en = NOW() WHERE familiar_id = ?`,
      [nombre, apellido_paterno || null, relacion || null, fechaFormato || null, telefono || null, tipo_sangre || null, puede_agendar ? 1 : 0, puede_ver_historial ? 1 : 0, notas || null, enfermedades_cronicas ? JSON.stringify(enfermedades_cronicas) : null, alergias ? JSON.stringify(alergias) : null, id]
    );

    console.log('✅ Familiar actualizado exitosamente');
    return res.status(200).json({ success: true, message: 'Familiar actualizado' });
  } catch (error) {
    console.error('❌ Error actualizando familiar:', error);
    return res.status(500).json({ success: false, message: 'Error al actualizar familiar', error: (error as any).message });
  }
});

// DELETE /api/familiares/:id - eliminar si pertenece al usuario
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const ownerId = req.usuario_id;
    const { id } = req.params;

    const pool = getConnection();
    const [rows] = await pool.query(`SELECT owner_id FROM familiares WHERE familiar_id = ?`, [id]);
    if ((rows as any[]).length === 0) return res.status(404).json({ success: false, message: 'Familiar no encontrado' });
    if ((rows as any[])[0].owner_id !== ownerId) return res.status(403).json({ success: false, message: 'Acceso denegado' });

    await pool.query(`DELETE FROM familiares WHERE familiar_id = ?`, [id]);
    return res.status(200).json({ success: true, message: 'Familiar eliminado' });
  } catch (error) {
    console.error('❌ Error eliminando familiar:', error);
    return res.status(500).json({ success: false, message: 'Error al eliminar familiar' });
  }
});

export default router;
