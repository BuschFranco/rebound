#!/usr/bin/env bash
# Base de datos de la tienda en la VPS: PostgreSQL 16 + PostgREST (la misma API que usaba Supabase).
# Se puede correr más de una vez. Uso (como root, con las migraciones en /root/migrations):
#   bash provision-db.sh
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

DB=rebound
KEYS=/root/rebound-db-keys.env   # claves generadas (JWT y contraseñas); solo root

echo "==> PostgreSQL 16 (repositorio oficial)"
if ! command -v psql >/dev/null || ! psql --version | grep -q ' 16\.'; then
  install -d /usr/share/postgresql-common/pgdg
  curl -fsSL -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc https://www.postgresql.org/media/keys/ACCC4CF8.asc
  . /etc/os-release
  echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt ${VERSION_CODENAME}-pgdg main" > /etc/apt/sources.list.d/pgdg.list
  apt-get update -q
  apt-get -y -q install postgresql-16
fi

echo "==> Ajustes para 1 GB de RAM (solo escucha en localhost)"
cat > /etc/postgresql/16/main/conf.d/rebound.conf <<'EOF'
listen_addresses = 'localhost'
max_connections = 30
shared_buffers = 128MB
effective_cache_size = 384MB
work_mem = 4MB
maintenance_work_mem = 32MB
timezone = 'UTC'
EOF
systemctl restart postgresql

echo "==> Claves (se generan una sola vez)"
if [ ! -f "$KEYS" ]; then
  umask 077
  {
    echo "JWT_SECRET=$(openssl rand -hex 32)"
    echo "AUTHENTICATOR_PASSWORD=$(openssl rand -hex 24)"
  } > "$KEYS"
fi
# shellcheck disable=SC1090
. "$KEYS"

echo "==> Roles como los de Supabase (anon / authenticated / service_role) y la base"
sudo -u postgres psql -v ON_ERROR_STOP=1 -q <<SQL
do \$\$ begin
  if not exists (select from pg_roles where rolname = 'anon') then create role anon nologin noinherit; end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated nologin noinherit; end if;
  if not exists (select from pg_roles where rolname = 'service_role') then create role service_role nologin noinherit bypassrls; end if;
  if not exists (select from pg_roles where rolname = 'authenticator') then create role authenticator login noinherit; end if;
end \$\$;
alter role authenticator password '${AUTHENTICATOR_PASSWORD}';
grant anon, authenticated, service_role to authenticator;
SQL
sudo -u postgres psql -tAc "select 1 from pg_database where datname = '$DB'" | grep -q 1 || sudo -u postgres createdb "$DB"

sudo -u postgres psql -d "$DB" -v ON_ERROR_STOP=1 -q <<'SQL'
-- Como en Supabase: los roles de la API ven el esquema; qué filas ve cada uno lo deciden las políticas RLS
-- y los grants de cada migración. El panel (service_role) puede todo.
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on functions to service_role;
-- Las funciones nuevas no quedan ejecutables para cualquiera: cada migración da los permisos.
alter default privileges revoke execute on functions from public;
SQL

echo "==> Migraciones (las del repo, en orden; se registra cuáles ya se aplicaron)"
sudo -u postgres psql -d "$DB" -v ON_ERROR_STOP=1 -q -c \
  "create table if not exists public._migrations (name text primary key, applied_at timestamptz not null default now()); revoke all on public._migrations from anon, authenticated;"
for f in $(ls /root/migrations/*.sql | sort); do
  name=$(basename "$f")
  if sudo -u postgres psql -d "$DB" -tAc "select 1 from public._migrations where name = '$name'" | grep -q 1; then
    continue
  fi
  # El bucket de fotos es de Supabase Storage: en la VPS las fotos van a Cloudflare R2.
  if grep -q 'storage\.buckets' "$f"; then
    echo "   (salteada) $name"
  else
    echo "   aplicando $name"
    # /root no es legible para postgres: se aplica desde una copia temporal.
    tmp=$(mktemp /tmp/migration-XXXX.sql)
    cp "$f" "$tmp"
    chmod 644 "$tmp"
    sudo -u postgres psql -d "$DB" -v ON_ERROR_STOP=1 -q -1 -f "$tmp"
    rm -f "$tmp"
  fi
  sudo -u postgres psql -d "$DB" -q -c "insert into public._migrations (name) values ('$name')"
done
# Tablas creadas por las migraciones (dueño postgres): el panel las administra entero.
sudo -u postgres psql -d "$DB" -v ON_ERROR_STOP=1 -q <<'SQL'
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
SQL

echo "==> PostgREST"
if ! command -v postgrest >/dev/null; then
  url=$(curl -fsSL https://api.github.com/repos/PostgREST/postgrest/releases/latest | grep -o 'https://[^"]*linux-static-x86-64\.tar\.xz' | head -1)
  curl -fsSL "$url" -o /tmp/postgrest.tar.xz
  tar -xJf /tmp/postgrest.tar.xz -C /usr/local/bin postgrest
  rm /tmp/postgrest.tar.xz
fi
id postgrest >/dev/null 2>&1 || useradd --system --shell /usr/sbin/nologin postgrest
install -d -m 750 -o root -g postgrest /etc/postgrest
cat > /etc/postgrest/rebound.conf <<EOF
db-uri = "postgres://authenticator:${AUTHENTICATOR_PASSWORD}@127.0.0.1:5432/${DB}"
db-schemas = "public"
db-anon-role = "anon"
db-pool = 10
jwt-secret = "${JWT_SECRET}"
server-host = "127.0.0.1"
server-port = 3010
openapi-mode = "disabled"
EOF
chown root:postgrest /etc/postgrest/rebound.conf
chmod 640 /etc/postgrest/rebound.conf

cat > /etc/systemd/system/postgrest.service <<'EOF'
[Unit]
Description=PostgREST (API de la base de REBOUND)
After=postgresql.service
Requires=postgresql.service

[Service]
User=postgrest
ExecStart=/usr/local/bin/postgrest /etc/postgrest/rebound.conf
ExecReload=/bin/kill -SIGUSR2 $MAINPID
Restart=always
RestartSec=3
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable postgrest >/dev/null
systemctl restart postgrest

echo "==> Claves de la API (JWT): anon para la tienda, service_role para el panel"
if ! grep -q '^ANON_KEY=' "$KEYS"; then
  node - "$JWT_SECRET" >> "$KEYS" <<'JS'
const crypto = require("crypto");
const secret = process.argv[2];
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const sign = (role) => {
  const body = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ role, iss: "rebound", iat: Math.floor(Date.now() / 1000), exp: 4102444800 })}`;
  return `${body}.${crypto.createHmac("sha256", secret).update(body).digest("base64url")}`;
};
console.log(`ANON_KEY=${sign("anon")}`);
console.log(`SERVICE_ROLE_KEY=${sign("service_role")}`);
JS
fi
. "$KEYS"

echo "==> Prueba local"
sleep 2
code=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $ANON_KEY" "http://127.0.0.1:3010/categories?select=slug&limit=1")
echo "   GET /categories como anon -> $code"
code=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $ANON_KEY" "http://127.0.0.1:3010/sales?select=id&limit=1")
echo "   GET /sales como anon (tiene que fallar: 401/403 o lista vacía) -> $code"
echo
echo "LISTO. PostgreSQL $(sudo -u postgres psql -tAc 'show server_version' | cut -d' ' -f1) · $(postgrest --version 2>&1 | head -1)"
echo "Claves guardadas en $KEYS (solo root)."
free -m | awk '/Mem/{print "RAM usada: " $3 " MB de " $2 " MB"}'
