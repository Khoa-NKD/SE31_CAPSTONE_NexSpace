#!/usr/bin/env bash
set -euo pipefail

# Never replace an existing developer configuration or copy another developer's credentials.
backend_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ "$(uname -s)" != Darwin ]]; then
  printf '%s\n' 'This helper targets macOS. Docker already bundles OCR on other hosts.' >&2
  exit 1
fi
brew_command="$(command -v brew || true)"
if [[ -z "$brew_command" ]]; then
  for candidate in /opt/homebrew/bin/brew /usr/local/bin/brew; do
    if [[ -x "$candidate" ]]; then brew_command="$candidate"; break; fi
  done
fi
if [[ -z "$brew_command" ]]; then
  printf '%s\n' 'Install Homebrew from https://brew.sh, then rerun this helper.' >&2
  exit 1
fi
if [[ "${1:-}" == --install-ocr ]]; then
  "$brew_command" install tesseract tesseract-lang
elif [[ $# -gt 0 ]]; then
  printf '%s\n' 'Usage: bash scripts/setup-local-macos.sh [--install-ocr]' >&2
  exit 1
fi
brew_prefix="$("$brew_command" --prefix)"
ocr_command="$brew_prefix/bin/tesseract"
ocr_data="$brew_prefix/share/tessdata"
if [[ ! -x "$ocr_command" || ! -f "$ocr_data/vie.traineddata" || ! -f "$ocr_data/eng.traineddata" ]]; then
  printf '%s\n' 'OCR is incomplete. Run: bash scripts/setup-local-macos.sh --install-ocr' >&2
  exit 1
fi
languages="$("$ocr_command" --tessdata-dir "$ocr_data" --list-langs)"
if ! grep -qx vie <<< "$languages" || ! grep -qx eng <<< "$languages"; then
  printf '%s\n' 'Tesseract must load both vie and eng. Check the Homebrew language installation.' >&2
  exit 1
fi
local_config="$backend_root/src/main/resources/application-local.properties"
if [[ ! -e "$local_config" && ! -L "$local_config" ]]; then
  (umask 077; cp "$local_config.example" "$local_config")
  printf '%s\n' 'Created application-local.properties from the template. Configure your own DB, mail and storage settings.'
else
  printf '%s\n' 'Kept your existing application-local.properties unchanged.'
fi
if [[ -L "$backend_root/.local-ocr.env" ]]; then
  printf '%s\n' 'Refusing to replace a symlink at .local-ocr.env.' >&2
  exit 1
fi
(umask 077; printf 'export OCR_TESSERACT_COMMAND=%q\nexport OCR_TESSDATA_DIR=%q\n' "$ocr_command" "$ocr_data" > "$backend_root/.local-ocr.env")
printf '%s\n' 'OCR is ready. In the same terminal, run:' 'source .local-ocr.env' './mvnw spring-boot:run -Dspring-boot.run.profiles=local'
