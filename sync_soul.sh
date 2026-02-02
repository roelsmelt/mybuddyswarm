#!/bin/bash
# Sync Emrys Soul to Fly.io
APP="mybuddytalk"
LOCAL_DIR="./migration/emrys"
REMOTE_DIR="/root/.clawdbot"

echo "📦 Preparing soul archive..."
tar -czf emrys_soul.tar.gz -C "$LOCAL_DIR" .

echo "🚀 Uploading to Fly..."
fly ssh sftp put emrys_soul.tar.gz /root/emrys_soul.tar.gz

echo "🪄 Extracting soul on server..."
fly ssh console --app "$APP" -C "rm -rf $REMOTE_DIR/* && mkdir -p $REMOTE_DIR && tar -xzf /root/emrys_soul.tar.gz -C $REMOTE_DIR && rm /root/emrys_soul.tar.gz"

echo "🔄 Restarting Emrys..."
fly machine restart 7815999b241de8

echo "✅ Soul Migration Complete!"
rm emrys_soul.tar.gz
