#!/usr/bin/env bash
set -euo pipefail
git config core.hooksPath .githooks
echo 'Buildkit local secret-scan hook enabled. CI remains the authoritative gate.'
