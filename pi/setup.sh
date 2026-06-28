#!/usr/bin/env bash
#
# Gange-Rolv Infoskjerm — Raspberry Pi kiosk-oppsett
# ---------------------------------------------------
# Kjør på en fersk Raspberry Pi OS Lite (64-bit, Bookworm):
#
#   sudo SCREEN_TOKEN=gr_xxxxxxxx bash setup.sh
#
# Scriptet:
#   - installerer Chromium (kiosk), cage (Wayland-kioskmotor), cec-utils (TV av/på), jq, curl
#   - skriver konfig til /etc/infoskjerm/config.env
#   - setter opp to systemd-tjenester:
#       infoskjerm-kiosk : viser skjerm-URL i fullskjerm, starter automatisk
#       infoskjerm-agent : puls + fjernstyring (av/på/reload/omstart) hvert 15. sek
#
set -euo pipefail

# ---- Konfigurasjon (kan overstyres med miljøvariabler) ----
APP_URL="${APP_URL:-https://infoskjerm-seven.vercel.app}"
SUPABASE_URL="${SUPABASE_URL:-https://fcxwrfmdvfjulhoebceq.supabase.co}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjeHdyZm1kdmZqdWxob2ViY2VxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NTcwMTUsImV4cCI6MjA5ODEzMzAxNX0.4G0Ru6LRyCDflq-pfnpYVo_2zxo9jCyBD5jRpj6L-tQ}"
KIOSK_USER="${KIOSK_USER:-${SUDO_USER:-pi}}"

if [[ $EUID -ne 0 ]]; then echo "Kjør med sudo: sudo bash setup.sh"; exit 1; fi

if [[ -z "${SCREEN_TOKEN:-}" ]]; then
  read -rp "Lim inn skjerm-token (fra admin → Innstillinger): " SCREEN_TOKEN
fi
if [[ -z "${SCREEN_TOKEN}" ]]; then echo "SCREEN_TOKEN mangler."; exit 1; fi

SCREEN_FULL_URL="${APP_URL}/screen/${SCREEN_TOKEN}"
echo ">> Skjerm-URL: ${SCREEN_FULL_URL}"
echo ">> Kiosk-bruker: ${KIOSK_USER}"

# ---- Pakker ----
echo ">> Installerer pakker ..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
# chromium heter 'chromium' på Bookworm, 'chromium-browser' på eldre
CHROMIUM_PKG="chromium"; apt-cache show chromium >/dev/null 2>&1 || CHROMIUM_PKG="chromium-browser"
apt-get install -y --no-install-recommends \
  "${CHROMIUM_PKG}" cage cec-utils jq curl ca-certificates seatd
systemctl enable --now seatd 2>/dev/null || true
usermod -aG video,render,input,seat "${KIOSK_USER}" 2>/dev/null || true

CHROMIUM_BIN="$(command -v chromium || command -v chromium-browser)"

# ---- Konfigfil ----
echo ">> Skriver /etc/infoskjerm/config.env ..."
install -d -m 755 /etc/infoskjerm
cat > /etc/infoskjerm/config.env <<EOF
APP_URL=${APP_URL}
SCREEN_TOKEN=${SCREEN_TOKEN}
SCREEN_FULL_URL=${SCREEN_FULL_URL}
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
CHROMIUM_BIN=${CHROMIUM_BIN}
EOF
chmod 600 /etc/infoskjerm/config.env

# ---- Kiosk-launcher ----
echo ">> Skriver /usr/local/bin/infoskjerm-kiosk ..."
cat > /usr/local/bin/infoskjerm-kiosk <<'KIOSK'
#!/usr/bin/env bash
set -euo pipefail
source /etc/infoskjerm/config.env
exec cage -d -- "${CHROMIUM_BIN}" \
  --kiosk --noerrdialogs --disable-infobars --incognito \
  --no-first-run --fast --fast-start \
  --disable-features=Translate \
  --check-for-update-interval=31536000 \
  --autoplay-policy=no-user-gesture-required \
  --enable-features=OverlayScrollbar \
  "${SCREEN_FULL_URL}"
KIOSK
chmod 755 /usr/local/bin/infoskjerm-kiosk

# ---- Fjernstyrings-agent ----
echo ">> Skriver /usr/local/bin/infoskjerm-agent ..."
cat > /usr/local/bin/infoskjerm-agent <<'AGENT'
#!/usr/bin/env bash
# Puls + fjernstyring. Poller Supabase hvert 15. sek.
set -uo pipefail
source /etc/infoskjerm/config.env

cec() { echo "$1 0" | cec-client -s -d 1 >/dev/null 2>&1 || true; }   # 0 = TV
INFO="pi $(uname -m) / $(. /etc/os-release 2>/dev/null; echo "${PRETTY_NAME:-?}")"

while true; do
  RESP="$(curl -s -m 15 -X POST "${SUPABASE_URL}/rest/v1/rpc/screen_poll" \
    -H "apikey: ${SUPABASE_ANON_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"p_token\":\"${SCREEN_TOKEN}\",\"p_info\":\"${INFO}\"}")"

  CMD="$(echo "$RESP" | jq -r '.[0].pending_command // empty' 2>/dev/null)"

  case "$CMD" in
    power_off) cec standby ;;
    power_on)  cec on ;;
    reload)    systemctl restart infoskjerm-kiosk ;;
    reboot)    : ;;  # selve omstarten skjer etter ack nedenfor
  esac

  if [[ -n "$CMD" ]]; then
    curl -s -m 15 -X POST "${SUPABASE_URL}/rest/v1/rpc/screen_ack" \
      -H "apikey: ${SUPABASE_ANON_KEY}" \
      -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
      -H "Content-Type: application/json" \
      -d "{\"p_token\":\"${SCREEN_TOKEN}\",\"p_command\":\"${CMD}\"}" >/dev/null
    [[ "$CMD" == "reboot" ]] && sleep 2 && /sbin/reboot
  fi

  sleep 15
done
AGENT
chmod 755 /usr/local/bin/infoskjerm-agent

# ---- systemd-tjenester ----
echo ">> Skriver systemd-tjenester ..."
cat > /etc/systemd/system/infoskjerm-kiosk.service <<EOF
[Unit]
Description=Gange-Rolv Infoskjerm (kiosk)
After=network-online.target seatd.service
Wants=network-online.target

[Service]
User=${KIOSK_USER}
PAMName=login
TTYPath=/dev/tty1
ExecStart=/usr/local/bin/infoskjerm-kiosk
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/infoskjerm-agent.service <<EOF
[Unit]
Description=Gange-Rolv Infoskjerm (fjernstyrings-agent)
After=network-online.target
Wants=network-online.target

[Service]
ExecStart=/usr/local/bin/infoskjerm-agent
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Boot rett til konsoll (ingen desktop), kiosk-tjenesten tar over skjermen
systemctl set-default multi-user.target

systemctl daemon-reload
systemctl enable --now infoskjerm-agent.service
systemctl enable infoskjerm-kiosk.service

echo ""
echo "============================================================"
echo " Ferdig! Start skjermen nå med:  sudo systemctl start infoskjerm-kiosk"
echo " (eller bare reboot:             sudo reboot)"
echo ""
echo " Skjerm-URL : ${SCREEN_FULL_URL}"
echo " Logg kiosk : journalctl -u infoskjerm-kiosk -f"
echo " Logg agent : journalctl -u infoskjerm-agent -f"
echo "============================================================"
