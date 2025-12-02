-- Agrega columnas para sintomas, notas y modalidad a la tabla citas si no existen
ALTER TABLE citas
  ADD COLUMN IF NOT EXISTS sintomas TEXT,
  ADD COLUMN IF NOT EXISTS notas TEXT,
  ADD COLUMN IF NOT EXISTS modalidad VARCHAR(50);

-- Puedes ejecutar este script con mysql cliente o desde un script node para aplicar los cambios.
