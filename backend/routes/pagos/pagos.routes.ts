import { Router, Response } from 'express';
import { getConnection } from '../../BD/SQLite/database';
import { AuthRequest, verificarToken } from '../../middleware/auth.middleware';
import { FacturaService } from '../../src/services/factura.service';

const router = Router();
const facturaService = new FacturaService();

console.log('💳 Registrando rutas de pagos con autenticación');
router.use(verificarToken);

// POST - Crear pago
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { paciente_id, medico_id, factura_id, cita_id, monto, metodo, transaccion, estado, descripcion, fecha, cita_fecha, cita_hora, cita_motivo, cita_sintomas, cita_notas, cita_tipo, doctor_nombre } = req.body;

    console.log('💳 POST /api/pagos - Creando nuevo pago');
    console.log('📥 Datos recibidos:', req.body);
    console.log('   paciente_id:', paciente_id, 'tipo:', typeof paciente_id);
    console.log('   monto:', monto, 'tipo:', typeof monto);
    console.log('   cita_fecha:', cita_fecha);
    console.log('   cita_hora:', cita_hora);

    // Convertir a números para validación
    const pacienteId = Number(paciente_id);
    const montoNum = Number(monto);
    const medicoId = medico_id ? Number(medico_id) : null;

    if (!pacienteId || pacienteId <= 0 || !montoNum || montoNum <= 0) {
      console.log('❌ Validación fallida');
      console.log('   pacienteId:', pacienteId, 'válido:', pacienteId > 0);
      console.log('   montoNum:', montoNum, 'válido:', montoNum > 0);
      return res.status(400).json({ message: 'Faltan campos obligatorios o inválidos: paciente_id, monto' });
    }

    if (req.rol_id === 2 && req.usuario_id !== pacienteId) {
      console.log('❌ No autorizado');
      return res.status(403).json({ message: 'No autorizado para crear pago para otro paciente' });
    }

    const pool = getConnection();

    // Construir descripción con información de la cita
    let descripcionFinal = descripcion || 'Pago de cita médica';
    if (cita_motivo) {
      descripcionFinal = `Consulta: ${cita_motivo}`;
    }

    const [result] = await pool.query(
      `INSERT INTO pagos (paciente_id, medico_id, factura_id, cita_id, monto, metodo, transaccion, estado, descripcion, fecha, creado_en)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [pacienteId, medicoId, factura_id || null, cita_id || null, montoNum, metodo || 'tarjeta', transaccion, estado || 'pendiente', descripcionFinal, fecha || null]
    );

    const pagoId = (result as any).insertId;
    console.log('✅ Pago creado con ID:', pagoId);

    // Obtener el pago creado para devolverlo
    const [pagos] = await pool.query('SELECT * FROM pagos WHERE pago_id = ?', [pagoId]);

    if ((pagos as any[]).length > 0) {
      const pagCreado = (pagos as any[])[0];
      console.log('📦 Pago retornado:', pagCreado);
      return res.status(201).json({
        message: 'Pago registrado exitosamente',
        pago_id: pagoId,
        pago: pagCreado,
        // Retornar información de la cita para que el frontend la pueda usar luego
        cita_info: {
          fecha: cita_fecha,
          hora: cita_hora,
          motivo: cita_motivo,
          sintomas: cita_sintomas,
          notas: cita_notas,
          tipo: cita_tipo,
          doctor_nombre: doctor_nombre
        }
      });
    }

    return res.status(201).json({
      message: 'Pago registrado',
      pago_id: pagoId
    });
  } catch (error) {
    console.error('❌ Error creando pago:', error);
    return res.status(500).json({
      message: 'Error al procesar el pago',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// GET - Obtener pagos (si es paciente solo los suyos)
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const pool = getConnection();
    let query = `SELECT p.*, u.nombre as paciente_nombre FROM pagos p LEFT JOIN usuarios u ON p.paciente_id = u.usuario_id`;
    let params: any[] = [];

    if (req.rol_id === 2) {
      query += ' WHERE p.paciente_id = ?';
      params.push(req.usuario_id);
    }

    query += ' ORDER BY p.creado_en DESC';

    const [rows] = await pool.query(query, params);
    return res.status(200).json(rows);
  } catch (error) {
    console.error('❌ Error obteniendo pagos:', error);
    return res.status(500).json({ message: 'Error en el servidor' });
  }
});

// GET - Obtener pagos por paciente
router.get('/paciente/:paciente_id', async (req: AuthRequest, res: Response) => {
  try {
    const { paciente_id } = req.params;
    if (req.rol_id === 2 && req.usuario_id !== Number(paciente_id)) {
      return res.status(403).json({ message: 'No autorizado para ver pagos de otro paciente' });
    }

    const pool = getConnection();
    const [rows] = await pool.query(
      `SELECT p.*, u.nombre as medico_nombre, u.apellido_paterno
       FROM pagos p
       LEFT JOIN usuarios u ON p.medico_id = u.usuario_id
       WHERE p.paciente_id = ?
       ORDER BY p.creado_en DESC`,
      [paciente_id]
    );
    return res.status(200).json(rows);
  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ message: 'Error en el servidor' });
  }
});

// GET - Obtener pagos por estado
router.get('/estado/:estado', async (req: AuthRequest, res: Response) => {
  try {
    const { estado } = req.params;
    const pool = getConnection();
    const [rows] = await pool.query('SELECT * FROM pagos WHERE estado = ? ORDER BY creado_en DESC', [estado]);
    return res.status(200).json(rows);
  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ message: 'Error en el servidor' });
  }
});

// POST - Generar y descargar factura PDF (DEBE IR ANTES DEL GET /:pago_id)
router.post('/factura/:pago_id', async (req: AuthRequest, res: Response) => {
  try {
    const { pago_id } = req.params;
    const pool = getConnection();

    console.log('📄 POST /api/pagos/factura/:pago_id - Generando factura para pago:', pago_id);

    // Obtener datos del pago con información del paciente y médico
    const [pagos] = await pool.query(
      `SELECT p.*,
              pac.nombre as paciente_nombre, pac.email as paciente_email,
              med.nombre as medico_nombre, med.apellido_paterno as medico_apellido,
              prof.especialidad, prof.tarifa_consulta
       FROM pagos p
       LEFT JOIN usuarios pac ON p.paciente_id = pac.usuario_id
       LEFT JOIN usuarios med ON p.medico_id = med.usuario_id
       LEFT JOIN medicos_profesionales prof ON p.medico_id = prof.usuario_id
       WHERE p.pago_id = ?`,
      [pago_id]
    );

    if ((pagos as any[]).length === 0) {
      console.log('❌ Pago no encontrado:', pago_id);
      return res.status(404).json({ message: 'Pago no encontrado' });
    }

    const pago = (pagos as any[])[0];

    // Verificar permisos
    if (req.rol_id === 2 && req.usuario_id !== pago.paciente_id) {
      console.log('❌ No autorizado para acceder a factura');
      return res.status(403).json({ message: 'No autorizado' });
    }

    console.log('📄 Generando factura para pago:', pago_id);
    console.log('   Información del pago:', {
      id: pago.pago_id,
      monto: pago.monto,
      paciente: pago.paciente_nombre,
      medico: pago.medico_nombre,
      descripcion: pago.descripcion
    });

    // Generar factura
    const fileName = await facturaService.generarFactura({
      id: pago.pago_id,
      monto: pago.monto,
      paciente_nombre: pago.paciente_nombre || 'Paciente',
      medico_nombre: pago.medico_nombre || 'Doctor',
      medico_apellido: pago.medico_apellido,
      medico_especialidad: pago.especialidad || 'Medicina General',
      concepto: pago.descripcion || 'Consulta Médica',
      fecha_pago: pago.fecha || pago.creado_en,
      metodo_pago: pago.metodo || 'Tarjeta',
      estado: pago.estado,
      email: pago.paciente_email,
      transaccion: pago.transaccion
    });

    const filePath = facturaService.getFacturaPath(fileName);

    console.log(`✅ Factura lista: ${filePath}`);

    // Configurar headers explícitos para PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Factura-${pago_id}.pdf"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

    // Enviar archivo al cliente
    res.download(filePath, `Factura-${pago_id}.pdf`, (err) => {
      if (err) {
        console.error('❌ Error descargando archivo:', err);
        if (!res.headersSent) {
          res.status(500).json({ message: 'Error al descargar la factura' });
        }
      }
    });
  } catch (error) {
    console.error('❌ Error generando factura:', error);
    return res.status(500).json({
      message: 'Error al generar la factura',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// GET - Obtener pago por ID
router.get('/:pago_id', async (req: AuthRequest, res: Response) => {
  try {
    const { pago_id } = req.params;
    const pool = getConnection();
    const [rows] = await pool.query('SELECT * FROM pagos WHERE pago_id = ?', [pago_id]);
    if ((rows as any[]).length === 0) return res.status(404).json({ message: 'Pago no encontrado' });

    const pago = (rows as any[])[0];
    if (req.rol_id === 2 && req.usuario_id !== pago.paciente_id) return res.status(403).json({ message: 'No autorizado' });

    return res.status(200).json(pago);
  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ message: 'Error en el servidor' });
  }
});

// PUT - Actualizar pago
router.put('/:pago_id', async (req: AuthRequest, res: Response) => {
  try {
    const { pago_id } = req.params;
    const { monto, metodo, transaccion, estado, descripcion, fecha } = req.body;
    const pool = getConnection();

    const [existingRows] = await pool.query('SELECT * FROM pagos WHERE pago_id = ?', [pago_id]);
    const pago = (existingRows as any[]).length ? (existingRows as any[])[0] : null;
    if (!pago) return res.status(404).json({ message: 'Pago no encontrado' });

    if (req.rol_id === 2 && req.usuario_id !== pago.paciente_id) return res.status(403).json({ message: 'No autorizado' });

    const [result] = await pool.query(
      `UPDATE pagos SET monto = COALESCE(?, monto), metodo = COALESCE(?, metodo), transaccion = COALESCE(?, transaccion), estado = COALESCE(?, estado), descripcion = COALESCE(?, descripcion), fecha = COALESCE(?, fecha) WHERE pago_id = ?`,
      [monto, metodo, transaccion, estado, descripcion, fecha, pago_id]
    );

    if ((result as any).affectedRows === 0) return res.status(404).json({ message: 'Pago no encontrado' });
    return res.status(200).json({ message: 'Pago actualizado' });
  } catch (error) {
    console.error('❌ Error actualizando pago:', error);
    return res.status(500).json({ message: 'Error en el servidor' });
  }
});

// DELETE - Eliminar pago
router.delete('/:pago_id', async (req: AuthRequest, res: Response) => {
  try {
    const { pago_id } = req.params;
    const pool = getConnection();

    const [existingRows] = await pool.query('SELECT * FROM pagos WHERE pago_id = ?', [pago_id]);
    const pago = (existingRows as any[]).length ? (existingRows as any[])[0] : null;
    if (!pago) return res.status(404).json({ message: 'Pago no encontrado' });

    if (req.rol_id === 2 && req.usuario_id !== pago.paciente_id) return res.status(403).json({ message: 'No autorizado' });

    const [result] = await pool.query('DELETE FROM pagos WHERE pago_id = ?', [pago_id]);
    if ((result as any).affectedRows === 0) return res.status(404).json({ message: 'Pago no encontrado' });

    return res.status(200).json({ message: 'Pago eliminado' });
  } catch (error) {
    console.error('❌ Error eliminando pago:', error);
    return res.status(500).json({ message: 'Error en el servidor' });
  }
});

export default router;
