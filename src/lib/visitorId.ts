const STORAGE_KEY = "enertech_visitor_id";

/** UUID por pestaña/sesión (sessionStorage); no persistente entre dispositivos. */
export function getOrCreateVisitorId(): string | null {
  if (typeof window === "undefined") return null;

  try {
    let id = sessionStorage.getItem(STORAGE_KEY);
    if (!id || id.length < 8) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
      sessionStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}
