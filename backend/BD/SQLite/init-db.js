const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'mediconnect.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON');

  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id TEXT PRIMARY KEY,
      correo TEXT UNIQUE NOT NULL,
      contraseña TEXT NOT NULL,
      nombre TEXT NOT NULL,
      apellido TEXT,
      rol TEXT CHECK(rol IN ('doctor', 'paciente')) NOT NULL,
      telefono TEXT,
      direccion TEXT,
      ciudad TEXT,
      pais TEXT,
      imagen_perfil TEXT,
      especializacion TEXT,
      numero_licencia TEXT,
      creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
      actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS pacientes (
      id TEXT PRIMARY KEY,
      usuario_id TEXT UNIQUE NOT NULL,
      fecha_nacimiento TEXT,
      genero TEXT,
      tipo_sangre TEXT,
      alergias TEXT,
      condiciones_cronicas TEXT,
      nombre_contacto_emergencia TEXT,
      telefono_contacto_emergencia TEXT,
      relacion_contacto_emergencia TEXT,
      proveedor_seguro TEXT,
      numero_seguro TEXT,
      creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
      actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) {
      console.error('❌ Error:', err);
    } else {
      console.log('✅ Tablas creadas exitosamente');
    }
    db.close();
  });
});
