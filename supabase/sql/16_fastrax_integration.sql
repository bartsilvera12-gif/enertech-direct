-- 16_fastrax_integration.sql — Integración Fastrax (APPEND-ONLY).
-- Solo ADD COLUMN / CREATE INDEX IF NOT EXISTS. Sin DROP, sin TRUNCATE, sin tocar
-- el CHECK de enertech.orders.status ni datos existentes.
-- Ejecutar con rol owner/supabase_admin:
--   npm run db:migrate:16
-- (lee SUPABASE_DB_URL / DIRECT_POSTGRES_URL de .env.local; ver docs/DBA.md)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- products: vínculo + snapshot Fastrax ----------
-- fastrax_stock / fastrax_price se guardan SEPARADOS de stock/price para no
-- pisar lo curado por el admin. La publicación sigue gobernada por is_active.
ALTER TABLE enertech.products ADD COLUMN IF NOT EXISTS fastrax_sku          text;
ALTER TABLE enertech.products ADD COLUMN IF NOT EXISTS fastrax_enabled      boolean NOT NULL DEFAULT false;
ALTER TABLE enertech.products ADD COLUMN IF NOT EXISTS fastrax_raw          jsonb;
ALTER TABLE enertech.products ADD COLUMN IF NOT EXISTS fastrax_crc          text;
ALTER TABLE enertech.products ADD COLUMN IF NOT EXISTS fastrax_last_sync_at timestamptz;
ALTER TABLE enertech.products ADD COLUMN IF NOT EXISTS fastrax_stock        integer;
ALTER TABLE enertech.products ADD COLUMN IF NOT EXISTS fastrax_price        numeric;

-- Lookup por SKU remoto. No único: Fastrax puede repetir SKU entre variantes;
-- volver único más adelante si se confirma unicidad.
CREATE INDEX IF NOT EXISTS idx_products_fastrax_sku
  ON enertech.products (fastrax_sku) WHERE fastrax_sku IS NOT NULL;

-- ---------- orders: pedido remoto Fastrax + idempotencia ----------
ALTER TABLE enertech.orders ADD COLUMN IF NOT EXISTS fastrax_order_pdc     text;
ALTER TABLE enertech.orders ADD COLUMN IF NOT EXISTS fastrax_order_status  text;
ALTER TABLE enertech.orders ADD COLUMN IF NOT EXISTS fastrax_order_raw     jsonb;
ALTER TABLE enertech.orders ADD COLUMN IF NOT EXISTS fastrax_order_sent_at timestamptz;

-- Idempotencia: un pdc Fastrax mapea a lo sumo a un pedido local.
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_fastrax_pdc
  ON enertech.orders (fastrax_order_pdc) WHERE fastrax_order_pdc IS NOT NULL;
