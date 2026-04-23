-- enertech.products: columnas usadas por adminProductService + import Excel.
-- Solo ADD IF NOT EXISTS; sin DROP.

ALTER TABLE enertech.products ADD COLUMN IF NOT EXISTS warehouse text;
ALTER TABLE enertech.products ADD COLUMN IF NOT EXISTS article_type text;
ALTER TABLE enertech.products ADD COLUMN IF NOT EXISTS situation text;
ALTER TABLE enertech.products ADD COLUMN IF NOT EXISTS range_label text;
