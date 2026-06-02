-- 17_fastrax_external_phase2.sql — Fase 2 integración Fastrax (APPEND-ONLY).
--
-- Objetivo: adoptar el modelo `external_*` genérico (compatible con futuras
-- integraciones) y agregar la tabla `fastrax_order_map`. Mantiene intactas las
-- columnas `fastrax_*` creadas por 16_fastrax_integration.sql (compat hacia
-- atrás) y no toca datos existentes.
--
-- Reglas: solo ADD COLUMN / CREATE INDEX / CREATE TABLE IF NOT EXISTS. Sin DROP,
-- sin TRUNCATE, sin tocar CHECKs existentes, sin migrar filas históricas.
-- Ejecutar con rol owner/supabase_admin:
--   npm run db:migrate:17
-- (lee SUPABASE_DB_URL / DIRECT_POSTGRES_URL de .env.local; ver docs/DBA.md)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- products: capa external_* + imágenes Fastrax + atributos del proveedor
-- ============================================================================
ALTER TABLE enertech.products ADD COLUMN IF NOT EXISTS product_source_type  text NOT NULL DEFAULT 'enertech';
ALTER TABLE enertech.products ADD COLUMN IF NOT EXISTS external_provider    text;
ALTER TABLE enertech.products ADD COLUMN IF NOT EXISTS external_product_id  text;
ALTER TABLE enertech.products ADD COLUMN IF NOT EXISTS external_sku         text;
ALTER TABLE enertech.products ADD COLUMN IF NOT EXISTS external_payload     jsonb;
ALTER TABLE enertech.products ADD COLUMN IF NOT EXISTS external_sync_crc    text;
ALTER TABLE enertech.products ADD COLUMN IF NOT EXISTS external_last_sync_at timestamptz;
ALTER TABLE enertech.products ADD COLUMN IF NOT EXISTS external_active      boolean;
ALTER TABLE enertech.products ADD COLUMN IF NOT EXISTS external_image_url   text;
ALTER TABLE enertech.products ADD COLUMN IF NOT EXISTS external_images      jsonb;
ALTER TABLE enertech.products ADD COLUMN IF NOT EXISTS external_brand       text;
ALTER TABLE enertech.products ADD COLUMN IF NOT EXISTS external_category    text;

-- CHECK soft: solo restringe a valores conocidos (extensible). Si no existe.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'enertech'
      AND table_name   = 'products'
      AND constraint_name = 'products_source_type_chk'
  ) THEN
    ALTER TABLE enertech.products
      ADD CONSTRAINT products_source_type_chk
      CHECK (product_source_type IN ('enertech','fastrax'));
  END IF;
END
$$;

-- Lookup principal: (provider, product_id) único cuando ambos están definidos.
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_external_provider_product_id
  ON enertech.products (external_provider, external_product_id)
  WHERE external_provider IS NOT NULL AND external_product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_external_sku
  ON enertech.products (external_provider, external_sku)
  WHERE external_provider IS NOT NULL AND external_sku IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_source_type
  ON enertech.products (product_source_type);

-- ============================================================================
-- order_items: trazabilidad de líneas que llegan a Fastrax
-- ============================================================================
ALTER TABLE enertech.order_items ADD COLUMN IF NOT EXISTS external_provider text;
ALTER TABLE enertech.order_items ADD COLUMN IF NOT EXISTS external_sku      text;
ALTER TABLE enertech.order_items ADD COLUMN IF NOT EXISTS line_status       text;

CREATE INDEX IF NOT EXISTS idx_order_items_external_provider
  ON enertech.order_items (external_provider) WHERE external_provider IS NOT NULL;

-- ============================================================================
-- fastrax_order_map: estado y payload del pedido en Fastrax (1:1 con orders)
-- ============================================================================
CREATE TABLE IF NOT EXISTS enertech.fastrax_order_map (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id             uuid NOT NULL REFERENCES enertech.orders(id) ON DELETE CASCADE,
  status               text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','syncing','succeeded','failed')),
  fastrax_status       text,
  fastrax_order_id     text,
  fastrax_ped          text,
  fastrax_pdc          text,
  fastrax_sit          text,
  fastrax_status_code  int,
  fastrax_status_label text,
  payload              jsonb,
  response             jsonb,
  invoice_response     jsonb,
  last_error           text,
  last_sync_at         timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_fastrax_order_map_order_id
  ON enertech.fastrax_order_map (order_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_fastrax_order_map_pdc
  ON enertech.fastrax_order_map (fastrax_pdc) WHERE fastrax_pdc IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fastrax_order_map_status
  ON enertech.fastrax_order_map (status, updated_at DESC);

-- RLS + grants alineados a orders (solo admin)
ALTER TABLE enertech.fastrax_order_map ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'enertech'
      AND tablename  = 'fastrax_order_map'
      AND policyname = 'fastrax_order_map_admin_all'
  ) THEN
    CREATE POLICY fastrax_order_map_admin_all ON enertech.fastrax_order_map
      FOR ALL TO authenticated
      USING (enertech.is_admin())
      WITH CHECK (enertech.is_admin());
  END IF;
END
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON enertech.fastrax_order_map TO authenticated;
GRANT ALL ON enertech.fastrax_order_map TO service_role;

-- Trigger trivial para updated_at (idempotente).
CREATE OR REPLACE FUNCTION enertech.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS
$$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_fastrax_order_map_updated_at'
  ) THEN
    CREATE TRIGGER trg_fastrax_order_map_updated_at
      BEFORE UPDATE ON enertech.fastrax_order_map
      FOR EACH ROW EXECUTE FUNCTION enertech.touch_updated_at();
  END IF;
END
$$;

-- ============================================================================
-- Verificaciones recomendadas (ejecutar manualmente luego de aplicar):
--   SELECT column_name FROM information_schema.columns
--    WHERE table_schema='enertech' AND table_name='products'
--      AND column_name LIKE 'external_%';
--   SELECT count(*) FROM enertech.fastrax_order_map;
-- ============================================================================
