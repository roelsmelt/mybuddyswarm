/**
 * MyBuddy Swarm Manager
 * Manages multiple OpenClaw bot instances on a single Railway service
 * Syncs with Supabase for SpellBook, MyBuddyBook, and buddy registry
 */

const { spawn } = require('child_process');
const express = require('express');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

const BOTS_DIR = process.env.BOTS_DIR || '/data/bots';
const BASE_PORT = 18001;
const HTTP_PORT = process.env.PORT || 8080;

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Track running bots
const runningBots = new Map();

/**
 * Bot configuration structure
 */
function getBotConfig(botId) {
  const configPath = path.join(BOTS_DIR, botId, 'config.json');
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
  return null;
}

/**
 * Get all registered bots
 */
function getAllBots() {
  if (!fs.existsSync(BOTS_DIR)) {
    fs.mkdirSync(BOTS_DIR, { recursive: true });
    return [];
  }
  return fs.readdirSync(BOTS_DIR).filter(f => {
    const stat = fs.statSync(path.join(BOTS_DIR, f));
    return stat.isDirectory();
  });
}

/**
 * Start a bot instance
 */
async function startBot(botId) {
  if (runningBots.has(botId)) {
    console.log(`[${botId}] Already running`);
    return { success: true, message: 'Already running' };
  }

  const config = getBotConfig(botId);
  if (!config) {
    return { success: false, message: 'Bot config not found' };
  }

  const botDir = path.join(BOTS_DIR, botId);
  const port = BASE_PORT + getAllBots().indexOf(botId);
  
  // Create OpenClaw config
  const openclawConfig = {
    ...config.openclaw,
    gateway: {
      mode: 'local',
      port: port,
      host: '127.0.0.1'
    }
  };

  const openclawConfigPath = path.join(botDir, 'openclaw.json');
  fs.writeFileSync(openclawConfigPath, JSON.stringify(openclawConfig, null, 2));

  // Set environment variables
  const env = {
    ...process.env,
    OPENCLAW_STATE_DIR: path.join(botDir, '.openclaw'),
    OPENCLAW_WORKSPACE_DIR: path.join(botDir, 'workspace'),
    OPENCLAW_CONFIG: openclawConfigPath,
    ...config.env
  };

  // Start OpenClaw gateway
  console.log(`[${botId}] Starting on port ${port}...`);
  
  const proc = spawn('openclaw', ['gateway', 'start'], {
    env,
    cwd: botDir,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  proc.stdout.on('data', (data) => {
    console.log(`[${botId}] ${data.toString().trim()}`);
  });

  proc.stderr.on('data', (data) => {
    console.error(`[${botId}] ERROR: ${data.toString().trim()}`);
  });

  proc.on('exit', (code) => {
    console.log(`[${botId}] Exited with code ${code}`);
    runningBots.delete(botId);
  });

  runningBots.set(botId, { proc, port, config });
  
  return { success: true, port, message: `Started on port ${port}` };
}

/**
 * Stop a bot instance
 */
async function stopBot(botId) {
  const bot = runningBots.get(botId);
  if (!bot) {
    return { success: false, message: 'Bot not running' };
  }

  bot.proc.kill('SIGTERM');
  runningBots.delete(botId);
  
  return { success: true, message: 'Stopped' };
}

/**
 * Create a new bot
 */
async function createBot(botId, config) {
  const botDir = path.join(BOTS_DIR, botId);
  
  if (fs.existsSync(botDir)) {
    return { success: false, message: 'Bot already exists' };
  }

  // Create directories
  fs.mkdirSync(botDir, { recursive: true });
  fs.mkdirSync(path.join(botDir, 'workspace'), { recursive: true });
  fs.mkdirSync(path.join(botDir, '.openclaw'), { recursive: true });

  // Save config
  fs.writeFileSync(
    path.join(botDir, 'config.json'),
    JSON.stringify(config, null, 2)
  );

  // Copy workspace files if provided
  if (config.workspace) {
    for (const [filename, content] of Object.entries(config.workspace)) {
      fs.writeFileSync(path.join(botDir, 'workspace', filename), content);
    }
  }

  // Register in Supabase
  const { error } = await supabase.from('swarm_buddies').insert({
    buddy_id: botId,
    human_name: config.human_name || botId.split('-')[0],
    buddy_name: config.buddy_name || botId.split('-')[1] || botId,
    role: config.role || 'buddy',
    status: 'inactive',
    channels: config.channels || [],
    telegram_token: config.env?.TELEGRAM_BOT_TOKEN,
    metadata: { created_via: 'swarm_manager' }
  });

  if (error) {
    console.error(`[${botId}] Supabase registration failed:`, error.message);
  }

  return { success: true, message: 'Bot created', botId };
}

/**
 * Get SpellBook entries
 */
async function getSpellBook(level = 'buddy') {
  const levels = level === 'magician' ? ['buddy', 'magician'] : ['buddy'];
  const { data, error } = await supabase
    .from('swarm_spellbook')
    .select('*')
    .in('spell_level', levels)
    .eq('is_active', true);
  
  return error ? [] : data;
}

/**
 * Get MyBuddyBook entries
 */
async function getMyBuddyBook(visibility = 'all') {
  const { data, error } = await supabase
    .from('swarm_mybuddybook')
    .select('*')
    .in('visibility', visibility === 'magicians' ? ['all', 'magicians'] : ['all']);
  
  return error ? [] : data;
}

/**
 * Update buddy status in Supabase
 */
async function updateBuddyStatus(botId, status, port = null) {
  await supabase
    .from('swarm_buddies')
    .update({ status, port, updated_at: new Date().toISOString() })
    .eq('buddy_id', botId);
}

/**
 * Delete a bot
 */
async function deleteBot(botId) {
  await stopBot(botId);
  
  const botDir = path.join(BOTS_DIR, botId);
  if (fs.existsSync(botDir)) {
    fs.rmSync(botDir, { recursive: true });
  }
  
  return { success: true, message: 'Bot deleted' };
}

// ============ HTTP API ============

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    bots: runningBots.size,
    total: getAllBots().length
  });
});

// List all bots
app.get('/bots', (req, res) => {
  const bots = getAllBots().map(botId => {
    const running = runningBots.get(botId);
    return {
      id: botId,
      status: running ? 'running' : 'stopped',
      port: running?.port || null
    };
  });
  res.json({ bots });
});

// Get bot details
app.get('/bots/:id', (req, res) => {
  const botId = req.params.id;
  const config = getBotConfig(botId);
  const running = runningBots.get(botId);
  
  if (!config) {
    return res.status(404).json({ error: 'Bot not found' });
  }
  
  res.json({
    id: botId,
    status: running ? 'running' : 'stopped',
    port: running?.port || null,
    config: { ...config, env: '***' } // Hide secrets
  });
});

// Create bot
app.post('/bots', async (req, res) => {
  const { id, config } = req.body;
  
  if (!id || !config) {
    return res.status(400).json({ error: 'Missing id or config' });
  }
  
  const result = await createBot(id, config);
  res.status(result.success ? 201 : 400).json(result);
});

// Start bot
app.post('/bots/:id/start', async (req, res) => {
  const result = await startBot(req.params.id);
  res.json(result);
});

// Stop bot
app.post('/bots/:id/stop', async (req, res) => {
  const result = await stopBot(req.params.id);
  res.json(result);
});

// Delete bot
app.delete('/bots/:id', async (req, res) => {
  const result = await deleteBot(req.params.id);
  res.json(result);
});

// ============ SpellBook & MyBuddyBook API ============

// Get SpellBook
app.get('/spellbook', async (req, res) => {
  const level = req.query.level || 'buddy';
  const spells = await getSpellBook(level);
  res.json({ spells });
});

// Get MyBuddyBook
app.get('/mybuddybook', async (req, res) => {
  const visibility = req.query.visibility || 'all';
  const entries = await getMyBuddyBook(visibility);
  res.json({ entries });
});

// Add to MyBuddyBook
app.post('/mybuddybook', async (req, res) => {
  const { title, category, content, author_buddy_id, visibility, tags } = req.body;
  
  const { data, error } = await supabase.from('swarm_mybuddybook').insert({
    title, category, content, author_buddy_id, 
    visibility: visibility || 'all',
    tags: tags || []
  }).select();
  
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  res.status(201).json({ entry: data[0] });
});

// ============ Startup ============

async function startup() {
  console.log('🤖 MyBuddy Swarm Manager starting...');
  console.log(`📁 Bots directory: ${BOTS_DIR}`);
  
  // Auto-start all bots that were running
  const bots = getAllBots();
  console.log(`📋 Found ${bots.length} registered bots`);
  
  for (const botId of bots) {
    const config = getBotConfig(botId);
    if (config?.autostart !== false) {
      await startBot(botId);
    }
  }
  
  // Start HTTP server
  app.listen(HTTP_PORT, () => {
    console.log(`🌐 Swarm API listening on port ${HTTP_PORT}`);
    console.log(`✅ ${runningBots.size} bots running`);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  for (const [botId] of runningBots) {
    await stopBot(botId);
  }
  process.exit(0);
});

startup().catch(console.error);
