// backend/routes/pruebas-medicas/pruebas-medicas.routes.ts
import { Router, Response } from 'express';
import { getConnection } from '../../BD/SQLite/database';
import { AuthRequest, verificarToken } from '../../middleware/auth.middleware';

const router = Router();

console.log('🔬 Registrando rutas de pruebas médicas con autenticación');
router.use(verificarToken);

// POST - Crear nueva prueba médica
router.post('/', async (req: AuthRequest, res: Response) => {
    try {
        console.log('📝 Iniciando creación de prueba médica...');

        const {
            paciente_id,
            medico_id,
            tipo_prueba,
            descripcion,
            resultado,
            estado
        } = req.body;

        if (!paciente_id || !tipo_prueba) {
            return res.status(400).json({
                message: 'Faltan campos obligatorios: paciente_id, tipo_prueba'
            });
        }

        const pool = getConnection();

        const [result] = await pool.query(
            `INSERT INTO pruebas_medicas
            (paciente_id, medico_id, tipo_prueba, descripcion, resultado, estado, creado_en)
            VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [paciente_id, medico_id, tipo_prueba, descripcion, resultado, estado || 'pendiente']
        );

        console.log('✅ Prueba médica creada con ID:', (result as any).insertId);

        return res.status(201).json({
            message: 'Prueba médica creada exitosamente',
            prueba_id: (result as any).insertId
        });

    } catch (error) {
        console.error('❌ Error creando prueba médica:', error);
        return res.status(500).json({
            message: 'Error en el servidor',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
});

// GET - Obtener todas las pruebas médicas
router.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const pool = getConnection();

        const [pruebas] = await pool.query(
            `SELECT pm.*,
                    p.nombre as paciente_nombre,
                    d.nombre as medico_nombre
             FROM pruebas_medicas pm
             LEFT JOIN usuarios p ON pm.paciente_id = p.usuario_id
             LEFT JOIN usuarios d ON pm.medico_id = d.usuario_id
             ORDER BY pm.creado_en DESC`
        );

        console.log('✅ Pruebas médicas obtenidas:', (pruebas as any[]).length);
        return res.status(200).json(pruebas);

    } catch (error) {
        console.error('❌ Error obteniendo pruebas médicas:', error);
        return res.status(500).json({
            message: 'Error en el servidor',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
});

// GET - Obtener pruebas médicas por paciente
router.get('/paciente/:paciente_id', async (req: AuthRequest, res: Response) => {
    try {
        const { paciente_id } = req.params;
        const pool = getConnection();

        const [pruebas] = await pool.query(
            `SELECT pm.*,
                    p.nombre as paciente_nombre,
                    d.nombre as medico_nombre
             FROM pruebas_medicas pm
             LEFT JOIN usuarios p ON pm.paciente_id = p.usuario_id
             LEFT JOIN usuarios d ON pm.medico_id = d.usuario_id
             WHERE pm.paciente_id = ?
             ORDER BY pm.creado_en DESC`,
            [paciente_id]
        );

        console.log('✅ Pruebas del paciente obtenidas:', (pruebas as any[]).length);
        return res.status(200).json(pruebas);

    } catch (error) {
        console.error('❌ Error:', error);
        return res.status(500).json({ message: 'Error en el servidor' });
    }
});

// GET - Obtener pruebas médicas por tipo
router.get('/tipo/:tipo', async (req: AuthRequest, res: Response) => {
    try {
        const { tipo } = req.params;
        const pool = getConnection();

        const [pruebas] = await pool.query(
            `SELECT pm.*,
                    p.nombre as paciente_nombre,
                    d.nombre as medico_nombre
             FROM pruebas_medicas pm
             LEFT JOIN usuarios p ON pm.paciente_id = p.usuario_id
             LEFT JOIN usuarios d ON pm.medico_id = d.usuario_id
             WHERE pm.tipo_prueba = ?
             ORDER BY pm.creado_en DESC`,
            [tipo]
        );

        console.log('✅ Pruebas por tipo obtenidas:', (pruebas as any[]).length);
        return res.status(200).json(pruebas);

    } catch (error) {
        console.error('❌ Error:', error);
        return res.status(500).json({ message: 'Error en el servidor' });
    }
});

// GET - Obtener pruebas médicas por estado
router.get('/estado/:estado', async (req: AuthRequest, res: Response) => {
    try {
        const { estado } = req.params;
        const pool = getConnection();

        const [pruebas] = await pool.query(
            `SELECT pm.*,
                    p.nombre as paciente_nombre,
                    d.nombre as medico_nombre
             FROM pruebas_medicas pm
             LEFT JOIN usuarios p ON pm.paciente_id = p.usuario_id
             LEFT JOIN usuarios d ON pm.medico_id = d.usuario_id
             WHERE pm.estado = ?
             ORDER BY pm.creado_en DESC`,
            [estado]
        );

        console.log('✅ Pruebas por estado obtenidas:', (pruebas as any[]).length);
        return res.status(200).json(pruebas);

    } catch (error) {
        console.error('❌ Error:', error);
        return res.status(500).json({ message: 'Error en el servidor' });
    }
});

// GET - Obtener prueba médica por ID
router.get('/:prueba_id', async (req: AuthRequest, res: Response) => {
    try {
        const { prueba_id } = req.params;
        const pool = getConnection();

        const [pruebas] = await pool.query(
            `SELECT pm.*,
                    p.nombre as paciente_nombre,
                    d.nombre as medico_nombre
             FROM pruebas_medicas pm
             LEFT JOIN usuarios p ON pm.paciente_id = p.usuario_id
             LEFT JOIN usuarios d ON pm.medico_id = d.usuario_id
             WHERE pm.prueba_id = ?`,
            [prueba_id]
        );

        if ((pruebas as any[]).length === 0) {
            return res.status(404).json({ message: 'Prueba médica no encontrada' });
        }

        return res.status(200).json((pruebas as any[])[0]);

    } catch (error) {
        console.error('❌ Error:', error);
        return res.status(500).json({ message: 'Error en el servidor' });
    }
});

// PUT - Actualizar prueba médica
router.put('/:prueba_id', async (req: AuthRequest, res: Response) => {
    try {
        const { prueba_id } = req.params;
        const { tipo_prueba, descripcion, resultado, estado } = req.body;

        const pool = getConnection();

        const [result] = await pool.query(
            `UPDATE pruebas_medicas
             SET tipo_prueba = COALESCE(?, tipo_prueba),
                 descripcion = COALESCE(?, descripcion),
                 resultado = COALESCE(?, resultado),
                 estado = COALESCE(?, estado)
             WHERE prueba_id = ?`,
            [tipo_prueba, descripcion, resultado, estado, prueba_id]
        );

        if ((result as any).affectedRows === 0) {
            return res.status(404).json({ message: 'Prueba médica no encontrada' });
        }

        console.log('✅ Prueba médica actualizada');
        return res.status(200).json({ message: 'Prueba médica actualizada exitosamente' });

    } catch (error) {
        console.error('❌ Error:', error);
        return res.status(500).json({ message: 'Error en el servidor' });
    }
});

// PUT - Actualizar estado de prueba
router.put('/:prueba_id/estado', async (req: AuthRequest, res: Response) => {
    try {
        const { prueba_id } = req.params;
        const { estado } = req.body;

        if (!estado) {
            return res.status(400).json({ message: 'El estado es obligatorio' });
        }

        const pool = getConnection();

        const [result] = await pool.query(
            'UPDATE pruebas_medicas SET estado = ? WHERE prueba_id = ?',
            [estado, prueba_id]
        );

        if ((result as any).affectedRows === 0) {
            return res.status(404).json({ message: 'Prueba médica no encontrada' });
        }

        console.log('✅ Estado de prueba actualizado');
        return res.status(200).json({ message: 'Estado actualizado exitosamente' });

    } catch (error) {
        console.error('❌ Error:', error);
        return res.status(500).json({ message: 'Error en el servidor' });
    }
});

// DELETE - Eliminar prueba médica
router.delete('/:prueba_id', async (req: AuthRequest, res: Response) => {
    try {
        const { prueba_id } = req.params;
        const pool = getConnection();

        const [result] = await pool.query(
            'DELETE FROM pruebas_medicas WHERE prueba_id = ?',
            [prueba_id]
        );

        if ((result as any).affectedRows === 0) {
            return res.status(404).json({ message: 'Prueba médica no encontrada' });
        }

        console.log('✅ Prueba médica eliminada');
        return res.status(200).json({ message: 'Prueba médica eliminada exitosamente' });

    } catch (error) {
        console.error('❌ Error:', error);
        return res.status(500).json({ message: 'Error en el servidor' });
    }
});

export default router;
