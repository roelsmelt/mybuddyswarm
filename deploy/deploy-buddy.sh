#!/bin/bash
set -e

BUDDY_ID=$1
REGION=${2:-ams}

if [ -z "$BUDDY_ID" ]; then
  echo "Usage: ./deploy-buddy.sh <buddy-id> [region]"
  echo "Example: ./deploy-buddy.sh emrys ams"
  exit 1
fi

BUDDY_DIR="deploy/buddies/$BUDDY_ID"
APP_NAME="$BUDDY_ID-buddy"

if [ ! -d "$BUDDY_DIR" ]; then
  echo "❌ Buddy directory not found: $BUDDY_DIR"
  exit 1
fi

echo "🚀 Deploying $BUDDY_ID to Fly.io..."

# Check if app exists
if ! fly apps list | grep -q "$APP_NAME"; then
  echo "📦 Creating app: $APP_NAME"
  fly apps create "$APP_NAME"
  
  echo "💾 Creating volume..."
  fly volumes create openclaw_data --size 1 --region "$REGION" --app "$APP_NAME" -y
else
  echo "✅ App $APP_NAME already exists"
fi

# Deploy
echo "🔨 Deploying..."
cd "$BUDDY_DIR"
fly deploy --app "$APP_NAME"

echo "✅ Deployed $APP_NAME"
echo ""
echo "Next steps:"
echo "1. Set secrets: ./set-secrets.sh $BUDDY_ID"
echo "2. Upload config: ./upload-config.sh $BUDDY_ID"
echo "3. Onboard channel: fly ssh console --app $APP_NAME"
