#!/bin/sh
# Builds the site and publishes it to the gh-pages branch.
# Temporary: once the gh CLI token carries the `workflow` scope, .github/workflows/deploy.yml
# takes over and every push to main deploys by itself.
set -e
cd "$(dirname "$0")/.."

BASE_PATH=/week/ npm run build

cd dist
[ -d .git ] || git init -q -b gh-pages
touch .nojekyll
git add -A
git commit -q -m "Deploy $(date -u +%Y-%m-%dT%H:%MZ)" || { echo "nothing changed"; exit 0; }
git push -qf https://github.com/bergebakken/week.git gh-pages
echo "published to https://bergebakken.github.io/week/"
