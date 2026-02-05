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
7. **GEMINI_API_KEY is required** ⚠️ - Must be set per-service OR as shared variable. Auto-setup fails without it!
8. **Rate limit between services** - Wait 60+ seconds between creating multiple services ("Endpoint too recently updated")
9. **Volumes cannot be auto-provisioned** - Railway config-as-code (railway.toml) only supports build/deploy settings, NOT volumes. Must add via CLI.
10. **CLI timeouts don't mean failure** ⚠️ - When Railway CLI times out, the operation may still succeed. Always verify with `railway volume list` before retrying to avoid duplicates!
11. **OPENCLAW_MODEL format matters** - Must include provider prefix: `google/gemini-2.0-flash` (NOT just `gemini-2.0-flash`). Default `-exp` model is deprecated/invalid!
12. **Redeploy vs new deploy** - `railway redeploy` restarts existing container. For env var changes, container must restart to pick them up. Verify with `/setup/api/status` after redeploy.
13. **One volume per service** - Multiple volumes at same mount point causes issues. Check with `railway volume list` before adding.

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

## Step 6b: Set GEMINI_API_KEY (CRITICAL!)
// turbo
```bash
# Check if shared variable exists, otherwise set per-service:
railway variable set "GEMINI_API_KEY=AIzaSyAmlRwSzH-Z11dKPzkciC8YZZwY-02TxkU"
```

## Step 7: Generate Domain
// turbo
```bash
railway domain --json
```

## Step 8: Wait for Build & VERIFY (~3 min)

⚠️ **DO NOT SKIP VERIFICATION - do not report success until ALL checks pass!**

```bash
# Wait for build to complete
sleep 180

# 1. Healthcheck
curl -s "https://<DOMAIN>/setup/healthz"
# Expected: {"ok":true}

# 2. Configuration status & MODEL check
curl -s "https://<DOMAIN>/setup/api/status" \
  -H "Authorization: Basic $(echo -n ':<SETUP_PASSWORD>' | base64)" | jq -r '.configured, .openclawVersion'
# Expected: true, 2026.x.x

# 3. Check logs for correct model
railway logs | grep -E "Model:" | tail -1
# Expected: "Model: google/gemini-2.0-flash" (NOT gemini-2.0-flash-exp!)
```

**If model is wrong:** 
```bash
curl -X POST "https://<DOMAIN>/setup/api/reset" -H "Authorization: Basic $(echo -n ':<SETUP_PASSWORD>' | base64)"
railway variable set "OPENCLAW_MODEL=google/gemini-2.0-flash"
railway redeploy --yes
# Wait 2 min, re-verify
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

| Feature | Status | How |
|---------|--------|-----|
| Volume permissions | ✅ | `entrypoint.sh` runs `chown -R openclaw:openclaw /data` |
| Persistent pairing | ✅ | `entrypoint.sh` exports `OPENCLAW_STATE_DIR=/data/.openclaw` |
| Persistent workspace | ✅ | `entrypoint.sh` exports `OPENCLAW_WORKSPACE_DIR=/data/workspace` |
| State dir security | ✅ | `auto-setup.js` sets chmod 700 on state dir |
| Template copying | ✅ | `auto-setup.js` copies from /app/templates |
| Template variables | ✅ | `{{BUDDY_NAME}}`, `{{HUMAN}}` replaced |

## Key Architecture

```
entrypoint.sh (runs as root)
├── chown /data → openclaw user
├── export OPENCLAW_STATE_DIR=/data/.openclaw
├── export OPENCLAW_WORKSPACE_DIR=/data/workspace
└── exec as openclaw → auto-setup.js → server.js
```

**Why this works:** OpenClaw uses `./.openclaw` (relative to /app) by default.
Without env vars, data is ephemeral. The entrypoint exports volume paths BEFORE app starts.

## Troubleshooting

| Issue | Root Cause | Solution |
|-------|------------|----------|
| Pairing lost after redeploy | Env vars not exported | Redeploy with latest entrypoint.sh |
| Permission denied on /data | Volume mounted as root | entrypoint.sh fixes this |
| Pairing code expired | Takes 60s, code TTL short | Send new message for fresh code |
| Healthcheck fails | Service still starting | Wait 2-3 min after deploy |
| "API key expired" | GEMINI_API_KEY rotated | Redeploy to pick up shared var |
| Logs show `./.openclaw` | Old entrypoint running | Check `railway deploys` for latest |

## Role Reference

| Role | GCS Key | Access |
|------|---------|--------|
| buddy | GCS_BUDDY_KEY | MyBuddybook only |
| magician | GCS_MAGICIAN_KEY | MyBuddybook + Spellbook |

