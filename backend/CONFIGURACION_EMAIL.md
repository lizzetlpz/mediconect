# 📧 Configuración de Notificaciones por Email

## Configuración de Gmail para enviar correos desde la aplicación

### Paso 1: Habilitar la verificación en 2 pasos

1. Ve a tu cuenta de Google: https://myaccount.google.com/security
2. En la sección "Cómo inicias sesión en Google", haz clic en **"Verificación en 2 pasos"**
3. Sigue los pasos para habilitar la verificación en 2 pasos (necesitarás tu teléfono)

### Paso 2: Generar una contraseña de aplicación

1. Una vez habilitada la verificación en 2 pasos, regresa a: https://myaccount.google.com/security
2. Busca la sección **"Contraseñas de aplicaciones"** (aparece después de habilitar la verificación en 2 pasos)
3. Haz clic en **"Contraseñas de aplicaciones"**
4. En "Seleccionar app", elige **"Correo"**
5. En "Seleccionar dispositivo", elige **"Otro (nombre personalizado)"**
6. Escribe un nombre como: `MediConnect App`
7. Haz clic en **"Generar"**
8. Google te mostrará una contraseña de 16 caracteres (algo como: `abcd efgh ijkl mnop`)
9. **COPIA ESTA CONTRASEÑA** (la necesitarás en el siguiente paso)

### Paso 3: Configurar las variables de entorno

1. Abre el archivo `backend/.env`
2. Actualiza las siguientes líneas:

```env
# Configuración de Email (Gmail)
EMAIL_USER=tu_correo@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop
```

**IMPORTANTE:**
- `EMAIL_USER`: Tu correo completo de Gmail (ejemplo: mediconnect.app@gmail.com)
- `EMAIL_PASSWORD`: La contraseña de aplicación de 16 caracteres que generaste en el paso 2 (NO tu contraseña normal de Gmail)

### Paso 4: Reiniciar el servidor

Después de configurar el `.env`, reinicia el servidor backend:

```bash
cd backend
npm run dev
```

o

```bash
npx ts-node src/server.ts
```

### Paso 5: Probar el envío de emails

1. Inicia sesión como paciente en la aplicación
2. Agenda una cita con cualquier médico
3. Completa el formulario de cita y confirma
4. Realiza el pago
5. Revisa el correo del paciente (deberías recibir un email de confirmación)

---

## 📋 Verificación de configuración

El servidor imprimirá en la consola:

✅ **Si está bien configurado:**
```
✅ Configuración de email verificada correctamente
📧 Enviando notificación por email...
✅ Email de confirmación enviado correctamente
```

❌ **Si hay un error:**
```
❌ Error en configuración de email: Invalid login: 535-5.7.8 Username and Password not accepted
```

Esto significa que la contraseña de aplicación no es correcta o no has habilitado la verificación en 2 pasos.

---

## 🔧 Solución de problemas comunes

### Error: "Invalid login: 535-5.7.8"
- **Causa:** Contraseña incorrecta o verificación en 2 pasos no habilitada
- **Solución:** Genera una nueva contraseña de aplicación siguiendo los pasos 1 y 2

### Error: "self signed certificate in certificate chain"
- **Causa:** Problema con certificados SSL
- **Solución:** Esto no debería ocurrir con Gmail, pero si pasa, agrega esto al `.env`:
```env
NODE_TLS_REJECT_UNAUTHORIZED=0
```

### No llega el email
- Revisa la **carpeta de SPAM** del destinatario
- Verifica que el email del paciente esté correcto en la base de datos
- Revisa los logs del servidor para ver si hay errores

### El email se envía pero no se ve bien formateado
- Abre el email en Gmail web (no en la app móvil)
- Algunos clientes de correo pueden no mostrar el HTML correctamente

---

## 📧 Contenido del email de confirmación

El email incluye:

- ✅ Confirmación visual con diseño profesional
- 📋 ID de la cita
- 👨‍⚕️ Nombre del médico
- 🏥 Especialidad del médico
- 📅 Fecha de la cita (formato largo)
- 🕐 Hora de la cita
- 📝 Motivo de la consulta
- 💻 Modalidad (Videollamada o Chat de Texto)
- ⏰ Recordatorio para conectarse 5 minutos antes
- 🔗 Botón para ver las citas en la plataforma

---

## 🚀 Producción

Para producción, considera:

1. **Usar un servicio profesional de emails:**
   - SendGrid (https://sendgrid.com/)
   - Mailgun (https://www.mailgun.com/)
   - Amazon SES (https://aws.amazon.com/ses/)

2. **Crear un email corporativo:**
   - `no-reply@mediconnect.com`
   - `citas@mediconnect.com`
   - `notificaciones@mediconnect.com`

3. **Configurar SPF, DKIM y DMARC** para evitar que los emails caigan en SPAM

---

## 📝 Notas importantes

- ⚠️ Gmail tiene un límite de **500 emails por día** para cuentas gratuitas
- 🔒 NUNCA compartas tu contraseña de aplicación
- 🗑️ Si crees que tu contraseña fue comprometida, revócala y genera una nueva
- 💡 Para desarrollo, Gmail es suficiente. Para producción, usa un servicio profesional
