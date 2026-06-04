-- 18_products_archived_at.sql — Soft-delete para productos Fastrax (APPEND-ONLY).
--
-- Objetivo: permitir "archivar" productos importados de Fastrax en vez de
-- borrarlos físicamente, preservando imágenes, ediciones locales y vínculos
-- con order_items. Productos manuales (Enertech) siguen pudiendo borrarse.
--
-- Reglas: solo ADD COLUMN / CREATE INDEX IF NOT EXISTS. Sin DROP, sin TRUNCATE,
-- sin tocar CHECKs existentes, sin migrar filas históricas.
-- Ejecutar con rol owner/supabase_admin:
--   npm run db:migrate:18

-- ============================================================================
-- products.archived_at
-- ============================================================================
ALTER TABLE enertech.products
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- Index parcial: solo filas archivadas. Acelera filtros "ver archivados" y
-- también ignora la columna por completo cuando es NULL (caso 99%).
CREATE INDEX IF NOT EXISTS idx_products_archived_at
  ON enertech.products (archived_at)
  WHERE archived_at IS NOT NULL;

-- Verificación post-migración (consulta solo, no modifica nada):
--   SELECT column_name, data_type
--   FROM information_schema.columns
--   WHERE table_schema='enertech' AND table_name='products' AND column_name='archived_at';
--   SELECT COUNT(*) FROM enertech.products;
--   SELECT COUNT(*) FROM enertech.products WHERE archived_at IS NOT NULL;
