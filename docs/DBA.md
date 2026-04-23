# Rol DBA — PostgreSQL directo (Enertech / multi-tenant)

Este proyecto puede usar **conexión directa a PostgreSQL** para DDL, índices, funciones y datamarts. **No** está pensada para sustituir el cliente Supabase en el navegador: el frontend sigue usando `VITE_SUPABASE_*` solo para API anónima.

## Variables de entorno (PostgreSQL directo)

| Variable | Uso |
|----------|-----|
| `SUPABASE_DB_URL` | Preferida para **DDL** (rol con permisos ALTER, p. ej. `supabase_admin`). |
| `DIRECT_POSTGRES_URL` | Pooler / tenant; a veces **no** puede ejecutar `ALTER TABLE` (error «must be owner»). |

Los scripts leen primero `SUPABASE_DB_URL`, luego `DIRECT_POSTGRES_URL` (env o `.env.local`).

- Definí las URIs en **`.env.local`** (no versionar secretos).
- Migración Enertech alineada con el código: `npm run db:migrate:enertech` → `supabase/sql/09_full_enertech_alignment.sql`.

### Pooler Supavisor

El usuario debe ser **`postgres.<tenant-id>`**, no `postgres` solo. Si la conexión falla con `postgres`, revisá el usuario que te dio el proveedor.

### SSL

Si tu instancia exige TLS, podés usar:

```bash
set PGSSLMODE=require
```

(En PowerShell: `$env:PGSSLMODE="require"`.) Los scripts en `scripts/db/` respetan `PGSSLMODE=require` para el cliente `pg`.

## Scripts incluidos

Desde la raíz del repo:

```bash
npm run db:schemas
```

Lista schemas de negocio (excluye mayormente sistema).

```bash
npm run db:tables
```

Lista tablas del schema **`enertech`** (por defecto). Otro schema:

```bash
set SCHEMA=lilian_inmobiliaria && node scripts/db/list-tables.mjs
```

## Secuencia obligatoria para cambios

1. **Inspeccionar**: `\dn`, tablas en `information_schema`, `\d schema.tabla` equivalente en SQL.
2. **Validar**: que tabla/columna/índice exista o no según lo que vas a hacer.
3. **Preparar SQL idempotente** cuando sea posible (`IF NOT EXISTS`, etc.).
4. **Ejecutar** con la misma URI (psql, script `pg`, u otra herramienta **fuera** del bundle Vite).
5. **Validar resultado** con consultas de verificación.
6. **Resumir** qué se tocó.

## Cambios destructivos

Antes de `DROP TABLE`, `DROP COLUMN`, truncates masivos o borrados irreversibles: **advertir** y obtener confirmación explícita.

## Multi-schema

El servidor aloja **varios schemas por empresa**. El proyecto Enertech suele usar el schema **`enertech`**. Antes de crear objetos, confirmá el schema correcto listando schemas y tablas.

## SQL sugerido manual (psql)

Si tenés `psql` instalado:

```bash
psql "%DIRECT_POSTGRES_URL%" -c "\dn"
```

En PowerShell con variable cargada desde `.env.local`, exportá antes `DIRECT_POSTGRES_URL`.
