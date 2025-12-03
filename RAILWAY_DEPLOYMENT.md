# 🚀 Despliegue en Railway - MediConnect

## Pasos para desplegar el backend en Railway

### 1. Preparar GitHub
1. Crear repositorio en GitHub
2. Subir todo el código (sin .env)
3. Verificar que .gitignore esté configurado

### 2. Configurar Railway
1. Ir a [railway.app](https://railway.app)
2. Conectar con GitHub
3. Seleccionar el repositorio
4. Railway detectará automáticamente Node.js

### 3. Configurar Base de Datos
1. En Railway dashboard, agregar MySQL
2. Railway generará automáticamente las credenciales
3. Copiar las credenciales de conexión

### 4. Variables de Entorno en Railway
Agregar estas variables en Railway Settings > Variables:

```bash
# JWT Configuration
JWT_SECRET=tu_jwt_secreto_super_seguro_para_produccion
JWT_REFRESH_SECRET=tu_refresh_secreto_super_seguro_para_produccion

# Server
PORT=3000
NODE_ENV=production

# Database (Railway generará estos valores automáticamente)
DB_HOST=containers-us-west-XX.railway.app
DB_USER=root
DB_PASSWORD=tu_password_de_railway
DB_NAME=railway
DB_PORT=3306

# Email
EMAIL_USER=tu_correo@gmail.com
EMAIL_PASSWORD=tu_contraseña_de_aplicacion

# CORS
FRONTEND_URL=https://tu-frontend-url
CORS_ORIGINS=https://tu-frontend-url
```

### 5. Configurar Base de Datos
1. Conectar a MySQL de Railway
2. Ejecutar scripts de creación de tablas
3. Importar datos existentes si es necesario

### 6. Actualizar Frontend
Cambiar las URLs del frontend para apuntar a Railway:

```typescript
// En los servicios Angular
private apiUrl = 'https://tu-app-backend.up.railway.app/api';
```

### 7. Verificar Deployment
1. Railway automáticamente desplegará
2. Verificar logs en Railway dashboard
3. Probar endpoints: `https://tu-app.up.railway.app/api/health`

## URLs importantes después del deployment:
- **Backend API**: `https://tu-app.up.railway.app`
- **Health Check**: `https://tu-app.up.railway.app/api/health`
- **Railway Dashboard**: Para monitorear logs y métricas

## Troubleshooting
- **Error de conexión DB**: Verificar credenciales en variables de entorno
- **CORS errors**: Agregar frontend URL a CORS_ORIGINS
- **500 errors**: Revisar logs en Railway dashboard
