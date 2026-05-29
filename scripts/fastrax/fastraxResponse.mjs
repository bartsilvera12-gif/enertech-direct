/**
 * Fastrax: muchas operaciones responden vector/array — el primer nodo aporta estatus/cestatus.
 * estatus === 0 → OK; en caso contrario, error de negocio. No loguear secretos.
 * Adaptado de tradexpar-digital-hub/server/src/integrations/fastrax/fastraxResponse.js
 */

const PREFIX = "[fastrax]";

function isPlainObject(x) {
  return x != null && typeof x === "object" && !Array.isArray(x);
}

function str(v) {
  if (v == null) return "";
  return String(v).trim();
}

/** Recorre JSON buscando claves; devuelve la primera no vacía. */
export function findFirstStringKeyDeep(root, keys) {
  const set = new Set(keys.map((k) => k.toLowerCase()));
  const walk = (n) => {
    if (n == null) return null;
    if (Array.isArray(n)) {
      for (const el of n) {
        const f = walk(el);
        if (f) return f;
      }
      return null;
    }
    if (isPlainObject(n)) {
      for (const [k, v] of Object.entries(n)) {
        if (set.has(k.toLowerCase()) && v != null) {
          const s = str(v);
          if (s) return s;
        }
      }
      for (const v of Object.values(n)) {
        const f = walk(v);
        if (f) return f;
      }
    }
    return null;
  };
  return walk(root);
}

export function parseFastraxVectorHeader(head) {
  if (head == null) return { businessOk: true, estatus: 0, cestatus: "" };
  if (Array.isArray(head)) {
    if (head.length === 0) return { businessOk: true, estatus: 0, cestatus: "" };
    return parseFastraxVectorHeader(head[0]);
  }
  if (!isPlainObject(head)) return { businessOk: true, estatus: 0, cestatus: "" };
  const o = head;
  const cest = str(
    o.cestatus ?? o.CEstatus ?? o.cEst ?? o.mensaje ?? o.Mensaje ?? o.msg ?? o.Msg ?? o.motivo ?? o.error,
  );
  const rawE = o.estatus ?? o.Estatus ?? o.status ?? o.Status ?? o.st ?? o.ST ?? o.cest ?? o.codigo ?? o.cEst;
  if (rawE === undefined || rawE === null || rawE === "") {
    return { businessOk: true, estatus: 0, cestatus: cest };
  }
  // ope=2/4: a veces `estatus` viene como "0" (string); nunca tratarlo como error.
  if (str(rawE) === "0") return { businessOk: true, estatus: 0, cestatus: cest };
  const n = Number(rawE);
  if (Number.isFinite(n)) {
    if (n === 0) return { businessOk: true, estatus: 0, cestatus: cest };
    return { businessOk: false, estatus: n, cestatus: cest || `estatus ${n}` };
  }
  const t = str(rawE).toLowerCase();
  if (t === "0" || t === "ok") return { businessOk: true, estatus: 0, cestatus: cest };
  return { businessOk: false, estatus: null, cestatus: cest || str(rawE) };
}

function looksLikeFastraxStatusRow(n) {
  if (!isPlainObject(n)) return false;
  const o = n;
  return (
    Object.prototype.hasOwnProperty.call(o, "estatus") ||
    Object.prototype.hasOwnProperty.call(o, "Estatus") ||
    Object.prototype.hasOwnProperty.call(o, "cestatus") ||
    Object.prototype.hasOwnProperty.call(o, "CEstatus")
  );
}

export function evaluateFastraxBusinessEnvelope(parsed) {
  if (parsed == null) return { businessOk: true, estatus: 0, cestatus: "", head: null, dataRoot: null };
  if (Array.isArray(parsed)) {
    if (parsed.length === 0) return { businessOk: true, estatus: 0, cestatus: "", head: null, dataRoot: [] };
    const first = parsed[0];
    if (looksLikeFastraxStatusRow(first)) {
      const h = parseFastraxVectorHeader(first);
      return { ...h, head: first, dataRoot: parsed.slice(1) };
    }
    return { businessOk: true, estatus: 0, cestatus: "", head: null, dataRoot: parsed };
  }
  if (isPlainObject(parsed) && looksLikeFastraxStatusRow(parsed)) {
    const h = parseFastraxVectorHeader(parsed);
    return { ...h, head: parsed, dataRoot: parsed };
  }
  return { businessOk: true, estatus: 0, cestatus: "", head: null, dataRoot: parsed };
}

/**
 * Tras ope=12, localizar `pdc` (id Fastrax) y conservar el `ped` ecommerce enviado.
 * Fastrax a veces NO devuelve `pdc` y entrega el id bajo `ped` numérico en el cuerpo.
 */
export function extractFastraxPedPdc(parsed, sentPed) {
  const sent = str(sentPed);
  const env = evaluateFastraxBusinessEnvelope(parsed);
  const dataRoot = env && env.dataRoot != null ? env.dataRoot : parsed;
  let pdc = findFirstStringKeyDeep(dataRoot, ["pdc", "Pdc", "nPdc", "nro_pdc", "id_pdc", "PDC"]);
  if (!pdc) {
    const dataPed = findFirstStringKeyDeep(dataRoot, ["ped", "Ped", "nro_ped", "nPed", "id_ped", "nroext"]);
    if (dataPed != null) {
      const dataPedStr = str(dataPed);
      if (dataPedStr && (!sent || dataPedStr !== sent)) pdc = dataPedStr;
    }
  }
  if (pdc && sent && str(pdc) === sent) pdc = null;
  return { pdc: pdc ? str(pdc) : null, ped: sent || null };
}

export function withFastraxBusinessGate(r, ctx) {
  if (!r || r.ok === false) return r;
  const { businessOk, cestatus, estatus, head, dataRoot } = evaluateFastraxBusinessEnvelope(r.parsed);
  if (businessOk) {
    return { ...r, ok: true, businessOk: true, _fastrax_head: head, _fastrax_data: dataRoot };
  }
  const errMsg =
    cestatus && cestatus.length > 0
      ? cestatus
      : `Fastrax estatus distinto de 0${estatus != null ? ` (${estatus})` : ""} (ope=${ctx?.ope})`;
  console.error(PREFIX, {
    ope: ctx?.ope,
    label: ctx?.label,
    estatus: estatus ?? r?.estatus,
    cestatus: cestatus?.slice?.(0, 500),
  });
  return {
    ...r,
    ok: false,
    businessOk: false,
    businessError: true,
    message: errMsg,
    cestatus: cestatus || errMsg,
    _fastrax_head: head,
    _fastrax_data: dataRoot,
  };
}

/** Nunca pases cuerpo crudo (contiene `pas`); si logueás ope, está bien. */
export function logFastraxOpe(ope) {
  console.info(PREFIX, { ope });
}
