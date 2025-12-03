require('dotenv').config();
const mysql = require('mysql2');

async function crearCitaDePrueba() {
    console.log('📝 Creando cita de prueba para chat...');

    const connection = mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '12345',
        database: process.env.DB_NAME || 'paginaweb'
    });

    try {
        // Buscar un paciente y un médico existentes
        console.log('👥 Buscando usuarios existentes...');

        const [pacientes] = await connection.promise().query(
            'SELECT usuario_id, nombre, apellido_paterno FROM usuarios WHERE rol_id = 2 LIMIT 1'
        );

        const [medicos] = await connection.promise().query(
            'SELECT usuario_id, nombre, apellido_paterno FROM usuarios WHERE rol_id = 3 LIMIT 1'
        );

        if (pacientes.length === 0) {
            console.log('❌ No se encontraron pacientes. Creando uno...');

            const bcrypt = require('bcrypt');
            const hashedPassword = await bcrypt.hash('password123', 10);

            await connection.promise().query(`
                INSERT INTO usuarios
                (nombre, apellido_paterno, email, contraseña, rol_id, activo)
                VALUES ('Paciente', 'Prueba', 'paciente@test.com', ?, 2, 1)
            `, [hashedPassword]);

            console.log('✅ Paciente de prueba creado');
        }

        if (medicos.length === 0) {
            console.log('❌ No se encontraron médicos. Creando uno...');

            const bcrypt = require('bcrypt');
            const hashedPassword = await bcrypt.hash('password123', 10);

            await connection.promise().query(`
                INSERT INTO usuarios
                (nombre, apellido_paterno, email, contraseña, rol_id, activo)
                VALUES ('Dr. Juan', 'Pérez', 'medico@test.com', ?, 3, 1)
            `, [hashedPassword]);

            console.log('✅ Médico de prueba creado');
        }

        // Obtener usuarios actualizada
        const [pacientesActual] = await connection.promise().query(
            'SELECT usuario_id, nombre, apellido_paterno FROM usuarios WHERE rol_id = 2 LIMIT 1'
        );

        const [medicosActual] = await connection.promise().query(
            'SELECT usuario_id, nombre, apellido_paterno FROM usuarios WHERE rol_id = 3 LIMIT 1'
        );

        const paciente = pacientesActual[0];
        const medico = medicosActual[0];

        console.log('👤 Paciente:', `${paciente.nombre} ${paciente.apellido_paterno} (ID: ${paciente.usuario_id})`);
        console.log('👨‍⚕️ Médico:', `${medico.nombre} ${medico.apellido_paterno} (ID: ${medico.usuario_id})`);

        // Crear cita en estado "en_progreso"
        const fechaCita = new Date();
        fechaCita.setHours(fechaCita.getHours() + 1); // 1 hora desde ahora

        const [citaResult] = await connection.promise().query(`
            INSERT INTO citas
            (paciente_id, medico_id, fecha_cita, hora_cita, motivo, estado, modalidad)
            VALUES (?, ?, ?, ?, ?, 'en_progreso', 'texto')
        `, [
            paciente.usuario_id,
            medico.usuario_id,
            fechaCita.toISOString().split('T')[0], // Solo fecha
            fechaCita.toTimeString().split(' ')[0].substring(0, 5), // Solo hora HH:MM
            'Consulta de prueba para chat',
        ]);

        const citaId = citaResult.insertId;

        console.log('📅 Cita creada:');
        console.log(`   ID: ${citaId}`);
        console.log(`   Estado: en_progreso`);
        console.log(`   Modalidad: texto (chat)`);
        console.log(`   Fecha: ${fechaCita.toLocaleDateString()}`);
        console.log(`   Hora: ${fechaCita.toTimeString().split(' ')[0].substring(0, 5)}`);

        console.log('\n🎯 Para probar el chat:');
        console.log(`1. Inicia sesión como paciente: paciente@test.com / password123`);
        console.log(`2. Ve a "Mis Consultas"`);
        console.log(`3. Selecciona la cita ID ${citaId}`);
        console.log(`4. Escribe mensajes en el chat`);
        console.log('\n💡 También puedes iniciar sesión como médico desde otra ventana/navegador');
        console.log(`   Email médico: medico@test.com / password123`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        connection.end();
        process.exit(0);
    }
}

crearCitaDePrueba();
