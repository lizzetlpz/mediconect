#!/usr/bin/env powershell
# Script para diagnosticar y hacer pruebas al backend

Write-Host "`n" + "="*70 -ForegroundColor Cyan
Write-Host "🔧 DIAGNÓSTICO COMPLETO DEL BACKEND - MEDICONNECT" -ForegroundColor Yellow
Write-Host "="*70 -ForegroundColor Cyan

# 1. Verificar que el servidor está corriendo
Write-Host "`n1️⃣  VERIFICANDO SI EL SERVIDOR ESTÁ CORRIENDO..." -ForegroundColor Green
$port3000 = netstat -ano | findstr :3000
if ($port3000) {
    Write-Host "   ✅ Servidor corriendo en puerto 3000" -ForegroundColor Green
} else {
    Write-Host "   ❌ Servidor NO está corriendo en puerto 3000" -ForegroundColor Red
    Write-Host "   Inicia el backend con: cd backend && npm run dev" -ForegroundColor Yellow
}

# 2. Hacer una prueba GET simple
Write-Host "`n2️⃣  HACIENDO PRUEBA GET A http://localhost:3000..." -ForegroundColor Green
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -ErrorAction Stop
    Write-Host "   ✅ Servidor responde correctamente" -ForegroundColor Green
    Write-Host "   Respuesta: $($response.Content)" -ForegroundColor Cyan
} catch {
    Write-Host "   ❌ El servidor no responde" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
}

# 3. Verificar que tenemos usuarios en la BD (para obtener un token)
Write-Host "`n3️⃣  VERIFICANDO USUARIOS EN LA BD..." -ForegroundColor Green
Write-Host "   Los usuarios de prueba son:" -ForegroundColor Cyan
Write-Host "   - Email: zamamoreno62@gmail.com (Paciente)" -ForegroundColor Cyan
Write-Host "   - Email: 1234@gmail.com (Doctor)" -ForegroundColor Cyan

# 4. Intentar login para obtener token
Write-Host "`n4️⃣  INTENTANDO LOGIN..." -ForegroundColor Green
$loginData = @{
    email = "zamamoreno62@gmail.com"
    contraseña = "123456"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginData `
        -ErrorAction Stop

    $token = ($loginResponse.Content | ConvertFrom-Json).token
    Write-Host "   ✅ Login exitoso" -ForegroundColor Green
    Write-Host "   Token obtenido: $($token.Substring(0, 20))..." -ForegroundColor Cyan

    # 5. Hacer una prueba autenticada - GET consultas
    Write-Host "`n5️⃣  HACIENDO PRUEBA GET AUTENTICADA A /api/consultas..." -ForegroundColor Green
    $headers = @{
        "Authorization" = "Bearer $token"
    }

    try {
        $consultasResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/consultas" `
            -Method GET `
            -Headers $headers `
            -ErrorAction Stop

        Write-Host "   ✅ Consultas obtenidas correctamente" -ForegroundColor Green
        $consultasData = $consultasResponse.Content | ConvertFrom-Json
        Write-Host "   Total de consultas: $($consultasData.Count)" -ForegroundColor Cyan

    } catch {
        Write-Host "   ❌ Error al obtener consultas" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }

    # 6. Intentar crear una consulta de prueba
    Write-Host "`n6️⃣  INTENTANDO CREAR UNA CONSULTA DE PRUEBA..." -ForegroundColor Green

    # Primero obtener el usuario_id del token decodificado
    $consultaData = @{
        doctor_id = 2
        paciente_id = 1
        tipo = "videollamada"
        estado = "programada"
        titulo = "Consulta de prueba"
        descripcion = "Esta es una consulta de prueba"
        programada_en = (Get-Date).AddDays(1).ToString("yyyy-MM-dd HH:mm:ss")
    } | ConvertTo-Json

    try {
        $crearResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/consultas" `
            -Method POST `
            -ContentType "application/json" `
            -Headers $headers `
            -Body $consultaData `
            -ErrorAction Stop

        Write-Host "   ✅ Consulta creada exitosamente" -ForegroundColor Green
        $consultaResult = $crearResponse.Content | ConvertFrom-Json
        Write-Host "   ID de consulta: $($consultaResult.consulta_id)" -ForegroundColor Cyan

    } catch {
        Write-Host "   ❌ Error al crear consulta" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
        $errorBody = $_.ErrorDetails.Message
        Write-Host "   Detalles: $errorBody" -ForegroundColor Red
    }

} catch {
    Write-Host "   ❌ Error en login" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
}

Write-Host "`n" + "="*70 -ForegroundColor Cyan
Write-Host "✅ DIAGNÓSTICO COMPLETADO" -ForegroundColor Green
Write-Host "="*70 -ForegroundColor Cyan
