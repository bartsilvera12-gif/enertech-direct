-- Después de crear el usuario admin en Authentication (Supabase Dashboard),
-- copiá su UUID desde auth.users y ejecutá:

-- INSERT INTO enertech.admin_profiles (user_id)
-- VALUES ('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'::uuid)
-- ON CONFLICT (user_id) DO NOTHING;
