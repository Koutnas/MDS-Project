#!/usr/bin/env bash
# Vygeneruje self-signed certifikat pre nginx (nginx/conf/ssl/cert.pem + key.pem).
# Pouzitie:  ./gen-cert.sh [IP_ADRESA_V_LAN ...]
#   napr.    ./gen-cert.sh 192.168.1.50
# Na Windows sa da spustit v "Git Bash", alebo pouzi gen-cert.bat.
set -euo pipefail
DIR="$(cd "$(dirname "$0")/../nginx/conf/ssl" && pwd)"
SAN="DNS:localhost,IP:127.0.0.1,IP:::1"
for ip in "$@"; do SAN="$SAN,IP:$ip"; done
openssl req -x509 -newkey rsa:2048 -nodes -sha256 -days 825 \
  -keyout "$DIR/key.pem" -out "$DIR/cert.pem" \
  -subj "/C=CZ/O=MDS projekt/CN=localhost" \
  -addext "subjectAltName=$SAN" \
  -addext "keyUsage=digitalSignature,keyEncipherment" \
  -addext "extendedKeyUsage=serverAuth"
echo "Hotovo: $DIR/cert.pem ($SAN)"
