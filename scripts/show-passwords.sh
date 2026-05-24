#!/bin/bash
# Prints the password for every file in public-encrypted/.
# Share the relevant password with whoever needs access to that specific page.
set -euo pipefail
REPO_ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
SCRIPTS_DIR="$REPO_ROOT/scripts"
ENCRYPTED_DIR="$REPO_ROOT/public-encrypted"

if [ ! -d "$ENCRYPTED_DIR" ] || [ -z "$(find "$ENCRYPTED_DIR" -name "*.html" 2>/dev/null)" ]; then
  echo "No files in public-encrypted/."
  exit 0
fi

echo ""
echo "File passwords (derived from master secret):"
echo "──────────────────────────────────────────────────────"
find "$ENCRYPTED_DIR" -name "*.html" | sort | while read -r file; do
  relative="${file#$REPO_ROOT/}"
  password=$(bash "$SCRIPTS_DIR/derive-password.sh" "$relative")
  url_path="${relative#public-encrypted/}"
  printf "%-50s  %s\n" "$relative" "$password"
  printf "  → theclaudeconnection.com/%s\n" "$url_path"
  echo ""
done
