#!/bin/bash
# Sync templates from buddies/template/workspace/ to openclaw-railway-fork/templates/workspace/
# Run this script after making changes to the source templates

SOURCE_DIR="$(dirname "$0")/../buddies/template/workspace"
DEST_DIR="$(dirname "$0")/../openclaw-railway-fork/templates/workspace"

mkdir -p "$DEST_DIR"
cp "$SOURCE_DIR"/*.md "$DEST_DIR/"

echo "✅ Synced templates from buddies/template/workspace/ to openclaw-railway-fork/templates/workspace/"
ls -la "$DEST_DIR"
