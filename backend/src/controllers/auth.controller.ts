// src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getConnection } from '../../BD/SQLite/database';
import { AuthRequest } from '../../middleware/auth.middleware';
import emailService from '../services/email.service';

// LOGIN
export const login = async (req: Request, res: Response) => {
    const { email, correo, password, contraseña } = req.body;

    // Aceptar tanto 'email' como 'correo', 'password' como 'contraseña'
    const emailFinal = email || correo;
    const passwordFinal = password || contraseña;

    console.log('🔐 Intento de login:', emailFinal);

    if (!emailFinal || !passwordFinal) {
        console.log('❌ Faltan campos requeridos');
        return res.status(400).json({
            message: 'Email y contraseña son requeridos'
        });
    }

    try {
        const pool = getConnection();

        // Buscar usuario por email
        const [rows] = await pool.query(
            'SELECT * FROM usuarios WHERE email = ? AND activo = 1',
            [emailFinal]
        );

        if ((rows as any[]).length === 0) {
            console.log('❌ Usuario no encontrado:', emailFinal);
            return res.status(401).json({
                message: 'Credenciales inválidas'
            });
        }

        const usuario = (rows as any[])[0];
        console.log('✅ Usuario encontrado:', usuario.email);
        console.log('🔍 Datos del usuario:', {
            id: usuario.id,
            email: usuario.email,
            tipo_usuario: usuario.tipo_usuario,
            rol_id: usuario.rol_id
        });

        // ✅ CORRECCIÓN: Verificar contraseña con el campo correcto
        const contraseñaValida = await bcrypt.compare(
            passwordFinal,
            usuario.password || usuario.contraseña  // Intentar ambos nombres de campo
        );

        if (!contraseñaValida) {
            console.log('❌ Contraseña incorrecta');
            return res.status(401).json({
                message: 'Credenciales inválidas'
            });
        }

        console.log('✅ Contraseña válida');

        // Generar tokens
        const jwtSecret = process.env.JWT_SECRET || 'tu_secreto_super_seguro_cambiar_en_produccion';

        // ✅ IMPORTANTE: Incluir rol_id en el token para que el frontend sepa qué dashboard mostrar
        const token = jwt.sign(
            {
                id: usuario.id,  // ✅ Usar 'id' en lugar de 'usuario_id'
                rol_id: usuario.rol_id,
                tipo_usuario: usuario.tipo_usuario,
                email: usuario.email
            },
            jwtSecret,
            { expiresIn: '24h' }
        );

        const refreshToken = jwt.sign(
            { id: usuario.id },
            jwtSecret,
            { expiresIn: '7d' }
        );

        console.log('✅ Tokens generados con rol_id:', usuario.rol_id);

        // Responder con éxito
        return res.status(200).json({
            message: 'Login exitoso',
            user: {
                id: usuario.id,
                nombre: usuario.nombre,
                apellido: usuario.apellido,
                email: usuario.email,
                telefono: usuario.telefono,
                fecha_nacimiento: usuario.fecha_nacimiento,
                tipo_usuario: usuario.tipo_usuario,
                rol_id: usuario.rol_id,  // ✅ CRÍTICO: Enviar rol_id al frontend
                activo: usuario.activo,
                fecha_registro: usuario.fecha_registro
            },
            token,
            refreshToken
        });

    } catch (error) {
        console.error('❌ Error en login:', error);
        return res.status(500).json({
            message: 'Error en el servidor',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};

// REGISTER
export const register = async (req: Request, res: Response) => {
    const {
        nombre,
        apellido_paterno,
        apellido,  // ✅ Aceptar también 'apellido'
        apellido_materno,
        email,
        correo,  // ✅ Aceptar también 'correo'
        password,
        contraseña,  // ✅ Aceptar también 'contraseña'
        telefono,
        fecha_nacimiento,
        rol,  // ✅ NUEVO: Aceptar 'rol' del frontend
        cedulaProfesional
    } = req.body;

    // Normalizar campos
    const emailFinal = correo || email;
    const passwordFinal = contraseña || password;
    const apellidoFinal = apellido || apellido_paterno;
    const rolFinal = rol;

    console.log('📝 Intento de registro:', emailFinal);
    console.log('🔍 Rol recibido:', rolFinal);

    if (!nombre || !apellidoFinal || !emailFinal || !passwordFinal || !rolFinal) {
        console.log('❌ Faltan campos requeridos');
        return res.status(400).json({
            message: 'Faltan campos requeridos: nombre, apellido, email, password, rol',
            recibido: req.body
        });
    }

    // ✅ CALCULAR rol_id basado en el rol que envía el frontend
    let rol_id: number;
    let tipo_usuario: string;

    if (rolFinal === 'doctor' || rolFinal === 'medico') {
        rol_id = 2;  // Doctor
        tipo_usuario = 'medico';

        // Validar cédula profesional para doctores
        if (!cedulaProfesional) {
            return res.status(400).json({
                message: 'La cédula profesional es requerida para doctores'
            });
        }
    } else if (rolFinal === 'paciente') {
        rol_id = 3;  // Paciente
        tipo_usuario = 'paciente';
    } else {
        return res.status(400).json({
            message: 'Rol inválido. Debe ser "doctor" o "paciente"'
        });
    }

    console.log('✅ Rol calculado:', { rolFinal, rol_id, tipo_usuario });

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailFinal)) {
        return res.status(400).json({
            message: 'El formato del correo electrónico no es válido'
        });
    }

    // Validar contraseña mínimo 8 caracteres
    if (passwordFinal.length < 8) {
        return res.status(400).json({
            message: 'La contraseña debe tener al menos 8 caracteres'
        });
    }

    try {
        const pool = getConnection();

        // Verificar si el email ya existe
        const [emailRows] = await pool.query(
            'SELECT id FROM usuarios WHERE email = ?',
            [emailFinal]
        );

        if ((emailRows as any[]).length > 0) {
            console.log('❌ Email ya registrado:', emailFinal);
            return res.status(409).json({
                message: 'El email ya está registrado'
            });
        }

        // Hashear contraseña con bcrypt
        const hashedPassword = await bcrypt.hash(passwordFinal, 10);
        console.log('✅ Contraseña hasheada');

        // Generar código de verificación de 6 dígitos
        const codigoVerificacion = Math.floor(100000 + Math.random() * 900000).toString();
        const fechaExpiracion = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

        console.log('💾 Insertando usuario en base de datos...');
        console.log('   Datos a insertar:');
        console.log('   - Nombre:', nombre);
        console.log('   - Apellido:', apellidoFinal);
        console.log('   - Email:', emailFinal.toLowerCase());
        console.log('   - Tipo usuario:', tipo_usuario);
        console.log('   - Rol ID:', rol_id);

        // ✅ Insertar usuario con el rol_id correcto
        const [result] = await pool.query(
            `INSERT INTO usuarios
            (nombre, apellido, email, password, telefono, fecha_nacimiento, tipo_usuario, rol_id, activo, email_verificado, codigo_verificacion, fecha_expiracion_codigo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                nombre,
                apellidoFinal,
                emailFinal.toLowerCase(),
                hashedPassword,
                telefono || null,
                fecha_nacimiento || null,
                tipo_usuario,
                rol_id,  // ✅ CRÍTICO: Guardar el rol_id calculado
                1,  // activo
                0,  // email_verificado
                codigoVerificacion,
                fechaExpiracion
            ]
        );

        const usuario_id = (result as any).insertId;
        console.log('✅ Usuario creado con ID:', usuario_id, 'y rol_id:', rol_id);

        // Si es doctor, registrar en medicos_profesionales
        if (rol_id === 2 && cedulaProfesional) {
            try {
                await pool.query(
                    `INSERT INTO medicos_profesionales
                    (usuario_id, especialidad, anos_experiencia, universidad, cedula_profesional, descripcion, tarifa_consulta, creado_en)
                    VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
                    [
                        usuario_id,
                        'Medicina General',
                        0,
                        '',
                        cedulaProfesional,
                        'Perfil médico nuevo',
                        100.00
                    ]
                );
                console.log('✅ Registro en medicos_profesionales completado');
            } catch (medError) {
                console.error('⚠️ Error registrando en medicos_profesionales:', medError);
            }
        }

        // Enviar email de verificación
        try {
            const emailEnviado = await emailService.enviarEmail({
                to: emailFinal.toLowerCase(),
                subject: 'Verificar tu cuenta en MediConnect',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #0066cc;">Bienvenido a MediConnect</h2>
                        <p>Hola <strong>${nombre}</strong>,</p>
                        <p>Gracias por registrarte en MediConnect. Tu código de verificación es:</p>
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                            <div style="font-size: 32px; font-weight: bold; color: #0066cc; letter-spacing: 4px;">
                                ${codigoVerificacion}
                            </div>
                        </div>
                        <p>Este código expira en <strong>24 horas</strong>.</p>
                    </div>
                `
            });

            if (emailEnviado) {
                console.log('✅ Email de verificación enviado');
            }
        } catch (emailError) {
            console.error('⚠️ Error enviando email:', emailError);
        }

        // Generar tokens
        const jwtSecret = process.env.JWT_SECRET || 'tu_secreto_super_seguro_cambiar_en_produccion';

        const token = jwt.sign(
            {
                id: usuario_id,
                rol_id: rol_id,  // ✅ Incluir rol_id en el token
                tipo_usuario: tipo_usuario,
                email: emailFinal.toLowerCase()
            },
            jwtSecret,
            { expiresIn: '24h' }
        );

        const refreshToken = jwt.sign(
            { id: usuario_id },
            jwtSecret,
            { expiresIn: '7d' }
        );

        return res.status(201).json({
            message: 'Usuario registrado exitosamente. Por favor verifica tu email.',
            user: {
                id: usuario_id,
                nombre: nombre,
                apellido: apellidoFinal,
                email: emailFinal.toLowerCase(),
                tipo_usuario: tipo_usuario,
                rol_id: rol_id,  // ✅ CRÍTICO: Enviar rol_id al frontend
                activo: 1,
                email_verificado: 0
            },
            token,
            refreshToken,
            requireEmailVerification: true,
            email: emailFinal
        });

    } catch (error: any) {
        console.error('❌ Error en registro:', error);
        return res.status(500).json({
            message: 'Error al registrar usuario',
            error: error.message
        });
    }
};

// VERIFICAR SESIÓN
export const verificarSesion = async (req: AuthRequest, res: Response) => {
    try {
        const usuario_id = req.usuario_id;

        if (!usuario_id) {
            return res.status(401).json({
                message: 'Token inválido'
            });
        }

        const pool = getConnection();

        const [rows] = await pool.query(
            'SELECT * FROM usuarios WHERE id = ? AND activo = 1',
            [usuario_id]
        );

        if ((rows as any[]).length === 0) {
            return res.status(404).json({
                message: 'Usuario no encontrado'
            });
        }

        const usuario = (rows as any[])[0];

        return res.status(200).json({
            message: 'Sesión válida',
            user: {
                id: usuario.id,
                nombre: usuario.nombre,
                apellido: usuario.apellido,
                email: usuario.email,
                telefono: usuario.telefono,
                fecha_nacimiento: usuario.fecha_nacimiento,
                tipo_usuario: usuario.tipo_usuario,
                rol_id: usuario.rol_id,
                activo: usuario.activo,
                fecha_registro: usuario.fecha_registro
            }
        });

    } catch (error) {
        console.error('❌ Error en verificar sesión:', error);
        return res.status(500).json({
            message: 'Error en el servidor',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};

// VERIFICAR CUENTA POR EMAIL
export const verificarCuenta = async (req: Request, res: Response) => {
    const { email, codigo } = req.body;

    console.log('🔐 Verificando cuenta:', email, 'con código:', codigo);

    if (!email || !codigo) {
        return res.status(400).json({
            message: 'Email y código son requeridos'
        });
    }

    try {
        const pool = getConnection();

        const [rows] = await pool.query(
            'SELECT * FROM usuarios WHERE email = ? AND codigo_verificacion = ? AND fecha_expiracion_codigo > NOW()',
            [email, codigo]
        );

        if ((rows as any[]).length === 0) {
            console.log('❌ Código inválido o expirado');
            return res.status(400).json({
                message: 'Código de verificación inválido o expirado'
            });
        }

        const usuario = (rows as any[])[0];
        console.log('✅ Usuario verificado:', usuario.email);

        // Actualizar usuario como verificado
        await pool.query(
            'UPDATE usuarios SET email_verificado = 1, codigo_verificacion = NULL, fecha_expiracion_codigo = NULL WHERE id = ?',
            [usuario.id]
        );

        return res.status(200).json({
            message: '¡Cuenta verificada exitosamente!',
            user: {
                id: usuario.id,
                nombre: usuario.nombre,
                apellido: usuario.apellido,
                email: usuario.email,
                tipo_usuario: usuario.tipo_usuario,
                rol_id: usuario.rol_id
            }
        });

    } catch (error) {
        console.error('❌ Error en verificación:', error);
        return res.status(500).json({
            message: 'Error en el servidor',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};

// REENVIAR EMAIL DE VERIFICACIÓN
export const reenviarVerificacion = async (req: Request, res: Response) => {
    const { email } = req.body;

    console.log('📧 Reenviando verificación para:', email);

    if (!email) {
        return res.status(400).json({
            message: 'Email es requerido'
        });
    }

    try {
        const pool = getConnection();

        const [rows] = await pool.query(
            'SELECT * FROM usuarios WHERE email = ? AND email_verificado = 0',
            [email]
        );

        if ((rows as any[]).length === 0) {
            return res.status(404).json({
                message: 'No se encontró una cuenta pendiente de verificación'
            });
        }

        const usuario = (rows as any[])[0];

        // Generar nuevo código
        const nuevoCodigo = Math.floor(100000 + Math.random() * 900000).toString();
        const nuevaExpiracion = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await pool.query(
            'UPDATE usuarios SET codigo_verificacion = ?, fecha_expiracion_codigo = ? WHERE email = ?',
            [nuevoCodigo, nuevaExpiracion, email]
        );

        // Enviar email
        await emailService.enviarEmail({
            to: email,
            subject: 'Código de verificación - MediConnect',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Tu nuevo código de verificación</h2>
                    <div style="background-color: #f8f9fa; padding: 20px; text-align: center; margin: 20px 0;">
                        <div style="font-size: 32px; font-weight: bold; color: #0066cc;">
                            ${nuevoCodigo}
                        </div>
                    </div>
                </div>
            `
        });

        return res.status(200).json({
            message: 'Email de verificación reenviado'
        });

    } catch (error) {
        console.error('❌ Error reenviando verificación:', error);
        return res.status(500).json({
            message: 'Error en el servidor',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};
