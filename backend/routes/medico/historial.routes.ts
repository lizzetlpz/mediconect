// backend/routes/medico/Historial.routes.ts
import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { getConnection } from '../../BD/SQLite/database';
import { AuthRequest, verificarToken } from '../../middleware/auth.middleware';

const router = Router();

// Configurar multer para recetas
const uploadsDir = path.join(process.cwd(), 'backend', 'uploads', 'recetas');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se aceptan imágenes'));
    }
  }
});

// Aplicar middleware de autenticación
router.use(verificarToken);

// ============================================
// POST - Crear nuevo historial médico
// ============================================
router.post('/', upload.single('foto_receta'), async (req: AuthRequest, res: Response) => {
    try {
        console.log('📝 Iniciando creación de historial médico...');
        console.log('👤 Doctor ID del token:', req.usuario_id);

        const doctor_id = req.usuario_id;

        if (!doctor_id) {
            return res.status(401).json({
                message: 'No se pudo obtener el ID del doctor'
            });
        }

        const {
            paciente_nombre,
            fecha_consulta,
            motivo_consulta,
            sintomas,
            diagnostico,
            plan_tratamiento,
            requiere_seguimiento,
            notas_medico,
            medicamentos,
            estudios
        } = req.body;

        console.log('📋 Datos recibidos:', {
            paciente_nombre,
            fecha_consulta,
            motivo_consulta,
            medicamentos: medicamentos?.length || 0,
            estudios: estudios?.length || 0
        });

        // Validar campos obligatorios
        if (!paciente_nombre || !fecha_consulta || !motivo_consulta) {
            return res.status(400).json({
                message: 'Faltan campos obligatorios: paciente_nombre, fecha_consulta, motivo_consulta'
            });
        }

        const pool = getConnection();

        // Buscar o crear paciente
        console.log('🔍 Buscando paciente:', paciente_nombre);

        const [pacientes] = await pool.query(
            `SELECT usuario_id FROM usuarios
             WHERE CONCAT(nombre, ' ', apellido_paterno, ' ', COALESCE(apellido_materno, '')) LIKE ?
             AND rol_id = 2
             LIMIT 1`,
            [`%${paciente_nombre}%`]
        );

        let paciente_id;

        if ((pacientes as any[]).length > 0) {
            paciente_id = (pacientes as any[])[0].usuario_id;
            console.log('✅ Paciente encontrado con ID:', paciente_id);
        } else {
            // Crear nuevo paciente
            console.log('ℹ️ Paciente no encontrado, creando nuevo...');

            const nombrePartes = paciente_nombre.trim().split(' ');
            const nombre = nombrePartes[0] || paciente_nombre;
            const apellido_paterno = nombrePartes[1] || '';
            const apellido_materno = nombrePartes[2] || null;

            const [resultPaciente] = await pool.query(
                `INSERT INTO usuarios (nombre, apellido_paterno, apellido_materno, email, contraseña, rol_id, activo)
                 VALUES (?, ?, ?, ?, 'temp_password', 2, 1)`,
                [
                    nombre,
                    apellido_paterno,
                    apellido_materno,
                    `${nombre.toLowerCase()}_${Date.now()}@temp.com`
                ]
            );

            paciente_id = (resultPaciente as any).insertId;
            console.log('✅ Nuevo paciente creado con ID:', paciente_id);
        }

        // Insertar historial médico
        console.log('💾 Insertando historial médico...');

        const [result] = await pool.query(
            `INSERT INTO historial_medico
            (paciente_id, doctor_id, fecha_consulta, motivo_consulta, sintomas,
             diagnostico, plan_tratamiento, requiere_seguimiento, notas_medico)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                paciente_id,
                doctor_id,
                fecha_consulta,
                motivo_consulta,
                sintomas || null,
                diagnostico || null,
                plan_tratamiento || null,
                requiere_seguimiento ? 1 : 0,
                notas_medico || null
            ]
        );

        const historial_id = (result as any).insertId;
        console.log('✅ Historial creado con ID:', historial_id);

        // Insertar medicamentos si existen
        if (medicamentos && Array.isArray(medicamentos) && medicamentos.length > 0) {
            console.log(`💊 Insertando ${medicamentos.length} medicamentos...`);

            for (const med of medicamentos) {
                if (med.nombre && med.nombre.trim()) {
                    await pool.query(
                        `INSERT INTO historial_medicamentos
                        (historial_id, nombre, dosis, frecuencia, duracion, instrucciones)
                        VALUES (?, ?, ?, ?, ?, ?)`,
                        [
                            historial_id,
                            med.nombre,
                            med.dosis || null,
                            med.frecuencia || null,
                            med.duracion || null,
                            med.instrucciones || null
                        ]
                    );
                }
            }
            console.log('✅ Medicamentos insertados');
        }

        // Insertar estudios si existen
        if (estudios && Array.isArray(estudios) && estudios.length > 0) {
            console.log(`🔬 Insertando ${estudios.length} estudios...`);

            for (const est of estudios) {
                if (est.nombre && est.nombre.trim()) {
                    await pool.query(
                        `INSERT INTO historial_estudios
                        (historial_id, nombre, tipo, descripcion, archivo_url)
                        VALUES (?, ?, ?, ?, ?)`,
                        [
                            historial_id,
                            est.nombre,
                            est.tipo || null,
                            est.descripcion || null,
                            est.archivo_url || null
                        ]
                    );
                }
            }
            console.log('✅ Estudios insertados');
        }

        console.log('🎉 Historial médico creado exitosamente\n');

        return res.status(201).json({
            message: 'Historial médico creado exitosamente',
            historial_id,
            paciente_id
        });

    } catch (error) {
        console.error('❌ ERROR CREANDO HISTORIAL:', error);
        return res.status(500).json({
            message: 'Error al crear historial',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
});

// ============================================
// GET - Obtener historial de un paciente
// ⚠️ RUTAS ESPECÍFICAS DEBEN IR ANTES DE /:historial_id
// ============================================
router.get('/paciente/:paciente_id', async (req: AuthRequest, res: Response) => {
    try {
        const { paciente_id } = req.params;

        console.log('📋 Obteniendo historial del paciente:', paciente_id);

        const pool = getConnection();

        const [historiales] = await pool.query(
            `SELECT
                h.*,
                p.nombre as paciente_nombre,
                p.apellido_paterno as paciente_apellido_paterno,
                p.apellido_materno as paciente_apellido_materno,
                d.nombre as doctor_nombre,
                d.apellido_paterno as doctor_apellido_paterno,
                d.apellido_materno as doctor_apellido_materno
             FROM historial_medico h
             LEFT JOIN usuarios p ON h.paciente_id = p.usuario_id
             LEFT JOIN usuarios d ON h.doctor_id = d.usuario_id
             WHERE h.paciente_id = ?
             ORDER BY h.fecha_consulta DESC`,
            [paciente_id]
        );

        console.log(`✅ Historiales encontrados: ${(historiales as any[]).length}`);

        const historialesCompletos = await Promise.all(
            (historiales as any[]).map(async (hist) => {
                const [medicamentos] = await pool.query(
                    'SELECT * FROM historial_medicamentos WHERE historial_id = ?',
                    [hist.historial_id]
                );

                const [estudios] = await pool.query(
                    'SELECT * FROM historial_estudios WHERE historial_id = ?',
                    [hist.historial_id]
                );

                return {
                    ...hist,
                    medicamentos,
                    estudios
                };
            })
        );

        return res.status(200).json(historialesCompletos);

    } catch (error) {
        console.error('❌ Error obteniendo historial:', error);
        return res.status(500).json({
            message: 'Error al obtener historial médico',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
});

// ============================================
// GET - Obtener todos los historiales de un doctor
// ⚠️ ESTA RUTA DEBE IR ANTES DE /:historial_id
// ============================================
router.get('/doctor/:doctor_id', async (req: AuthRequest, res: Response) => {
    try {
        const { doctor_id } = req.params;

        console.log('📋 Obteniendo historiales del doctor:', doctor_id);

        const pool = getConnection();

        const [historiales] = await pool.query(
            `SELECT
                h.*,
                p.nombre as paciente_nombre,
                p.apellido_paterno as paciente_apellido_paterno,
                p.apellido_materno as paciente_apellido_materno,
                d.nombre as doctor_nombre,
                d.apellido_paterno as doctor_apellido_paterno,
                d.apellido_materno as doctor_apellido_materno
             FROM historial_medico h
             LEFT JOIN usuarios p ON h.paciente_id = p.usuario_id
             LEFT JOIN usuarios d ON h.doctor_id = d.usuario_id
             WHERE h.doctor_id = ?
             ORDER BY h.fecha_consulta DESC`,
            [doctor_id]
        );

        console.log(`✅ Historiales encontrados: ${(historiales as any[]).length}`);

        const historialesCompletos = await Promise.all(
            (historiales as any[]).map(async (hist) => {
                const [medicamentos] = await pool.query(
                    'SELECT * FROM historial_medicamentos WHERE historial_id = ?',
                    [hist.historial_id]
                );

                const [estudios] = await pool.query(
                    'SELECT * FROM historial_estudios WHERE historial_id = ?',
                    [hist.historial_id]
                );

                return {
                    ...hist,
                    medicamentos,
                    estudios
                };
            })
        );

        return res.status(200).json(historialesCompletos);

    } catch (error) {
        console.error('❌ Error obteniendo historiales del doctor:', error);
        return res.status(500).json({
            message: 'Error al obtener historiales',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
});

// ============================================
// GET - Obtener un historial específico por ID
// ⚠️ ESTA RUTA DEBE IR AL FINAL DE LOS GET
// ============================================
router.get('/:historial_id', async (req: AuthRequest, res: Response) => {
    try {
        const { historial_id } = req.params;

        console.log('📋 Obteniendo historial ID:', historial_id);

        const pool = getConnection();

        const [historiales] = await pool.query(
            `SELECT
                h.*,
                p.nombre as paciente_nombre,
                p.apellido_paterno as paciente_apellido_paterno,
                p.apellido_materno as paciente_apellido_materno,
                d.nombre as doctor_nombre,
                d.apellido_paterno as doctor_apellido_paterno,
                d.apellido_materno as doctor_apellido_materno
             FROM historial_medico h
             LEFT JOIN usuarios p ON h.paciente_id = p.usuario_id
             LEFT JOIN usuarios d ON h.doctor_id = d.usuario_id
             WHERE h.historial_id = ?`,
            [historial_id]
        );

        if ((historiales as any[]).length === 0) {
            return res.status(404).json({
                message: 'Historial no encontrado'
            });
        }

        const historial = (historiales as any[])[0];

        const [medicamentos] = await pool.query(
            'SELECT * FROM historial_medicamentos WHERE historial_id = ?',
            [historial_id]
        );

        const [estudios] = await pool.query(
            'SELECT * FROM historial_estudios WHERE historial_id = ?',
            [historial_id]
        );

        const historialCompleto = {
            ...historial,
            medicamentos,
            estudios
        };

        console.log('✅ Historial encontrado');

        return res.status(200).json(historialCompleto);

    } catch (error) {
        console.error('❌ Error obteniendo historial:', error);
        return res.status(500).json({
            message: 'Error al obtener historial',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
});

// ============================================
// PUT - Actualizar historial
// ============================================
router.put('/:historial_id', async (req: AuthRequest, res: Response) => {
    try {
        const { historial_id } = req.params;
        const {
            sintomas,
            diagnostico,
            plan_tratamiento,
            requiere_seguimiento,
            notas_medico
        } = req.body;

        console.log('📝 Actualizando historial ID:', historial_id);

        const pool = getConnection();

        const [result] = await pool.query(
            `UPDATE historial_medico
             SET sintomas = COALESCE(?, sintomas),
                 diagnostico = COALESCE(?, diagnostico),
                 plan_tratamiento = COALESCE(?, plan_tratamiento),
                 requiere_seguimiento = COALESCE(?, requiere_seguimiento),
                 notas_medico = COALESCE(?, notas_medico)
             WHERE historial_id = ?`,
            [sintomas, diagnostico, plan_tratamiento, requiere_seguimiento, notas_medico, historial_id]
        );

        if ((result as any).affectedRows === 0) {
            return res.status(404).json({
                message: 'Historial no encontrado'
            });
        }

        console.log('✅ Historial actualizado');

        return res.status(200).json({
            message: 'Historial actualizado exitosamente'
        });

    } catch (error) {
        console.error('❌ Error actualizando historial:', error);
        return res.status(500).json({
            message: 'Error al actualizar historial',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
});

// ============================================
// DELETE - Eliminar historial
// ============================================
router.delete('/:historial_id', async (req: AuthRequest, res: Response) => {
    try {
        const { historial_id } = req.params;

        console.log('🗑️ Eliminando historial ID:', historial_id);

        const pool = getConnection();

        const [result] = await pool.query(
            'DELETE FROM historial_medico WHERE historial_id = ?',
            [historial_id]
        );

        if ((result as any).affectedRows === 0) {
            return res.status(404).json({
                message: 'Historial no encontrado'
            });
        }

        console.log('✅ Historial eliminado');

        return res.status(200).json({
            message: 'Historial eliminado exitosamente'
        });

    } catch (error) {
        console.error('❌ Error eliminando historial:', error);
        return res.status(500).json({
            message: 'Error al eliminar historial',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
});

// ============================================
// POST - Crear registro médico desde paciente
// ============================================
router.post('/paciente/registro', upload.single('foto_receta'), async (req: AuthRequest, res: Response) => {
    try {
        console.log('📝 Creando registro médico desde paciente...');
        console.log('👤 Paciente ID:', req.usuario_id);
        console.log('📄 Archivo recibido:', req.file?.originalname);
        console.log('📋 Body recibido:', req.body);

        const paciente_id = req.usuario_id;
        const {
            estudios: estudiosStr
        } = req.body;

        // Validar que haya foto
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Se requiere una foto de la receta'
            });
        }

        const pool = getConnection();
        const fotoPath = `/uploads/recetas/${req.file.filename}`;

        // Insertar en historial_medico con solo los datos mínimos
        // Usar doctor_id = 1 (puedes cambiar a un usuario "Sistema" si existe)
        console.log('📝 Datos a insertar:', {
            paciente_id,
            doctor_id: 1,
            fecha_consulta: new Date().toISOString().split('T')[0],
            motivo_consulta: 'Registro de laboratorios',
            foto_receta: fotoPath
        });

        const [result] = await pool.query(
            `INSERT INTO historial_medico 
            (paciente_id, doctor_id, fecha_consulta, motivo_consulta, foto_receta)
            VALUES (?, ?, ?, ?, ?)`,
            [paciente_id, 1, new Date().toISOString().split('T')[0], 'Registro de laboratorios', fotoPath]
        );

        const historial_id = (result as any).insertId;

        // Insertar estudios si existen
        if (estudiosStr) {
            try {
                const estudios = typeof estudiosStr === 'string' ? JSON.parse(estudiosStr) : estudiosStr;
                
                if (Array.isArray(estudios) && estudios.length > 0) {
                    console.log(`🔬 Insertando ${estudios.length} estudios...`);

                    for (const est of estudios) {
                        if (est.nombre && est.nombre.trim()) {
                            await pool.query(
                                `INSERT INTO historial_estudios
                                (historial_id, nombre, tipo, descripcion)
                                VALUES (?, ?, ?, ?)`,
                                [
                                    historial_id,
                                    est.nombre,
                                    est.tipo || null,
                                    est.descripcion || null
                                ]
                            );
                        }
                    }
                    console.log('✅ Estudios insertados');
                }
            } catch (parseError) {
                console.warn('⚠️ Advertencia al procesar estudios:', parseError);
            }
        }

        console.log('✅ Registro creado exitosamente');
        return res.status(201).json({
            success: true,
            message: 'Registro médico guardado',
            id: historial_id,
            fotoPath
        });
    } catch (error) {
        console.error('❌ Error creando registro:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al crear registro',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
});

export default router;
