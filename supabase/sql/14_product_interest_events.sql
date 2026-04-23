-- Eventos de interés por producto (tienda + panel admin).
-- Ejecutar con rol owner / superuser. Replicable cambiando el prefijo schema (enertech).

-- Algunas instancias tienen schema enertech pero sin esta helper (01_schema parcial).
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

CREATE TABLE IF NOT EXISTS enertech.product_interest_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES enertech.products(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('view', 'click', 'search_click')),
  search_term text,
  visitor_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pie_search_term_len CHECK (search_term IS NULL OR char_length(search_term) <= 500),
  CONSTRAINT pie_visitor_len CHECK (char_length(trim(visitor_id)) >= 8)
);

CREATE INDEX IF NOT EXISTS idx_pie_product_created ON enertech.product_interest_events(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pie_created ON enertech.product_interest_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pie_dedupe ON enertech.product_interest_events(visitor_id, product_id, event_type, created_at DESC);

COMMENT ON TABLE enertech.product_interest_events IS 'Tracking: view, click, search_click. Dedupe 45 min por sesión/producto/tipo via RPC.';

ALTER TABLE enertech.product_interest_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pie_admin_select ON enertech.product_interest_events;
CREATE POLICY pie_admin_select ON enertech.product_interest_events
  FOR SELECT TO authenticated
  USING (enertech.is_admin());

CREATE OR REPLACE FUNCTION enertech.record_product_event(
  p_product_id uuid,
  p_event_type text,
  p_search_term text,
  p_visitor_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = enertech, public
AS $$
BEGIN
  IF p_event_type NOT IN ('view', 'click', 'search_click') THEN
    RAISE EXCEPTION 'event_type inválido';
  END IF;

  IF p_visitor_id IS NULL OR length(trim(p_visitor_id)) < 8 THEN
    RAISE EXCEPTION 'visitor_id inválido';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM enertech.products p WHERE p.id = p_product_id AND p.is_active = true
  ) THEN
    RETURN jsonb_build_object('recorded', false, 'reason', 'inactive_or_missing');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM enertech.product_interest_events e
    WHERE e.visitor_id = trim(p_visitor_id)
      AND e.product_id = p_product_id
      AND e.event_type = p_event_type
      AND e.created_at > (now() - interval '45 minutes')
  ) THEN
    RETURN jsonb_build_object('recorded', false, 'reason', 'deduped');
  END IF;

  INSERT INTO enertech.product_interest_events (product_id, event_type, search_term, visitor_id)
  VALUES (
    p_product_id,
    p_event_type,
    NULLIF(left(trim(coalesce(p_search_term, '')), 500), ''),
    trim(p_visitor_id)
  );

  RETURN jsonb_build_object('recorded', true);
END;
$$;

GRANT EXECUTE ON FUNCTION enertech.record_product_event(uuid, text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION enertech.admin_top_products_current_month(p_limit int DEFAULT 10)
RETURNS TABLE (
  product_id uuid,
  product_slug text,
  product_name text,
  sku text,
  category_label text,
  views bigint,
  clicks bigint,
  search_clicks bigint,
  total_interactions bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = enertech, public
AS $$
DECLARE
  lim int := LEAST(GREATEST(COALESCE(p_limit, 10), 1), 50);
BEGIN
  IF NOT enertech.is_admin() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH bounds AS (
    SELECT
      date_trunc('month', now()) AS start_m,
      date_trunc('month', now()) + interval '1 month' AS end_m
  ),
  agg AS (
    SELECT
      e.product_id,
      count(*) FILTER (WHERE e.event_type = 'view')::bigint AS v,
      count(*) FILTER (WHERE e.event_type = 'click')::bigint AS c,
      count(*) FILTER (WHERE e.event_type = 'search_click')::bigint AS s,
      count(*)::bigint AS t
    FROM enertech.product_interest_events e
    CROSS JOIN bounds b
    WHERE e.created_at >= b.start_m
      AND e.created_at < b.end_m
    GROUP BY e.product_id
  )
  SELECT
    p.id,
    p.slug,
    p.name,
    coalesce(nullif(trim(p.sku), ''), nullif(trim(p.code), ''), '')::text,
    trim(both ' · ' FROM concat_ws(
      ' · ',
      NULLIF(trim(coalesce(root.name, '')), ''),
      NULLIF(trim(coalesce(sub.name, '')), '')
    )),
    coalesce(a.v, 0::bigint),
    coalesce(a.c, 0::bigint),
    coalesce(a.s, 0::bigint),
    coalesce(a.t, 0::bigint)
  FROM agg a
  JOIN enertech.products p ON p.id = a.product_id
  LEFT JOIN enertech.categories root ON root.id = p.category_id
  LEFT JOIN enertech.categories sub ON sub.id = p.subcategory_id
  ORDER BY coalesce(a.t, 0::bigint) DESC, p.name ASC
  LIMIT lim;
END;
$$;

GRANT EXECUTE ON FUNCTION enertech.admin_top_products_current_month(int) TO authenticated;

GRANT SELECT ON TABLE enertech.product_interest_events TO anon, authenticated, service_role;
GRANT ALL ON TABLE enertech.product_interest_events TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA enertech GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA enertech GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA enertech GRANT ALL ON TABLES TO service_role;
