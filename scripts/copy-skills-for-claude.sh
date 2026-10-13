#!/usr/bin/env bash
set -euo pipefail
mkdir -p .claude/skills
for d in .agents/skills/*; do
  [ -d "$d" ] || continue
  name="$(basename "$d")"
  mkdir -p ".claude/skills/$name"
  cp "$d/SKILL.md" ".claude/skills/$name/SKILL.md"
done
echo 'Copied project skills to .claude/skills/'
