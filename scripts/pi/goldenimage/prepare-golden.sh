#!/usr/bin/env bash
#
# Gjør en ferdig oppsatt Pi klar som GOLDEN IMAGE-kilde: installerer den sovende
# firstboot-tjenesten som personaliserer fremtidige kloner. Kjøres PÅ Pi-en:
#
#   scp -r scripts/pi/goldenimage frlund3@<pi-ip>:/tmp/goldenimage
#   ssh frlund3@<pi-ip> "sudo bash /tmp/goldenimage/prepare-golden.sh"
#
#   # Når du er klar til å trekke kortet for kloning:
#   ssh frlund3@<pi-ip> "sudo HALT=1 bash /tmp/goldenimage/prepare-golden.sh"
#
# Tjenesten gjør INGENTING uten /boot/firmware/infoskjerm-provision.json, så
# golden-Pi-en kan kjøre videre som normalt etterpå.
#
set -euo pipefail

if [[ $EUID -ne 0 ]]; then echo "Kjør med sudo."; exit 1; fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ">> Sikrer at jq finnes (brukes av firstboot) ..."
command -v jq >/dev/null || { export DEBIAN_FRONTEND=noninteractive; apt-get update -y -qq; apt-get install -y -qq jq; }

echo ">> Installerer firstboot-scriptet ..."
install -m 755 "$SCRIPT_DIR/firstboot.sh" /usr/local/sbin/infoskjerm-firstboot

echo ">> Skriver systemd-tjeneste (sovende uten provision-fil) ..."
cat > /etc/systemd/system/infoskjerm-firstboot.service <<'EOF'
[Unit]
Description=Infoskjerm firstboot-provisjonering (golden image)
# Kjør før kiosken starter så en klone aldri rekker å koble til Xibo
# med golden-Pi-ens identitet. Uten provision-fil/fase-2 hoppes tjenesten
# over umiddelbart (Condition), og getty starter uten forsinkelse.
Before=getty@tty1.service
After=local-fs.target
ConditionPathExists=|/boot/firmware/infoskjerm-provision.json
ConditionPathExists=|/var/lib/infoskjerm-firstboot/phase2-pending

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/infoskjerm-firstboot

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable infoskjerm-firstboot.service

echo ""
echo "============================================================"
echo " Golden-forberedelse ferdig. Tjenesten ligger sovende."
echo ""
if [[ "${HALT:-0}" == "1" ]]; then
  echo " Slår av Pi-en nå — trekk SD-kortet og kjør"
  echo " capture-golden-image.sh på Mac-en."
  echo "============================================================"
  sync
  shutdown -h now
else
  echo " Neste: sudo HALT=1 bash prepare-golden.sh  (slår av for kloning)"
  echo "============================================================"
fi
