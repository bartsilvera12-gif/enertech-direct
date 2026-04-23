-- URL principal opcional en la fila del producto (además de product_images).
-- Prioridad en la app: image_url → primera imagen en product_images.

ALTER TABLE enertech.products
  ADD COLUMN IF NOT EXISTS image_url text;

COMMENT ON COLUMN enertech.products.image_url IS 'Imagen principal opcional; si es NULL se usa la primera fila en product_images por sort_order.';
