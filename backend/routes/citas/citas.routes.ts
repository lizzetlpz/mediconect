// backend/routes/citas/citas.routes.ts
import { Router, Response } from 'express';
import { getConnection } from '../../BD/SQLite/database';
import { AuthRequest, verificarToken } from '../../middleware/auth.middleware';
import brevoService from '../../src/services/brevo.service';

const router = Router();

console.log('📅 Registrando rutas de citas con autenticación');
router.use(verificarToken);

// POST - Crear nueva cita
router.post('/', async (req: AuthRequest, res: Response) => {
    try {
        console.log('📝 Iniciando creación de cita...');
        console.log('📋 Payload recibido:', JSON.stringify(req.body, null, 2));

        const {
            paciente_id,
            medico_id,
            fecha_cita,
            hora_cita,
            motivo,
            estado,
            sintomas,
            notas,
            modalidad,
            email_notificacion
        } = req.body;

        console.log('✅ Campos extraídos:');
        console.log('  - paciente_id:', paciente_id);
        console.log('  - medico_id:', medico_id);
        console.log('  - fecha_cita:', fecha_cita);
        console.log('  - hora_cita:', hora_cita);
        console.log('  - motivo:', motivo);
        console.log('  - sintomas:', sintomas);
        console.log('  - notas:', notas);
        console.log('  - modalidad:', modalidad);

        if (!paciente_id || !medico_id || !fecha_cita || !hora_cita) {
            return res.status(400).json({
                message: 'Faltan campos obligatorios: paciente_id, medico_id, fecha_cita, hora_cita'
            });
        }

        const pool = getConnection();

        // Validación de autorización: si es paciente, sólo puede crear citas para sí mismo o para un familiar propio
        if (req.rol_id === 2) {
            const usuarioIdNum = Number(req.usuario_id);
            const pacienteIdNum = Number(paciente_id);
            if (usuarioIdNum !== pacienteIdNum) {
                // comprobar si pacienteIdNum corresponde a un familiar cuyo owner_id sea el usuario
                const [famRows] = await pool.query('SELECT owner_id FROM familiares WHERE familiar_id = ?', [pacienteIdNum]);
                const isOwned = Array.isArray(famRows) && famRows.length && (famRows as any[])[0].owner_id === usuarioIdNum;
                if (!isOwned) {
                    console.log('🚫 Usuario intenta crear cita en nombre de otro paciente que no es su familiar');
                    return res.status(403).json({ message: 'No autorizado para crear cita para este paciente' });
                }
            }
        }

        console.log('💾 Insertando en BD: INSERT INTO citas (paciente_id, medico_id, fecha_cita, hora_cita, motivo, estado, sintomas, notas, modalidad, creado_en)');
        const [result] = await pool.query(
            `INSERT INTO citas
            (paciente_id, medico_id, fecha_cita, hora_cita, motivo, estado, sintomas, notas, modalidad, creado_en)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [paciente_id, medico_id, fecha_cita, hora_cita, motivo, estado || 'pendiente', sintomas || null, notas || null, modalidad || null]
        );

        console.log('✅ Cita creada con ID:', (result as any).insertId);
        console.log('📊 Valores insertados:', {
            paciente_id, medico_id, fecha_cita, hora_cita, motivo,
            estado: estado || 'pendiente',
            sintomas: sintomas || null,
            notas: notas || null,
            modalidad: modalidad || null
        });

        const citaId = (result as any).insertId;

        // Obtener información completa para el email
        try {
            const [citaInfo] = await pool.query(
                `SELECT c.*,
                        p.nombre as paciente_nombre, p.email as paciente_email,
                        m.nombre as medico_nombre, m.apellido_paterno as medico_apellido,
                        prof.especialidad
                 FROM citas c
                 LEFT JOIN usuarios p ON c.paciente_id = p.usuario_id
                 LEFT JOIN usuarios m ON c.medico_id = m.usuario_id
                 LEFT JOIN medicos_profesionales prof ON c.medico_id = prof.usuario_id
                 WHERE c.cita_id = ?`,
                [citaId]
            );

            if ((citaInfo as any[]).length > 0) {
                const cita = (citaInfo as any[])[0];

                // Determinar el email a usar: prioritario el del formulario de pago
                const emailDestino = email_notificacion || cita.paciente_email;

                console.log('📧 Enviando notificación por email...');
                console.log('   Email de formulario:', email_notificacion);
                console.log('   Email registrado:', cita.paciente_email);
                console.log('   Email destino final:', emailDestino);

                if (emailDestino) {
                    const medicoNombre = cita.medico_apellido
                        ? `${cita.medico_nombre} ${cita.medico_apellido}`
                        : cita.medico_nombre;

                    const emailEnviado = await brevoService.enviarEmail({
                        to: emailDestino,
                        subject: '✅ Cita Médica Confirmada - MediConnect',
                        html: `
                            <h1>Cita Confirmada</h1>
                            <p>Hola <strong>${cita.paciente_nombre}</strong>,</p>
                            <p>Tu cita médica ha sido confirmada:</p>
                            <ul>
                                <li><strong>Médico:</strong> ${medicoNombre}</li>
                                <li><strong>Especialidad:</strong> ${cita.especialidad || 'No especificada'}</li>
                                <li><strong>Fecha:</strong> ${cita.fecha_cita}</li>
                                <li><strong>Hora:</strong> ${cita.hora_cita}</li>
                                <li><strong>Motivo:</strong> ${cita.motivo}</li>
                                <li><strong>Modalidad:</strong> ${cita.modalidad || 'texto'}</li>
                                <li><strong>ID Cita:</strong> #${citaId}</li>
                            </ul>
                            <p>Recuerda conectarte 5 minutos antes de tu cita.</p>
                        `
                    });

                    if (emailEnviado) {
                        console.log('✅ Email de confirmación enviado correctamente a:', emailDestino);
                    } else {
                        console.log('⚠️ No se pudo enviar el email de confirmación (la cita se creó correctamente)');
                    }
                } else {
                    console.log('⚠️ No hay email disponible para enviar notificación');
                }
            }
        } catch (emailError) {
            console.error('⚠️ Error enviando email (la cita se creó correctamente):', emailError);
        }

        return res.status(201).json({
            message: 'Cita creada exitosamente',
            cita_id: citaId
        });

    } catch (error) {
        console.error('❌ Error creando cita:', error);
        return res.status(500).json({
            message: 'Error en el servidor',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
});

// GET - Obtener todas las citas
router.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const pool = getConnection();
        const usuario_id = req.usuario_id;
        const rol_id = req.rol_id;

        let query = `
            SELECT c.*,
                   p.nombre as paciente_nombre, p.apellido_paterno as paciente_apellido, p.telefono as paciente_telefono, p.email as paciente_email,
                   d.nombre as medico_nombre, d.apellido_paterno as medico_apellido,
                   mp.especialidad as medico_especialidad
            FROM citas c
            LEFT JOIN usuarios p ON c.paciente_id = p.usuario_id
            LEFT JOIN usuarios d ON c.medico_id = d.usuario_id
            LEFT JOIN medicos_profesionales mp ON c.medico_id = mp.usuario_id`;

        let params: any[] = [];

        // Si es médico, solo mostrar sus citas
        if (rol_id === 3) {
            query += ' WHERE c.medico_id = ?';
            params.push(usuario_id);
        }
        // Si es paciente, solo mostrar sus citas
        else if (rol_id === 2) {
            query += ' WHERE c.paciente_id = ?';
            params.push(usuario_id);
        }

        query += ' ORDER BY c.fecha_cita DESC, c.hora_cita DESC';

        const [citas] = await pool.query(query, params);

        console.log('✅ Citas obtenidas para usuario', usuario_id, 'rol', rol_id, ':', (citas as any[]).length);
        return res.status(200).json(citas);

    } catch (error) {
        console.error('❌ Error obteniendo citas:', error);
        return res.status(500).json({ message: 'Error en el servidor' });
    }
});

// GET /paciente - Obtener citas del paciente actual
router.get('/paciente', async (req: AuthRequest, res: Response) => {
    try {
        const pool = getConnection();
        const usuario_id = req.usuario_id;
        const rol_id = req.rol_id;

        // Solo pacientes pueden usar esta ruta
        if (rol_id !== 2) {
            return res.status(403).json({ message: 'Solo pacientes pueden acceder a esta información' });
        }

        const query = `
            SELECT c.*,
                   p.nombre as paciente_nombre, p.apellido_paterno as paciente_apellido, p.telefono as paciente_telefono, p.email as paciente_email,
                   d.nombre as medico_nombre, d.apellido_paterno as medico_apellido,
                   mp.especialidad as medico_especialidad
            FROM citas c
            LEFT JOIN usuarios p ON c.paciente_id = p.usuario_id
            LEFT JOIN usuarios d ON c.medico_id = d.usuario_id
            LEFT JOIN medicos_profesionales mp ON c.medico_id = mp.usuario_id
            WHERE c.paciente_id = ?
            ORDER BY c.fecha_cita DESC, c.hora_cita DESC`;

        const [citas] = await pool.query(query, [usuario_id]);

        console.log('✅ Citas del paciente obtenidas:', usuario_id, 'total:', (citas as any[]).length);
        return res.status(200).json(citas);

    } catch (error) {
        console.error('❌ Error obteniendo citas del paciente:', error);
        return res.status(500).json({ message: 'Error en el servidor' });
    }
});

// GET /estadisticas - Obtener estadísticas de citas del médico
router.get('/estadisticas', async (req: AuthRequest, res: Response) => {
    try {
        const pool = getConnection();
        const usuario_id = req.usuario_id;
        const rol_id = req.rol_id;

        // Solo médicos pueden ver estadísticas
        if (rol_id !== 3) {
            return res.status(403).json({ message: 'Solo médicos pueden ver estadísticas' });
        }

        const [estadisticas] = await pool.query(
            `SELECT
                COUNT(*) as total,
                SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
                SUM(CASE WHEN estado = 'confirmada' THEN 1 ELSE 0 END) as confirmadas,
                SUM(CASE WHEN estado = 'completada' THEN 1 ELSE 0 END) as completadas,
                SUM(CASE WHEN estado = 'en_progreso' THEN 1 ELSE 0 END) as en_progreso
            FROM citas
            WHERE medico_id = ?`,
            [usuario_id]
        );

        console.log('✅ Estadísticas obtenidas para médico', usuario_id);
        return res.status(200).json((estadisticas as any[])[0]);
    } catch (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        return res.status(500).json({
            message: 'Error en el servidor',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
});

// GET - Obtener citas por paciente
router.get('/paciente/:paciente_id', async (req: AuthRequest, res: Response) => {
    try {
        const { paciente_id } = req.params;
        const pool = getConnection();

        const usuarioIdNum = Number(req.usuario_id);
        const pacienteIdNum = Number(paciente_id);

        // Si el solicitante es paciente, sólo puede ver citas propias o de sus familiares
        if (req.rol_id === 2) {
            if (usuarioIdNum !== pacienteIdNum) {
                const [famRows] = await pool.query('SELECT owner_id FROM familiares WHERE familiar_id = ?', [pacienteIdNum]);
                const isOwned = Array.isArray(famRows) && famRows.length && (famRows as any[])[0].owner_id === usuarioIdNum;
                if (!isOwned) return res.status(403).json({ message: 'No autorizado para ver citas de este paciente' });
            }
        }

        // Construir consulta: si el solicitante es el propio paciente, incluir sus familiares en el resultado
        let query = `SELECT c.*, p.nombre as paciente_nombre, d.nombre as medico_nombre
                     FROM citas c
                     LEFT JOIN usuarios p ON c.paciente_id = p.usuario_id
                     LEFT JOIN usuarios d ON c.medico_id = d.usuario_id`;
        let params: any[] = [];

        if (req.rol_id === 2 && usuarioIdNum === pacienteIdNum) {
            // obtener familiares del usuario
            const [famRows] = await pool.query('SELECT familiar_id FROM familiares WHERE owner_id = ?', [usuarioIdNum]);
            const famIds = Array.isArray(famRows) ? (famRows as any[]).map(r => r.familiar_id) : [];
            const ids = [pacienteIdNum, ...famIds];
            if (ids.length === 0) ids.push(pacienteIdNum);
            const placeholders = ids.map(() => '?').join(',');
            query += ` WHERE c.paciente_id IN (${placeholders})`;
            params = ids;
        } else {
            query += ` WHERE c.paciente_id = ?`;
            params = [pacienteIdNum];
        }

        query += ' ORDER BY c.fecha_cita DESC, c.hora_cita DESC';

        const [citas] = await pool.query(query, params);

        console.log('✅ Citas del paciente obtenidas:', (citas as any[]).length);
        return res.status(200).json(citas);

    } catch (error) {
        console.error('❌ Error:', error);
        return res.status(500).json({ message: 'Error en el servidor' });
    }
});

// PUT /:id/estado - Actualizar estado de una cita
router.put('/:id/estado', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;
        const pool = getConnection();
        const usuario_id = req.usuario_id;
        const rol_id = req.rol_id;

        if (!estado) {
            return res.status(400).json({ message: 'El estado es requerido' });
        }

        // Verificar que la cita existe y que el usuario tiene acceso a ella
        const [citaRows] = await pool.query(
            'SELECT * FROM citas WHERE cita_id = ?',
            [id]
        );

        if (!Array.isArray(citaRows) || citaRows.length === 0) {
            return res.status(404).json({ message: 'Cita no encontrada' });
        }

        const cita = (citaRows as any[])[0];

        // Verificar permisos
        if (rol_id === 3 && cita.medico_id !== usuario_id) {
            return res.status(403).json({ message: 'No tienes permiso para modificar esta cita' });
        } else if (rol_id === 2 && cita.paciente_id !== usuario_id) {
            return res.status(403).json({ message: 'No tienes permiso para modificar esta cita' });
        }

        // Actualizar el estado
        await pool.query(
            'UPDATE citas SET estado = ?, actualizado_en = CURRENT_TIMESTAMP WHERE cita_id = ?',
            [estado, id]
        );

        console.log('✅ Estado de cita actualizado:', id, 'nuevo estado:', estado);
        return res.status(200).json({ message: 'Estado actualizado correctamente' });

    } catch (error) {
        console.error('❌ Error actualizando estado de cita:', error);
        return res.status(500).json({ message: 'Error en el servidor' });
    }
});

// DELETE /:id - Eliminar una cita
router.delete('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const pool = getConnection();
        const usuario_id = req.usuario_id;
        const rol_id = req.rol_id;

        // Verificar que la cita existe y que el usuario tiene acceso a ella
        const [citaRows] = await pool.query(
            'SELECT * FROM citas WHERE cita_id = ?',
            [id]
        );

        if (!Array.isArray(citaRows) || citaRows.length === 0) {
            return res.status(404).json({ message: 'Cita no encontrada' });
        }

        const cita = (citaRows as any[])[0];

        // Verificar permisos (solo médicos y el paciente propietario pueden eliminar)
        if (rol_id === 3 && cita.medico_id !== usuario_id) {
            return res.status(403).json({ message: 'No tienes permiso para eliminar esta cita' });
        } else if (rol_id === 2 && cita.paciente_id !== usuario_id) {
            return res.status(403).json({ message: 'No tienes permiso para eliminar esta cita' });
        }

        // Eliminar la cita
        await pool.query('DELETE FROM citas WHERE cita_id = ?', [id]);

        console.log('✅ Cita eliminada:', id);
        return res.status(200).json({ message: 'Cita eliminada correctamente' });

    } catch (error) {
        console.error('❌ Error eliminando cita:', error);
        return res.status(500).json({ message: 'Error en el servidor' });
    }
});

// GET - Obtener citas por médico
router.get('/medico/:medico_id', async (req: AuthRequest, res: Response) => {
    try {
        const { medico_id } = req.params;
        const pool = getConnection();

        const [citas] = await pool.query(
            `SELECT c.*,
                    p.nombre as paciente_nombre,
                    d.nombre as medico_nombre
             FROM citas c
             LEFT JOIN usuarios p ON c.paciente_id = p.usuario_id
             LEFT JOIN usuarios d ON c.medico_id = d.usuario_id
             WHERE c.medico_id = ?
             ORDER BY c.fecha_cita DESC, c.hora_cita DESC`,
            [medico_id]
        );

        console.log('✅ Citas del médico obtenidas:', (citas as any[]).length);
        return res.status(200).json(citas);

    } catch (error) {
        console.error('❌ Error:', error);
        return res.status(500).json({ message: 'Error en el servidor' });
    }
});

// GET - Obtener citas por estado
router.get('/estado/:estado', async (req: AuthRequest, res: Response) => {
    try {
        const { estado } = req.params;
        const pool = getConnection();

        const [citas] = await pool.query(
            `SELECT c.*,
                    p.nombre as paciente_nombre,
                    d.nombre as medico_nombre
             FROM citas c
             LEFT JOIN usuarios p ON c.paciente_id = p.usuario_id
             LEFT JOIN usuarios d ON c.medico_id = d.usuario_id
             WHERE c.estado = ?
             ORDER BY c.fecha_cita DESC, c.hora_cita DESC`,
            [estado]
        );

        console.log('✅ Citas con estado obtenidas:', (citas as any[]).length);
        return res.status(200).json(citas);

    } catch (error) {
        console.error('❌ Error:', error);
        return res.status(500).json({ message: 'Error en el servidor' });
    }
});

// GET - Obtener cita por ID
router.get('/:cita_id', async (req: AuthRequest, res: Response) => {
    try {
        const { cita_id } = req.params;
        const pool = getConnection();

        const [citas] = await pool.query(
            `SELECT c.*,
                    p.nombre as paciente_nombre,
                    d.nombre as medico_nombre
             FROM citas c
             LEFT JOIN usuarios p ON c.paciente_id = p.usuario_id
             LEFT JOIN usuarios d ON c.medico_id = d.usuario_id
             WHERE c.cita_id = ?`,
            [cita_id]
        );

        if ((citas as any[]).length === 0) {
            return res.status(404).json({ message: 'Cita no encontrada' });
        }

        return res.status(200).json((citas as any[])[0]);

    } catch (error) {
        console.error('❌ Error:', error);
        return res.status(500).json({ message: 'Error en el servidor' });
    }
});

// PUT - Actualizar cita
router.put('/:cita_id', async (req: AuthRequest, res: Response) => {
    try {
        const { cita_id } = req.params;
        const { fecha_cita, hora_cita, motivo, estado, sintomas, notas, modalidad } = req.body;

        const pool = getConnection();

        // Verificar que el usuario esté autorizado para modificar la cita
        const [existing] = await pool.query('SELECT * FROM citas WHERE cita_id = ?', [cita_id]);
        const cita = (existing as any[]).length ? (existing as any[])[0] : null;
        if (!cita) return res.status(404).json({ message: 'Cita no encontrada' });

        if (req.rol_id !== 1) { // si no es admin
            const usuarioId = req.usuario_id;
            if (req.rol_id === 2 && usuarioId !== cita.paciente_id) {
                return res.status(403).json({ message: 'No autorizado para modificar esta cita' });
            }
            if (req.rol_id === 3 && usuarioId !== cita.medico_id) {
                return res.status(403).json({ message: 'No autorizado para modificar esta cita' });
            }
        }

        const [result] = await pool.query(
            `UPDATE citas
             SET fecha_cita = COALESCE(?, fecha_cita),
                 hora_cita = COALESCE(?, hora_cita),
                 motivo = COALESCE(?, motivo),
                 estado = COALESCE(?, estado),
                 sintomas = COALESCE(?, sintomas),
                 notas = COALESCE(?, notas),
                 modalidad = COALESCE(?, modalidad)
             WHERE cita_id = ?`,
            [fecha_cita, hora_cita, motivo, estado, sintomas, notas, modalidad, cita_id]
        );

        if ((result as any).affectedRows === 0) {
            return res.status(404).json({ message: 'Cita no encontrada' });
        }

        console.log('✅ Cita actualizada');
        return res.status(200).json({ message: 'Cita actualizada exitosamente' });

    } catch (error) {
        console.error('❌ Error:', error);
        return res.status(500).json({ message: 'Error en el servidor' });
    }
});

// PUT - Actualizar estado de cita
router.put('/:cita_id/estado', async (req: AuthRequest, res: Response) => {
    try {
        const { cita_id } = req.params;
        const { estado } = req.body;

        if (!estado) {
            return res.status(400).json({ message: 'El estado es obligatorio' });
        }

        const pool = getConnection();

        // Verificar autorización: sólo admin, paciente dueño o médico asignado
        const [existingEstado] = await pool.query('SELECT * FROM citas WHERE cita_id = ?', [cita_id]);
        const citaEstado = (existingEstado as any[]).length ? (existingEstado as any[])[0] : null;
        if (!citaEstado) return res.status(404).json({ message: 'Cita no encontrada' });

        if (req.rol_id !== 1) {
            const usuarioId = req.usuario_id;
            if (req.rol_id === 2 && usuarioId !== citaEstado.paciente_id) {
                return res.status(403).json({ message: 'No autorizado para modificar el estado de esta cita' });
            }
            if (req.rol_id === 3 && usuarioId !== citaEstado.medico_id) {
                return res.status(403).json({ message: 'No autorizado para modificar el estado de esta cita' });
            }
        }

        const [result] = await pool.query(
            'UPDATE citas SET estado = ? WHERE cita_id = ?',
            [estado, cita_id]
        );

        if ((result as any).affectedRows === 0) {
            return res.status(404).json({ message: 'Cita no encontrada' });
        }

        console.log('✅ Estado de cita actualizado');
        return res.status(200).json({ message: 'Estado actualizado exitosamente' });

    } catch (error) {
        console.error('❌ Error:', error);
        return res.status(500).json({ message: 'Error en el servidor' });
    }
});

// DELETE - Eliminar cita
router.delete('/:cita_id', async (req: AuthRequest, res: Response) => {
    try {
        const { cita_id } = req.params;
        const pool = getConnection();

        // Verificar autorización antes de eliminar
        const [existing] = await pool.query('SELECT * FROM citas WHERE cita_id = ?', [cita_id]);
        const cita = (existing as any[]).length ? (existing as any[])[0] : null;
        if (!cita) return res.status(404).json({ message: 'Cita no encontrada' });

        if (req.rol_id !== 1) {
            const usuarioId = req.usuario_id;
            if (req.rol_id === 2 && usuarioId !== cita.paciente_id) {
                return res.status(403).json({ message: 'No autorizado para eliminar esta cita' });
            }
            if (req.rol_id === 3 && usuarioId !== cita.medico_id) {
                return res.status(403).json({ message: 'No autorizado para eliminar esta cita' });
            }
        }

        const [result] = await pool.query('DELETE FROM citas WHERE cita_id = ?', [cita_id]);
        if ((result as any).affectedRows === 0) {
            return res.status(404).json({ message: 'Cita no encontrada' });
        }

        console.log('✅ Cita eliminada');
        return res.status(200).json({ message: 'Cita eliminada exitosamente' });

    } catch (error) {
        console.error('❌ Error:', error);
        return res.status(500).json({ message: 'Error en el servidor' });
    }
});

// Endpoint de test para probar emails
router.get('/test-email', async (req: AuthRequest, res: Response) => {
    try {
        console.log('🧪 Probando configuración de email con Resend...');

        const emailDestino = (req.query['email'] as string) || 'medicoomx@gmail.com';
        const resultado = await brevoService.enviarEmail({
            to: emailDestino,
            subject: '✅ Test de Email - MediConnect',
            html: '<h1>Test exitoso!</h1><p>El servicio de email con Resend está funcionando correctamente.</p>'
        });

        if (resultado) {
            return res.status(200).json({
                success: true,
                message: `✅ Email de prueba enviado correctamente a: ${emailDestino}`,
                email_destino: emailDestino
            });
        } else {
            return res.status(500).json({
                success: false,
                message: `❌ Error enviando email de prueba a: ${emailDestino}`
            });
        }
    } catch (error) {
        console.error('❌ Error en test de email:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
});

export default router;
