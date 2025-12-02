import { getConnection } from './BD/SQLite/database';

async function checkDoctors() {
  try {
    console.log('🔍 Revisando médicos en la base de datos...\n');
    
    const pool = getConnection();
    
    // Obtener médicos activos (rol_id = 3)
    const [doctors]: any = await pool.query(
      `SELECT usuario_id, nombre, apellido_paterno, apellido_materno, email, rol_id, activo 
       FROM usuarios 
       WHERE rol_id = 3`
    );
    
    console.log(`📋 Médicos encontrados (rol_id = 3): ${doctors.length}\n`);
    
    if (doctors.length === 0) {
      console.log('⚠️  No hay médicos registrados en la base de datos.');
      console.log('💡 Insertar un médico de prueba:\n');
      console.log(`
        INSERT INTO usuarios 
        (nombre, apellido_paterno, apellido_materno, email, contraseña, rol_id, activo)
        VALUES 
        ('Juan', 'García', 'López', 'juan.doctor@example.com', 'password123', 3, 1);
      `);
    } else {
      console.log('✅ Médicos activos:\n');
      doctors.forEach((doc: any, index: number) => {
        const fullName = `${doc.nombre} ${doc.apellido_paterno || ''} ${doc.apellido_materno || ''}`.trim();
        console.log(`${index + 1}. ${fullName}`);
        console.log(`   ID: ${doc.usuario_id}, Email: ${doc.email}, Rol: ${doc.rol_id}, Activo: ${doc.activo}\n`);
      });
    }
    
    // También revisar todos los usuarios para referencia
    console.log('\n📊 Todos los usuarios en la base de datos:\n');
    const [allUsers]: any = await pool.query(
      `SELECT usuario_id, nombre, apellido_paterno, rol_id, activo 
       FROM usuarios 
       ORDER BY rol_id, usuario_id`
    );
    
    console.log(`Total de usuarios: ${allUsers.length}\n`);
    allUsers.forEach((user: any) => {
      const roleDesc = user.rol_id === 1 ? 'Admin' : user.rol_id === 2 ? 'Paciente' : 'Médico';
      console.log(`${user.usuario_id} | ${user.nombre} ${user.apellido_paterno || ''} | Rol: ${roleDesc} (${user.rol_id}) | Activo: ${user.activo}`);
    });
    
    await pool.end();
    console.log('\n✅ Revisión completada.');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkDoctors();
