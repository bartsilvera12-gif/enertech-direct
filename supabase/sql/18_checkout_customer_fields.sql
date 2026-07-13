-- 18_checkout_customer_fields.sql — Checkout: documento (CI/RUC) + email del cliente.
-- APPEND-ONLY / idempotente. Ejecutar con rol owner:
--   npm run db:migrate:18
-- (lee SUPABASE_DB_URL / DIRECT_POSTGRES_URL de .env.local; ver docs/DBA.md)
--
-- Contexto: el checkout persistido (/checkout → create_guest_order) pasa a
-- capturar documento y email. `customers.email` ya existía (01_schema) pero el
-- RPC no lo insertaba; `document` es nuevo. Estos datos son para el pedido
-- interno + la factura + el mensaje de WhatsApp: NO viajan a Fastrax (ope=12
-- solo recibe ped/sku/qtd/gra/pgt).

-- ---------- customers: documento (CI/RUC) ----------
ALTER TABLE enertech.customers ADD COLUMN IF NOT EXISTS document text;

-- ---------- RPC create_guest_order: sumar p_email y p_document ----------
-- Agregar parámetros cambia la firma → hay que DROP + CREATE (no es destructivo
-- de datos; solo reemplaza la función). Los nuevos params van al final con
-- DEFAULT '' para no romper llamadas viejas.
DROP FUNCTION IF EXISTS enertech.create_guest_order(text, text, text, text, text, text, jsonb, bigint);

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
  v_customer_id uuid;
  v_order_id uuid;
  v_order_number text;
  line jsonb;
  tries int := 0;
BEGIN
  IF p_total IS NULL OR p_total < 0 THEN
    RAISE EXCEPTION 'total inválido';
  END IF;

  INSERT INTO enertech.customers (full_name, phone, email, document, city, address, reference, observations)
  VALUES (
    p_full_name,
    p_phone,
    NULLIF(trim(p_email), ''),
    NULLIF(trim(p_document), ''),
    p_city,
    p_address,
    NULLIF(trim(p_reference), ''),
    NULLIF(trim(p_observations), '')
  )
  RETURNING id INTO v_customer_id;

  LOOP
    v_order_number := 'ENT-' || lpad((floor(random() * 900000) + 100000)::int::text, 6, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM enertech.orders o WHERE o.order_number = v_order_number);
    tries := tries + 1;
    IF tries > 30 THEN
      RAISE EXCEPTION 'no se pudo generar order_number único';
    END IF;
  END LOOP;

  INSERT INTO enertech.orders (order_number, customer_id, status, total_amount, currency)
  VALUES (v_order_number, v_customer_id, 'sent_whatsapp', p_total, 'PYG')
  RETURNING id INTO v_order_id;

  FOR line IN SELECT * FROM jsonb_array_elements(coalesce(p_lines, '[]'::jsonb))
  LOOP
    INSERT INTO enertech.order_items (order_id, product_id, product_name, quantity, unit_price)
    VALUES (
      v_order_id,
      NULLIF(line->>'product_id','')::uuid,
      coalesce(line->>'product_name', 'Producto'),
      greatest(1, coalesce((line->>'quantity')::int, 1)),
      greatest(0, coalesce((line->>'unit_price')::bigint, 0))
    );
  END LOOP;

  RETURN jsonb_build_object('order_id', v_order_id, 'order_number', v_order_number);
END;
$$;

GRANT EXECUTE ON FUNCTION enertech.create_guest_order(text, text, text, text, text, text, jsonb, bigint, text, text) TO anon, authenticated;
