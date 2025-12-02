-- Agregar columnas a la tabla citas si no existen
ALTER TABLE citas ADD COLUMN IF NOT EXISTS sintomas VARCHAR(1000);
ALTER TABLE citas ADD COLUMN IF NOT EXISTS notas VARCHAR(1000);
ALTER TABLE citas ADD COLUMN IF NOT EXISTS modalidad VARCHAR(50);

-- Verificar que las columnas fueron añadidas
DESCRIBE citas;
