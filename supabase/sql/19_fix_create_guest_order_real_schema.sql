-- 19_fix_create_guest_order_real_schema.sql
-- Corrige create_guest_order para el ESQUEMA REAL de enertech (modelo tradexpar).
-- Ejecutar como supabase_admin (owner del schema enertech):
--   npm run db:migrate:19   (con SUPABASE_DB_URL owner en .env.local)
--   o pegar este SQL en tu herramienta conectada como supabase_admin.
--
-- Contexto: la migración 18 asumía columnas del repo (orders.total_amount,
-- customers.reference/observations, order_number text) que NO existen en la base
-- real. La tabla `orders` real guarda los datos del cliente DENORMALIZADOS
-- (customer_name/email/phone/document, shipping_*), usa `total` (numeric) y
-- `order_number` bigint autoincremental. Esta función inserta directo en `orders`
-- + `order_items` con las columnas reales. No usa la tabla `customers`.

DROP FUNCTION IF EXISTS enertech.create_guest_order(text, text, text, text, text, text, jsonb, bigint, text, text);

CREATE OR REPLACE FUNCTION enertech.create_guest_order(
  p_full_name text,
  p_phone text,
  p_city text,
  p_address text,
  p_reference text,
  p_observations text,
  p_lines jsonb,
  p_total bigint,
  p_email text DEFAULT '',
  p_document text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = enertech, public
AS $$
DECLARE
  v_order_id uuid;
  v_order_number bigint;
  line jsonb;
  v_qty int;
  v_unit numeric;
BEGIN
  IF p_total IS NULL OR p_total < 0 THEN
    RAISE EXCEPTION 'total inválido';
  END IF;
  IF p_full_name IS NULL OR trim(p_full_name) = '' THEN
    RAISE EXCEPTION 'nombre requerido';
  END IF;

  INSERT INTO enertech.orders (
    customer_name,
    customer_phone,
    customer_document,
    customer_email,
    shipping_city,
    shipping_address,
    shipping_reference,
    status,
    subtotal,
    total,
    currency,
    notes
  )
  VALUES (
    trim(p_full_name),
    NULLIF(trim(p_phone), ''),
    NULLIF(trim(p_document), ''),
    NULLIF(trim(p_email), ''),
    NULLIF(trim(p_city), ''),
    NULLIF(trim(p_address), ''),
    NULLIF(trim(p_reference), ''),
    'pending',
    p_total,
    p_total,
    'PYG',
    NULLIF(trim(p_observations), '')
  )
  RETURNING id, order_number INTO v_order_id, v_order_number;

  FOR line IN SELECT * FROM jsonb_array_elements(coalesce(p_lines, '[]'::jsonb))
  LOOP
    v_qty  := greatest(1, coalesce((line->>'quantity')::int, 1));
    v_unit := greatest(0, coalesce((line->>'unit_price')::numeric, 0));
    INSERT INTO enertech.order_items (
      order_id,
      product_id,
      product_name,
      product_slug,
      sku,
      image_url,
      quantity,
      unit_price,
      total_price
    )
    VALUES (
      v_order_id,
      NULLIF(line->>'product_id', '')::uuid,
      coalesce(line->>'product_name', 'Producto'),
      NULLIF(line->>'product_slug', ''),
      NULLIF(line->>'sku', ''),
      NULLIF(line->>'image_url', ''),
      v_qty,
      v_unit,
      v_unit * v_qty
    );
  END LOOP;

  RETURN jsonb_build_object('order_id', v_order_id, 'order_number', v_order_number::text);
END;
$$;

GRANT EXECUTE ON FUNCTION enertech.create_guest_order(text, text, text, text, text, text, jsonb, bigint, text, text) TO anon, authenticated;
