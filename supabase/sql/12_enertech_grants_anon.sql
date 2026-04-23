-- Permisos PostgREST (rol `anon`): lectura catálogo / embeds sobre schema enertech.
-- Ejecutar con rol owner (p. ej. supabase_admin) si aparece "permission denied" en tablas nuevas.
-- Sin DROP.

GRANT USAGE ON SCHEMA enertech TO anon, authenticated, service_role;

GRANT SELECT ON ALL TABLES IN SCHEMA enertech TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA enertech TO authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA enertech TO service_role;
