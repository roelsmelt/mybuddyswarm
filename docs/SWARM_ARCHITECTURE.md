# MyBuddyTalk Swarm Architecture

## Overview

MyBuddyTalk is a swarm of AI Buddies running on Fly.io. Each Buddy serves a specific Human and has a defined role.

## Naming Convention

```
{Human}Buddy-{BotName}
```

### Current Swarm Members

| Bot ID | Human | Role | Channels | Status |
|--------|-------|------|----------|--------|
| `RoelBuddy-Emrys` | Roel | Magician | TG + WA | Active |
| `RoelBuddy-Galahad` | Roel | Buddy | TG | Planned |
| `EstherBuddy-Kazeh` | Esther | Buddy | TG + WA | Migration |
| `EstherBuddy-Morgan` | Esther | Magician | TG | Planned |

### Roles

- **Magician**: Can spawn/upgrade Buddies, access SpellBook, elevated privileges
- **Buddy**: Standard assistant, can read/write MyBuddyBook

## WhatsApp Constraint

Each Human can have **maximum 1 WhatsApp connection**:
- Roel → RoelBuddy-Emrys
- Esther → EstherBuddy-Kazeh

---

## Fly.io Structure

```
mybuddytalk (app)
├── Machines:
│   ├── roelbuddy-emrys      (magician)
│   ├── roelbuddy-galahad    (buddy)
│   ├── estherbuddy-kazeh    (buddy)
│   └── estherbuddy-morgan   (magician)
│
└── Volume: swarm_shared
    ├── mybuddybook/         (all Buddies R/W)
    └── spellbook/           (Magicians only)
```

---

## Storage Architecture

### Personal Data (IN Docker Image)
Each Buddy's personal data is baked into their Docker image:

```
/root/.clawdbot/
├── clawdbot.json           # Config (channels, API keys)
├── workspace/
│   ├── SOUL.MD             # Personality
│   ├── IDENTITY.MD         # Name, role, vibe
│   ├── MEMORY.MD           # Personal memory instructions
│   ├── USER.MD             # Info about their Human
│   └── memory/             # Daily logs
├── credentials/            # WhatsApp session, etc.
└── memory/                 # LanceDB personal memory
```

### Shared Data (Volume: swarm_shared)
Mounted at `/mnt/swarm/` for all Buddies:

```
/mnt/swarm/
├── mybuddybook/
│   ├── wisdom/             # Shared knowledge articles
│   ├── announcements/      # Resonate broadcasts
│   ├── registry.json       # Bot registry
│   └── templates/          # Buddy templates
└── spellbook/
    ├── spells/             # Magician-only tools
    │   └── spawn_buddy.md  # Spell to create new Buddy
    └── changelog.md        # Version history
```

---

## MyBuddy vs Standard Clawdbot

### MyBuddy-Specific Configuration

| Setting | MyBuddy | Standard Clawdbot | Reason |
|---------|---------|-------------------|--------|
| `model.primary` | `google/gemini-3-flash-preview` | Various | Gemini optimized |
| `model.fallbacks` | `google/gemini-3-pro-preview` | Various | Gemini stack |
| Moltbook integration | **Disabled** | Enabled | MyBuddyBook instead |
| `beekeeper` plugin | **Removed** | Optional | Not needed |
| `swarm-manager` plugin | **Removed** | Optional | Custom swarm logic |
| Gateway binding | `--bind lan` | `--bind loopback` | Fly.io proxy |
| Gateway token | Auto-generated | Manual | Security |

### MyBuddy Base Template

```json
{
  "env": {
    "GEMINI_API_KEY": "${GEMINI_API_KEY}",
    "BRAVE_API_KEY": "${BRAVE_API_KEY}"
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "google/gemini-3-flash-preview",
        "fallbacks": ["google/gemini-3-pro-preview"]
      }
    }
  },
  "gateway": {
    "mode": "local",
    "auth": { "token": "${AUTO_GENERATED}" }
  },
  "plugins": {
    "entries": {
      "telegram": { "enabled": true },
      "whatsapp": { "enabled": false }
    }
  }
}
```

### Personal Config Additions (per Buddy)

```json
{
  "env": {
    "CLAWDBOT_TELEGRAM_TOKEN": "${BOT_SPECIFIC_TOKEN}",
    "TELEGRAM_ADMIN_ID": "${HUMAN_TELEGRAM_ID}"
  },
  "channels": {
    "telegram": {
      "botToken": "${BOT_SPECIFIC_TOKEN}",
      "dmPolicy": "pairing",
      "groupPolicy": "allowlist"
    },
    "whatsapp": {
      "sendReadReceipts": true,
      "dmPolicy": "allowlist",
      "allowFrom": ["${HUMAN_PHONE}"]
    }
  }
}
```

---

## SpawnBuddy Spell

### Location
`/mnt/swarm/spellbook/spells/spawn_buddy.md`

### Prerequisites
- Magician role required
- Access to Fly.io API (FLY_API_TOKEN)
- Template from `/mnt/swarm/mybuddybook/templates/`

### Spell Parameters

```yaml
spell: spawn_buddy
parameters:
  human: "Esther"           # Human owner
  name: "Kazeh"             # Buddy name
  role: "buddy"             # buddy | magician
  channels:
    telegram: true
    telegram_token: "..."   # From BotFather
    whatsapp: true          # Max 1 per Human!
    whatsapp_phone: "+31..."
  personality:
    soul: "..."             # SOUL.MD content
    identity: "..."         # IDENTITY.MD content
```

### Execution Steps

1. **Validate**: Check Human doesn't exceed WA limit
2. **Generate**: Create Buddy-specific Dockerfile
3. **Build**: `fly deploy --dockerfile buddies/{human}buddy-{name}/Dockerfile`
4. **Register**: Add to `/mnt/swarm/mybuddybook/registry.json`
5. **Resonate**: Announce new Buddy to swarm

---

## Directory Structure (Repository)

```
MyBuddyTalk/
├── fly.toml                    # Base Fly.io config
├── Dockerfile                  # Base image
├── entrypoint.sh               # Startup script
├── docs/
│   └── SWARM_ARCHITECTURE.md   # This file
├── buddies/
│   ├── _template/              # Base buddy template
│   │   ├── workspace/
│   │   │   ├── SOUL.MD
│   │   │   ├── IDENTITY.MD
│   │   │   └── ...
│   │   └── config.json
│   ├── roelbuddy-emrys/
│   │   ├── Dockerfile
│   │   ├── workspace/
│   │   └── config.json
│   └── estherbuddy-kazeh/
│       ├── Dockerfile
│       ├── workspace/
│       ├── credentials/        # WA session (gitignored)
│       └── config.json
└── shared/
    ├── mybuddybook/
    └── spellbook/
```

---

## Migration Checklist: EstherBuddy-Kazeh

- [ ] Copy workspace from DO VPS
- [ ] Copy WhatsApp credentials from DO VPS
- [ ] Create `buddies/estherbuddy-kazeh/` directory
- [ ] Create Buddy-specific Dockerfile
- [ ] Deploy to Fly.io
- [ ] Verify WA connection
- [ ] Register in swarm

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2026-02-02 | 0.1.0 | Initial architecture design |
