-- Tabla de prueba (ejecutar con rol que tenga CREATE en schema enertech).
-- Si falla con "permission denied for schema enertech", un superusuario puede:
--   GRANT USAGE, CREATE ON SCHEMA enertech TO postgres;
-- (ajustar el nombre del rol según tu tenant/pooler.)

CREATE TABLE IF NOT EXISTS enertech.test_cursor_db (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);
