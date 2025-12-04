// backend/routes/medico/agregarPaciente.route.ts
import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import { getConnection } from '../../BD/SQLite/database';
import { AuthRequest, verificarToken } from '../../middleware/auth.middleware';

const router = Router();

// Aplicar middleware de autenticación
router.use(verificarToken);

// ============================================
// GET - Obtener todos los pacientes
// ============================================
router.get('/', async (req: AuthRequest, res: Response) => {
    try {
        console.log('📋 Obteniendo lista de pacientes...');

        const pool = getConnection();
        // Si el usuario es doctor, devolver solo pacientes vinculados a ese doctor
        const esDoctor = req.rol_id === 3;
        const doctorId = req.usuario_id;

        let pacientesQuery = `SELECT
                u.usuario_id,
                CONCAT(u.nombre, ' ', u.apellido_paterno, ' ', COALESCE(u.apellido_materno, '')) as nombre_completo,
                u.nombre,
                u.apellido_paterno,
                u.apellido_materno,
                u.email,
                u.telefono,
                u.fecha_nacimiento,
                DATE_FORMAT(u.fecha_registro, '%Y-%m-%d') as fecha_registro,
                u.activo,
                pim.genero,
                pim.tipo_sangre,
                pim.direccion,
                pim.alergias,
                pim.condiciones_cronicas
             FROM usuarios u
             LEFT JOIN pacientes_informacion_medica pim ON u.usuario_id = pim.paciente_id
             WHERE u.rol_id = 2
             AND u.activo = 1`;

        let params: any[] = [];

        if (esDoctor && doctorId) {
            // Obtener pacientes que aparecen en historial_medico, consultas o citas del doctor
            pacientesQuery += ` AND u.usuario_id IN (
                SELECT paciente_id FROM historial_medico WHERE doctor_id = ?
                UNION
                SELECT paciente_id FROM consultas WHERE doctor_id = ?
                UNION
                SELECT paciente_id FROM citas WHERE medico_id = ?
            )`;
            params = [doctorId, doctorId, doctorId];
        }

        pacientesQuery += ` ORDER BY u.fecha_registro DESC`;

        const [pacientes] = await pool.query(pacientesQuery, params);

        console.log(`✅ ${(pacientes as any[]).length} pacientes encontrados`);

        return res.status(200).json({
            success: true,
            data: pacientes,
            total: (pacientes as any[]).length
        });

    } catch (error) {
        console.error('❌ Error obteniendo pacientes:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener pacientes',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
});

// ============================================
// POST - Crear nuevo historial médico con paciente
// ============================================
router.post('/', async (req: AuthRequest, res: Response) => {
    try {
        console.log('📝 Iniciando creación de historial médico...');
        console.log('👤 Doctor ID del token:', req.usuario_id);

        const doctor_id = req.usuario_id;

        if (!doctor_id) {
            return res.status(401).json({
                success: false,
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
            sintomas: sintomas?.substring(0, 50) || 'N/A',
            diagnostico: diagnostico?.substring(0, 50) || 'N/A',
            medicamentos: medicamentos?.length || 0,
            estudios: estudios?.length || 0
        });

        // Validar campos obligatorios
        if (!paciente_nombre || !fecha_consulta || !motivo_consulta) {
            console.log('❌ Faltan campos obligatorios');
            return res.status(400).json({
                success: false,
                message: 'Faltan campos obligatorios',
                campos_requeridos: {
                    paciente_nombre: !paciente_nombre ? 'requerido' : 'ok',
                    fecha_consulta: !fecha_consulta ? 'requerido' : 'ok',
                    motivo_consulta: !motivo_consulta ? 'requerido' : 'ok'
                }
            });
        }

        const pool = getConnection();

        // ✅ Buscar paciente por nombre completo
        console.log('🔍 Buscando paciente:', paciente_nombre);

        const [pacientes] = await pool.query(
            `SELECT usuario_id, nombre, apellido_paterno, apellido_materno
             FROM usuarios
             WHERE CONCAT(nombre, ' ', apellido_paterno, ' ', COALESCE(apellido_materno, '')) LIKE ?
             AND rol_id = 2
             LIMIT 1`,
            [`%${paciente_nombre}%`]
        );

        let paciente_id;
        let paciente_creado = false;

        if ((pacientes as any[]).length > 0) {
            // Paciente encontrado
            paciente_id = (pacientes as any[])[0].usuario_id;
            console.log('✅ Paciente encontrado con ID:', paciente_id);
            console.log('   Datos:', (pacientes as any[])[0]);
        } else {
            // ✅ Crear nuevo paciente
            console.log('ℹ️ Paciente no encontrado, creando nuevo usuario...');

            const nombrePartes = paciente_nombre.trim().split(' ');
            const nombre = nombrePartes[0] || paciente_nombre;
            const apellido_paterno = nombrePartes[1] || 'Sin Apellido';
            const apellido_materno = nombrePartes[2] || null;

            console.log('   📝 Creando paciente:', {
                nombre,
                apellido_paterno,
                apellido_materno
            });

            const [resultPaciente] = await pool.query(
                `INSERT INTO usuarios
                (nombre, apellido_paterno, apellido_materno, email, contraseña, rol_id, activo)
                VALUES (?, ?, ?, ?, ?, 2, 1)`,
                [
                    nombre,
                    apellido_paterno,
                    apellido_materno,
                    `${nombre.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}@temp.com`,
                    '$2b$10$defaultPasswordHash'
                ]
            );

            paciente_id = (resultPaciente as any).insertId;
            paciente_creado = true;
            console.log('✅ Nuevo paciente creado con ID:', paciente_id);
        }

        // ✅ Insertar historial médico
        console.log('💾 Insertando historial médico...');
        console.log('   Paciente ID:', paciente_id);
        console.log('   Doctor ID:', doctor_id);

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
        console.log('✅ Historial médico creado con ID:', historial_id);

        // ✅ Insertar medicamentos si existen
        let medicamentos_insertados = 0;
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
                            med.nombre.trim(),
                            med.dosis?.trim() || null,
                            med.frecuencia?.trim() || null,
                            med.duracion?.trim() || null,
                            med.instrucciones?.trim() || null
                        ]
                    );
                    medicamentos_insertados++;
                }
            }
            console.log(`✅ ${medicamentos_insertados} medicamentos insertados`);
        }

        // ✅ Insertar estudios si existen
        let estudios_insertados = 0;
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
                            est.nombre.trim(),
                            est.tipo?.trim() || null,
                            est.descripcion?.trim() || null,
                            est.archivo_url || null
                        ]
                    );
                    estudios_insertados++;
                }
            }
            console.log(`✅ ${estudios_insertados} estudios insertados`);
        }

        console.log('🎉 Historial médico creado exitosamente\n');

        // Respuesta exitosa
        return res.status(201).json({
            success: true,
            message: 'Historial médico creado exitosamente',
            data: {
                historial_id,
                paciente_id,
                paciente_creado,
                medicamentos_insertados,
                estudios_insertados
            }
        });

    } catch (error) {
        console.error('❌ ERROR CREANDO HISTORIAL:', error);
        console.error('   Tipo:', error instanceof Error ? error.name : typeof error);
        console.error('   Mensaje:', error instanceof Error ? error.message : String(error));
        console.error('   Stack:', error instanceof Error ? error.stack : 'N/A');

        return res.status(500).json({
            success: false,
            message: 'Error al crear historial médico',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
});

// ============================================
// GET - Buscar paciente por nombre (para autocompletar)
// ============================================
router.get('/buscar-paciente', async (req: AuthRequest, res: Response) => {
    try {
        const { nombre } = req.query;

        if (!nombre || typeof nombre !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Parámetro "nombre" requerido'
            });
        }

        console.log('🔍 Buscando pacientes con nombre:', nombre);

        const pool = getConnection();

        const esDoctor = req.rol_id === 3;
        const doctorId = req.usuario_id;

        let buscarQuery = `SELECT
                usuario_id,
                CONCAT(nombre, ' ', apellido_paterno, ' ', COALESCE(apellido_materno, '')) as nombre_completo,
                nombre,
                apellido_paterno,
                apellido_materno,
                email
             FROM usuarios
             WHERE (nombre LIKE ? OR apellido_paterno LIKE ? OR apellido_materno LIKE ?)
             AND rol_id = 2
             AND activo = 1`;

        const params: any[] = [`%${nombre}%`, `%${nombre}%`, `%${nombre}%`];

        if (esDoctor && doctorId) {
            buscarQuery += ` AND usuario_id IN (
                SELECT paciente_id FROM historial_medico WHERE doctor_id = ?
                UNION
                SELECT paciente_id FROM consultas WHERE doctor_id = ?
                UNION
                SELECT paciente_id FROM citas WHERE medico_id = ?
            )`;
            params.push(doctorId, doctorId, doctorId);
        }

        buscarQuery += ` LIMIT 10`;

        const [pacientes] = await pool.query(buscarQuery, params);

        console.log(`✅ ${(pacientes as any[]).length} pacientes encontrados`);

        return res.status(200).json({
            success: true,
            data: pacientes
        });

    } catch (error) {
        console.error('❌ Error buscando pacientes:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al buscar pacientes',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
});

// ============================================
// POST - Registrar nuevo paciente COMPLETO
// ============================================
router.post('/registrar', async (req: AuthRequest, res: Response) => {
    try {
        console.log('📝 Registrando nuevo paciente completo...');
        console.log('👤 Doctor ID del token:', req.usuario_id);

        const {
            nombre,
            apellido_paterno,
            apellido_materno,
            email,
            telefono,
            fecha_nacimiento,
            genero,
            tipo_sangre,
            direccion,
            contacto_emergencia_nombre,
            contacto_emergencia_telefono,
            alergias,
            condiciones_cronicas,
            medicamentos_actuales,
            proveedor_seguro,
            numero_poliza
        } = req.body;

        console.log('📋 Datos recibidos:', {
            nombre,
            apellido_paterno,
            email,
            telefono
        });

        // Validar campos obligatorios
        if (!nombre || !apellido_paterno || !email || !telefono) {
            console.log('❌ Faltan campos obligatorios');
            return res.status(400).json({
                success: false,
                message: 'Faltan campos obligatorios',
                campos_requeridos: {
                    nombre: !nombre ? 'requerido' : 'ok',
                    apellido_paterno: !apellido_paterno ? 'requerido' : 'ok',
                    email: !email ? 'requerido' : 'ok',
                    telefono: !telefono ? 'requerido' : 'ok'
                }
            });
        }

        const pool = getConnection();

        // ✅ Verificar si el email ya existe
        console.log('🔍 Verificando si el email existe:', email);
        const [existente] = await pool.query(
            'SELECT usuario_id FROM usuarios WHERE email = ?',
            [email]
        );

        if ((existente as any[]).length > 0) {
            console.log('❌ Email ya registrado');
            return res.status(400).json({
                success: false,
                message: 'El email ya está registrado'
            });
        }

        // ✅ Generar contraseña temporal
        const contraseñaTemporal = `Temp${Math.floor(Math.random() * 10000)}`;
        const hashedPassword = await bcrypt.hash(contraseñaTemporal, 10);

        console.log('🔐 Contraseña temporal generada');

        // ✅ Insertar paciente en la tabla usuarios
        console.log('💾 Insertando paciente en usuarios...');

        const [result] = await pool.query(
            `INSERT INTO usuarios
            (nombre, apellido_paterno, apellido_materno, email, contraseña, telefono, fecha_nacimiento, rol_id, activo)
            VALUES (?, ?, ?, ?, ?, ?, ?, 2, 1)`,
            [
                nombre.trim(),
                apellido_paterno.trim(),
                apellido_materno?.trim() || null,
                email.trim(),
                hashedPassword,
                telefono?.trim() || null,
                fecha_nacimiento || null
            ]
        );

        const usuario_id = (result as any).insertId;
        console.log('✅ Paciente insertado con ID:', usuario_id);

        // ✅ Insertar información médica adicional
        let info_medica_insertada = false;

        if (genero || tipo_sangre || direccion || contacto_emergencia_nombre ||
            alergias || condiciones_cronicas || medicamentos_actuales ||
            proveedor_seguro || numero_poliza) {

            console.log('💊 Insertando información médica...');

            await pool.query(
                `INSERT INTO pacientes_informacion_medica
                (paciente_id, genero, tipo_sangre, direccion,
                 contacto_emergencia_nombre, contacto_emergencia_telefono,
                 alergias, condiciones_cronicas, medicamentos_actuales,
                 proveedor_seguro, numero_poliza)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    usuario_id,
                    genero?.trim() || null,
                    tipo_sangre?.trim() || null,
                    direccion?.trim() || null,
                    contacto_emergencia_nombre?.trim() || null,
                    contacto_emergencia_telefono?.trim() || null,
                    alergias?.trim() || null,
                    condiciones_cronicas?.trim() || null,
                    medicamentos_actuales?.trim() || null,
                    proveedor_seguro?.trim() || null,
                    numero_poliza?.trim() || null
                ]
            );

            info_medica_insertada = true;
            console.log('✅ Información médica insertada');
        }

        // ✅ IMPORTANTE: Crear registro en historial_medico para vincular al doctor
        // Esto asegura que el paciente aparezca en "Mis Pacientes" del doctor
        console.log('🔗 Vinculando paciente con el doctor en historial_medico...');

        const doctor_id = req.usuario_id;

        await pool.query(
            `INSERT INTO historial_medico
            (paciente_id, doctor_id, fecha_consulta, motivo_consulta, diagnostico, notas_medico)
            VALUES (?, ?, NOW(), 'Paciente agregado manualmente', 'Nuevo paciente registrado', 'Paciente agregado por el médico')`,
            [usuario_id, doctor_id]
        );

        console.log('✅ Paciente vinculado al doctor');

        console.log('🎉 Paciente registrado exitosamente\n');

        return res.status(201).json({
            success: true,
            message: 'Paciente registrado exitosamente',
            data: {
                usuario_id,
                nombre,
                apellido_paterno,
                email,
                info_medica_insertada
            },
            info: {
                contraseña_temporal: contraseñaTemporal,
                mensaje: 'Guarda esta contraseña temporal'
            }
        });

    } catch (error) {
        console.error('❌ ERROR REGISTRANDO PACIENTE:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al registrar paciente',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
});

export default router;
