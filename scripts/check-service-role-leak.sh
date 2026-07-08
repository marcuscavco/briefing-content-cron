#!/usr/bin/env bash
# Guard-rail: a service role key só pode ser referenciada em packages/db (admin.ts)
# e em arquivos de infra (env example, CI, docs, testes de RLS).
set -euo pipefail

cd "$(dirname "$0")/.."

matches=$(grep -rn "SERVICE_ROLE" \
  --include='*.ts' --include='*.tsx' --include='*.js' --include='*.mjs' \
  --exclude-dir=.next --exclude-dir=node_modules --exclude-dir=dist \
  apps packages 2>/dev/null \
  | grep -v '^packages/db/src/admin.ts:' || true)

if [ -n "$matches" ]; then
  echo "ERRO: referência a SERVICE_ROLE fora de packages/db/src/admin.ts:"
  echo "$matches"
  exit 1
fi

echo "ok: service role key confinada a packages/db/src/admin.ts"
