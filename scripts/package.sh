#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="$(node -p "require('${ROOT_DIR}/manifest.json').version")"
OUT_DIR="${ROOT_DIR}/release"
ZIP_PATH="${OUT_DIR}/overleaf-latex-formatter-v${VERSION}.zip"

mkdir -p "${OUT_DIR}"
rm -f "${ZIP_PATH}"

cd "${ROOT_DIR}"
zip -r "${ZIP_PATH}" \
  manifest.json \
  src \
  icons \
  README.md \
  -x "*.DS_Store" "__MACOSX/*" "release/*" "tests/*" "docs/*" "scripts/*"

echo "Created: ${ZIP_PATH}"
