-- Enertech: alineación schema ↔ app (solo ADD IF NOT EXISTS / CREATE IF NOT EXISTS; sin DROP).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- categories ----------
ALTER TABLE enertech.categories
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES enertech.categories(id) ON DELETE SET NULL;

ALTER TABLE enertech.categories
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- ---------- products ----------
ALTER TABLE enertech.products ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE enertech.products ADD COLUMN IF NOT EXISTS hero_slide_order integer;
ALTER TABLE enertech.products ADD COLUMN IF NOT EXISTS specs jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE enertech.products ADD COLUMN IF NOT EXISTS code text;
ALTER TABLE enertech.products ADD COLUMN IF NOT EXISTS supplier text;
ALTER TABLE enertech.products ADD COLUMN IF NOT EXISTS subcategory_id uuid REFERENCES enertech.categories(id) ON DELETE SET NULL;
ALTER TABLE enertech.products ADD COLUMN IF NOT EXISTS meta_title text;
ALTER TABLE enertech.products ADD COLUMN IF NOT EXISTS meta_description text;

ALTER TABLE enertech.products ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
ALTER TABLE enertech.products ADD COLUMN IF NOT EXISTS compare_price numeric;
ALTER TABLE enertech.products ADD COLUMN IF NOT EXISTS gallery jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE enertech.products ADD COLUMN IF NOT EXISTS track_stock boolean NOT NULL DEFAULT true;
ALTER TABLE enertech.products ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- ---------- product_images ----------
CREATE TABLE IF NOT EXISTS enertech.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES enertech.products(id) ON DELETE CASCADE,
  url text NOT NULL,
  sort_order integer DEFAULT 0,
  alt text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product ON enertech.product_images(product_id);

-- ---------- índices ----------
CREATE INDEX IF NOT EXISTS idx_products_featured ON enertech.products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_hero ON enertech.products(hero_slide_order);
