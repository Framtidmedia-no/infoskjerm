#!/usr/bin/env bash
#
# Infoskjerm firstboot — personaliserer en Pi som er flashet fra golden image.
# Installeres på GOLDEN-Pi-en med prepare-golden.sh FØR SD-kortet klones, og
# ligger sovende til en klone bootes med /boot/firmware/infoskjerm-provision.json
# på plass (skrevet av flash-pi.sh på Mac-en).
#
# Fase 1 (provision-fil finnes): ny identitet — hostname, machine-id, SSH-nøkler,
#   skjerm-token (tvpower), rotasjon, Arexibo display-identitet (ny display_id =
#   ny machine-id → registreres som NY skjerm i Xibo), nullstilt Connect-state,
#   valgfritt WiFi. Deretter reboot.
# Fase 2 (etter reboot): melder enheten inn i Raspberry Pi Connect med org-auth-key.
#
# Uten provision-fil og uten ventende fase 2 gjør scriptet INGENTING — golden-Pi-en
# kan trygt kjøre videre med tjenesten aktivert.
#
set -euo pipefail

PROVISION=/boot/firmware/infoskjerm-provision.json
STATE_DIR=/var/lib/infoskjerm-firstboot
APPLIED="$STATE_DIR/applied.json"
PI_USER=frlund3
PI_HOME=/home/$PI_USER
XIBO_DIR=$PI_HOME/xibo

log() { echo "infoskjerm-firstboot: $*"; }

# ---------- Fase 2: Connect-innmelding (etter reboot, trenger nett) ----------
if [[ -f "$STATE_DIR/phase2-pending" ]]; then
  AUTH_KEY=$(jq -r '.connect_auth_key // empty' "$APPLIED" 2>/dev/null || true)
  if [[ -z "$AUTH_KEY" ]]; then
    log "fase 2: ingen connect_auth_key i provision — hopper over Connect."
    rm -f "$STATE_DIR/phase2-pending"
    exit 0
  fi

  PI_UID=$(id -u "$PI_USER")
  loginctl enable-linger "$PI_USER" 2>/dev/null || true

  as_user() {
    sudo -u "$PI_USER" \
      XDG_RUNTIME_DIR="/run/user/$PI_UID" \
      DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/$PI_UID/bus" \
      "$@"
  }

  # Vent på nett + brukersesjon; gi opp etter ~100s (prøver igjen neste boot).
  for i in $(seq 1 5); do
    if curl -s -m 10 -o /dev/null https://connect.raspberrypi.com; then
      if as_user rpi-connect signin --auth-key="$AUTH_KEY" 2>&1 | grep -qiv "error"; then
        sleep 3
        as_user rpi-connect status || true
        # Auth-nøkkelen har gjort jobben sin — ikke la den ligge igjen på disk.
        jq 'del(.connect_auth_key)' "$APPLIED" > "$APPLIED.tmp" && mv "$APPLIED.tmp" "$APPLIED"
        chmod 600 "$APPLIED"
        rm -f "$STATE_DIR/phase2-pending"
        log "fase 2: Connect-innmelding OK."
        exit 0
      fi
    fi
    log "fase 2: nett/Connect ikke klar (forsøk $i/5) — venter 20s"
    sleep 20
  done
  log "fase 2: ga opp denne booten — prøver igjen neste boot."
  exit 0
fi

# ---------- Fase 1: personalisering ----------
[[ -f "$PROVISION" ]] || exit 0

NEW_HOSTNAME=$(jq -r '.hostname // empty' "$PROVISION")
SCREEN_TOKEN=$(jq -r '.screen_token // empty' "$PROVISION")
ROTATION=$(jq -r '.rotation // "normal"' "$PROVISION")
WIFI_SSID=$(jq -r '.wifi_ssid // empty' "$PROVISION")
WIFI_PSK=$(jq -r '.wifi_psk // empty' "$PROVISION")

if [[ -z "$NEW_HOSTNAME" || -z "$SCREEN_TOKEN" ]]; then
  log "FEIL: provision-fila mangler hostname eller screen_token — gjør ingenting."
  exit 1
fi

log "fase 1: provisjonerer som '$NEW_HOSTNAME' ..."
OLD_HOSTNAME=$(cat /etc/hostname)

# 1) Ny machine-id (→ ny Arexibo display_id, unik DHCP/duid-identitet)
rm -f /etc/machine-id /var/lib/dbus/machine-id
systemd-machine-id-setup
ln -sf /etc/machine-id /var/lib/dbus/machine-id
NEW_MID=$(cat /etc/machine-id)

# 2) Hostname
echo "$NEW_HOSTNAME" > /etc/hostname
sed -i "s/\b${OLD_HOSTNAME}\b/${NEW_HOSTNAME}/g" /etc/hosts

# 3) Nye SSH-vertsnøkler (kloner skal ikke dele nøkler)
rm -f /etc/ssh/ssh_host_*key*
ssh-keygen -A

# 4) TV-strømagent: nytt skjerm-token (behold APP_URL/CEC_DEVICE fra imaget)
if [[ -f /etc/infoskjerm/tvpower.env ]]; then
  # shellcheck disable=SC1091
  source /etc/infoskjerm/tvpower.env
fi
install -d -m 755 /etc/infoskjerm
cat > /etc/infoskjerm/tvpower.env <<EOF
APP_URL=${APP_URL:-https://infoskjerm.framtidtech.no}
SCREEN_TOKEN=${SCREEN_TOKEN}
CEC_DEVICE=${CEC_DEVICE:-/dev/cec0}
EOF
chmod 600 /etc/infoskjerm/tvpower.env

# 5) Rotasjon (kunde=right/portrett, bakrom=normal/liggende)
echo "$ROTATION" > "$PI_HOME/.kiosk-rotate"
chown "$PI_USER:$PI_USER" "$PI_HOME/.kiosk-rotate"

# 6) Arexibo: ny display-identitet. CMS-adresse/nøkkel gjenbrukes fra golden-imagets
#    cms.json; display_id = ny machine-id → registreres som NY (uautorisert) skjerm
#    i Xibo. Autoriseres etterpå fra Mac-en: node scripts/xibo/adopt-display.mjs
if [[ -f "$XIBO_DIR/cms.json" ]]; then
  CMS_ADDRESS=$(jq -r '.address' "$XIBO_DIR/cms.json")
  CMS_KEY=$(jq -r '.key' "$XIBO_DIR/cms.json")
  jq -n --arg address "$CMS_ADDRESS" --arg key "$CMS_KEY" \
        --arg display_id "$NEW_MID" --arg display_name "$NEW_HOSTNAME" \
        '{address: $address, key: $key, display_id: $display_id, display_name: $display_name, proxy: null}' \
        > "$XIBO_DIR/cms.json"
  chown "$PI_USER:$PI_USER" "$XIBO_DIR/cms.json"
else
  log "ADVARSEL: fant ikke $XIBO_DIR/cms.json — Arexibo-identitet ikke endret."
fi

# 7) Raspberry Pi Connect: fjern klonet identitet (IKKE signout — det ville
#    påvirket golden-enhetens registrering). Fase 2 melder inn på nytt.
rm -rf "$PI_HOME/.config/rpi-connect" "$PI_HOME/.local/share/rpi-connect" "$PI_HOME/.cache/rpi-connect"

# 8) Valgfritt WiFi (butikkens nett)
if [[ -n "$WIFI_SSID" && -n "$WIFI_PSK" ]] && command -v nmcli >/dev/null; then
  nmcli connection add type wifi con-name "$WIFI_SSID" ssid "$WIFI_SSID" \
    wifi-sec.key-mgmt wpa-psk wifi-sec.psk "$WIFI_PSK" autoconnect yes 2>/dev/null \
    || log "ADVARSEL: klarte ikke legge til WiFi '$WIFI_SSID' (finnes den fra før?)"
fi

# 9) Flytt provision-fila bort fra boot-partisjonen (den inneholder hemmeligheter)
install -d -m 700 "$STATE_DIR"
mv "$PROVISION" "$APPLIED"
chmod 600 "$APPLIED"
touch "$STATE_DIR/phase2-pending"

log "fase 1 ferdig — rebooter som '$NEW_HOSTNAME'."
sync
reboot
