// backend/routes/facturacion/facturacion.routes.ts
import { Router, Response } from 'express';
import { getConnection } from '../../BD/SQLite/database';
import { AuthRequest, verificarToken } from '../../middleware/auth.middleware';

const router = Router();

console.log('💰 Registrando rutas de facturación con autenticación');
router.use(verificarToken);

// POST - Crear nuevo registro de facturación
router.post('/', async (req: AuthRequest, res: Response) => {
    try {
        console.log('📝 Iniciando creación de factura...');

        const {
            paciente_id,
            consulta_id,
            monto,
            concepto,
            estado,
            fecha_vencimiento
        } = req.body;

        if (!paciente_id || !monto || !concepto) {
            return res.status(400).json({
                message: 'Faltan campos obligatorios: paciente_id, monto, concepto'
            });
        }

        const pool = getConnection();

        const [result] = await pool.query(
            `INSERT INTO facturacion
            (paciente_id, consulta_id, monto, concepto, estado, fecha_vencimiento, creado_en)
            VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [paciente_id, consulta_id, monto, concepto, estado || 'pendiente', fecha_vencimiento]
        );

        console.log('✅ Factura creada con ID:', (result as any).insertId);

        return res.status(201).json({
            message: 'Factura creada exitosamente',
            factura_id: (result as any).insertId
        });

    } catch (error) {
        console.error('❌ Error creando factura:', error);
        return res.status(500).json({
            message: 'Error en el servidor',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
});

// GET - Obtener todas las facturas
router.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const pool = getConnection();

        const [facturas] = await pool.query(
            `SELECT f.*,
                    p.nombre as paciente_nombre,
                    p.email as paciente_email
             FROM facturacion f
             LEFT JOIN usuarios p ON f.paciente_id = p.usuario_id
             ORDER BY f.creado_en DESC`
        );

        console.log('✅ Facturas obtenidas:', (facturas as any[]).length);
        return res.status(200).json(facturas);

    } catch (error) {
        console.error('❌ Error obteniendo facturas:', error);
        return res.status(500).json({
            message: 'Error en el servidor',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
});

// GET - Obtener facturas por paciente
router.get('/paciente/:paciente_id', async (req: AuthRequest, res: Response) => {
    try {
        const { paciente_id } = req.params;
        const pool = getConnection();

        const [facturas] = await pool.query(
            `SELECT f.*,
                    p.nombre as paciente_nombre,
                    p.email as paciente_email
             FROM facturacion f
             LEFT JOIN usuarios p ON f.paciente_id = p.usuario_id
             WHERE f.paciente_id = ?
             ORDER BY f.creado_en DESC`,
            [paciente_id]
        );

        console.log('✅ Facturas del paciente obtenidas:', (facturas as any[]).length);
        return res.status(200).json(facturas);

    } catch (error) {
        console.error('❌ Error:', error);
        return res.status(500).json({ message: 'Error en el servidor' });
    }
});

// GET - Obtener facturas por estado
router.get('/estado/:estado', async (req: AuthRequest, res: Response) => {
    try {
        const { estado } = req.params;
        const pool = getConnection();

        const [facturas] = await pool.query(
            `SELECT f.*,
                    p.nombre as paciente_nombre,
                    p.email as paciente_email
             FROM facturacion f
             LEFT JOIN usuarios p ON f.paciente_id = p.usuario_id
             WHERE f.estado = ?
             ORDER BY f.creado_en DESC`,
            [estado]
        );

        console.log('✅ Facturas por estado obtenidas:', (facturas as any[]).length);
        return res.status(200).json(facturas);

    } catch (error) {
        console.error('❌ Error:', error);
        return res.status(500).json({ message: 'Error en el servidor' });
    }
});

// GET - Obtener facturas pendientes
router.get('/pendientes/all', async (req: AuthRequest, res: Response) => {
    try {
        const pool = getConnection();

        const [facturas] = await pool.query(
            `SELECT f.*,
                    p.nombre as paciente_nombre,
                    p.email as paciente_email
             FROM facturacion f
             LEFT JOIN usuarios p ON f.paciente_id = p.usuario_id
             WHERE f.estado = 'pendiente'
             ORDER BY f.fecha_vencimiento ASC`
        );

        console.log('✅ Facturas pendientes obtenidas:', (facturas as any[]).length);
        return res.status(200).json(facturas);

    } catch (error) {
        console.error('❌ Error:', error);
        return res.status(500).json({ message: 'Error en el servidor' });
    }
});

// GET - Obtener factura por ID
router.get('/:factura_id', async (req: AuthRequest, res: Response) => {
    try {
        const { factura_id } = req.params;
        const pool = getConnection();

        const [facturas] = await pool.query(
            `SELECT f.*,
                    p.nombre as paciente_nombre,
                    p.email as paciente_email
             FROM facturacion f
             LEFT JOIN usuarios p ON f.paciente_id = p.usuario_id
             WHERE f.factura_id = ?`,
            [factura_id]
        );

        if ((facturas as any[]).length === 0) {
            return res.status(404).json({ message: 'Factura no encontrada' });
        }

        return res.status(200).json((facturas as any[])[0]);

    } catch (error) {
        console.error('❌ Error:', error);
        return res.status(500).json({ message: 'Error en el servidor' });
    }
});

// PUT - Actualizar factura
router.put('/:factura_id', async (req: AuthRequest, res: Response) => {
    try {
        const { factura_id } = req.params;
        const { monto, concepto, estado, fecha_vencimiento } = req.body;

        const pool = getConnection();

        const [result] = await pool.query(
            `UPDATE facturacion
             SET monto = COALESCE(?, monto),
                 concepto = COALESCE(?, concepto),
                 estado = COALESCE(?, estado),
                 fecha_vencimiento = COALESCE(?, fecha_vencimiento)
             WHERE factura_id = ?`,
            [monto, concepto, estado, fecha_vencimiento, factura_id]
        );

        if ((result as any).affectedRows === 0) {
            return res.status(404).json({ message: 'Factura no encontrada' });
        }

        console.log('✅ Factura actualizada');
        return res.status(200).json({ message: 'Factura actualizada exitosamente' });

    } catch (error) {
        console.error('❌ Error:', error);
        return res.status(500).json({ message: 'Error en el servidor' });
    }
});

// PUT - Actualizar estado de factura
router.put('/:factura_id/estado', async (req: AuthRequest, res: Response) => {
    try {
        const { factura_id } = req.params;
        const { estado } = req.body;

        if (!estado) {
            return res.status(400).json({ message: 'El estado es obligatorio' });
        }

        // Validar que el estado sea válido
        const estadosValidos = ['pendiente', 'pagada', 'cancelada'];
        if (!estadosValidos.includes(estado)) {
            return res.status(400).json({
                message: `Estado inválido. Estados válidos: ${estadosValidos.join(', ')}`
            });
        }

        const pool = getConnection();

        const [result] = await pool.query(
            'UPDATE facturacion SET estado = ? WHERE factura_id = ?',
            [estado, factura_id]
        );

        if ((result as any).affectedRows === 0) {
            return res.status(404).json({ message: 'Factura no encontrada' });
        }

        console.log('✅ Estado de factura actualizado a:', estado);
        return res.status(200).json({ message: 'Estado actualizado exitosamente' });

    } catch (error) {
        console.error('❌ Error:', error);
        return res.status(500).json({ message: 'Error en el servidor' });
    }
});

// DELETE - Eliminar factura
router.delete('/:factura_id', async (req: AuthRequest, res: Response) => {
    try {
        const { factura_id } = req.params;
        const pool = getConnection();

        const [result] = await pool.query(
            'DELETE FROM facturacion WHERE factura_id = ?',
            [factura_id]
        );

        if ((result as any).affectedRows === 0) {
            return res.status(404).json({ message: 'Factura no encontrada' });
        }

        console.log('✅ Factura eliminada');
        return res.status(200).json({ message: 'Factura eliminada exitosamente' });

    } catch (error) {
        console.error('❌ Error:', error);
        return res.status(500).json({ message: 'Error en el servidor' });
    }
});

export default router;
