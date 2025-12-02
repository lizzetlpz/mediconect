// backend/routes/consultas/consultas.routes.ts
import { Router, Response } from 'express';
import { getConnection } from '../../BD/SQLite/database';
import { AuthRequest, verificarToken } from '../../middleware/auth.middleware';

const router = Router();

console.log('📋 Registrando rutas de consultas con autenticación');
router.use(verificarToken);

// POST - Crear nueva consulta
router.post('/', async (req: AuthRequest, res: Response) => {
    try {
        console.log('📝 Iniciando creación de consulta...');

        const {
            doctor_id,
            paciente_id,
            tipo,
            estado,
            titulo,
            descripcion,
            programada_en
        } = req.body;

        if (!paciente_id || !doctor_id) {
            return res.status(400).json({
                message: 'Faltan campos obligatorios: paciente_id, doctor_id'
            });
        }

        const pool = getConnection();

        const [result] = await pool.query(
            `INSERT INTO consultas
            (doctor_id, paciente_id, tipo, estado, titulo, descripcion, programada_en, creado_en)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
            [doctor_id, paciente_id, tipo || 'videollamada', estado || 'programada', titulo || '', descripcion || '', programada_en]
        );

        console.log('✅ Consulta creada con ID:', (result as any).insertId);

        return res.status(201).json({
            message: 'Consulta creada exitosamente',
            consulta_id: (result as any).insertId
        });

    } catch (error) {
        console.error('❌ Error creando consulta:', error);
        return res.status(500).json({
            message: 'Error en el servidor',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
});

// GET - Obtener todas las consultas
router.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const pool = getConnection();

        const [consultas] = await pool.query(
            `SELECT c.*,
                    p.nombre as paciente_nombre,
                    p.apellido_paterno as paciente_apellido,
                    d.nombre as medico_nombre,
                    d.apellido_paterno as medico_apellido
             FROM consultas c
             LEFT JOIN usuarios p ON c.paciente_id = p.usuario_id
             LEFT JOIN usuarios d ON c.doctor_id = d.usuario_id
             ORDER BY c.creado_en DESC`
        );

        console.log('✅ Consultas obtenidas:', (consultas as any[]).length);
        return res.status(200).json(consultas);

    } catch (error) {
        console.error('❌ Error obteniendo consultas:', error);
        return res.status(500).json({
            message: 'Error en el servidor',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
});

// GET - Obtener consultas por paciente
router.get('/paciente/:paciente_id', async (req: AuthRequest, res: Response) => {
    try {
        const { paciente_id } = req.params;
        const pool = getConnection();

        const [consultas] = await pool.query(
            `SELECT c.*,
                    p.nombre as paciente_nombre,
                    d.nombre as medico_nombre
             FROM consultas c
             LEFT JOIN usuarios p ON c.paciente_id = p.usuario_id
             LEFT JOIN usuarios d ON c.medico_id = d.usuario_id
             WHERE c.paciente_id = ?
             ORDER BY c.fecha_cita DESC`,
            [paciente_id]
        );

        console.log('✅ Consultas del paciente obtenidas:', (consultas as any[]).length);
        return res.status(200).json(consultas);

    } catch (error) {
        console.error('❌ Error:', error);
        return res.status(500).json({ message: 'Error en el servidor' });
    }
});

// GET - Obtener consultas por doctor
router.get('/doctor/:doctor_id', async (req: AuthRequest, res: Response) => {
    try {
        const { doctor_id } = req.params;
        const pool = getConnection();

        const [consultas] = await pool.query(
            `SELECT c.*,
                    p.nombre as paciente_nombre,
                    d.nombre as medico_nombre
             FROM consultas c
             LEFT JOIN usuarios p ON c.paciente_id = p.usuario_id
             LEFT JOIN usuarios d ON c.doctor_id = d.usuario_id
             WHERE c.doctor_id = ?
             ORDER BY c.creado_en DESC`,
            [doctor_id]
        );

        console.log('✅ Consultas del doctor obtenidas:', (consultas as any[]).length);
        return res.status(200).json(consultas);

    } catch (error) {
        console.error('❌ Error:', error);
        return res.status(500).json({ message: 'Error en el servidor' });
    }
});

// GET - Obtener consulta por ID
router.get('/:consulta_id', async (req: AuthRequest, res: Response) => {
    try {
        const { consulta_id } = req.params;
        const pool = getConnection();

        const [consultas] = await pool.query(
            `SELECT c.*,
                    p.nombre as paciente_nombre,
                    d.nombre as medico_nombre
             FROM consultas c
             LEFT JOIN usuarios p ON c.paciente_id = p.usuario_id
             LEFT JOIN usuarios d ON c.medico_id = d.usuario_id
             WHERE c.consulta_id = ?`,
            [consulta_id]
        );

        if ((consultas as any[]).length === 0) {
            return res.status(404).json({ message: 'Consulta no encontrada' });
        }

        return res.status(200).json((consultas as any[])[0]);

    } catch (error) {
        console.error('❌ Error:', error);
        return res.status(500).json({ message: 'Error en el servidor' });
    }
});

// PUT - Actualizar consulta
router.put('/:consulta_id', async (req: AuthRequest, res: Response) => {
    try {
        const { consulta_id } = req.params;
        const { tipo, estado, titulo, descripcion, programada_en } = req.body;

        const pool = getConnection();

        const [result] = await pool.query(
            `UPDATE consultas
             SET tipo = COALESCE(?, tipo),
                 estado = COALESCE(?, estado),
                 titulo = COALESCE(?, titulo),
                 descripcion = COALESCE(?, descripcion),
                 programada_en = COALESCE(?, programada_en)
             WHERE consulta_id = ?`,
            [tipo, estado, titulo, descripcion, programada_en, consulta_id]
        );

        if ((result as any).affectedRows === 0) {
            return res.status(404).json({ message: 'Consulta no encontrada' });
        }

        console.log('✅ Consulta actualizada');
        return res.status(200).json({ message: 'Consulta actualizada exitosamente' });

    } catch (error) {
        console.error('❌ Error:', error);
        return res.status(500).json({ message: 'Error en el servidor' });
    }
});

// DELETE - Eliminar consulta
router.delete('/:consulta_id', async (req: AuthRequest, res: Response) => {
    try {
        const { consulta_id } = req.params;
        const pool = getConnection();

        const [result] = await pool.query(
            'DELETE FROM consultas WHERE consulta_id = ?',
            [consulta_id]
        );

        if ((result as any).affectedRows === 0) {
            return res.status(404).json({ message: 'Consulta no encontrada' });
        }

        console.log('✅ Consulta eliminada');
        return res.status(200).json({ message: 'Consulta eliminada exitosamente' });

    } catch (error) {
        console.error('❌ Error:', error);
        return res.status(500).json({ message: 'Error en el servidor' });
    }
});

export default router;
