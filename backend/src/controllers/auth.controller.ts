// src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getConnection } from '../../BD/SQLite/database';  // ✅ IMPORTAR AQUÍ
import { AuthRequest } from '../../middleware/auth.middleware';
import emailService from '../services/email.service';

// LOGIN
export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    console.log('🔐 Intento de login:', email);

    if (!email || !password) {
        console.log('❌ Faltan campos requeridos');
        return res.status(400).json({
            message: 'Email y contraseña son requeridos'
        });
    }

    try {
        const pool = getConnection();  // ✅ SIN await porque no es async

        // Buscar usuario por email
        const [rows] = await pool.query(
            'SELECT * FROM usuarios WHERE email = ? AND activo = 1',
            [email]
        );

        if ((rows as any[]).length === 0) {
            console.log('❌ Usuario no encontrado:', email);
            return res.status(401).json({
                message: 'Credenciales inválidas'
            });
        }

        const usuario = (rows as any[])[0];
        console.log('✅ Usuario encontrado:', usuario.email);

        // Verificar contraseña con bcrypt
        const contraseñaValida = await bcrypt.compare(password, usuario.contraseña);

        if (!contraseñaValida) {
            console.log('❌ Contraseña incorrecta');
            return res.status(401).json({
                message: 'Credenciales inválidas'
            });
        }

        console.log('✅ Contraseña válida');

        // Generar tokens
        const jwtSecret = process.env.JWT_SECRET || 'tu_secreto';
        const token = jwt.sign(
            {
                usuario_id: usuario.usuario_id,
                rol_id: usuario.rol_id,
                email: usuario.email
            },
            jwtSecret,
            { expiresIn: '24h' }
        );

        const refreshToken = jwt.sign(
            { usuario_id: usuario.usuario_id },
            jwtSecret,
            { expiresIn: '7d' }
        );

        console.log('✅ Tokens generados');

        // Responder con éxito
        return res.status(200).json({
            message: 'Login exitoso',
            user: {
                usuario_id: usuario.usuario_id,
                nombre: usuario.nombre,
                apellido_paterno: usuario.apellido_paterno,
                apellido_materno: usuario.apellido_materno,
                email: usuario.email,
                telefono: usuario.telefono,
                fecha_nacimiento: usuario.fecha_nacimiento,
                rol_id: usuario.rol_id,
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
        apellido_materno,
        email,
        password,
        telefono,
        fecha_nacimiento,
        rol_id = 2 // Por defecto rol de paciente
    } = req.body;

    console.log('📝 Intento de registro:', email);

    if (!nombre || !apellido_paterno || !email || !password) {
        console.log('❌ Faltan campos requeridos');
        return res.status(400).json({
            message: 'Faltan campos requeridos: nombre, apellido_paterno, email, password'
        });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({
            message: 'El formato del correo electrónico no es válido'
        });
    }

    // Validar contraseña mínimo 8 caracteres
    if (password.length < 8) {
        return res.status(400).json({
            message: 'La contraseña debe tener al menos 8 caracteres'
        });
    }

    try {
        const pool = getConnection();  // ✅ SIN await porque no es async

        // Verificar si el email ya existe
        const [emailRows] = await pool.query(
            'SELECT usuario_id FROM usuarios WHERE email = ?',
            [email]
        );

        if ((emailRows as any[]).length > 0) {
            console.log('❌ Email ya registrado:', email);
            return res.status(409).json({
                message: 'El email ya está registrado'
            });
        }

        // Verificar que el rol existe
        const [roleRows] = await pool.query(
            'SELECT * FROM roles WHERE rol_id = ?',
            [rol_id]
        );

        if ((roleRows as any[]).length === 0) {
            return res.status(400).json({
                message: 'Rol inválido'
            });
        }

        // Hashear contraseña con bcrypt
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('✅ Contraseña hasheada');

        // Generar token de verificación
        const tokenVerificacion = crypto.randomBytes(32).toString('hex');
        const expiracionToken = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

        // Guardar en tabla temporal de verificaciones
        await pool.query(
            `INSERT INTO verificaciones_pendientes
            (email, token, nombre, apellido_paterno, apellido_materno, password_hash, telefono, fecha_nacimiento, rol_id, fecha_expiracion)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                email,
                tokenVerificacion,
                nombre,
                apellido_paterno,
                apellido_materno || null,
                hashedPassword,
                telefono || null,
                fecha_nacimiento || null,
                rol_id,
                expiracionToken
            ]
        );

        console.log('✅ Datos guardados en tabla temporal');

        // Enviar email de verificación
        console.log('📧 Enviando email de verificación...');
        const emailEnviado = await emailService.enviarVerificacionCuenta(
            email,
            nombre,
            tokenVerificacion
        );

        if (!emailEnviado) {
            console.warn('⚠️ No se pudo enviar email de verificación');
        }

        return res.status(201).json({
            message: 'Registro iniciado. Revisa tu email para verificar tu cuenta y completar el registro.',
            email: email,
            requiereVerificacion: true,
            emailEnviado
        });

    } catch (error) {
        console.error('❌ Error en registro:', error);
        return res.status(500).json({
            message: 'Error en el servidor',
            error: error instanceof Error ? error.message : 'Error desconocido'
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

        const pool = getConnection();  // ✅ SIN await porque no es async

        // Buscar usuario
        const [rows] = await pool.query(
            'SELECT * FROM usuarios WHERE usuario_id = ? AND activo = 1',
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
                usuario_id: usuario.usuario_id,
                nombre: usuario.nombre,
                apellido_paterno: usuario.apellido_paterno,
                apellido_materno: usuario.apellido_materno,
                email: usuario.email,
                telefono: usuario.telefono,
                fecha_nacimiento: usuario.fecha_nacimiento,
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
    const { token } = req.body;

    console.log('🔐 Verificando cuenta con token:', token?.substring(0, 10) + '...');

    if (!token) {
        return res.status(400).json({
            message: 'Token de verificación es requerido'
        });
    }

    try {
        const pool = getConnection();

        // Buscar en tabla temporal
        const [rows] = await pool.query(
            'SELECT * FROM verificaciones_pendientes WHERE token = ? AND fecha_expiracion > NOW()',
            [token]
        );

        if ((rows as any[]).length === 0) {
            console.log('❌ Token inválido o expirado');
            return res.status(400).json({
                message: 'Token de verificación inválido o expirado'
            });
        }

        const verificacion = (rows as any[])[0];
        console.log('✅ Verificación encontrada para:', verificacion.email);

        // Verificar que el email no esté ya registrado en usuarios
        const [usuariosExistentes] = await pool.query(
            'SELECT usuario_id FROM usuarios WHERE email = ?',
            [verificacion.email]
        );

        if ((usuariosExistentes as any[]).length > 0) {
            // Limpiar tabla temporal
            await pool.query('DELETE FROM verificaciones_pendientes WHERE token = ?', [token]);
            return res.status(409).json({
                message: 'Este email ya está registrado. Puedes iniciar sesión directamente.'
            });
        }

        // Crear usuario en tabla principal
        const [result] = await pool.query(
            `INSERT INTO usuarios
            (nombre, apellido_paterno, apellido_materno, email, contraseña, telefono, fecha_nacimiento, rol_id, activo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [
                verificacion.nombre,
                verificacion.apellido_paterno,
                verificacion.apellido_materno,
                verificacion.email,
                verificacion.password_hash,
                verificacion.telefono,
                verificacion.fecha_nacimiento,
                verificacion.rol_id
            ]
        );

        const usuario_id = (result as any).insertId;
        console.log('✅ Usuario creado definitivamente con ID:', usuario_id);

        // Limpiar tabla temporal
        await pool.query('DELETE FROM verificaciones_pendientes WHERE token = ?', [token]);
        console.log('🗑️ Registro temporal eliminado');

        // Generar tokens de sesión
        const jwtSecret = process.env.JWT_SECRET || 'tu_secreto';
        const authToken = jwt.sign(
            {
                usuario_id: usuario_id,
                rol_id: verificacion.rol_id,
                email: verificacion.email
            },
            jwtSecret,
            { expiresIn: '24h' }
        );

        const refreshToken = jwt.sign(
            { usuario_id: usuario_id },
            jwtSecret,
            { expiresIn: '7d' }
        );

        return res.status(200).json({
            message: '¡Cuenta verificada exitosamente! Tu registro ha sido completado.',
            user: {
                usuario_id: usuario_id,
                nombre: verificacion.nombre,
                apellido_paterno: verificacion.apellido_paterno,
                apellido_materno: verificacion.apellido_materno,
                email: verificacion.email,
                telefono: verificacion.telefono,
                fecha_nacimiento: verificacion.fecha_nacimiento,
                rol_id: verificacion.rol_id,
                activo: 1
            },
            token: authToken,
            refreshToken
        });

    } catch (error) {
        console.error('❌ Error en verificación de cuenta:', error);
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

        // Buscar en tabla temporal
        const [rows] = await pool.query(
            'SELECT * FROM verificaciones_pendientes WHERE email = ?',
            [email]
        );

        if ((rows as any[]).length === 0) {
            return res.status(404).json({
                message: 'No se encontró una cuenta pendiente de verificación con este email'
            });
        }

        const verificacion = (rows as any[])[0];

        // Generar nuevo token
        const nuevoToken = crypto.randomBytes(32).toString('hex');
        const nuevaExpiracion = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // Actualizar token en tabla temporal
        await pool.query(
            'UPDATE verificaciones_pendientes SET token = ?, fecha_expiracion = ? WHERE email = ?',
            [nuevoToken, nuevaExpiracion, email]
        );

        // Enviar email
        const emailEnviado = await emailService.enviarVerificacionCuenta(
            email,
            verificacion.nombre,
            nuevoToken
        );

        return res.status(200).json({
            message: 'Email de verificación reenviado. Revisa tu bandeja de entrada.',
            emailEnviado
        });

    } catch (error) {
        console.error('❌ Error reenviando verificación:', error);
        return res.status(500).json({
            message: 'Error en el servidor',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};
