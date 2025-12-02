#!/usr/bin/env powershell
# Script simple para verificar si el backend guarda datos en MySQL

param(
    [string]$Token = $null
)

Write-Host "`n" + "="*70 -ForegroundColor Cyan
Write-Host "🧪 PRUEBA DE INSERCIÓN DE DATOS - BACKEND MEDICONNECT" -ForegroundColor Yellow
Write-Host "="*70 -ForegroundColor Cyan

# Si no hay token, intentamos login primero
if (-not $Token) {
    Write-Host "`n1️⃣  INTENTANDO LOGIN PARA OBTENER TOKEN..." -ForegroundColor Green
    
    $loginData = @{
        email = "zamamoreno62@gmail.com"
        contraseña = "123456"
    } | ConvertTo-Json
    
    try {
        $loginResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/login" `
            -Method POST `
            -ContentType "application/json" `
            -Body $loginData `
            -ErrorAction Stop `
            -UseBasicParsing
        
        $loginResult = $loginResponse.Content | ConvertFrom-Json
        $Token = $loginResult.token
        
        Write-Host "   ✅ Login exitoso" -ForegroundColor Green
        Write-Host "   Usuario ID: $($loginResult.usuario_id)" -ForegroundColor Cyan
        Write-Host "   Token: $($Token.Substring(0, 20))..." -ForegroundColor Cyan
        
    } catch {
        Write-Host "   ❌ Error en login" -ForegroundColor Red
        Write-Host "   Detalle: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
        exit 1
    }
}

# Ahora intentamos crear una consulta
Write-Host "`n2️⃣  CREANDO UNA CONSULTA DE PRUEBA..." -ForegroundColor Green

$headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

$consultaData = @{
    doctor_id = 2
    paciente_id = 1
    tipo = "videollamada"
    estado = "programada"
    titulo = "Consulta de prueba desde diagnóstico"
    descripcion = "Esta es una consulta de prueba para verificar que se guarda en MySQL"
    programada_en = (Get-Date).AddDays(3).ToString("yyyy-MM-dd 10:00:00")
} | ConvertTo-Json

Write-Host "   Datos a enviar:" -ForegroundColor Cyan
$consultaData | Write-Host -ForegroundColor Cyan

try {
    $crearResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/consultas" `
        -Method POST `
        -Headers $headers `
        -Body $consultaData `
        -ErrorAction Stop `
        -UseBasicParsing
    
    $resultado = $crearResponse.Content | ConvertFrom-Json
    
    Write-Host "   ✅ Consulta creada exitosamente" -ForegroundColor Green
    Write-Host "   ID: $($resultado.consulta_id)" -ForegroundColor Cyan
    Write-Host "   Mensaje: $($resultado.message)" -ForegroundColor Cyan
    
    $nuevaConsultaId = $resultado.consulta_id
    
    # Ahora verificamos que se guardó en MySQL
    Write-Host "`n3️⃣  VERIFICANDO QUE LA CONSULTA SE GUARDÓ EN MYSQL..." -ForegroundColor Green
    Write-Host "   (Ejecuta esto en MySQL Workbench:)" -ForegroundColor Yellow
    Write-Host "   SELECT * FROM consultas WHERE consulta_id = $nuevaConsultaId;" -ForegroundColor Yellow
    
    # Intentamos recuperar la consulta
    Write-Host "`n4️⃣  INTENTANDO RECUPERAR LA CONSULTA CREADA..." -ForegroundColor Green
    
    try {
        $getResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/consultas/$nuevaConsultaId" `
            -Method GET `
            -Headers $headers `
            -ErrorAction Stop `
            -UseBasicParsing
        
        $consulta = $getResponse.Content | ConvertFrom-Json
        
        Write-Host "   ✅ Consulta recuperada exitosamente" -ForegroundColor Green
        Write-Host "   Datos:" -ForegroundColor Cyan
        $consulta | ConvertTo-Json -Depth 2 | Write-Host -ForegroundColor Cyan
        
    } catch {
        Write-Host "   ❌ Error al recuperar consulta" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "   ❌ Error al crear consulta" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    Write-Host "   Detalles: $($_.Exception.Message)" -ForegroundColor Red
    
    try {
        $errorContent = $_ | ConvertFrom-Json -ErrorAction SilentlyContinue
        if ($errorContent) {
            Write-Host "   Respuesta del servidor: $($errorContent | ConvertTo-Json)" -ForegroundColor Red
        }
    } catch { }
}

Write-Host "`n" + "="*70 -ForegroundColor Cyan
Write-Host "✅ PRUEBA COMPLETADA" -ForegroundColor Green
Write-Host "="*70 -ForegroundColor Cyan
