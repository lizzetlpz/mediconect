// backend/routes/prescripciones/prescripciones.routes.ts
import { Router, Response } from 'express';
import { getConnection } from '../../BD/SQLite/database';
import { AuthRequest, verificarToken } from '../../middleware/auth.middleware';

const router = Router();

console.log('💊 Registrando rutas de prescripciones con autenticación');
router.use(verificarToken);

// POST - Crear nueva prescripción
router.post('/', async (req: AuthRequest, res: Response) => {
    try {
        console.log('📝 Iniciando creación de prescripción...');

        const {
            consulta_id,
            paciente_id,
            medico_id,
            medicamentos,
            notas,
            expira_en
        } = req.body;

        if (!paciente_id || !medico_id || !medicamentos) {
            return res.status(400).json({
                message: 'Faltan campos obligatorios: paciente_id, medico_id, medicamentos'
            });
        }

        const pool = getConnection();

        const [result] = await pool.query(
            `INSERT INTO prescripciones
            (consulta_id, paciente_id, medico_id, medicamentos, notas, expira_en, creado_en)
            VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [consulta_id, paciente_id, medico_id, JSON.stringify(medicamentos), notas, expira_en]
        );

        console.log('✅ Prescripción creada con ID:', (result as any).insertId);

        return res.status(201).json({
            message: 'Prescripción creada exitosamente',
            prescripcion_id: (result as any).insertId
        });

    } catch (error) {
        console.error('❌ Error creando prescripción:', error);
        return res.status(500).json({
            message: 'Error en el servidor',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
});

// GET - Obtener todas las prescripciones
router.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const pool = getConnection();

        const [prescripciones] = await pool.query(
            `SELECT pr.*,
                    p.nombre as paciente_nombre,
                    d.nombre as medico_nombre
             FROM prescripciones pr
             LEFT JOIN usuarios p ON pr.paciente_id = p.usuario_id
             LEFT JOIN usuarios d ON pr.medico_id = d.usuario_id
             ORDER BY pr.creado_en DESC`
        );

        console.log('✅ Prescripciones obtenidas:', (prescripciones as any[]).length);
        return res.status(200).json(prescripciones);

    } catch (error) {
        console.error('❌ Error obteniendo prescripciones:', error);
        return res.status(500).json({
            message: 'Error en el servidor',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
});

// GET - Obtener prescripciones por paciente
router.get('/paciente/:paciente_id', async (req: AuthRequest, res: Response) => {
    try {
        const { paciente_id } = req.params;
        const pool = getConnection();

        const [prescripciones] = await pool.query(
            `SELECT pr.*,
                    p.nombre as paciente_nombre,
                    d.nombre as medico_nombre
             FROM prescripciones pr
             LEFT JOIN usuarios p ON pr.paciente_id = p.usuario_id
             LEFT JOIN usuarios d ON pr.medico_id = d.usuario_id
             WHERE pr.paciente_id = ?
             ORDER BY pr.creado_en DESC`,
            [paciente_id]
        );

        console.log('✅ Prescripciones del paciente obtenidas:', (prescripciones as any[]).length);
        return res.status(200).json(prescripciones);

    } catch (error) {
        console.error('❌ Error:', error);
        return res.status(500).json({ message: 'Error en el servidor' });
    }
});

// GET - Obtener prescripciones por consulta
router.get('/consulta/:consulta_id', async (req: AuthRequest, res: Response) => {
    try {
        const { consulta_id } = req.params;
        const pool = getConnection();

        const [prescripciones] = await pool.query(
            `SELECT pr.*,
                    p.nombre as paciente_nombre,
                    d.nombre as medico_nombre
             FROM prescripciones pr
             LEFT JOIN usuarios p ON pr.paciente_id = p.usuario_id
             LEFT JOIN usuarios d ON pr.medico_id = d.usuario_id
             WHERE pr.consulta_id = ?`,
            [consulta_id]
        );

        console.log('✅ Prescripciones de la consulta obtenidas:', (prescripciones as any[]).length);
        return res.status(200).json(prescripciones);

    } catch (error) {
        console.error('❌ Error:', error);
        return res.status(500).json({ message: 'Error en el servidor' });
    }
});

// GET - Obtener prescripción por ID
router.get('/:prescripcion_id', async (req: AuthRequest, res: Response) => {
    try {
        const { prescripcion_id } = req.params;
        const pool = getConnection();

        const [prescripciones] = await pool.query(
            `SELECT pr.*,
                    p.nombre as paciente_nombre,
                    d.nombre as medico_nombre
             FROM prescripciones pr
             LEFT JOIN usuarios p ON pr.paciente_id = p.usuario_id
             LEFT JOIN usuarios d ON pr.medico_id = d.usuario_id
             WHERE pr.prescripcion_id = ?`,
            [prescripcion_id]
        );

        if ((prescripciones as any[]).length === 0) {
            return res.status(404).json({ message: 'Prescripción no encontrada' });
        }

        return res.status(200).json((prescripciones as any[])[0]);

    } catch (error) {
        console.error('❌ Error:', error);
        return res.status(500).json({ message: 'Error en el servidor' });
    }
});

// PUT - Actualizar prescripción
router.put('/:prescripcion_id', async (req: AuthRequest, res: Response) => {
    try {
        const { prescripcion_id } = req.params;
        const { medicamentos, notas, expira_en } = req.body;

        const pool = getConnection();

        const [result] = await pool.query(
            `UPDATE prescripciones
             SET medicamentos = COALESCE(?, medicamentos),
                 notas = COALESCE(?, notas),
                 expira_en = COALESCE(?, expira_en)
             WHERE prescripcion_id = ?`,
            [medicamentos ? JSON.stringify(medicamentos) : null, notas, expira_en, prescripcion_id]
        );

        if ((result as any).affectedRows === 0) {
            return res.status(404).json({ message: 'Prescripción no encontrada' });
        }

        console.log('✅ Prescripción actualizada');
        return res.status(200).json({ message: 'Prescripción actualizada exitosamente' });

    } catch (error) {
        console.error('❌ Error:', error);
        return res.status(500).json({ message: 'Error en el servidor' });
    }
});

// DELETE - Eliminar prescripción
router.delete('/:prescripcion_id', async (req: AuthRequest, res: Response) => {
    try {
        const { prescripcion_id } = req.params;
        const pool = getConnection();

        const [result] = await pool.query(
            'DELETE FROM prescripciones WHERE prescripcion_id = ?',
            [prescripcion_id]
        );

        if ((result as any).affectedRows === 0) {
            return res.status(404).json({ message: 'Prescripción no encontrada' });
        }

        console.log('✅ Prescripción eliminada');
        return res.status(200).json({ message: 'Prescripción eliminada exitosamente' });

    } catch (error) {
        console.error('❌ Error:', error);
        return res.status(500).json({ message: 'Error en el servidor' });
    }
});

export default router;
