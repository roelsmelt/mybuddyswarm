#!/bin/bash
set -e

echo "Starting path migration..."

# 1. Create the target directory if it doesn't exist
mkdir -p /root/clawd

# 2. Check if we have data in the "wrong" place (.clawdbot/workspace)
if [ -d "/root/.clawdbot/workspace" ]; then
    echo "Found data in /root/.clawdbot/workspace. Moving to /root/clawd..."
    # Copy everything recursively, preserving attributes
    cp -rp /root/.clawdbot/workspace/* /root/clawd/
fi

# 3. Check if we have credentials in .clawdbot
if [ -d "/root/.clawdbot/credentials" ]; then
    echo "Found credentials in /root/.clawdbot. Moving..."
    mkdir -p /root/clawd/credentials
    cp -rp /root/.clawdbot/credentials/* /root/clawd/credentials/
fi

# 4. Check if we have config in .clawdbot
if [ -d "/root/.clawdbot/config" ]; then
    echo "Found config in /root/.clawdbot. Moving..."
    mkdir -p /root/clawd/config
    cp -rp /root/.clawdbot/config/* /root/clawd/config/
fi

# 5. Fix permissions aggressively
echo "Fixing permissions on /root/clawd..."
chown -R root:root /root/clawd
chmod -R 755 /root/clawd

# 6. List the new home
echo "New /root/clawd contents:"
ls -R /root/clawd
