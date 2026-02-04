#!/bin/bash
set -e

BUDDY_ID=$1
APP_NAME="$BUDDY_ID-buddy"

if [ -z "$BUDDY_ID" ]; then
  echo "Usage: ./upload-config.sh <buddy-id>"
  exit 1
fi

BUDDY_DIR="deploy/buddies/$BUDDY_ID"
WORKSPACE_SRC="buddies/*-$BUDDY_ID/workspace"

# Find workspace directory (pattern: humanname-buddyname)
WORKSPACE_DIR=$(ls -d buddies/*-$BUDDY_ID/workspace 2>/dev/null | head -1)

if [ -z "$WORKSPACE_DIR" ]; then
  echo "❌ Workspace not found for $BUDDY_ID"
  echo "Looking for: buddies/*-$BUDDY_ID/workspace"
  exit 1
fi

echo "📁 Using workspace: $WORKSPACE_DIR"

# Create workspace directory on Fly
echo "📂 Creating /data/workspace on $APP_NAME..."
fly ssh console --app "$APP_NAME" -C "mkdir -p /data/workspace"

# Upload openclaw.json
echo "📤 Uploading openclaw.json..."
cat "$BUDDY_DIR/openclaw.json" | fly ssh console --app "$APP_NAME" -C "cat > /data/openclaw.json"

# Upload workspace files
echo "📤 Uploading workspace files..."
for file in "$WORKSPACE_DIR"/*.md; do
  if [ -f "$file" ]; then
    filename=$(basename "$file")
    echo "  → $filename"
    cat "$file" | fly ssh console --app "$APP_NAME" -C "cat > /data/workspace/$filename"
  fi
done

# Restart to pick up config
echo "🔄 Restarting $APP_NAME..."
fly machine restart --app "$APP_NAME" -y 2>/dev/null || fly apps restart "$APP_NAME"

echo "✅ Config uploaded to $APP_NAME"
echo ""
echo "Next: Channel onboarding"
echo "  fly ssh console --app $APP_NAME"
echo "  > openclaw channels login  # For WhatsApp QR"
