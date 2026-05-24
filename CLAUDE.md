# TheClaudeConnection.github.io — Claude Instructions

## Encryption System

This repo uses StatiCrypt to password-protect sensitive HTML pages.

### Folder pattern
- `public-encrypted/` — source HTML, gitignored, never committed. **Edit files here.**
- Root — encrypted HTML output, committed and deployed by GitHub Pages.

### Workflow
1. Create or edit an HTML file in `public-encrypted/` (e.g. `public-encrypted/reports/client-weekly.html`)
2. Commit anything — the pre-commit hook runs `scripts/encrypt.sh` automatically
3. Encrypted version appears at root (e.g. `reports/client-weekly.html`)
4. GitHub Pages deploys it at `theclaudeconnection.com/reports/client-weekly.html`
5. Get the password: `bash scripts/show-passwords.sh`

### Password system
Each file has a unique password derived from: `HMAC-SHA256(ENCRYPTION_SECRET, file_path)[:16]`
Same master secret + same file path = same password every time.

### Commands
```bash
bash scripts/encrypt.sh        # Manually encrypt all files (hook does this automatically)
bash scripts/show-passwords.sh # List passwords for all files in public-encrypted/
bash scripts/derive-password.sh public-encrypted/reports/file.html  # Single file password
```

## Encrypt vs Leave Public

**Encrypt** (put in `public-encrypted/`):
- Client deliverables and reports
- Performance data (revenue, ROAS, spend, conversion rates)
- Strategy documents
- Proposals with pricing
- Audit findings
- Anything a competitor or the public should not see

**Leave public** (commit to root as normal):
- Portfolio and marketing pages
- Public case studies (with sensitive numbers redacted)
- Training and how-to content
- Landing pages meant for everyone

## If .env is lost
All file passwords change on next encryption. Steps:
1. Generate a new secret: `openssl rand -base64 32`
2. Update `.env` with the new value
3. Re-encrypt: `bash scripts/encrypt.sh` and commit
4. Retrieve new passwords: `bash scripts/show-passwords.sh`
5. Redistribute new passwords to anyone who had access
