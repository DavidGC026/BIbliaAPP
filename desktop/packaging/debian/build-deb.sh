#!/usr/bin/env bash
# Compila .deb para Debian/Ubuntu (requiere deps GTK en el host).
set -euo pipefail
cd "$(dirname "$0")/../.."
npm run pack:deb
echo ""
echo ">> .deb generado en:"
ls -1 src-tauri/target/release/bundle/deb/*.deb 2>/dev/null || ls -1 src-tauri/target/release/bundle/deb/*/*.deb
