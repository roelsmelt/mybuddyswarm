# Spell: Spawn Buddy 🧙‍♂️

**Spell Level:** Magician Only  
**Purpose:** Create a new Buddy in the MyBuddyTalk swarm  
**Source:** GitHub Repository

## Templates (GitHub Raw)

```
BASE_URL: https://raw.githubusercontent.com/roelsmelt/mybuddyswarm/main

Templates:
- ${BASE_URL}/buddies/_template/config.template.json
- ${BASE_URL}/buddies/_template/workspace/SOUL.md
```

## Prerequisites

1. You must be a Magician (Emrys or Morgan)
2. You need the following information:
   - Human name (who the Buddy serves)
   - Buddy name
   - Role (buddy or magician)
   - Telegram bot token (from @BotFather)
   - Human's Telegram ID
   - WhatsApp phone (optional, max 1 per Human)

## Spell Incantation

### Step 1: Fetch Templates from GitHub

```bash
# Fetch config template
curl -s https://raw.githubusercontent.com/roelsmelt/mybuddyswarm/main/buddies/_template/config.template.json

# Fetch SOUL template
curl -s https://raw.githubusercontent.com/roelsmelt/mybuddyswarm/main/buddies/_template/workspace/SOUL.md
```

### Step 2: Prepare the Soul

Create the Buddy's identity files based on templates:
- SOUL.MD - Their personality and essence
- IDENTITY.MD - Name, role, vibe
- USER.MD - Information about their Human

### Step 3: Request the Cascade Wizard

Tell your Human to invoke the Cascade wizard with:

```
Create new buddy: {Human}Buddy-{Name}
- Role: [buddy|magician]
- Telegram token: [from BotFather]
- Human Telegram ID: [number]
- WhatsApp: [yes/no]
- Personality: [description]
```

### Step 3: The Wizard Will

1. Create `buddies/{human}buddy-{name}/` directory
2. Generate Dockerfile with personal data baked in
3. Copy credentials if WhatsApp enabled
4. Deploy to Fly.io
5. Register in `/mnt/swarm/mybuddybook/registry.json`

### Step 4: Resonate

Once spawned, broadcast to the swarm:
```
📣 RESONATE: New Buddy joined! Welcome {Human}Buddy-{Name} ({Role})
```

## Registry Entry Format

```json
{
  "id": "{human}buddy-{name}",
  "human": "{Human}",
  "name": "{Name}",
  "role": "buddy|magician",
  "channels": {
    "telegram": true,
    "whatsapp": false
  },
  "spawned_at": "2026-02-02T17:30:00Z",
  "spawned_by": "RoelBuddy-Emrys"
}
```

## WhatsApp Constraint

⚠️ **Important:** Each Human can only have ONE Buddy with WhatsApp.

Before spawning with WhatsApp, check:
```
Does {Human} already have a Buddy with WhatsApp? 
If yes → Cannot enable WhatsApp for new Buddy
```

Current WhatsApp assignments:
- Roel → RoelBuddy-Emrys
- Esther → EstherBuddy-Kazeh

---

*Spell created by RoelBuddy-Emrys, 2026-02-02*
