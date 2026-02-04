# Railway Buddy Manager

Railway API-based management tool for MyBuddyTalk swarm.

## Setup

1. **Get Railway API Token**
   - Go to https://railway.app/account/tokens
   - Create a new token
   - Copy the token

2. **Get Project ID**
   - Go to your Railway project dashboard
   - Copy the project ID from the URL: `railway.app/project/{PROJECT_ID}`

3. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env and add your token and project ID
   ```

4. **Install Dependencies**
   ```bash
   npm install
   ```

## Usage

### List all buddies
```bash
npm run list
# or
node index.js list
```

### Get buddy status
```bash
node index.js status <service-name>

# Examples:
node index.js status buddy-roel-emrys
node index.js status buddy-ess-morgan
```

### View buddy logs
```bash
node index.js logs <service-name>

# Note: Railway GraphQL API doesn't expose logs directly.
# Use Railway CLI or Dashboard to view logs.
```

## Architecture

This tool uses the Railway GraphQL API v2 to manage buddy services:
- **List**: Query all services in the project
- **Status**: Get deployment status and URL for a service
- **Logs**: Reminder to use Railway CLI/Dashboard

## Coming Soon

- [ ] `spawn` - Create new buddy from template
- [ ] `restart` - Restart a buddy service
- [ ] `update` - Update environment variables
- [ ] `remove` - Delete a buddy service

## Railway CLI Alternative

You can also use the official Railway CLI:
```bash
railway login
railway link
railway status
railway logs
```
