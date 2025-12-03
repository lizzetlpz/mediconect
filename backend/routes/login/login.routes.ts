// backend/routes/login/login.routes.ts
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
  console.log('🚀 INICIO DE REGISTRO - Datos recibidos:', JSON.stringify(req.body, null, 2));

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

    console.log('📝 Valores procesados:');
    console.log('   Email:', emailFinal);
    console.log('   Password:', passwordFinal ? '***PRESENTE***' : 'AUSENTE');
    console.log('   Nombre:', nombreFinal);
    console.log('   Apellido:', apellidoPaternoFinal);
    console.log('   Rol:', rolFinal);

    if (!emailFinal || !passwordFinal || !nombreFinal || !apellidoPaternoFinal) {
      console.log('❌ Faltan campos obligatorios');
      return res.status(400).json({
        message: 'Todos los campos obligatorios deben ser completados'
      });
    }

    const pool = getConnection();

    // Verificar si el email ya existe
    const [existingUsers] = await pool.query(
      'SELECT usuario_id FROM usuarios WHERE email = ?',
      [emailFinal.toLowerCase()]
    );

    if ((existingUsers as any[]).length > 0) {
      console.log('❌ Email ya registrado');
      return res.status(400).json({
        message: 'Este correo electrónico ya está registrado'
      });
    }

    // Hashear contraseña
    console.log('🔐 Hasheando contraseña...');
    const hashedPassword = await bcrypt.hash(passwordFinal, 10);
    console.log('✅ Contraseña hasheada');

    // Insertar usuario
    // rol_id: 2 = paciente, 3 = medico
    const rol_id = rolFinal === 'doctor' ? 3 : 2;

    const [result] = await pool.query(
      `INSERT INTO usuarios
       (nombre, apellido_paterno, email, contraseña, rol_id, activo, email_verificado)
       VALUES (?, ?, ?, ?, ?, TRUE, TRUE)`,
      [
        nombreFinal,
        apellidoPaternoFinal,
        emailFinal.toLowerCase(),
        hashedPassword,
        rol_id
      ]
    );

    const usuario_id = (result as any).insertId;
    console.log('✅ Usuario creado con ID:', usuario_id);

    // Generar tokens
    const token = jwt.sign(
      { id: usuario_id, email: emailFinal, rol_id },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const refreshToken = jwt.sign(
      { id: usuario_id },
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
      message: 'Usuario registrado exitosamente',
      user: userResponse,
      token,
      refreshToken
    });

  } catch (error: any) {
    console.error('❌ ERROR EN REGISTRO:', error);
    res.status(500).json({
      message: 'Error al registrar usuario',
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

    const token = jwt.sign(
      { id: user.usuario_id, email: user.email, rol_id: user.rol_id },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const refreshToken = jwt.sign(
      { id: user.usuario_id },
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
    const userId = decoded.id;

    if (!refreshTokens.has(userId.toString())) {
      return res.status(401).json({ message: 'Refresh token inválido' });
    }

    const newToken = jwt.sign(
      { id: userId },
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
