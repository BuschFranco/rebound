#!/usr/bin/env bash
# Backups semanales de la base a Cloudflare R2 (bucket rebound-backups; R2 los borra a los 90 días).
# Uso (como root, con las claves de R2 en /root/.r2-backups.env): bash provision-backups.sh
set -euo pipefail

ACCOUNT=2e3b069064b630882f2cb54755188225
CREDS=/root/.r2-backups.env
[ -f "$CREDS" ] || { echo "Falta $CREDS"; exit 1; }
chmod 600 "$CREDS"
# shellcheck disable=SC1090
. <(tr -d '\r' < "$CREDS" | grep -E '^R2_(ACCESS_KEY_ID|SECRET_ACCESS_KEY)=')

echo "==> rclone"
command -v rclone >/dev/null || curl -fsSL https://rclone.org/install.sh | bash >/dev/null
install -d -m 700 /root/.config/rclone
cat > /root/.config/rclone/rclone.conf <<EOF
[r2]
type = s3
provider = Cloudflare
access_key_id = ${R2_ACCESS_KEY_ID}
secret_access_key = ${R2_SECRET_ACCESS_KEY}
endpoint = https://${ACCOUNT}.r2.cloudflarestorage.com
no_check_bucket = true
EOF
chmod 600 /root/.config/rclone/rclone.conf

echo "==> Script de backup"
cat > /usr/local/bin/rebound-backup <<'EOF'
#!/usr/bin/env bash
# Copia de la base "rebound" a R2 (formato custom de pg_dump, ya comprimido).
# Restaurar: rclone copy r2:rebound-backups/db/<archivo> . && sudo -u postgres pg_restore -d rebound --clean --if-exists <archivo>
set -euo pipefail
stamp=$(date -u +%Y-%m-%dT%H%MZ)
sudo -u postgres pg_dump -d rebound -Fc | rclone rcat "r2:rebound-backups/db/rebound-${stamp}.dump"
echo "Backup subido: db/rebound-${stamp}.dump"
EOF
chmod 750 /usr/local/bin/rebound-backup

echo "==> Todos los domingos a las 06:00 UTC (03:00 de Argentina)"
cat > /etc/systemd/system/rebound-backup.service <<'EOF'
[Unit]
Description=Backup de la base de REBOUND a Cloudflare R2
After=postgresql.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/rebound-backup
EOF
cat > /etc/systemd/system/rebound-backup.timer <<'EOF'
[Unit]
Description=Backup semanal de la base de REBOUND

[Timer]
OnCalendar=Sun *-*-* 06:00:00 UTC
Persistent=true
RandomizedDelaySec=10m

[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload
systemctl enable --now rebound-backup.timer >/dev/null

echo "==> Primer backup de prueba"
/usr/local/bin/rebound-backup
rclone lsl r2:rebound-backups/db/ | tail -n 3
echo
echo "LISTO. Próximo backup: $(systemctl list-timers rebound-backup.timer --no-pager --no-legend | awk '{print $1, $2, $3}')"
