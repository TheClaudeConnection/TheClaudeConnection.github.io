#!/bin/bash
# Encrypts all .html files in public-encrypted/ → matching root paths using StatiCrypt.
# Each file gets a unique password derived from HMAC-SHA256(ENCRYPTION_SECRET, file_path).
set -euo pipefail
REPO_ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
SCRIPTS_DIR="$REPO_ROOT/scripts"
ENCRYPTED_DIR="$REPO_ROOT/public-encrypted"

if [ ! -d "$ENCRYPTED_DIR" ] || [ -z "$(find "$ENCRYPTED_DIR" -name "*.html" 2>/dev/null)" ]; then
  echo "Nothing in public-encrypted/ to encrypt."
  exit 0
fi

set -a; source "$REPO_ROOT/.env"; set +a
# Derive a deterministic 32-char hex salt from the master secret so encrypted
# output is consistent across machines without needing a committed config file.
SALT=$(echo -n "staticrypt-salt" | openssl dgst -hmac "$ENCRYPTION_SECRET" -sha256 | awk '{print $2}' | cut -c1-32)

find "$ENCRYPTED_DIR" -name "*.html" | while read -r file; do
  relative="${file#$REPO_ROOT/}"
  out_subpath="${relative#public-encrypted/}"
  out_dir="$REPO_ROOT/$(dirname "$out_subpath")"
  password=$(bash "$SCRIPTS_DIR/derive-password.sh" "$relative")
  mkdir -p "$out_dir"
  staticrypt "$file" \
    --password "$password" \
    --directory "$out_dir" \
    --salt "$SALT" \
    --short \
    2>/dev/null
  echo "Encrypted: $relative → $out_subpath"
done
