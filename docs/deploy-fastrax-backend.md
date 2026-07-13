# Deploy del backend Fastrax en la VPS (subdominio dedicado)

El frontend de Enertech se sirve estático en Hostinger, pero el **sync Fastrax** necesita
código server-side (guarda `FASTRAX_COD`/`FASTRAX_PASS`, evita CORS/SSL del navegador).
Ese código es `server/` y corre en la **VPS de Neura**, bajo PM2 detrás de nginx, en su
propio subdominio HTTPS — exactamente el mismo patrón que el `server/` de Tradexpar
(`payments.neura.com.py`).

```
navegador (https://enertechcde.com, en Hostinger)
   │  fetch(VITE_FASTRAX_BACKEND_URL + /api/fastrax/*)  con JWT de Supabase
   ▼
https://enertech-api.neura.com.py        ← nginx (SSL Let's Encrypt)
   │  proxy_pass
   ▼
127.0.0.1:8788                            ← Node server/ (PM2)  [pg → Postgres, fetch → Fastrax]
```

Valores reales de este deploy:

| | |
|---|---|
| Frontend (Hostinger) | `https://enertechcde.com` |
| Backend (VPS) | `https://enertech-api.neura.com.py` |
| IP de la VPS | `187.77.247.54` (misma que `payments.neura.com.py`) |
| Puerto Node | `8788` (el 8787 lo usa Tradexpar) |

---

## 0. DNS

En el panel DNS de `neura.com.py`, crear un **A record**:

```
enertech-api   A   187.77.247.54   (DNS only / sin proxy, igual que payments.neura.com.py)
```

Esperá a que resuelva (`nslookup enertech-api.neura.com.py` → 187.77.247.54) antes del paso 4 (certbot).

---

## 1. Subir el código a la VPS

```bash
cd /var/www
git clone https://github.com/bartsilvera12-gif/enertech-direct.git enertech
cd enertech
# 'pg' está en dependencies → con --omit=dev igual se instala (lo usa el backend en runtime)
npm install --omit=dev
```

Para actualizar después: `cd /var/www/enertech && git pull && npm install --omit=dev && pm2 restart enertech-api`.

## 2. Variables de entorno (NO versionar)

Crear `/var/www/enertech/.env` (el loader lo lee; las variables de PM2 igual tienen prioridad):

```ini
# --- Fastrax (solo server-side) ---
FASTRAX_ENABLED=1
FASTRAX_API_URL=https://sisfxapi.fastrax.com.py:60253/MarketPlace/production.php
FASTRAX_COD=__tu_codigo__
FASTRAX_PASS=__tu_password__
FASTRAX_SSL_INSECURE=1
FASTRAX_REQUEST_TIMEOUT_MS=90000

# --- Postgres directo (mismo que usan los scripts DBA) ---
SUPABASE_DB_URL=postgresql://USER:PASS@HOST:PORT/postgres?sslmode=disable

# --- Validación del JWT de admin (mismos valores que el frontend) ---
SUPABASE_URL=https://api.neura.com.py
SUPABASE_ANON_KEY=__anon_key__

# --- Backend HTTP ---
FASTRAX_BACKEND_PORT=8788
FASTRAX_BACKEND_HOST=127.0.0.1
# Dominio público del frontend (Hostinger), sin barra final:
FASTRAX_BACKEND_CORS_ORIGINS=https://enertechcde.com,https://www.enertechcde.com
```

> Puerto **8788**: el 8787 ya lo usa el server de Tradexpar en esta VPS. Si hay otro, elegí uno libre.
> `chmod 600 .env`.

## 3. Levantar con PM2

```bash
cd /var/www/enertech
pm2 start npm --name enertech-api -- run server
pm2 save                 # persiste tras reboot
pm2 logs enertech-api    # ver "escuchando en http://127.0.0.1:8788"
```

Probar local en la VPS (sin pasar por nginx):

```bash
curl -s http://127.0.0.1:8788/api/health
# {"ok":true,"service":"fastrax-backend","fastraxConfigured":true}
```

## 4. nginx — server block del subdominio (solo API)

`/etc/nginx/sites-available/enertech-api.conf`:

```nginx
upstream enertech_node {
    server 127.0.0.1:8788;
    keepalive 16;
}

server {
    listen 443 ssl http2;
    server_name enertech-api.neura.com.py;

    ssl_certificate     /etc/letsencrypt/live/enertech-api.neura.com.py/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/enertech-api.neura.com.py/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    server_tokens off;
    client_body_timeout 30s;

    # El CORS lo maneja el Node (FASTRAX_BACKEND_CORS_ORIGINS). No duplicar headers acá.
    location /api/ {
        proxy_pass http://enertech_node;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 5s;
        proxy_send_timeout 90s;   # ope=2/ope=4 en lote pueden tardar
        proxy_read_timeout 90s;
    }

    location / { return 404; }   # este subdominio es solo API
}

server {
    listen 80;
    server_name enertech-api.neura.com.py;
    return 301 https://$host$request_uri;
}
```

Activar + certificado:

```bash
ln -s /etc/nginx/sites-available/enertech-api.conf /etc/nginx/sites-enabled/
certbot --nginx -d enertech-api.neura.com.py      # emite/renueva SSL
nginx -t && systemctl reload nginx
curl -s https://enertech-api.neura.com.py/api/health
```

> El DNS de `enertech-api.neura.com.py` debe apuntar (A/AAAA) a la IP de la VPS antes de correr certbot.

## 5. Apuntar el frontend (Hostinger) al backend

En las **environment variables del deployment de Hostinger** (porque `.env.local` no va a git):

```ini
VITE_SUPABASE_URL=https://api.neura.com.py
VITE_SUPABASE_ANON_KEY=__anon_key__
VITE_FASTRAX_BACKEND_URL=https://enertech-api.neura.com.py
```

Redeploy en Hostinger → el botón **Sincronizar Fastrax** ya pega al backend de la VPS,
con HTTPS, sin `localhost` ni problemas de CORS.

## Checklist de verificación

- [ ] `pm2 logs enertech-api` muestra "escuchando en http://127.0.0.1:8788" y "Fastrax configurado: true"
- [ ] `curl https://enertech-api.neura.com.py/api/health` → `ok:true`
- [ ] En el sitio de Hostinger, **Sincronizar Fastrax → Probar conexión** responde la versión Fastrax
- [ ] **Vista previa (dry-run)** lista productos; **Aplicar** recién cuando lo decidas
