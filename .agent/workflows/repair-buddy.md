---
description: Repair a broken buddy by creating a fresh install with data preservation
---

# Repair Buddy Workflow

This workflow recreates a broken buddy service while preserving all data (Memory.md, Identity.md, etc.).

## Prerequisites
- Railway CLI installed and logged in
- Project linked via `railway link`

## Required Information

Before starting, gather:
1. **Buddy Name**: e.g., "Emrys"
2. **Human Name**: e.g., "Roel"  
3. **Role**: "buddy" or "magician"
4. **Telegram Bot Token**: From BotFather
5. **Telegram Username**: e.g., "@RoelBuddy_EmrysBot"
6. **Existing Volume Name**: Check with `railway volume list --json`

## Repair Steps

### 1. Identify the broken service and volume

```bash
# List all volumes to find the data volume
railway volume list --json

# Note the volume with data (check currentSizeMB > 0)
# Example: "emrys-volume" with 116MB data
```

### 2. Delete the broken service

```bash
# Via Railway dashboard or CLI
# IMPORTANT: This detaches but does NOT delete the volume
```

### 3. Create new service with same config

```bash
# // turbo-all
# Link to the project first
railway link -p <PROJECT_ID>

# Create new service with GitHub repo and environment variables
railway add \
  --service "Human | BuddyName" \
  --repo "roelsmelt/openclaw-railway-template" \
  --variables "TELEGRAM_BOT_TOKEN=<BOT_TOKEN>" \
  --variables "BUDDY_NAME=<BUDDY_NAME>" \
  --variables "BUDDY_HUMAN=<HUMAN_NAME>" \
  --variables "TELEGRAM_BOT_USERNAME=<@BOT_USERNAME>" \
  --json
```

### 4. Link to new service and attach volume

```bash
# Link to the new service
railway link -s "Human | BuddyName"

# Attach the existing volume (preserves all data!)
railway volume attach -v <VOLUME_NAME> -y --json
```

### 5. Generate domain

```bash
railway domain -s "Human | BuddyName" --json
```

### 6. Verify deployment

```bash
# Check deployment status
railway service status --json

# Check logs
railway logs -s "Human | BuddyName"

# Test healthcheck
curl -s "https://<DOMAIN>/setup/healthz"
```

### 7. Approve Telegram pairing

When user sends a message, they'll get a pairing code. Approve it:

```bash
curl -X POST "https://<DOMAIN>/setup/api/pairing/approve" \
  -H "Authorization: Basic $(echo -n ':<SETUP_PASSWORD>' | base64)" \
  -H "Content-Type: application/json" \
  -d '{"channel": "telegram", "code": "<PAIRING_CODE>"}'
```

## Volume Types by Role

| Role | GCS Key Variable | Access |
|------|------------------|--------|
| buddy | GCS_BUDDY_KEY | mybuddybook only |
| magician | GCS_MAGICIAN_KEY | mybuddybook + spellbook |

## Common Issues

- **Healthcheck failure**: Check if templates exist in `/app/templates/workspace/`
- **Volume not found**: Ensure volume is unattached (`serviceName: null`)
- **Repo not found**: Use full format `owner/repo-name`

## Project Reference

- **Project ID**: `27ea1f12-23ff-4acc-a064-a845b26cdb6d`
- **Repo**: `roelsmelt/openclaw-railway-template`
