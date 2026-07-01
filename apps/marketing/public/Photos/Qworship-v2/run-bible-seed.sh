#!/bin/bash
# run-bible-seed.sh
# Run this from your terminal inside the Qworship-v2 directory.
# It seeds the AMP and MSG Bible translations into MongoDB.

# Go to the server directory
cd "$(dirname "$0")"

echo "🔌 Running Bible translation seed..."
npx tsx apps/server/src/scripts/seed-bible-translations.ts

echo "✅ Done!"
