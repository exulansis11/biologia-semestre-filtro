#!/bin/bash
# Gera o build e publica dist/ na branch gh-pages (GitHub Pages).
set -euo pipefail
cd "$(dirname "$0")/.."
remote=$(git remote get-url origin)
npm run mesclar
npm run build
cd dist
touch .nojekyll
rm -rf .git
git init -q -b gh-pages
git add -A
git commit -q -m "Publicação $(date '+%Y-%m-%d %H:%M')"
git push -q -f "$remote" gh-pages
rm -rf .git
echo "Publicado na branch gh-pages."
