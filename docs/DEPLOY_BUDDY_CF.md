# Deploy Buddy to Cloudflare Workers - Complete Flow

## Wat werkt ✅

We hebben een werkende setup met:
- **Worker**: `https://roel-buddy-emrys.viriya.workers.dev`
- **Telegram**: `@roelbuddy_emrys_bot`
- **R2 bucket**: `roel-buddy-emrys-data`

## Complete Deploy Flow

### Prerequisites (eenmalig in GitHub Secrets)

| Secret | Beschrijving |
|--------|-------------|
| `CLOUDFLARE_ACCOUNT_ID` | Je Cloudflare account ID |
| `CLOUDFLARE_API_TOKEN` | API token met Workers/R2 rechten |
| `ANTHROPIC_API_KEY` | Claude API key |
| `MOLTBOT_GATEWAY_TOKEN` | Gateway token (genereer met `openssl rand -hex 32`) |
| `R2_ACCESS_KEY_ID` | R2 access key |
| `R2_SECRET_ACCESS_KEY` | R2 secret key |

### Per Buddy Input

1. **buddy_name**: Unieke naam (bijv. `kazeh-buddy`)
2. **telegram_bot_token**: Van @BotFather

### Deploy Steps (GitHub Actions doet dit)

```
1. Clone moltworker base repo
2. Rename worker naar buddy_name
3. Create R2 bucket (buddy_name-data)
4. Set all secrets
5. Deploy worker
```

## Kritische Config (moltbot.json.template)

**GEEN `token` key in channels.telegram!** Token komt uit env var.

```json
{
  "agents": {
    "defaults": {
      "workspace": "/root/clawd",
      "model": {
        "primary": "anthropic/claude-sonnet-4-20250514",
        "fallbacks": ["anthropic/claude-3-5-haiku-20241022"]
      }
    }
  },
  "channels": {
    "telegram": {
      "enabled": true,
      "dmPolicy": "allowlist",
      "allowFrom": ["tg:6528670828", "*"]
    }
  },
  "gateway": {
    "port": 18789,
    "mode": "local"
  }
}
```

## Wat nog nodig is 🔧

### 1. Soul/Persona Config
De buddy heeft nu geen persoonlijkheid. Nodig:
- Soul file in R2 bucket of via config
- Instructies wie de buddy is

### 2. Per-Buddy Config Template
Elke buddy heeft unieke:
- `allowFrom` lijst (Telegram user IDs)
- Model preferences
- Soul/persona

### 3. Verbeteringen aan Workflow

```yaml
inputs:
  buddy_name:        # ✅ hebben we
  telegram_bot_token: # ✅ hebben we
  # Nieuw nodig:
  owner_telegram_id:  # Wie mag DM'en
  soul_template:      # Welke persoonlijkheid
  model_primary:      # Model keuze
```

## Deploy Command

```bash
# Via GitHub Actions UI:
# Actions → Deploy Buddy Moltworker → Run workflow
#   buddy_name: kazeh-buddy
#   telegram_bot_token: 8330797405:AAH...
```

## Post-Deploy Checklist

- [ ] Test `/ping` endpoint: `curl https://BUDDY.viriya.workers.dev/ping`
- [ ] Test Telegram bot: stuur `/start`
- [ ] Check logs in Cloudflare dashboard
- [ ] Verify R2 bucket created

## Clean Deploy (bij problemen)

1. Delete R2 config: via Cloudflare dashboard of API
2. Delete worker en redeploy
3. Of: clear R2 bucket contents

---

*Laatste update: 2026-02-03*
