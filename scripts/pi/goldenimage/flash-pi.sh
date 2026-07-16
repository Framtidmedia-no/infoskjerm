#!/usr/bin/env bash
#
# «Sett inn kort, skriv navn, ferdig» — flasher golden image til et SD-kort og
# legger på per-enhet-provisjonering (hostname, skjerm-token, rotasjon, Connect).
# Kjøres på Mac-en fra repo-rot:
#
#   ./scripts/pi/goldenimage/flash-pi.sh gr-spar-valderoya1 --butikk "SPAR Valderøya"
#   ./scripts/pi/goldenimage/flash-pi.sh gr-spar-valderoya2 --butikk "SPAR Valderøya" \
#       --wifi-ssid kundenett --wifi-pass 'hemmelig'
#
# Konvensjon: hostname som slutter på 1 = kundeskjerm (portrett), 2 = bakrom
# (liggende) — overstyr med --rolle kunde|bakrom. Skjermraden opprettes (eller
# gjenbrukes) automatisk i Supabase via service-nøkkelen i .env.local.
#
#   Flagg: --butikk "NAVN"     opprett/gjenbruk skjermrad for butikken (vanligst)
#          --token sk_xxx      bruk eksisterende token (hopper over Supabase)
#          --rolle kunde|bakrom overstyr rolle fra hostname-konvensjonen
#          --image <sti>       golden image (default: nyeste ~/infoskjerm-golden-*.img.gz)
#          --disk diskN        SD-kortets disk (default: auto hvis kun ett eksternt)
#          --wifi-ssid/--wifi-pass  legg til butikkens WiFi på enheten
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
ENV_FILE="$REPO_ROOT/.env.local"

command -v jq >/dev/null || { echo "Trenger jq: brew install jq"; exit 1; }
[[ -f "$ENV_FILE" ]] || { echo "Fant ikke $ENV_FILE"; exit 1; }

env_get() { grep "^$1=" "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'"; }

SUPABASE_URL=$(env_get NEXT_PUBLIC_SUPABASE_URL)
SERVICE_KEY=$(env_get SUPABASE_SERVICE_ROLE_KEY)
CONNECT_AUTH_KEY=$(env_get RPI_CONNECT_ORG_AUTH_KEY)

# ---------- argumenter ----------
HOSTNAME_ARG="${1:-}"; shift || true
[[ -n "$HOSTNAME_ARG" ]] || { echo "Bruk: $0 <hostname> --butikk \"NAVN\" [flagg]"; exit 1; }

BUTIKK="" TOKEN="" ROLLE="" IMAGE="" DISK="" WIFI_SSID="" WIFI_PASS=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --butikk) BUTIKK="$2"; shift 2 ;;
    --token) TOKEN="$2"; shift 2 ;;
    --rolle) ROLLE="$2"; shift 2 ;;
    --image) IMAGE="$2"; shift 2 ;;
    --disk) DISK="$2"; shift 2 ;;
    --wifi-ssid) WIFI_SSID="$2"; shift 2 ;;
    --wifi-pass) WIFI_PASS="$2"; shift 2 ;;
    *) echo "Ukjent flagg: $1"; exit 1 ;;
  esac
done

if [[ -z "$ROLLE" ]]; then
  case "$HOSTNAME_ARG" in
    *1) ROLLE=kunde ;;
    *2) ROLLE=bakrom ;;
    *) echo "Kan ikke utlede rolle fra '$HOSTNAME_ARG' — oppgi --rolle kunde|bakrom"; exit 1 ;;
  esac
fi
case "$ROLLE" in
  kunde)  ROTATION=right;  FLATE=kunde;  ORIENTATION=portrait;  NAME_SUFFIX="kunde" ;;
  bakrom) ROTATION=normal; FLATE=intern; ORIENTATION=landscape; NAME_SUFFIX="intern" ;;
  *) echo "--rolle må være kunde eller bakrom"; exit 1 ;;
esac

if [[ -z "$IMAGE" ]]; then
  IMAGE=$(ls -t "$HOME"/infoskjerm-golden-*.img.gz 2>/dev/null | head -1 || true)
  [[ -n "$IMAGE" ]] || { echo "Fant ingen ~/infoskjerm-golden-*.img.gz — kjør capture-golden-image.sh først."; exit 1; }
fi

# ---------- skjermrad i Supabase (token) ----------
sb() { # sb <metode> <sti> [json-body]
  local method="$1" path="$2" body="${3:-}"
  curl -s -m 20 -X "$method" "$SUPABASE_URL/rest/v1/$path" \
    -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" \
    -H "Content-Type: application/json" -H "Prefer: return=representation" \
    ${body:+-d "$body"}
}

if [[ -z "$TOKEN" ]]; then
  [[ -n "$BUTIKK" ]] || { echo "Oppgi --butikk \"NAVN\" (eller --token sk_xxx)."; exit 1; }
  [[ -n "$SERVICE_KEY" ]] || { echo "SUPABASE_SERVICE_ROLE_KEY mangler i .env.local"; exit 1; }

  BUTIKK_ENC=$(jq -rn --arg s "*$BUTIKK*" '$s|@uri')
  STORES=$(sb GET "stores?select=id,tenant_id,name&name=ilike.$BUTIKK_ENC")
  N_STORES=$(jq 'length' <<<"$STORES")
  if [[ "$N_STORES" -ne 1 ]]; then
    echo "Fant $N_STORES butikker som matcher '$BUTIKK':"
    jq -r '.[].name' <<<"$STORES"
    exit 1
  fi
  STORE_ID=$(jq -r '.[0].id' <<<"$STORES")
  TENANT_ID=$(jq -r '.[0].tenant_id' <<<"$STORES")
  STORE_NAME=$(jq -r '.[0].name' <<<"$STORES")
  SCREEN_NAME="$STORE_NAME $NAME_SUFFIX"

  # Gjenbruk eksisterende skjermrad (idempotent re-flash), ellers opprett ny.
  EXISTING=$(sb GET "screens?select=token,name&store_id=eq.$STORE_ID&flate=eq.$FLATE")
  if [[ $(jq 'length' <<<"$EXISTING") -ge 1 ]]; then
    TOKEN=$(jq -r '.[0].token' <<<"$EXISTING")
    echo ">> Gjenbruker skjermrad «$(jq -r '.[0].name' <<<"$EXISTING")» for $STORE_NAME ($FLATE)."
  else
    TOKEN="sk_$(openssl rand -hex 24)"
    ROW=$(jq -n --arg store_id "$STORE_ID" --arg tenant_id "$TENANT_ID" --arg name "$SCREEN_NAME" \
                --arg token "$TOKEN" --arg flate "$FLATE" --arg orientation "$ORIENTATION" \
      '{store_id: $store_id, tenant_id: $tenant_id, name: $name, token: $token, flate: $flate, orientation: $orientation}')
    CREATED=$(sb POST "screens" "$ROW")
    [[ $(jq 'length' <<<"$CREATED" 2>/dev/null || echo 0) -ge 1 ]] \
      || { echo "FEIL: klarte ikke opprette skjermrad: $CREATED"; exit 1; }
    echo ">> Opprettet skjermrad «$SCREEN_NAME» i Supabase."
  fi
fi

# ---------- finn og bekreft SD-kort ----------
# SD-kort = removable fysisk disk (Mac-ens innebygde kortleser er «internal»,
# så vi kan ikke filtrere på external — kun removable).
find_sd_disk() {
  local d
  for d in $(diskutil list physical | awk '/^\/dev\/disk/ {print $1}' | sed 's|/dev/||'); do
    diskutil info "/dev/$d" 2>/dev/null | grep -qE "Removable Media:.*Removable" && echo "$d"
  done
}
if [[ -z "$DISK" ]]; then
  CANDIDATES=($(find_sd_disk))
  [[ ${#CANDIDATES[@]} -eq 1 ]] || { echo "Fant ${#CANDIDATES[@]} minnekort — oppgi --disk diskN:"; diskutil list physical; exit 1; }
  DISK="${CANDIDATES[0]}"
fi

echo ""
echo "== MÅL: /dev/$DISK — ALT PÅ DISKEN SLETTES =="
diskutil info "/dev/$DISK" | grep -E "Device / Media Name|Disk Size|Removable"
echo ""
echo "   Hostname : $HOSTNAME_ARG  ($ROLLE → rotasjon $ROTATION)"
echo "   Image    : $IMAGE"
echo "   Token    : ${TOKEN:0:12}…"
read -rp "Skriv '$DISK' for å flashe: " CONFIRM
[[ "$CONFIRM" == "$DISK" ]] || { echo "Avbrutt."; exit 1; }

diskutil unmountDisk force "/dev/$DISK"
echo ">> Skriver image (tar 10–40 min) ..."
gunzip -c "$IMAGE" | sudo dd of="/dev/r$DISK" bs=4m status=progress
sync

# ---------- provision-fil på boot-partisjonen ----------
echo ">> Monterer boot-partisjonen ..."
diskutil mountDisk "/dev/$DISK" >/dev/null
BOOTVOL=""
for i in $(seq 1 15); do
  BOOTVOL=$(ls -d /Volumes/bootfs 2>/dev/null || true)
  [[ -n "$BOOTVOL" ]] && break
  sleep 1
done
[[ -n "$BOOTVOL" ]] || { echo "FEIL: fant ikke /Volumes/bootfs etter flashing."; exit 1; }

jq -n --arg hostname "$HOSTNAME_ARG" --arg screen_token "$TOKEN" --arg rotation "$ROTATION" \
      --arg connect_auth_key "$CONNECT_AUTH_KEY" --arg wifi_ssid "$WIFI_SSID" --arg wifi_psk "$WIFI_PASS" \
  '{hostname: $hostname, screen_token: $screen_token, rotation: $rotation}
   + (if $connect_auth_key != "" then {connect_auth_key: $connect_auth_key} else {} end)
   + (if $wifi_ssid != "" then {wifi_ssid: $wifi_ssid, wifi_psk: $wifi_psk} else {} end)' \
  > "$BOOTVOL/infoskjerm-provision.json"

diskutil eject "/dev/$DISK"

echo ""
echo "============================================================"
echo " ✅ Kortet er klart: $HOSTNAME_ARG"
echo ""
echo " 1. Sett kortet i Pi-en og gi strøm. Den booter to ganger"
echo "    (personalisering + Connect-innmelding) — ta det med ro."
echo " 2. Enheten dukker opp i Connect-konsollen og som NY,"
echo "    uautorisert skjerm i Xibo. Autoriser + grupper den:"
echo "      node scripts/xibo/adopt-display.mjs $HOSTNAME_ARG --group \"<Xibo-gruppe>\""
echo " 3. Bygg/koble layout om det er en ny butikk (build-widget-layout.mjs),"
echo "    og oppdater docs/raspberry-enheter.md."
echo "============================================================"
