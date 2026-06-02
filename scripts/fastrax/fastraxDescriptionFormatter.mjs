/**
 * Formatter de descripción Fastrax.
 *
 * Las descripciones (raw_detail.des) llegan como HTML — típicamente una tabla
 * label/valor con `<ul><li>…</li></ul>` adentro. Si las guardamos crudas en
 * `enertech.products.description`, el frontend deja bloques con saltos enormes.
 * Esta función las normaliza a una línea limpia.
 *
 * Adaptado de tradexpar-digital-hub/server/src/integrations/fastrax/
 * fastraxDescriptionFormatter.js. No depende de Postgres ni Supabase.
 */

const TAG_RE = /<\/?[a-z!][^>]*>/gi;
const UL_INSIDE_RE = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
const TR_RE = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
const CELL_RE = /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi;
const HAS_HTML_RE = /<[a-z!][\s\S]*?>/i;
const HAS_LI_RE = /<li\b/i;

function decodeUrlEncoded(v) {
  if (v == null) return "";
  const t = String(v).replace(/\+/g, " ");
  try {
    return decodeURIComponent(t);
  } catch {
    return t;
  }
}

function decodeEntities(s) {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => {
      const cp = Number(n);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : "";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => {
      const cp = parseInt(h, 16);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : "";
    });
}

function stripTags(s) {
  return s.replace(TAG_RE, " ");
}

function compactSpaces(s) {
  return s.replace(/[\s ]+/g, " ").trim();
}

function buildLabel(html) {
  const t = compactSpaces(stripTags(decodeEntities(html)));
  return t.replace(/[\s:：]+$/u, "").trim();
}

function extractListItems(html) {
  const items = [];
  let m;
  UL_INSIDE_RE.lastIndex = 0;
  while ((m = UL_INSIDE_RE.exec(html)) !== null) {
    const t = compactSpaces(stripTags(decodeEntities(m[1])));
    if (t) items.push(t);
  }
  return items;
}

function processTableRow(rowHtml) {
  const cells = [];
  let m;
  CELL_RE.lastIndex = 0;
  while ((m = CELL_RE.exec(rowHtml)) !== null) cells.push(m[1]);
  if (cells.length === 0) return "";
  if (cells.length === 1) return compactSpaces(stripTags(decodeEntities(cells[0])));

  const label = buildLabel(cells[0]);
  const valueHtml = cells.slice(1).join(" ");
  if (HAS_LI_RE.test(valueHtml)) {
    const items = extractListItems(valueHtml);
    if (items.length > 0) {
      const itemText = items.join("; ");
      return label ? `${label}: ${itemText}` : itemText;
    }
  }
  const valueText = compactSpaces(stripTags(decodeEntities(valueHtml)));
  if (!valueText) return label;
  if (!label) return valueText;
  return `${label}: ${valueText}`;
}

function joinSentences(sentences) {
  const cleaned = sentences
    .map((s) => {
      let t = compactSpaces(s);
      t = t.replace(/[.;,]+$/u, "");
      return t;
    })
    .filter(Boolean)
    .filter((s) => !/^link externo$/i.test(s.trim()))
    .filter((s) => !/^ver m[áa]s$/i.test(s.trim()));
  if (cleaned.length === 0) return "";
  let out = cleaned.join(". ");
  if (!/[.!?]$/.test(out)) out += ".";
  return out
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:])/g, "$1")
    .replace(/\.{2,}/g, ".")
    .replace(/(?:\.\s+){2,}/g, ". ")
    .trim();
}

/**
 * Devuelve la descripción Fastrax en texto plano, compacta y legible.
 * Si queda vacía, recurre a `fallbackBriefDescription` (típicamente raw.bre).
 */
export function formatFastraxDescription(rawDescription, fallbackBriefDescription) {
  const decoded = decodeUrlEncoded(rawDescription).trim();
  if (!decoded) {
    if (fallbackBriefDescription != null) return formatFastraxDescription(fallbackBriefDescription, undefined);
    return "";
  }
  let working = decoded
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");
  if (!HAS_HTML_RE.test(working)) return compactSpaces(decodeEntities(working));

  const sentences = [];
  if (/<tr\b/i.test(working)) {
    let m;
    TR_RE.lastIndex = 0;
    while ((m = TR_RE.exec(working)) !== null) {
      const sentence = processTableRow(m[1]);
      if (sentence) sentences.push(sentence);
    }
  }
  if (sentences.length === 0 && HAS_LI_RE.test(working)) {
    const items = extractListItems(working);
    if (items.length > 0) sentences.push(items.join("; "));
  }
  if (sentences.length === 0) {
    const blocks = working
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|h[1-6])>/gi, "\n")
      .split(/\n+/)
      .map((b) => compactSpaces(stripTags(decodeEntities(b))))
      .filter(Boolean);
    sentences.push(...blocks);
  }
  const out = joinSentences(sentences);
  if (out) return out;
  if (fallbackBriefDescription != null) return formatFastraxDescription(fallbackBriefDescription, undefined);
  return "";
}
