import pool from './BD/SQLite/database';

async function checkAndCleanUsers() {
  try {
    console.log('🔍 Verificando usuarios en la base de datos...\n');

    // Mostrar todos los usuarios
    const [users]: any = await pool.query(
      'SELECT usuario_id, nombre, email, rol_id, email_verificado, fecha_registro FROM usuarios ORDER BY usuario_id DESC LIMIT 10'
    );

    console.log('📋 ÚLTIMOS 10 USUARIOS REGISTRADOS:');
    console.table(users);

    // Preguntar si quiere eliminar alguno
    console.log('\n💡 Para eliminar un usuario específico por email, ejecuta:');
    console.log('   DELETE FROM usuarios WHERE email = "email@example.com";');

    console.log('\n⚠️  Para eliminar TODOS los usuarios de prueba (email temporal), ejecuta:');
    console.log('   DELETE FROM usuarios WHERE email LIKE "%@cexch.com" OR email LIKE "%@bialode.com";');

    await pool.end();
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkAndCleanUsers();
