#!/usr/bin/env bash
# Cambio final: copia los datos de Supabase a la base de la VPS, pasa las fotos a Cloudflare R2
# y apunta la tienda a la base nueva. Se corre una vez (como root, con una terminal interactiva:
# pide la contraseña de la base de Supabase). Si se corre de nuevo, vuelve a copiar todo desde cero.
set -euo pipefail

SUPABASE_HOST=db.ryzwqsbbfqjzcyqykglp.supabase.co
OLD_PREFIX="https://ryzwqsbbfqjzcyqykglp.supabase.co/storage/v1/object/public/catalog-images/"
NEW_PREFIX="https://img.reboundstore.com.ar/"
ACCOUNT=2e3b069064b630882f2cb54755188225
DB=rebound
# En la carpeta de postgres: /root no es legible para el usuario de la base.
DUMP=/var/lib/postgresql/supabase-data.sql
PG17=/usr/lib/postgresql/17/bin

echo "==> Cliente de PostgreSQL 17 (Supabase usa una versión más nueva que la de la VPS)"
[ -x "$PG17/pg_dump" ] || { export DEBIAN_FRONTEND=noninteractive; apt-get -y -q install postgresql-client-17 >/dev/null; }

echo "==> 1) Datos de Supabase"
echo "    Escribí la contraseña de la base de Supabase (Project Settings -> Database) y Enter:"
"$PG17/pg_dump" "host=$SUPABASE_HOST port=5432 dbname=postgres user=postgres sslmode=require" \
  --data-only --schema=public --exclude-table=public._migrations \
  --disable-triggers --no-owner --no-privileges -f "$DUMP"
# Parámetros que solo existen en Postgres 17: la VPS usa 16.
sed -i '/^SET transaction_timeout/d' "$DUMP"
echo "    $(grep -c '^COPY ' "$DUMP") tablas copiadas de Supabase"

echo "==> 2) Carga en la VPS (vacía las tablas antes, así se puede repetir)"
tables=$(sudo -u postgres psql -d "$DB" -tAc "select string_agg(format('public.%I', tablename), ', ') from pg_tables where schemaname = 'public' and tablename <> '_migrations'")
sudo -u postgres psql -d "$DB" -v ON_ERROR_STOP=1 -q -c "truncate $tables restart identity cascade"
chown postgres:postgres "$DUMP"
chmod 600 "$DUMP"
sudo -u postgres "$PG17/psql" -d "$DB" -v ON_ERROR_STOP=1 -q -f "$DUMP" >/dev/null
rm -f "$DUMP"
sudo -u postgres psql -d "$DB" -tA -F ': ' -c "
  select 'productos', count(*) from products union all
  select 'categorías', count(*) from categories union all
  select 'promociones', count(*) from promotions union all
  select 'zonas de envío', count(*) from shipping_zones union all
  select 'ventas', count(*) from sales union all
  select 'movimientos de stock', count(*) from inventory_movements union all
  select 'pedidos web', count(*) from order_intents" | sed 's/^/    /'

echo "==> 3) Fotos: de Supabase Storage a R2"
CREDS=/root/.r2-catalog.env
. <(tr -d '\r' < "$CREDS" | grep -E '^R2_(ACCESS_KEY_ID|SECRET_ACCESS_KEY)=')
export RCLONE_CONFIG_R2C_TYPE=s3 RCLONE_CONFIG_R2C_PROVIDER=Cloudflare RCLONE_CONFIG_R2C_NO_CHECK_BUCKET=true
export RCLONE_CONFIG_R2C_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" RCLONE_CONFIG_R2C_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"
export RCLONE_CONFIG_R2C_ENDPOINT="https://${ACCOUNT}.r2.cloudflarestorage.com"
urls=$(sudo -u postgres psql -d "$DB" -tA -c "
  select distinct u from (
    select unnest(images) as u from products
    union all select image_url from categories
    union all select banner_image_url from promotions
    union all select image_url from site_banners
  ) x where u like '${OLD_PREFIX}%'")
total=0; ok=0
for url in $urls; do
  total=$((total + 1))
  key="${url#"$OLD_PREFIX"}"
  if rclone copyurl "$url" "r2c:rebound-catalog/$key" --header-upload "Cache-Control: public, max-age=31536000, immutable" 2>/dev/null; then
    ok=$((ok + 1))
  else
    echo "    no se pudo copiar: $key"
  fi
done
echo "    $ok de $total fotos copiadas a R2"
[ "$ok" -eq "$total" ] || { echo "Faltan fotos: no se cambian las URLs. Revisá y volvé a correr."; exit 1; }
rm -f "$CREDS"

echo "    Actualizando las URLs de las fotos en la base"
sudo -u postgres psql -d "$DB" -v ON_ERROR_STOP=1 -q <<SQL
update products set images = array(select replace(u, '${OLD_PREFIX}', '${NEW_PREFIX}') from unnest(images) u)
  where exists (select 1 from unnest(images) u where u like '${OLD_PREFIX}%');
update categories set image_url = replace(image_url, '${OLD_PREFIX}', '${NEW_PREFIX}') where image_url like '${OLD_PREFIX}%';
update promotions set banner_image_url = replace(banner_image_url, '${OLD_PREFIX}', '${NEW_PREFIX}') where banner_image_url like '${OLD_PREFIX}%';
update site_banners set image_url = replace(image_url, '${OLD_PREFIX}', '${NEW_PREFIX}') where image_url like '${OLD_PREFIX}%';
SQL

echo "==> 4) Permisos del deploy (la caché de la app se puede borrar al limpiar versiones viejas)"
grep -q '^UMask=0002' /etc/systemd/system/rebound.service || sed -i '/^RestartSec=3$/a UMask=0002' /etc/systemd/system/rebound.service
systemctl daemon-reload
chmod -R g+w /srv/rebound/releases
[ -f /root/rebound-deploy ] && install -m 755 /root/rebound-deploy /usr/local/bin/rebound-deploy && rm -f /root/rebound-deploy

echo "==> 5) La tienda apunta a la base nueva"
. /root/rebound-db-keys.env
sed -i "s|^SUPABASE_URL=.*|SUPABASE_URL=https://api.reboundstore.com.ar|; s|^SUPABASE_PUBLISHABLE_KEY=.*|SUPABASE_PUBLISHABLE_KEY=${ANON_KEY}|" /etc/rebound/rebound.env
systemctl restart rebound
echo
echo "LISTO"
