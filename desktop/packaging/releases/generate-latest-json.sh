#!/usr/bin/env bash
# Genera latest.json para tauri-plugin-updater.
# Uso: ./generate-latest-json.sh 0.2.0 [directorio-artefactos] [salida.json]
# Plantilla sin artefactos: ./generate-latest-json.sh --dry 0.2.0

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DRY=false
VERSION=""
ARTIFACTS_DIR=""
OUT=""

if [[ "${1:-}" == "--dry" ]]; then
  DRY=true
  VERSION="${2:?Versión requerida (ej. 0.2.0)}"
  OUT="${3:-$(dirname "$0")/latest.json}"
  ARTIFACTS_DIR=""
else
  VERSION="${1:?Versión requerida (ej. 0.2.0)}"
  ARTIFACTS_DIR="${2:-$ROOT/src-tauri/target/release/bundle}"
  OUT="${3:-$(dirname "$0")/latest.json}"
fi

read_sig() {
  local f="$1"
  if [[ -f "${f}.sig" ]]; then
    tr -d '\n' < "${f}.sig"
  else
    echo "REEMPLAZAR_FIRMA_MINISIGN"
  fi
}

find_one() {
  local pattern="$1"
  find "$2" -name "$pattern" -type f 2>/dev/null | head -1
}

LINUX_TGZ=""
WIN_ZIP=""
if [[ -n "$ARTIFACTS_DIR" && -d "$ARTIFACTS_DIR" ]]; then
  LINUX_TGZ=$(find_one "BibliaAPP_${VERSION}_amd64.AppImage.tar.gz" "$ARTIFACTS_DIR" || find_one "*.AppImage.tar.gz" "$ARTIFACTS_DIR" || true)
  WIN_ZIP=$(find_one "BibliaAPP_${VERSION}_x64-setup.nsis.zip" "$ARTIFACTS_DIR" || find_one "*setup.nsis.zip" "$ARTIFACTS_DIR" || true)
fi

BASE_URL="${RELEASE_BASE_URL:-https://biblia2.dvguzman.com/desktop/releases}"
PUB_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

linux_block=""
win_block=""

if [[ -n "$LINUX_TGZ" ]]; then
  linux_name=$(basename "$LINUX_TGZ")
  linux_sig=$(read_sig "$LINUX_TGZ")
  linux_block=$(cat <<EOF
    "linux-x86_64": {
      "signature": "$linux_sig",
      "url": "$BASE_URL/$linux_name"
    }
EOF
)
fi

if [[ -n "$WIN_ZIP" ]]; then
  win_name=$(basename "$WIN_ZIP")
  win_sig=$(read_sig "$WIN_ZIP")
  win_block=$(cat <<EOF
    "windows-x86_64": {
      "signature": "$win_sig",
      "url": "$BASE_URL/$win_name"
    }
EOF
)
fi

platforms=""
if [[ -n "$linux_block" ]]; then platforms="$linux_block"; fi
if [[ -n "$win_block" ]]; then
  [[ -n "$platforms" ]] && platforms="$platforms,"
  platforms="$platforms$win_block"
fi

if [[ -z "$platforms" ]]; then
  platforms=$(cat <<EOF
    "linux-x86_64": {
      "signature": "REEMPLAZAR_FIRMA_MINISIGN",
      "url": "$BASE_URL/BibliaAPP_${VERSION}_amd64.AppImage.tar.gz"
    },
    "windows-x86_64": {
      "signature": "REEMPLAZAR_FIRMA_MINISIGN",
      "url": "$BASE_URL/BibliaAPP_${VERSION}_x64-setup.nsis.zip"
    }
EOF
)
fi

cat > "$OUT" <<EOF
{
  "version": "$VERSION",
  "notes": "BibliaAPP Desktop $VERSION",
  "pub_date": "$PUB_DATE",
  "platforms": {
$platforms
  }
}
EOF

echo "Escrito: $OUT"
if $DRY || [[ -z "$LINUX_TGZ" && -z "$WIN_ZIP" ]]; then
  echo "Nota: revisa URLs y firmas minisign antes de publicar en producción."
fi
