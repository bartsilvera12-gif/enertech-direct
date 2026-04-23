-- Extensión catálogo ENERTECH v2 (categorías jerárquicas + campos comerciales / importación Excel)
-- Ejecutar después de 01_schema_enertech.sql

ALTER TABLE enertech.categories
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES enertech.categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_categories_parent ON enertech.categories(parent_id);

COMMENT ON COLUMN enertech.categories.parent_id IS 'NULL = categoría raíz; FK a categoría padre para subcategorías';

ALTER TABLE enertech.products
  ADD COLUMN IF NOT EXISTS code text;

ALTER TABLE enertech.products
  ADD COLUMN IF NOT EXISTS brand text;

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

CREATE UNIQUE INDEX IF NOT EXISTS products_code_unique ON enertech.products (code)
  WHERE code IS NOT NULL AND length(trim(code)) > 0;

CREATE INDEX IF NOT EXISTS idx_products_brand ON enertech.products (brand);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON enertech.products (supplier);
CREATE INDEX IF NOT EXISTS idx_products_warehouse ON enertech.products (warehouse);
CREATE INDEX IF NOT EXISTS idx_products_subcategory ON enertech.products (subcategory_id);
