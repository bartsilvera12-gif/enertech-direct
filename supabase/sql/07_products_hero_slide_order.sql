-- Orden explícito en el carrusel del home (solo tiene efecto junto con featured + imagen).

ALTER TABLE enertech.products
  ADD COLUMN IF NOT EXISTS hero_slide_order integer;

COMMENT ON COLUMN enertech.products.hero_slide_order IS
  'Prioridad en el slider del hero (menor = más a la izquierda). NULL = después de los que tienen número; desempate created_at.';

CREATE INDEX IF NOT EXISTS idx_products_hero_slide_order
  ON enertech.products (featured, hero_slide_order NULLS LAST, created_at DESC)
  WHERE is_active = true AND featured = true;
