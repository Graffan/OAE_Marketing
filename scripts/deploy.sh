#!/bin/bash
set -e

APP_DIR="/opt/oae-marketing"
cd "$APP_DIR"

echo "=== OAE Marketing Deploy ==="
echo ""

echo "Pulling latest..."
git pull origin main

echo "Installing dependencies..."
npm install

echo "Applying schema changes (additive only)..."
npm run db:push

echo "Building..."
npm run build

echo "Restarting..."
pm2 restart oae-marketing

echo ""
echo "=== Deploy complete ==="
pm2 status
