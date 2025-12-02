// routes/login/auth.routes.ts
import { Router } from 'express';
import { login, register, verificarSesion, verificarCuenta, reenviarVerificacion } from '../../src/controllers/auth.controller';
import { verificarToken } from '../../middleware/auth.middleware';

const router = Router();

// Rutas públicas (no requieren autenticación)
router.post('/register', register);
router.post('/login', login);
router.post('/verificar-cuenta', verificarCuenta);
router.post('/reenviar-verificacion', reenviarVerificacion);

// Rutas protegidas (requieren autenticación)
router.get('/verificar-sesion', verificarToken, verificarSesion);

export default router;
