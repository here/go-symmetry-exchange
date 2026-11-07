#!/bin/sh
# Stamp a new cache-busting version on every ?v=... in the site's links and imports.
# Run before each push that changes docs/. See "Cache busting" in agents.md.
set -e
cd "$(dirname "$0")/../docs"
v=$(date -u +%Y%m%d%H%M%S)
perl -pi -e "s/\?v=[0-9A-Za-z]+/?v=$v/g" index.html app.js
echo "site version $v"
