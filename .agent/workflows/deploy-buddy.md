---
description: Deploy or update MyBuddyTalk buddies on Railway
---

# MyBuddyTalk Buddy Deployment

## Quick Deploy Checklist
// turbo-all

1. **Commit changes** to `openclaw-railway-fork`:
```bash
cd /Users/roelsmelt/Antigravity/Viriya/MyBuddy/openclaw-railway-fork
git add -A && git commit -m "Update buddy configuration" && git push
```

2. **Wait for Railway deploy** (auto-triggered on push to main)

3. **Verify deployment** via logs or browser

---

## New Buddy Setup

### Prerequisites
- [ ] Telegram bot created via @BotFather
- [ ] Bot token saved
- [ ] Buddy JSON config file created in `buddies/`

### Step 1: Create Buddy Config
Copy template and fill in:
```bash
cp buddies/template/config/human-buddy.json buddies/[human]-[buddyname].json
```

Fields to complete:
- `human`: Owner name (roel, ess, etc.)
- `buddy_name`: Buddy name (galahad, emrys, etc.)
- `telegram_bot_token`: From @BotFather
- `telegram_bot_username`: The @username

### Step 2: Create Railway Service
1. Go to Railway project: https://railway.com/project/27ea1f12-23ff-4acc-a064-a845b26cdb6d
2. New Service → Deploy from GitHub repo
3. Select `openclaw-railway-fork`
4. Set service name: `[Human] | [BuddyName]` (e.g., "Roel | Galahad")

### Step 3: Configure Environment Variables
In Railway service settings:

```
TELEGRAM_BOT_TOKEN=[from config]
BUDDY_NAME=[buddyname]
BUDDY_HUMAN=[human]
```

Reference shared variables:
```
GEMINI_API_KEY=${{shared.GEMINI_API_KEY}}
OPENCLAW_MODEL=${{shared.OPENCLAW_MODEL}}
GCS_BUDDY_KEY=${{shared.GCS_BUDDY_KEY}}  # Or GCS_MAGICIAN_KEY for magicians
```

### Step 4: Add Volume
1. Service → Settings → Volumes
2. Mount path: `/data`
3. Name: `[human]-[buddyname]-data`

### Step 5: Approve Telegram Pairing
After first message to bot:
```bash
# Via curl (from local machine)
curl -X POST "https://[service-url]/setup/api/pairing/approve" \
  -H "Authorization: Basic $(echo -n ':SETUP_PASSWORD' | base64)" \
  -H "Content-Type: application/json" \
  -d '{"chatId": "[CHAT_ID_FROM_LOGS]"}'
```

Or via browser: `https://[service-url]/setup` → Approve pending pairing

---

## Troubleshooting

### Bot niet responsief
1. Check Railway logs voor errors
2. Verify `TELEGRAM_BOT_TOKEN` is correct
3. Check if pairing is approved

### Templates niet gekopieerd
1. Check logs voor `[auto-setup] Checking workspace templates...`
2. Verify `templates/workspace/` exists in repo
3. Manual fix: Railway shell → copy files to `/data/workspace/`

### GCS connection failed
1. Verify `GCS_BUDDY_KEY` contains valid JSON
2. Check service account has bucket access
3. Test: `gsutil ls gs://mybuddytalk_mybuddybook/`

### Reconfigure buddy
1. Delete volume in Railway (loses all data!)
2. Or use: `curl -X POST "[url]/setup/api/reset"` (untested)

---

## Key Files

| File | Purpose |
|------|---------|
| `buddies/[human]-[buddy].json` | Buddy config template |
| `openclaw-railway-fork/scripts/auto-setup.js` | Auto-config on startup |
| `openclaw-railway-fork/templates/workspace/` | Default workspace files |
| `.secrets/buddy-gcs-key.json` | GCS buddy access (local) |
| `.secrets/magician-gcs-key.json` | GCS magician access (local) |

---

## GCS Bucket Structure

```
mybuddytalk_mybuddybook/
├── onboarding.md       # First-read instructions
├── rules.json          # Swarm rules
├── registry.json       # Who's on the network
├── buddybook/
│   ├── humans/         # Human profiles
│   └── buddies/        # Buddy profiles

mybuddytalk_spellbook/  # Magicians only!
├── spells/
└── blueprints/
```

---

## Railway Shared Variables

| Variable | Value | Usage |
|----------|-------|-------|
| `GEMINI_API_KEY` | (secret) | LLM API |
| `OPENCLAW_MODEL` | `google/gemini-3-flash-preview` | Model selection |
| `GCS_BUDDY_KEY` | (secret) | Buddies: MyBuddybook only |
| `GCS_MAGICIAN_KEY` | (secret) | Magicians: Both buckets |
