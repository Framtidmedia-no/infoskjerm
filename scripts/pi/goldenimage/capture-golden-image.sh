#!/usr/bin/env bash
#
# Kloner et golden-Pi-SD-kort til en komprimert image-fil på Mac-en.
# Kjøres på Mac med SD-kortet i leseren (etter prepare-golden.sh + HALT=1 på Pi-en):
#
#   ./scripts/pi/goldenimage/capture-golden-image.sh            # auto-finn kort
#   ./scripts/pi/goldenimage/capture-golden-image.sh disk4      # eksplisitt disk
#
# Output: ~/infoskjerm-golden-YYYYMMDD.img.gz (brukes av flash-pi.sh).
# Lesing tar 10–40 min avhengig av kortstørrelse og leser.
#
set -euo pipefail

OUT="${OUT:-$HOME/infoskjerm-golden-$(date +%Y%m%d).img.gz}"

# SD-kort = removable fysisk disk. Mac-ens INNEBYGDE kortleser regnes som
# «internal» av diskutil, så vi kan ikke filtrere på external — kun removable.
find_sd_disk() {
  local d
  for d in $(diskutil list physical | awk '/^\/dev\/disk/ {print $1}' | sed 's|/dev/||'); do
    diskutil info "/dev/$d" 2>/dev/null | grep -qE "Removable Media:.*Removable" && echo "$d"
  done
}

DISK="${1:-}"
if [[ -z "$DISK" ]]; then
  CANDIDATES=($(find_sd_disk))
  if [[ ${#CANDIDATES[@]} -eq 0 ]]; then echo "Fant ingen minnekort — sett inn SD-kortet."; exit 1; fi
  if [[ ${#CANDIDATES[@]} -gt 1 ]]; then
    echo "Flere minnekort/removable disker funnet — oppgi hvilken: $0 <diskN>"
    diskutil list physical
    exit 1
  fi
  DISK="${CANDIDATES[0]}"
fi

echo "== Kilde: /dev/$DISK =="
diskutil info "/dev/$DISK" | grep -E "Device / Media Name|Disk Size|Removable"
diskutil list "/dev/$DISK"
echo ""
read -rp "Lese HELE /dev/$DISK til $OUT ? Skriv '$DISK' for å bekrefte: " CONFIRM
[[ "$CONFIRM" == "$DISK" ]] || { echo "Avbrutt."; exit 1; }

diskutil unmountDisk "/dev/$DISK"

echo ">> Leser /dev/r$DISK → $OUT (dette tar en stund) ..."
sudo dd if="/dev/r$DISK" bs=4m status=progress | gzip > "$OUT"

diskutil eject "/dev/$DISK" || true

echo ""
echo "============================================================"
echo " Golden image lagret: $OUT ($(du -h "$OUT" | cut -f1))"
echo " Sett kortet tilbake i golden-Pi-en og gi den strøm."
echo " Flash nye kort med: scripts/pi/goldenimage/flash-pi.sh"
echo "============================================================"
