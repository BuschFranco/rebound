#!/usr/bin/env bash
# Prepara la VPS (Ubuntu 22.04/24.04) para correr la tienda. Se puede correr más de una vez.
# Uso (como root): bash provision.sh "<clave pública de GitHub Actions>"
set -euo pipefail

DEPLOY_PUBKEY="${1:?Falta la clave pública de deploy}"
export DEBIAN_FRONTEND=noninteractive

echo "==> Paquetes del sistema y actualizaciones de seguridad automáticas"
apt-get update -q
apt-get -y -q upgrade
apt-get -y -q install ca-certificates curl gnupg ufw fail2ban unattended-upgrades debian-keyring debian-archive-keyring apt-transport-https
dpkg-reconfigure -f noninteractive unattended-upgrades

echo "==> Swap de 2 GB (la VPS tiene 1 GB de RAM)"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
echo 'vm.swappiness=10' > /etc/sysctl.d/99-swappiness.conf
sysctl -q --system

echo "==> Node.js 22"
if ! command -v node >/dev/null || ! node --version | grep -q '^v22\.'; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get -y -q install nodejs
fi

echo "==> Caddy (servidor web con HTTPS automático)"
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -q
  apt-get -y -q install caddy
fi

echo "==> Usuarios: 'rebound' corre la app, 'deploy' la publica (GitHub Actions)"
id rebound >/dev/null 2>&1 || useradd --system --home /srv/rebound --shell /usr/sbin/nologin rebound
id deploy >/dev/null 2>&1 || useradd --create-home --shell /bin/bash deploy
usermod -aG rebound deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
echo "$DEPLOY_PUBKEY" > /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys

# Carpetas: releases/<commit> con cada versión, current -> la activa. El grupo rebound puede escribir
# (la app guarda su caché de páginas dentro de la versión).
install -d -m 2775 -o deploy -g rebound /srv/rebound /srv/rebound/releases /srv/rebound/incoming

# Variables de entorno de la app (las carga GitHub Actions / el script de variables).
install -d -m 750 -o root -g rebound /etc/rebound
[ -f /etc/rebound/rebound.env ] || install -m 640 -o root -g rebound /dev/null /etc/rebound/rebound.env

echo "==> Script de publicación y permiso para reiniciar solo la app"
install -m 755 -o root -g root /root/rebound-deploy /usr/local/bin/rebound-deploy
cat > /etc/sudoers.d/rebound-deploy <<'EOF'
deploy ALL=(root) NOPASSWD: /usr/bin/systemctl restart rebound, /usr/bin/systemctl is-active rebound
EOF
chmod 440 /etc/sudoers.d/rebound-deploy
visudo -cq

echo "==> Servicio de la app (systemd)"
cat > /etc/systemd/system/rebound.service <<'EOF'
[Unit]
Description=REBOUND (Next.js)
After=network-online.target
Wants=network-online.target

[Service]
User=rebound
Group=rebound
WorkingDirectory=/srv/rebound/current
EnvironmentFile=/etc/rebound/rebound.env
Environment=NODE_ENV=production PORT=3000 HOSTNAME=127.0.0.1
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=3
# Endurecimiento: la app solo puede escribir en su carpeta.
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/srv/rebound

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable rebound >/dev/null

echo "==> Caddy: por ahora responde por la IP (el dominio se suma al cambiar el DNS)"
if [ ! -f /etc/caddy/.rebound ]; then
  cat > /etc/caddy/Caddyfile <<'EOF'
:80 {
	encode zstd gzip
	reverse_proxy 127.0.0.1:3000
}
EOF
  touch /etc/caddy/.rebound
  systemctl reload caddy
fi

echo "==> Firewall: solo SSH, HTTP y HTTPS"
ufw allow OpenSSH >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw --force enable >/dev/null

echo "==> fail2ban para SSH"
cat > /etc/fail2ban/jail.d/sshd.local <<'EOF'
[sshd]
enabled = true
maxretry = 5
bantime = 1h
EOF
systemctl enable --now fail2ban >/dev/null
systemctl restart fail2ban

echo "==> SSH solo con clave (sin contraseñas)"
# 00- para que gane sobre 50-cloud-init.conf (sshd usa el primer valor que encuentra).
cat > /etc/ssh/sshd_config.d/00-hardening.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
EOF
sshd -t
systemctl reload ssh

echo
echo "LISTO. Node $(node --version) · $(caddy version | cut -d' ' -f1) · swap $(free -m | awk '/Swap/{print $2}') MB"
ufw status | head -8
