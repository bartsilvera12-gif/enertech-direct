/**
 * Helpers compartidos por los handlers de rutas (server/routes/*.mjs).
 * Vive aparte de index.mjs para evitar ciclos de import.
 */

export function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

export function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > 4_000_000) req.destroy();
      else chunks.push(c);
    });
    req.on("end", () => {
      const text = Buffer.concat(chunks).toString("utf8");
      if (!text) return resolve({});
      try {
        resolve(JSON.parse(text));
      } catch {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}
