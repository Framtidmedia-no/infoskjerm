#!/usr/bin/env bash
#
# Installerer TV-strømagenten (HDMI-CEC) på en Raspberry Pi i flåten.
# Kjøres PÅ Pi-en (Claude via SSH, eller manuelt):
#
#   sudo SCREEN_TOKEN=sk_xxx bash install.sh
#   sudo SCREEN_TOKEN=sk_xxx APP_URL=https://infoskjerm.framtidtech.no bash install.sh
#
# SCREEN_TOKEN = tokenet fra skjermkortet i admin (delen etter /skjerm/).
# Agenten poller appen hvert minutt og slår TV-en av/på etter butikkens
# åpningstider. Krever at CEC er PÅ i TV-menyen (Anynet+/SimpLink/Bravia Sync).
#
set -euo pipefail

APP_URL="${APP_URL:-https://infoskjerm.framtidtech.no}"

if [[ $EUID -ne 0 ]]; then echo "Kjør med sudo: sudo SCREEN_TOKEN=… bash install.sh"; exit 1; fi
if [[ -z "${SCREEN_TOKEN:-}" ]]; then
  read -rp "Lim inn skjerm-token (fra admin → Skjermer → Skjerm-URL, delen etter /skjerm/): " SCREEN_TOKEN
fi
if [[ -z "${SCREEN_TOKEN}" ]]; then echo "SCREEN_TOKEN mangler."; exit 1; fi

echo ">> Installerer avhengigheter (v4l-utils = cec-ctl, jq, curl) ..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y -qq
apt-get install -y -qq --no-install-recommends v4l-utils jq curl ca-certificates

echo ">> Skriver /etc/infoskjerm/tvpower.env ..."
install -d -m 755 /etc/infoskjerm
cat > /etc/infoskjerm/tvpower.env <<EOF
APP_URL=${APP_URL}
SCREEN_TOKEN=${SCREEN_TOKEN}
CEC_DEVICE=/dev/cec0
EOF
chmod 600 /etc/infoskjerm/tvpower.env

echo ">> Installerer agenten ..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
install -m 755 "${SCRIPT_DIR}/infoskjerm-tvpower.sh" /usr/local/bin/infoskjerm-tvpower

echo ">> Skriver systemd service + timer (hvert minutt) ..."
cat > /etc/systemd/system/infoskjerm-tvpower.service <<'EOF'
[Unit]
Description=Infoskjerm TV-strømagent (HDMI-CEC etter åpningstider)
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/infoskjerm-tvpower
EOF

cat > /etc/systemd/system/infoskjerm-tvpower.timer <<'EOF'
[Unit]
Description=Kjør TV-strømagenten hvert minutt

[Timer]
OnBootSec=45
OnUnitActiveSec=60
AccuracySec=5

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable --now infoskjerm-tvpower.timer

echo ">> Kjører agenten én gang nå (test) ..."
systemctl start infoskjerm-tvpower.service || true
sleep 2

echo ""
echo "============================================================"
echo " Ferdig! TV-strømagenten kjører hvert minutt."
echo ""
echo " Status  : systemctl status infoskjerm-tvpower.timer"
echo " Logg    : journalctl -u infoskjerm-tvpower -n 20"
echo " CEC-test: cec-ctl -s -d /dev/cec0 --to 0 --give-device-power-status"
echo ""
echo " Ser du 'unknown' i loggen: aktiver CEC i TV-menyen"
echo " (Samsung: Anynet+, LG: SimpLink, Sony: Bravia Sync)."
echo "============================================================"
