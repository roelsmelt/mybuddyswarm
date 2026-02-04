---
description: Create a new OpenClaw buddy from scratch (fully automated, scalable)
---

# Create Buddy Workflow

This workflow creates buddies reliably. Optimized for automation and scale (10-20+ buddies).

## Prerequisites
- Railway CLI installed (`npm i -g @railway/cli`)
- Logged in (`railway login`)
- Project linked (`railway link -p 27ea1f12-23ff-4acc-a064-a845b26cdb6d`)

## Critical Learnings (DO NOT SKIP)

1. **Volume BEFORE first deploy** - Creates with correct permissions
2. **Dashes in names, not pipes** - `Roel-Emrys` not `Roel | Emrys` (cleaner URLs)
3. **All env vars in one command** - Avoids multiple redeploys
4. **Pairing is async** - User provides code AFTER deploy
5. **State dir permissions** - Auto-fixed to 700 by auto-setup.js
6. **Build takes ~3 min** - Wait for SUCCESS before testing

## Step 1: Gather Info

```bash
# Required from user:
BUDDY_NAME="Emrys"           # Buddy's name
HUMAN="Roel"                 # Human's name  
ROLE="magician"              # "buddy" or "magician"
TG_TOKEN="8268526..."        # From @BotFather
TG_USERNAME="@roel_emrys_bot"
```

## Step 2: Create Service (NO DEPLOY YET)
// turbo-all
```bash
SERVICE_NAME="${HUMAN}-${BUDDY_NAME}"

railway add \
  --service "$SERVICE_NAME" \
  --repo "roelsmelt/openclaw-railway-template" \
  --variables "BUDDY_NAME=$BUDDY_NAME" \
  --variables "BUDDY_HUMAN=$HUMAN" \
  --variables "TELEGRAM_BOT_TOKEN=$TG_TOKEN" \
  --variables "TELEGRAM_BOT_USERNAME=$TG_USERNAME" \
  --json
```

## Step 3: Link to New Service
// turbo
```bash
railway link -s "$SERVICE_NAME"
```

## Step 4: Add Volume FIRST (before any deploy)
// turbo
```bash
railway volume add -m /data --json
```

## Step 5: Set SETUP_PASSWORD
// turbo
```bash
SETUP_PWD=$(openssl rand -hex 16)
echo "SETUP_PASSWORD: $SETUP_PWD"  # Save this!
railway variable set "SETUP_PASSWORD=$SETUP_PWD"
```

## Step 6: Set GCS Key (based on role)
// turbo
```bash
# For buddy role:
cat .secrets/buddy-gcs-key.json | railway variable set GCS_BUDDY_KEY --stdin

# For magician role:
cat .secrets/magician-gcs-key.json | railway variable set GCS_MAGICIAN_KEY --stdin
```

## Step 7: Generate Domain
// turbo
```bash
railway domain --json
```

## Step 8: Wait for Build (~3 min)

```bash
# Check status until SUCCESS
railway service status --json

# Test healthcheck
curl -s "https://<DOMAIN>/setup/healthz"
# Expected: {"ok":true}
```

## Step 9: Telegram Pairing (ASYNC!)

**Tell user:**
> Service ready! Message **@<bot_username>** in Telegram.
> Send me the pairing code you receive.

**When code received:**
```bash
curl -X POST "https://<DOMAIN>/setup/api/pairing/approve" \
  -H "Authorization: Basic $(echo -n ':<SETUP_PASSWORD>' | base64)" \
  -H "Content-Type: application/json" \
  -d '{"channel": "telegram", "code": "<PAIRING_CODE>"}'
```

## Step 10: Update Local Config

Create/update `buddies/<human>-<buddy>.json`:
```json
{
    "human": "<human>",
    "buddy_name": "<buddy>",
    "role": "<buddy|magician>",
    "telegram_bot_username": "@<username>",
    "telegram_bot_token": "<token>",
    "service_id": "<from railway add output>",
    "service_name": "<Human-BuddyName>",
    "service_url": "<domain>",
    "setup_password": "<password>",
    "volume_name": "<from volume add output>",
    "status": "active"
}
```

## What's Automatic Now

| Feature | Status |
|---------|--------|
| Volume permissions | ✅ Fixed by entrypoint.sh (chown /data) |
| State dir security | ✅ chmod 700 by auto-setup.js |
| Persistent pairing | ✅ Stored on /data/.openclaw |
| Workspace templates | ✅ Copied from /app/templates |
| Template variables | ✅ {{BUDDY_NAME}}, {{HUMAN}} replaced |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Permission denied on /data | Wait for entrypoint.sh fix deploy |
| Pairing code expired | Send new message, get fresh code |
| Healthcheck fails | Check logs: `railway logs` |
| "API key expired" | Redeploy to pick up new GEMINI_API_KEY |
| Pairing lost after redeploy | Ensure volume mounted, check symlinks |

## Role Reference

| Role | GCS Key | Access |
|------|---------|--------|
| buddy | GCS_BUDDY_KEY | MyBuddybook only |
| magician | GCS_MAGICIAN_KEY | MyBuddybook + Spellbook |
