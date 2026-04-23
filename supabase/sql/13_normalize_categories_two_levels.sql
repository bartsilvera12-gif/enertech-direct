-- Normaliza jerarquía a exactamente 2 niveles (sin borrar datos útiles).
-- A) Sube enlaces profundos: hijo → abuelo hasta que todos los padres sean raíz o null.
-- B) Productos que tenían category_id apuntando a una fila sub: pasan esa fila a subcategory_id y la raíz a category_id.

DO $$
DECLARE
  n integer;
BEGIN
  LOOP
    UPDATE enertech.categories AS child
    SET parent_id = parent.parent_id
    FROM enertech.categories AS parent
    WHERE child.parent_id = parent.id
      AND parent.parent_id IS NOT NULL;
    GET DIAGNOSTICS n = ROW_COUNT;
    EXIT WHEN n = 0;
  END LOOP;
END $$;

UPDATE enertech.products AS p
SET
  category_id = r.id,
  subcategory_id = sub.id
FROM enertech.categories AS sub
JOIN enertech.categories AS r ON r.id = sub.parent_id
WHERE p.category_id = sub.id
  AND sub.parent_id IS NOT NULL;
