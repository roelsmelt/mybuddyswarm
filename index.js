const { Type } = require('@sinclair/typebox');
const { exec } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');
const execPromise = util.promisify(exec);

const plugin = {
    id: 'beekeeper',
    name: 'Beekeeper',
    description: 'Manage the bot swarm (create/list bots).',

    register(api) {
        const config = api.pluginConfig || {};
        api.logger.info('Beekeeper plugin registered');

        api.registerTool({
            name: 'create_buddy',
            label: 'Create Buddy',
            description: 'Create a new AI Buddy in the swarm by cloning Emrys template.',
            parameters: Type.Object({
                name: Type.String({ description: 'Unique name (lowercase a-z, 0-9)' }),
                phone: Type.String({ description: 'WhatsApp number to allow (e.g. +316...)' })
            }),
            execute: async (toolCallId, { name, phone }) => {
                if (!/^[a-z0-9]+$/.test(name)) {
                    return { content: [{ type: 'text', text: 'Error: Name must be lowercase alphanumeric only.' }] };
                }

                const botsDir = config.botsDir || '/bots';
                const newBotDir = path.join(botsDir, name);
                const sourceDir = path.join(botsDir, 'emrys');

                if (fs.existsSync(newBotDir)) {
                    return { content: [{ type: 'text', text: `Error: Bot ${name} already exists.` }] };
                }

                try {
                    // 1. Clone directory
                    await execPromise(`cp -r ${sourceDir} ${newBotDir}`);

                    // 2. Clean up specific files
                    await execPromise(`rm -rf ${newBotDir}/workspace/.git ${newBotDir}/workspace/memory/* ${newBotDir}/workspace/canvas/*`);

                    // 3. Update Configuration
                    const configFile = path.join(newBotDir, 'config', 'clawdbot.json');
                    if (fs.existsSync(configFile)) {
                        const cfg = JSON.parse(fs.readFileSync(configFile, 'utf8'));

                        // Update WhatsApp allow list
                        if (cfg.channels && cfg.channels.whatsapp) {
                            cfg.channels.whatsapp.allowFrom = [phone];
                        }

                        // Disable beekeeper for the child? (Prevent infinite recursion)
                        if (cfg.plugins && cfg.plugins.entries && cfg.plugins.entries.beekeeper) {
                            delete cfg.plugins.entries.beekeeper;
                        }

                        fs.writeFileSync(configFile, JSON.stringify(cfg, null, 2));
                    }

                    // 4. Update Identity
                    const userFile = path.join(newBotDir, 'workspace', 'USER.md');
                    fs.writeFileSync(userFile, `# User Profile\n\nPhone: ${phone}\n\n(Auto-generated)`);

                    const identityFile = path.join(newBotDir, 'workspace', 'IDENTITY.md');
                    fs.writeFileSync(identityFile, `# Identity\n\nI am ${name}, a Buddy in the Molt Swarm.`);

                    // 5. Start Container
                    let hash = 0;
                    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
                    const port = 18790 + (Math.abs(hash) % 100);

                    const cmd = `docker run -d \
            --name buddy-${name} \
            --restart always \
            --network molt-bot-network \
            -e NODE_ENV=production \
            -e GOG_KEYRING_PASSWORD=clawdbot2026 \
            -e GOG_ACCOUNT=rulerulez@gmail.com \
            -e GEMINI_API_KEY=${process.env.GEMINI_API_KEY} \
            -e GOG_GATEWAY_HOST=0.0.0.0 \
            -v /root/molt-bot-platform/bots/${name}/workspace:/root/clawd \
            -v /root/molt-bot-platform/bots/${name}/config:/root/.clawdbot \
            -v /root/molt-bot-platform/shared:/shared \
            -v /root/molt-bot-platform/bots:/bots \
            -v /var/run/docker.sock:/var/run/docker.sock \
            -p ${port}:18789 \
            molt-bot-platform-engine:latest \
            clawdbot gateway --port 18789`;

                    // Note: Child bots ALSO get docker socket access (Beekeeper capability propagates?).
                    // If we want to restrict, remove the docker socket line from cmd.
                    // For now, let's include it so they can be potent.

                    await execPromise(cmd);

                    return {
                        content: [{ type: 'text', text: `✅ Hive expanded! Created buddy '${name}' for ${phone}.\n\n- Port: ${port}\n- Container: buddy-${name}` }]
                    };

                } catch (err) {
                    return { content: [{ type: 'text', text: `Failed to spawn: ${err.message}` }] };
                }
            }
        });
    }
};

module.exports = plugin;
