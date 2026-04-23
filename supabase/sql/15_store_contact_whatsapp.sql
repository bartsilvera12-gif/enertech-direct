-- Actualizar WhatsApp del comercio (productos/checkout leen store_settings).
-- Sin borrar datos: upsert por clave.

INSERT INTO enertech.store_settings (key, value)
VALUES ('whatsapp_e164', to_jsonb('595971472716'::text))
ON CONFLICT (key) DO UPDATE
SET value = excluded.value,
    updated_at = now();
