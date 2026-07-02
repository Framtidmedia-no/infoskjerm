#!/bin/sh
#
# Infoskjerm TV-strømagent (HDMI-CEC) — kjøres hvert minutt av systemd-timeren
# infoskjerm-tvpower.timer. Pi-en er dum: rapporter faktisk TV-status til appen,
# få ønsket tilstand tilbake (beregnet sentralt fra butikkens åpningstider),
# og utfør avviket med kernel-CEC (cec-ctl, uavhengig av X/Arexibo).
#
# Konfig: /etc/infoskjerm/tvpower.env  (APP_URL, SCREEN_TOKEN, ev. CEC_DEVICE)
#
set -u

CONFIG="${CONFIG:-/etc/infoskjerm/tvpower.env}"
[ -f "$CONFIG" ] || { echo "tvpower: mangler $CONFIG"; exit 1; }
# shellcheck disable=SC1090
. "$CONFIG"

APP_URL="${APP_URL:?APP_URL mangler i tvpower.env}"
SCREEN_TOKEN="${SCREEN_TOKEN:?SCREEN_TOKEN mangler i tvpower.env}"
CEC_DEV="${CEC_DEVICE:-/dev/cec0}"

[ -e "$CEC_DEV" ] || { echo "tvpower: $CEC_DEV finnes ikke (mangler kernel-CEC?)"; exit 1; }

# Sørg for at CEC-adapteren er konfigurert som Playback-enhet (idempotent).
if ! cec-ctl -s -d "$CEC_DEV" | grep -q "Playback"; then
  cec-ctl -s -d "$CEC_DEV" --playback >/dev/null 2>&1
fi

# Faktisk TV-status over CEC. Ingen respons (TV uten CEC / CEC av) → unknown.
tv_state() {
  out=$(cec-ctl -s -d "$CEC_DEV" --to 0 --give-device-power-status 2>/dev/null)
  case "$out" in
    *pwr-state:\ on*) echo on ;;
    *pwr-state:\ standby*|*pwr-state:\ to-standby*) echo off ;;
    *) echo unknown ;;
  esac
}

STATE=$(tv_state)
INFO="tvpower $(hostname) $(uname -r)"

# jq -n bygger JSON trygt uansett hva hostname/uname inneholder.
BODY=$(jq -n --arg token "$SCREEN_TOKEN" --arg tvState "$STATE" --arg info "$INFO" \
  '{token: $token, tvState: $tvState, info: $info}')

RESP=$(curl -s -m 15 -X POST "$APP_URL/api/screen/power" \
  -H "Content-Type: application/json" \
  -d "$BODY")

DESIRED=$(printf '%s' "$RESP" | jq -r '.desired // empty' 2>/dev/null)
if [ "$DESIRED" != "on" ] && [ "$DESIRED" != "off" ]; then
  echo "tvpower: uklart svar fra appen — gjør ingenting. state=$STATE resp=$RESP"
  exit 0
fi

if [ "$DESIRED" = "$STATE" ]; then
  echo "tvpower: ok (tv=$STATE, ønsket=$DESIRED)"
  exit 0
fi

if [ "$DESIRED" = "on" ]; then
  echo "tvpower: slår PÅ TV (var $STATE)"
  cec-ctl -s -d "$CEC_DEV" --to 0 --image-view-on >/dev/null 2>&1
  # Be TV-en bytte til vår HDMI-inngang etter oppvåkning.
  PHYS=$(cec-ctl -s -d "$CEC_DEV" | sed -n 's/.*Physical Address[^:]*: \([0-9a-f.]*\).*/\1/p' | head -1)
  [ -n "$PHYS" ] && cec-ctl -s -d "$CEC_DEV" --active-source phys-addr="$PHYS" >/dev/null 2>&1
else
  echo "tvpower: slår AV TV (var $STATE)"
  cec-ctl -s -d "$CEC_DEV" --to 0 --standby >/dev/null 2>&1
fi
