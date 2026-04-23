-- Alineación con instancias Enertech que ya tienen products “legacy” (is_featured, compare_price, gallery jsonb).
-- Idempotente: solo añade lo que falta.
--
-- Si falla con «must be owner», ejecutarlo como ownersuperuser del cluster (ej. desde psql como postgres).

ALTER TABLE enertech.categories
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES enertech.categories(id) ON DELETE SET NULL;

ALTER TABLE enertech.categories
  ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0;

ALTER TABLE enertech.products
  ADD COLUMN IF NOT EXISTS code text;

ALTER TABLE enertech.products
  ADD COLUMN IF NOT EXISTS subcategory_id uuid REFERENCES enertech.categories(id) ON DELETE SET NULL;

ALTER TABLE enertech.products
  ADD COLUMN IF NOT EXISTS supplier text;

ALTER TABLE enertech.products
  ADD COLUMN IF NOT EXISTS warehouse text;

ALTER TABLE enertech.products
  ADD COLUMN IF NOT EXISTS article_type text;

ALTER TABLE enertech.products
  ADD COLUMN IF NOT EXISTS situation text;

ALTER TABLE enertech.products
  ADD COLUMN IF NOT EXISTS range_label text;

ALTER TABLE enertech.products
  ADD COLUMN IF NOT EXISTS specs jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE enertech.products
  ADD COLUMN IF NOT EXISTS hero_slide_order integer;

CREATE TABLE IF NOT EXISTS enertech.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES enertech.products(id) ON DELETE CASCADE,
  url text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  alt text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product ON enertech.product_images(product_id);
