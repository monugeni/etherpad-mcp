#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "Pulling latest..."
git pull --ff-only

echo "Installing dependencies..."
npm install --omit=dev

echo "Building..."
npm run build

echo "Done. Restart the server to apply changes."
