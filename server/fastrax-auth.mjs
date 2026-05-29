/**
 * Autorización del mini-backend Fastrax.
 * El navegador (admin logueado) manda su access token de Supabase en Authorization: Bearer.
 * Acá se valida contra GoTrue (/auth/v1/user) y se confirma que el user esté en enertech.admin_profiles.
 * Las credenciales Fastrax NUNCA salen de este server.
 */
import { loadFastraxEnv } from "../scripts/fastrax/env.mjs";
import { withDb } from "../scripts/fastrax/db.mjs";

loadFastraxEnv();

function supabaseUrl() {
  let u = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim().replace(/\/+$/, "");
  if (!u) return "";
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

function anonKey() {
  return (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "").trim();
}

/**
 * Valida el bearer token y exige rol admin.
 * @returns {Promise<{ok:true,userId:string}|{ok:false,status:number,message:string}>}
 */
export async function verifyAdmin(bearerToken) {
  if (!bearerToken) return { ok: false, status: 401, message: "Falta el token de autorización." };

  const url = supabaseUrl();
  if (!url) return { ok: false, status: 500, message: "Backend sin SUPABASE_URL/VITE_SUPABASE_URL." };
  const key = anonKey();
  if (!key) return { ok: false, status: 500, message: "Backend sin SUPABASE_ANON_KEY." };

  let res;
  try {
    res = await fetch(`${url}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${bearerToken}`, apikey: key },
    });
  } catch (e) {
    return { ok: false, status: 502, message: `No se pudo validar el token: ${e instanceof Error ? e.message : String(e)}` };
  }
  if (!res.ok) return { ok: false, status: 401, message: "Token inválido o expirado." };

  let user;
  try {
    user = await res.json();
  } catch {
    return { ok: false, status: 502, message: "Respuesta de auth ilegible." };
  }
  const userId = user?.id;
  if (!userId) return { ok: false, status: 401, message: "Token sin usuario." };

  let isAdmin = false;
  try {
    isAdmin = await withDb(async (c) => {
      const r = await c.query("SELECT 1 FROM admin_profiles WHERE user_id = $1 LIMIT 1", [userId]);
      return (r.rowCount || 0) > 0;
    });
  } catch (e) {
    return { ok: false, status: 500, message: `No se pudo verificar admin: ${e instanceof Error ? e.message : String(e)}` };
  }
  if (!isAdmin) return { ok: false, status: 403, message: "El usuario no tiene perfil de administrador." };

  return { ok: true, userId };
}
