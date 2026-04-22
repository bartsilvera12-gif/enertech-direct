-- Schema fijo Enertech (Supabase self-hosted / Postgres)
-- Ejecutar como superuser o postgres. Requiere extensión pgcrypto.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE SCHEMA IF NOT EXISTS enertech;

-- ---------- Tablas ----------
CREATE TABLE enertech.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT categories_slug_chk CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

CREATE TABLE enertech.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES enertech.categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  sku text,
  short_description text,
  description text,
  price bigint NOT NULL CHECK (price >= 0),
  compare_at_price bigint CHECK (compare_at_price IS NULL OR compare_at_price >= 0),
  stock int NOT NULL DEFAULT 0 CHECK (stock >= 0),
  featured boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  specs jsonb NOT NULL DEFAULT '{}'::jsonb,
  seo_title text,
  seo_description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT products_slug_chk CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

CREATE INDEX idx_products_category ON enertech.products(category_id);
CREATE INDEX idx_products_active_slug ON enertech.products(is_active, slug);
CREATE INDEX idx_products_created ON enertech.products(created_at DESC);

CREATE TABLE enertech.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES enertech.products(id) ON DELETE CASCADE,
  url text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  alt text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_images_product ON enertech.product_images(product_id);

CREATE TABLE enertech.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  phone text NOT NULL,
  full_name text NOT NULL,
  city text NOT NULL,
  address text NOT NULL,
  reference text,
  observations text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_phone ON enertech.customers(phone);

CREATE TABLE enertech.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  customer_id uuid NOT NULL REFERENCES enertech.customers(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'sent_whatsapp'
    CHECK (status IN ('draft','sent_whatsapp','confirmed','cancelled','delivered')),
  total_amount bigint NOT NULL CHECK (total_amount >= 0),
  currency text NOT NULL DEFAULT 'PYG',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_created ON enertech.orders(created_at DESC);

CREATE TABLE enertech.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES enertech.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES enertech.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity int NOT NULL CHECK (quantity > 0),
  unit_price bigint NOT NULL CHECK (unit_price >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_items_order ON enertech.order_items(order_id);

CREATE TABLE enertech.store_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE enertech.admin_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- RPC checkout invitado (evita INSERT directo anon en tablas sensibles) ----------
CREATE OR REPLACE FUNCTION enertech.create_guest_order(
  p_full_name text,
  p_phone text,
  p_city text,
  p_address text,
  p_reference text,
  p_observations text,
  p_lines jsonb,
  p_total bigint
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

  INSERT INTO enertech.customers (full_name, phone, city, address, reference, observations)
  VALUES (
    p_full_name,
    p_phone,
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

GRANT EXECUTE ON FUNCTION enertech.create_guest_order(text, text, text, text, text, text, jsonb, bigint) TO anon, authenticated;

-- ---------- RLS ----------
ALTER TABLE enertech.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE enertech.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE enertech.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE enertech.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE enertech.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE enertech.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE enertech.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE enertech.admin_profiles ENABLE ROW LEVEL SECURITY;

-- Helper: es admin del panel
CREATE OR REPLACE FUNCTION enertech.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = enertech, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM enertech.admin_profiles ap WHERE ap.user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION enertech.is_admin() TO anon, authenticated;

-- categories
CREATE POLICY categories_public_read ON enertech.categories
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY categories_admin_all ON enertech.categories
  FOR ALL TO authenticated
  USING (enertech.is_admin())
  WITH CHECK (enertech.is_admin());

-- products
CREATE POLICY products_public_read ON enertech.products
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY products_admin_all ON enertech.products
  FOR ALL TO authenticated
  USING (enertech.is_admin())
  WITH CHECK (enertech.is_admin());

-- product_images
CREATE POLICY product_images_public_read ON enertech.product_images
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM enertech.products p
      WHERE p.id = product_images.product_id AND p.is_active = true
    )
  );

CREATE POLICY product_images_admin_all ON enertech.product_images
  FOR ALL TO authenticated
  USING (enertech.is_admin())
  WITH CHECK (enertech.is_admin());

-- customers / orders / order_items: solo admin (no lectura pública)
CREATE POLICY customers_admin_all ON enertech.customers
  FOR ALL TO authenticated
  USING (enertech.is_admin())
  WITH CHECK (enertech.is_admin());

CREATE POLICY orders_admin_all ON enertech.orders
  FOR ALL TO authenticated
  USING (enertech.is_admin())
  WITH CHECK (enertech.is_admin());

CREATE POLICY order_items_admin_all ON enertech.order_items
  FOR ALL TO authenticated
  USING (enertech.is_admin())
  WITH CHECK (enertech.is_admin());

-- configuración tienda: lectura pública de claves (anon usa número WhatsApp en cliente)
CREATE POLICY store_settings_public_read ON enertech.store_settings
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY store_settings_admin_write ON enertech.store_settings
  FOR INSERT TO authenticated
  WITH CHECK (enertech.is_admin());

CREATE POLICY store_settings_admin_update ON enertech.store_settings
  FOR UPDATE TO authenticated
  USING (enertech.is_admin())
  WITH CHECK (enertech.is_admin());

CREATE POLICY store_settings_admin_delete ON enertech.store_settings
  FOR DELETE TO authenticated
  USING (enertech.is_admin());

-- perfil admin: cada usuario solo ve su fila (login check)
CREATE POLICY admin_profiles_self_select ON enertech.admin_profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ---------- Grants schema ----------
GRANT USAGE ON SCHEMA enertech TO anon, authenticated, service_role;

GRANT SELECT ON ALL TABLES IN SCHEMA enertech TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA enertech TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA enertech TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA enertech GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA enertech GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA enertech GRANT ALL ON TABLES TO service_role;
