---
description: Create a new OpenClaw buddy from scratch with full Telegram integration
---

# Create Buddy Workflow

This workflow creates a new buddy service with all required configuration.

## Prerequisites
- Railway CLI installed and logged in (`railway login`)
- Project linked (`railway link -p 27ea1f12-23ff-4acc-a064-a845b26cdb6d`)

## Step 1: Gather Required Information

Ask the user for:
1. **Buddy Name**: e.g., "Emrys"
2. **Human Name**: e.g., "Roel"
3. **Role**: "buddy" (MyBuddybook only) or "magician" (MyBuddybook + Spellbook)
4. **Telegram Bot Token**: Created via @BotFather
5. **Telegram Bot Username**: e.g., "@roel_emrys_bot"

## Step 2: Create Service with Variables

```bash
# // turbo-all
railway add \
  --service "Human-BuddyName" \
  --repo "roelsmelt/openclaw-railway-template" \
  --variables "BUDDY_NAME=<BUDDY_NAME>" \
  --variables "BUDDY_HUMAN=<HUMAN_NAME>" \
  --variables "TELEGRAM_BOT_TOKEN=<TOKEN>" \
  --variables "TELEGRAM_BOT_USERNAME=<@USERNAME>" \
  --variables "GEMINI_API_KEY=AIzaSyA7UE92X4cuJeXdAh1QzavH0imJqlQuLgk" \
  --variables "OPENCLAW_MODEL=google/gemini-3-flash-preview" \
  --json
```

## Step 3: Link to Service

```bash
railway link -s "Human-BuddyName"
```

## Step 4: Create and Attach Volume

```bash
railway volume add -m /data --json
```

## Step 5: Add SETUP_PASSWORD

```bash
SETUP_PWD=$(openssl rand -hex 16)
echo "SETUP_PASSWORD: $SETUP_PWD"
railway variable set "SETUP_PASSWORD=$SETUP_PWD"
```

## Step 6: Add GCS Key (based on role)

For **buddy** role:
```bash
cat .secrets/buddy-gcs-key.json | railway variable set GCS_BUDDY_KEY --stdin
```

For **magician** role:
```bash
cat .secrets/magician-gcs-key.json | railway variable set GCS_MAGICIAN_KEY --stdin
```

## Step 7: Generate Domain

```bash
railway domain --json
```

## Step 8: Wait for Build (~2-3 min)

```bash
# Check status
railway service status --json

# Test healthcheck
curl -s "https://<DOMAIN>/setup/healthz"
```

## Step 9: Telegram Pairing (Async!)

Tell user:
> Service is ready! Open Telegram and message **@<bot_username>**.
> You'll receive a pairing code. Send it back to continue.

When user provides pairing code:
```bash
curl -X POST "https://<DOMAIN>/setup/api/pairing/approve" \
  -H "Authorization: Basic $(echo -n ':<SETUP_PASSWORD>' | base64)" \
  -H "Content-Type: application/json" \
  -d '{"channel": "telegram", "code": "<PAIRING_CODE>"}'
```

## Step 10: Update Local Config

Update `buddies/<human>-<buddy>.json`:
```json
{
    "human": "<human>",
    "buddy_name": "<buddy>",
    "role": "<buddy|magician>",
    "telegram_bot_username": "@<username>",
    "telegram_bot_token": "<token>",
    "service_id": "<service_id>",
    "service_name": "<Human-BuddyName>",
    "service_url": "<domain>",
    "setup_password": "<password>",
    "volume_name": "<volume_name>",
    "gcs_key_var": "GCS_BUDDY_KEY|GCS_MAGICIAN_KEY",
    "status": "active"
}
```

## Role Reference

| Role | GCS Key | Access |
|------|---------|--------|
| buddy | GCS_BUDDY_KEY | MyBuddybook only |
| magician | GCS_MAGICIAN_KEY | MyBuddybook + Spellbook |

## Notes

- Use dashes in service names (not pipes) for cleaner URLs
- Build takes ~2-3 minutes
- Pairing is async - user may respond later
- Templates (Bootstrap.md, Identity.md, etc.) are auto-copied on first run
