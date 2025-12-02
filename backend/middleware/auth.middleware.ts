// backend/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
    usuario_id?: number;
    rol_id?: number;
}

export const verificarToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];

    console.log('\n' + '='.repeat(60));
    console.log('🔐 VERIFICANDO TOKEN JWT');
    console.log('='.repeat(60));

    if (!authHeader) {
        console.log('❌ No se proporcionó header Authorization');
        console.log('='.repeat(60) + '\n');
        return res.status(401).json({
            message: 'Token no proporcionado'
        });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        console.log('❌ Header Authorization mal formado');
        console.log('Header recibido:', authHeader);
        console.log('='.repeat(60) + '\n');
        return res.status(401).json({
            message: 'Token mal formado'
        });
    }

    console.log('📝 Token recibido:', token.substring(0, 20) + '...');

    try {
        // ✅ Usar el mismo JWT_SECRET que en login.routes.ts
        const jwtSecret = process.env.JWT_SECRET || 'tu_secreto_super_seguro_cambiar_en_produccion';
        const decoded: any = jwt.verify(token, jwtSecret);

        console.log('✅ ¡TOKEN VÁLIDO!');
        console.log('✅ Token decodificado correctamente');
        console.log('━'.repeat(60));
        console.log('👤 Usuario ID:', decoded.usuario_id);
        console.log('📧 Email:', decoded.email);
        console.log('🎭 Rol ID:', decoded.rol_id);
        console.log('⏰ Expira en:', new Date(decoded.exp * 1000).toLocaleString());
        console.log('━'.repeat(60));

        req.usuario_id = decoded.usuario_id;
        req.rol_id = decoded.rol_id;

        console.log('✅ Autenticación completada exitosamente');
        console.log('='.repeat(60) + '\n');

        next();
    } catch (error) {
        console.error('\n' + '❌'.repeat(30));
        console.error('❌ ERROR AL VERIFICAR TOKEN');
        console.error('❌'.repeat(30));

        if (error instanceof jwt.TokenExpiredError) {
            console.error('❌ Tipo: Token expirado');
            console.error('⏰ Expiró en:', new Date(error.expiredAt).toLocaleString());
            console.log('='.repeat(60) + '\n');
            return res.status(401).json({
                message: 'Token expirado'
            });
        }

        if (error instanceof jwt.JsonWebTokenError) {
            console.error('❌ Tipo: Token inválido');
            console.error('📝 Detalle:', error.message);
            console.log('='.repeat(60) + '\n');
            return res.status(401).json({
                message: 'Token inválido'
            });
        }

        console.error('❌ Tipo: Error desconocido');
        console.error('📝 Detalle:', error instanceof Error ? error.message : 'Error desconocido');
        console.log('='.repeat(60) + '\n');
        return res.status(401).json({
            message: 'Error de autenticación'
        });
    }
};
