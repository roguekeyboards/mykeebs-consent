#!/usr/bin/env bash
set -euo pipefail

npm run --silent build

if ! git diff --exit-code --stat -- dist; then
  echo
  echo "dist/ is out of date - run npm run build and commit the result." >&2
  exit 1
fi
