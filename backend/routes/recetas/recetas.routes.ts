import { Router, Request, Response } from 'express';
import { getConnection } from '../../BD/SQLite/database';
import { verificarToken, AuthRequest } from '../../middleware/auth.middleware';
import { RowDataPacket } from 'mysql2';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configuración de Multer para subida de fotos
const uploadsDir = path.join(__dirname, '../../uploads/recetas');

// Crear directorio si no existe
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    cb(null, `receta_${timestamp}${extension}`);
  }
});

const fileFilter = (req: any, file: any, cb: any) => {
  // Solo permitir imágenes
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos de imagen'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: fileFilter
});

// ============== CREAR RECETA CON FOTO (Solo médicos) ==============
router.post('/con-foto', verificarToken, upload.single('foto_receta'), async (req: AuthRequest, res: Response) => {
  try {
    const {
      paciente_id,
      cita_id,
      medicamentos,
      instrucciones,
      observaciones,
      dias_validez = 30,
      codigo_medico,
      firma_digital
    } = req.body;

    // Verificar que el usuario es médico
    if (req.rol_id !== 3) {
      return res.status(403).json({ message: 'Solo los médicos pueden crear recetas' });
    }

    // Validar código médico
    if (!codigo_medico) {
      return res.status(400).json({ message: 'Código médico requerido' });
    }

    // Generar código único de validación
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    const codigo_validacion = `RX-${timestamp.substr(-6)}-${random}`;

    const pool = getConnection();

    // Calcular fecha de vencimiento
    const fecha_emision = new Date();
    const fecha_vencimiento = new Date();
    fecha_vencimiento.setDate(fecha_vencimiento.getDate() + parseInt(dias_validez));

    // Obtener ruta de la foto si se subió
    const foto_receta = req.file ? `/uploads/recetas/${req.file.filename}` : null;

    // Insertar receta principal con foto
    const [recetaResult] = await pool.query(`
      INSERT INTO recetas (
        medico_id, paciente_id, cita_id, codigo_validacion,
        instrucciones, observaciones, dias_validez,
        fecha_emision, fecha_vencimiento, estado,
        foto_receta, codigo_medico, firma_digital
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', ?, ?, ?)
    `, [
      req.usuario_id, paciente_id, cita_id, codigo_validacion,
      instrucciones, observaciones, dias_validez,
      fecha_emision, fecha_vencimiento,
      foto_receta, codigo_medico, firma_digital
    ]);

    const receta_id = (recetaResult as any).insertId;

    // Insertar medicamentos
    const medicamentosArray = JSON.parse(medicamentos);
    for (const med of medicamentosArray) {
      await pool.query(`
        INSERT INTO receta_medicamentos (
          receta_id, nombre, concentracion, forma_farmaceutica,
          cantidad, via_administracion, frecuencia, duracion, indicaciones_especiales
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        receta_id, med.nombre, med.concentracion, med.forma_farmaceutica,
        med.cantidad, med.via_administracion, med.frecuencia, med.duracion,
        med.indicaciones_especiales
      ]);
    }

    res.status(201).json({
      message: 'Receta creada exitosamente con foto',
      receta_id,
      codigo_validacion,
      foto_receta,
      autenticacion_medica: {
        codigo_medico,
        firma_digital,
        timestamp: fecha_emision
      }
    });

  } catch (error) {
    console.error('Error al crear receta con foto:', error);

    // Eliminar archivo subido si hubo error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error al eliminar archivo:', unlinkError);
      }
    }

    res.status(500).json({
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido',
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
    });
  }
});

// ============== CREAR RECETA (Solo médicos) ==============
router.post('/', verificarToken, async (req: AuthRequest, res: Response) => {
  try {
    console.log('📥 Datos recibidos en POST /recetas:', req.body);
    const { paciente_id, cita_id, medicamentos, instrucciones, observaciones, dias_validez = 30 } = req.body;

    // Verificar que el usuario es médico
    if (req.rol_id !== 3) {
      return res.status(403).json({ message: 'Solo los médicos pueden crear recetas' });
    }

    // Generar código único de validación
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    const codigo_validacion = `RX-${timestamp.substr(-6)}-${random}`;

    const pool = getConnection();

    // Calcular fecha de vencimiento
    const fecha_emision = new Date();
    const fecha_vencimiento = new Date();
    fecha_vencimiento.setDate(fecha_vencimiento.getDate() + parseInt(dias_validez));

    // Insertar receta principal
    const [recetaResult] = await pool.query(`
      INSERT INTO recetas (
        medico_id, paciente_id, cita_id, instrucciones, observaciones,
        fecha_emision, fecha_vencimiento, estado, codigo_validacion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'activa', ?)
    `, [
      req.usuario_id, paciente_id, cita_id || null, instrucciones, observaciones || null,
      fecha_emision, fecha_vencimiento, codigo_validacion
    ]);

    const receta_id = (recetaResult as any).insertId;

    // Insertar medicamentos
    for (const medicamento of medicamentos) {
      await pool.query(`
        INSERT INTO receta_medicamentos (
          receta_id, nombre, concentracion, forma_farmaceutica,
          cantidad, via_administracion, frecuencia, duracion, indicaciones_especiales
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        receta_id, medicamento.nombre, medicamento.concentracion,
        medicamento.forma_farmaceutica, medicamento.cantidad,
        medicamento.via_administracion, medicamento.frecuencia,
        medicamento.duracion, medicamento.indicaciones_especiales || null
      ]);
    }

    // Obtener receta completa
    const [recetas] = await pool.query(`
      SELECT r.*, u.nombre as medico_nombre, p.nombre as paciente_nombre
      FROM recetas r
      LEFT JOIN usuarios u ON r.medico_id = u.usuario_id
      LEFT JOIN usuarios p ON r.paciente_id = p.usuario_id
      WHERE r.id = ?
    `, [receta_id]);

    const receta = (recetas as RowDataPacket[])[0];

    // Obtener medicamentos
    const [medicamentosResult] = await pool.query(`
      SELECT * FROM receta_medicamentos WHERE receta_id = ?
    `, [receta_id]);

    receta.medicamentos = medicamentosResult;

    console.log(`✅ Receta creada: ${codigo_validacion}`);
    res.status(201).json(receta);

  } catch (error) {
    console.error('❌ Error creando receta:', error);
    res.status(500).json({ 
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido',
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
    });
  }
});

// ============== OBTENER RECETAS DEL MÉDICO ==============
router.get('/medico', verificarToken, async (req: AuthRequest, res: Response) => {
  try {
    if (req.rol_id !== 3) {
      return res.status(403).json({ message: 'Solo los médicos pueden ver sus recetas' });
    }

    const pool = getConnection();
    const [recetas] = await pool.query(`
      SELECT r.*, u.nombre as medico_nombre, p.nombre as paciente_nombre
      FROM recetas r
      LEFT JOIN usuarios u ON r.medico_id = u.usuario_id
      LEFT JOIN usuarios p ON r.paciente_id = p.usuario_id
      WHERE r.medico_id = ?
      ORDER BY r.fecha_emision DESC
    `, [req.usuario_id]);

    // Obtener medicamentos para cada receta
    for (let receta of recetas as RowDataPacket[]) {
      const [medicamentos] = await pool.query(`
        SELECT * FROM receta_medicamentos WHERE receta_id = ?
      `, [receta.id]);
      receta.medicamentos = medicamentos;
    }

    res.json(recetas);

  } catch (error) {
    console.error('❌ Error obteniendo recetas del médico:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ============== OBTENER RECETAS DEL PACIENTE ==============
router.get('/paciente', verificarToken, async (req: AuthRequest, res: Response) => {
  try {
    if (req.rol_id !== 2) {
      return res.status(403).json({ message: 'Solo los pacientes pueden ver sus recetas' });
    }

    const pool = getConnection();
    const [recetas] = await pool.query(`
      SELECT r.*, u.nombre as medico_nombre, p.nombre as paciente_nombre
      FROM recetas r
      LEFT JOIN usuarios u ON r.medico_id = u.usuario_id
      LEFT JOIN usuarios p ON r.paciente_id = p.usuario_id
      WHERE r.paciente_id = ?
      ORDER BY r.fecha_emision DESC
    `, [req.usuario_id]);

    // Obtener medicamentos para cada receta
    for (let receta of recetas as RowDataPacket[]) {
      const [medicamentos] = await pool.query(`
        SELECT * FROM receta_medicamentos WHERE receta_id = ?
      `, [receta.id]);
      receta.medicamentos = medicamentos;
    }

    res.json(recetas);

  } catch (error) {
    console.error('❌ Error obteniendo recetas del paciente:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ============== VALIDAR RECETA (Público para farmacias) ==============
router.get('/validar/:codigo', async (req: Request, res: Response) => {
  try {
    const { codigo } = req.params;

    const pool = getConnection();
    const [recetas] = await pool.query(`
      SELECT r.*, u.nombre as medico_nombre, p.nombre as paciente_nombre
      FROM recetas r
      LEFT JOIN usuarios u ON r.medico_id = u.usuario_id
      LEFT JOIN usuarios p ON r.paciente_id = p.usuario_id
      WHERE r.codigo_validacion = ?
    `, [codigo]);

    if ((recetas as RowDataPacket[]).length === 0) {
      return res.json({
        valida: false,
        razon_invalidez: 'Código de receta no encontrado'
      });
    }

    const receta = (recetas as RowDataPacket[])[0];
    const ahora = new Date();
    const vencimiento = new Date(receta.fecha_vencimiento);

    // Verificar estado
    if (receta.estado === 'utilizada') {
      return res.json({
        valida: false,
        razon_invalidez: 'Esta receta ya ha sido utilizada'
      });
    }

    if (receta.estado === 'cancelada') {
      return res.json({
        valida: false,
        razon_invalidez: 'Esta receta ha sido cancelada por el médico'
      });
    }

    if (ahora > vencimiento) {
      // Actualizar estado a vencida
      await pool.query(`
        UPDATE recetas SET estado = 'vencida' WHERE id = ?
      `, [receta.id]);

      return res.json({
        valida: false,
        razon_invalidez: 'Esta receta ha vencido'
      });
    }

    // Obtener medicamentos
    const [medicamentos] = await pool.query(`
      SELECT * FROM receta_medicamentos WHERE receta_id = ?
    `, [receta.id]);

    receta.medicamentos = medicamentos;

    res.json({
      valida: true,
      receta: receta
    });

  } catch (error) {
    console.error('❌ Error validando receta:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ============== UTILIZAR RECETA (Público para farmacias) ==============
router.post('/utilizar/:codigo', async (req: Request, res: Response) => {
  try {
    const { codigo } = req.params;
    const { nombre_farmacia, farmaceutico_responsable, observaciones } = req.body;

    const pool = getConnection();

    // Verificar que la receta existe y está activa
    const [recetas] = await pool.query(`
      SELECT * FROM recetas WHERE codigo_validacion = ? AND estado = 'activa'
    `, [codigo]);

    if ((recetas as RowDataPacket[]).length === 0) {
      return res.status(404).json({ message: 'Receta no encontrada o no disponible' });
    }

    const receta = (recetas as RowDataPacket[])[0];
    const ahora = new Date();
    const vencimiento = new Date(receta.fecha_vencimiento);

    if (ahora > vencimiento) {
      return res.status(400).json({ message: 'La receta ha vencido' });
    }

    // Marcar como utilizada
    await pool.query(`
      UPDATE recetas
      SET estado = 'utilizada',
          farmacia_utilizada = ?,
          farmaceutico_responsable = ?,
          fecha_utilizacion = ?,
          observaciones_farmacia = ?
      WHERE id = ?
    `, [nombre_farmacia, farmaceutico_responsable, ahora, observaciones || null, receta.id]);

    console.log(`✅ Receta utilizada: ${codigo} en ${nombre_farmacia}`);
    res.json({ message: 'Receta dispensada exitosamente' });

  } catch (error) {
    console.error('❌ Error utilizando receta:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ============== CANCELAR RECETA (Solo médicos) ==============
router.put('/:id/cancelar', verificarToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    if (req.rol_id !== 3) {
      return res.status(403).json({ message: 'Solo los médicos pueden cancelar recetas' });
    }

    const pool = getConnection();

    // Verificar que la receta pertenece al médico
    const [recetas] = await pool.query(`
      SELECT * FROM recetas WHERE id = ? AND medico_id = ?
    `, [id, req.usuario_id]);

    if ((recetas as RowDataPacket[]).length === 0) {
      return res.status(404).json({ message: 'Receta no encontrada' });
    }

    const receta = (recetas as RowDataPacket[])[0];

    if (receta.estado === 'utilizada') {
      return res.status(400).json({ message: 'No se puede cancelar una receta ya utilizada' });
    }

    // Cancelar receta
    await pool.query(`
      UPDATE recetas
      SET estado = 'cancelada',
          motivo_cancelacion = ?,
          fecha_cancelacion = ?
      WHERE id = ?
    `, [motivo, new Date(), id]);

    console.log(`✅ Receta cancelada: ${id}`);
    res.json({ message: 'Receta cancelada exitosamente' });

  } catch (error) {
    console.error('❌ Error cancelando receta:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

export default router;
