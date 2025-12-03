// C:\Users\lizze\medicos\nombre-proyecto\backend\routes\login\auth.routes.ts
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getConnection } from '../../BD/SQLite/database';

const router = Router();

// ✅ Usar la misma clave que en .env y middleware
const JWT_SECRET = process.env.JWT_SECRET || 'tu_secreto_super_seguro_cambiar_en_produccion';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'tu_refresh_secret_cambiar_en_produccion';

const refreshTokens = new Map<string, string>();

// ============================================
// POST /api/auth/register - Registro de usuario
// ============================================
router.post('/register', async (req: Request, res: Response) => {
  try {
    const {
      correo, email,
      contraseña, password,
      nombre, firstName,
      apellido_paterno, apellido, lastName,
      apellido_materno,
      telefono,
      fecha_nacimiento,
      rol, role,
      cedulaProfesional
    } = req.body;

    const emailFinal = correo || email;
    const passwordFinal = contraseña || password;
    const nombreFinal = nombre || firstName;
    const apellidoPaternoFinal = apellido_paterno || apellido || lastName;
    const rolFinal = rol || role;

    console.log('📥 Datos recibidos:', req.body);

    if (!emailFinal || !passwordFinal || !nombreFinal || !apellidoPaternoFinal || !rolFinal) {
      return res.status(400).json({
        message: 'Todos los campos son requeridos (email, password, nombre, apellido_paterno, rol)',
        recibido: req.body
      });
    }

    // Validación especial para doctores: cédula profesional requerida
    if ((rolFinal === 'doctor') && !cedulaProfesional) {
      return res.status(400).json({
        message: 'La cédula profesional es requerida para el registro de doctores',
        recibido: req.body
      });
    }

    let rol_id: number;
    if (rolFinal === 'patient' || rolFinal === 'paciente') {
      rol_id = 2;
    } else if (rolFinal === 'doctor') {
      rol_id = 3;
    } else if (typeof rolFinal === 'number') {
      rol_id = rolFinal;
    } else {
      return res.status(400).json({
        message: 'El rol debe ser "doctor", "paciente" o un rol_id válido'
      });
    }

    const pool = getConnection();

    const [existingUsers] = await pool.query(
      'SELECT usuario_id FROM usuarios WHERE email = ?',
      [emailFinal.toLowerCase()]
    );

    if ((existingUsers as any[]).length > 0) {
      return res.status(400).json({
        message: 'El correo electrónico ya está registrado'
      });
    }

    const [roles] = await pool.query(
      'SELECT rol_id FROM roles WHERE rol_id = ?',
      [rol_id]
    );

    if ((roles as any[]).length === 0) {
      return res.status(400).json({
        message: 'Rol inválido'
      });
    }

    const hashedPassword = await bcrypt.hash(passwordFinal, 10);

    // Generar código de verificación de email
    const codigoVerificacion = Math.floor(100000 + Math.random() * 900000).toString();
    const fechaExpiracion = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

    const [result] = await pool.query(
      `INSERT INTO usuarios
      (nombre, apellido_paterno, apellido_materno, email, contraseña, telefono, fecha_nacimiento, rol_id, activo, email_verificado, codigo_verificacion, fecha_expiracion_codigo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)`,
      [
        nombreFinal,
        apellidoPaternoFinal,
        apellido_materno || null,
        emailFinal.toLowerCase(),
        hashedPassword,
        telefono || null,
        fecha_nacimiento || null,
        rol_id,
        codigoVerificacion,
        fechaExpiracion
      ]
    );

    const usuario_id = (result as any).insertId;
    console.log('✅ Usuario creado con ID:', usuario_id);

    // Si es doctor, registrar en medicos_profesionales
    if (rolFinal === 'doctor' && cedulaProfesional) {
      try {
        await pool.query(
          `INSERT INTO medicos_profesionales
          (usuario_id, especialidad, anos_experiencia, universidad, cedula_profesional, descripcion, tarifa_consulta, creado_en)
          VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            usuario_id,
            'Medicina General', // Especialidad por defecto
            0, // Años de experiencia por defecto
            '', // Universidad vacía por defecto
            cedulaProfesional,
            'Perfil médico nuevo', // Descripción por defecto
            100.00 // Tarifa por defecto
          ]
        );
        console.log('✅ Registro en medicos_profesionales completado para doctor con cédula:', cedulaProfesional);
      } catch (medError) {
        console.error('⚠️ Error registrando en medicos_profesionales:', medError);
        // No fallar el registro completo por esto
      }
    }

    // Enviar email de verificación
    try {
      const { default: emailService } = await import('../../src/services/email.service');

      const emailEnviado = await emailService.enviarEmail({
        to: emailFinal.toLowerCase(),
        subject: 'Verificar tu cuenta en MediConnect',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0066cc;">Bienvenido a MediConnect</h2>
            <p>Hola <strong>${nombreFinal}</strong>,</p>
            <p>Gracias por registrarte en MediConnect. Para completar tu registro, por favor verifica tu correo electrónico.</p>

            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <h3 style="margin: 0; color: #0066cc;">Tu código de verificación:</h3>
              <div style="font-size: 32px; font-weight: bold; color: #0066cc; letter-spacing: 4px; margin: 10px 0;">
                ${codigoVerificacion}
              </div>
            </div>

            <p>Este código expira en <strong>24 horas</strong>.</p>
            <p>Si no solicitaste esta cuenta, puedes ignorar este email.</p>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #6b7280;">MediConnect - Plataforma médica profesional</p>
          </div>
        `
      });

      if (emailEnviado) {
        console.log('✅ Email de verificación enviado a:', emailFinal);
      } else {
        console.log('⚠️ No se pudo enviar email de verificación, pero el usuario se creó correctamente');
      }
    } catch (emailError) {
      console.error('⚠️ Error enviando email de verificación:', emailError);
    }

    // ✅ CAMBIO: usar usuario_id en lugar de userId
    const token = jwt.sign(
      { usuario_id, email: emailFinal.toLowerCase(), rol_id },  // ✅ Cambio aquí
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const refreshToken = jwt.sign(
      { usuario_id },  // ✅ Cambio aquí
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    refreshTokens.set(usuario_id.toString(), refreshToken);

    const [users] = await pool.query(
      'SELECT usuario_id, nombre, apellido_paterno, apellido_materno, email, telefono, fecha_nacimiento, rol_id, activo, email_verificado, fecha_registro FROM usuarios WHERE usuario_id = ?',
      [usuario_id]
    );

    const userResponse = (users as any[])[0];

    res.status(201).json({
      message: 'Usuario registrado exitosamente. Por favor verifica tu email para completar el proceso.',
      user: userResponse,
      token,
      refreshToken,
      requireEmailVerification: true,
      email: emailFinal
    });

  } catch (error: any) {
    console.error('❌ Error en registro:', error);
    res.status(500).json({
      message: 'Error al registrar usuario',
      error: error.message
    });
  }
});

// ============================================
// POST /api/auth/verify-email - Verificación de email
// ============================================
router.post('/verify-email', async (req: Request, res: Response) => {
  try {
    const { email, codigo } = req.body;

    if (!email || !codigo) {
      return res.status(400).json({
        message: 'Email y código son requeridos'
      });
    }

    const pool = getConnection();

    // Buscar usuario con el código
    const [users] = await pool.query(
      'SELECT usuario_id, email_verificado, fecha_expiracion_codigo FROM usuarios WHERE email = ? AND codigo_verificacion = ?',
      [email.toLowerCase(), codigo]
    );

    if ((users as any[]).length === 0) {
      return res.status(400).json({
        message: 'Código de verificación inválido'
      });
    }

    const user = (users as any[])[0];

    // Verificar si ya está verificado
    if (user.email_verificado) {
      return res.status(400).json({
        message: 'El email ya ha sido verificado'
      });
    }

    // Verificar si el código no ha expirado
    if (new Date() > new Date(user.fecha_expiracion_codigo)) {
      return res.status(400).json({
        message: 'El código de verificación ha expirado'
      });
    }

    // Marcar email como verificado
    await pool.query(
      'UPDATE usuarios SET email_verificado = 1, codigo_verificacion = NULL, fecha_expiracion_codigo = NULL WHERE usuario_id = ?',
      [user.usuario_id]
    );

    res.status(200).json({
      message: 'Email verificado exitosamente'
    });

  } catch (error: any) {
    console.error('❌ Error en verificación de email:', error);
    res.status(500).json({
      message: 'Error al verificar email',
      error: error.message
    });
  }
});

// ============================================
// POST /api/auth/login - Inicio de sesión
// ============================================
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { correo, email, contraseña, password } = req.body;

    const emailFinal = correo || email;
    const passwordFinal = contraseña || password;

    console.log('🔐 Intento de login:', emailFinal);

    if (!emailFinal || !passwordFinal) {
      return res.status(400).json({
        message: 'Correo y contraseña son requeridos'
      });
    }

    const pool = getConnection();

    const [users] = await pool.query(
      'SELECT * FROM usuarios WHERE email = ? AND activo = 1',
      [emailFinal.toLowerCase()]
    );

    if ((users as any[]).length === 0) {
      console.log('❌ Usuario no encontrado:', emailFinal);
      return res.status(401).json({
        message: 'Credenciales incorrectas'
      });
    }

    const user = (users as any[])[0];
    console.log('✅ Usuario encontrado:', user.email);

    const isValidPassword = await bcrypt.compare(passwordFinal, user.contraseña);

    if (!isValidPassword) {
      console.log('❌ Contraseña incorrecta');
      return res.status(401).json({
        message: 'Credenciales incorrectas'
      });
    }

    console.log('✅ Contraseña válida');

    // ✅ CAMBIO: usar usuario_id en lugar de userId
    const token = jwt.sign(
      { usuario_id: user.usuario_id, email: user.email, rol_id: user.rol_id },  // ✅ Cambio aquí
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const refreshToken = jwt.sign(
      { usuario_id: user.usuario_id },  // ✅ Cambio aquí
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    refreshTokens.set(user.usuario_id.toString(), refreshToken);

    const { contraseña: _, ...userResponse } = user;

    console.log('✅ Login exitoso');

    res.status(200).json({
      message: 'Login exitoso',
      user: userResponse,
      token,
      refreshToken
    });

  } catch (error: any) {
    console.error('❌ Error en login:', error);
    res.status(500).json({
      message: 'Error al iniciar sesión',
      error: error.message
    });
  }
});

// ============================================
// POST /api/auth/refresh-token - Renovar token
// ============================================
router.post('/refresh-token', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token requerido' });
    }

    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as any;

    // ✅ CAMBIO: usar usuario_id
    const storedToken = refreshTokens.get(decoded.usuario_id.toString());
    if (!storedToken || storedToken !== refreshToken) {
      return res.status(401).json({ message: 'Refresh token inválido' });
    }

    const pool = getConnection();

    const [users] = await pool.query(
      'SELECT usuario_id, nombre, apellido_paterno, apellido_materno, email, rol_id FROM usuarios WHERE usuario_id = ? AND activo = 1',
      [decoded.usuario_id]  // ✅ Cambio aquí
    );

    if ((users as any[]).length === 0) {
      return res.status(401).json({ message: 'Usuario no encontrado' });
    }

    const user = (users as any[])[0];

    // ✅ CAMBIO: usar usuario_id
    const newToken = jwt.sign(
      { usuario_id: user.usuario_id, email: user.email, rol_id: user.rol_id },  // ✅ Cambio aquí
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({ token: newToken });

  } catch (error: any) {
    console.error('❌ Error en refresh token:', error);
    res.status(401).json({ message: 'Refresh token inválido o expirado' });
  }
});

// ============================================
// POST /api/auth/logout - Cerrar sesión
// ============================================
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    if (userId) {
      refreshTokens.delete(userId.toString());
    }

    res.status(200).json({ message: 'Logout exitoso' });
  } catch (error: any) {
    console.error('❌ Error en logout:', error);
    res.status(500).json({ message: 'Error al cerrar sesión' });
  }
});

export default router;
