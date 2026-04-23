/** Supabase/PostgREST devuelve objetos planos, no siempre instancias de Error. */
export function formatPostgrestError(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === "object") {
    const o = err as Record<string, unknown>;
    const parts: string[] = [];
    if (typeof o.message === "string" && o.message.trim()) parts.push(o.message.trim());
    if (typeof o.details === "string" && o.details.trim()) parts.push(o.details.trim());
    if (typeof o.hint === "string" && o.hint.trim()) parts.push(`Sugerencia: ${o.hint.trim()}`);
    if (typeof o.code === "string" && o.code.trim()) parts.push(`[${o.code}]`);
    if (parts.length) return parts.join(" · ");
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}
