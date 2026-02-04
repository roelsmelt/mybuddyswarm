---
description: Deploy OpenClaw to Railway MyBuddyTalk project
---

# Deploy OpenClaw to Railway (MyBuddyTalk)

Automated deployment to Railway using the openclaw-railway-template.

## Prerequisites

- Railway CLI installed and authenticated
- Railway project: MyBuddyTalk
- Railway Volume mounted at /data

## Deployment Steps

// turbo-all

1. **Navigate to template directory**
```bash
cd /Users/roelsmelt/Antigravity/Viriya/MyBuddy/railway-openclaw-template
```

2. **Verify Railway CLI authentication**
```bash
railway whoami
```

3. **Link to MyBuddyTalk project** (if not already linked)
```bash
railway link
```

4. **Check current deployment status**
```bash
railway status
```

5. **Deploy to Railway**
```bash
railway up
```

6. **Stream deployment logs**
```bash
railway logs --tail 100
```

7. **Get deployment URL**
```bash
railway status | grep "URL"
```

## Post-Deployment Setup

Access the setup wizard at `https://<your-app>.up.railway.app/setup`

**Setup Wizard Steps:**
1. Enter SETUP_PASSWORD (from Railway Variables/Shared Secrets)
2. Choose auth provider: **"Google Gemini API key"**
3. Enter GEMINI_API_KEY (from Railway Shared Secrets)
4. Select model: `google/gemini-2.0-flash-exp` or `google/gemini-2.0-flash-thinking-exp-01-21`
5. (Optional) Add Telegram/Discord bot tokens
6. Click "Run Setup" → gateway will start automatically
7. Click "Open OpenClaw UI" to access the Control interface

## Troubleshooting

**If deployment fails:**
```bash
# Check detailed logs
railway logs --tail 500

# Check environment variables
railway variables

# Shell into container
railway run bash
```

**Common issues:**
- **Health check timeout**: Takes 1-2 minutes for first startup
- **Volume not mounted**: Verify volume exists at `/data` in Railway dashboard
- **Missing env vars**: Check `OPENCLAW_STATE_DIR` and `OPENCLAW_WORKSPACE_DIR` are set
- **Initialization failure**: Pin OpenClaw version in Dockerfile (see implementation plan)
