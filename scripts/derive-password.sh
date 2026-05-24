#!/bin/bash
# Usage: derive-password.sh <file_path>
# Returns the 16-char HMAC-SHA256 password for a given file path.
set -euo pipefail
REPO_ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
set -a; source "$REPO_ROOT/.env"; set +a
echo -n "$1" | openssl dgst -hmac "$ENCRYPTION_SECRET" -sha256 | awk '{print $2}' | cut -c1-16
