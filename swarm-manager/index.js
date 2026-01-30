const { Type } = require('@sinclair/typebox');
const { execFile, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const plugin = {
    name: 'swarm-manager',
    description: 'Manage the My Buddy Swarm (Orchestrator tools)',
    activate(context) {
        context.registerTool({
            name: 'create_buddy',
            description: 'Create a new buddy for a specific phone number.',
            parameters: Type.Object({
                name: Type.String({ description: 'The name of the new buddy (lowercase, no spaces)' }),
                phone: Type.String({ description: 'The phone number in international format (e.g. +316...)' }),
            }),
            async execute({ name, phone }) {
                return new Promise((resolve) => {
                    execFile('/shared/bin/create_buddy.sh', [name, phone], (error, stdout, stderr) => {
                        if (error) {
                            resolve({ error: error.message, details: stderr });
                        } else {
                            resolve({ message: stdout });
                        }
                    });
                });
            },
        });

        context.registerTool({
            name: 'get_buddy_qr',
            description: 'Get the WhatsApp pairing QR code for a specific buddy.',
            parameters: Type.Object({
                name: Type.String({ description: 'The name of the buddy' }),
            }),
            async execute({ name }) {
                return new Promise((resolve) => {
                    exec(`docker exec buddy-${name} clawdbot channels login`, (error, stdout, stderr) => {
                        if (stdout && stdout.includes('Scan this QR')) {
                            resolve({ qr: stdout });
                        } else {
                            resolve({ error: 'Could not retrieve QR. Check logs or if already linked.', details: (stdout || '') + (stderr || '') });
                        }
                    });
                    setTimeout(() => resolve({ error: 'Timeout waiting for QR code. Try again or check logs.' }), 30000);
                });
            },
        });

        context.registerTool({
            name: 'list_buddies',
            description: 'List all buddies in the swarm and their status.',
            parameters: Type.Object({}),
            async execute() {
                return new Promise((resolve) => {
                    exec('docker ps --filter "name=buddy-" --format "{{.Names}}: {{.Status}}"', (error, stdout, stderr) => {
                        if (error) {
                            resolve({ error: error.message });
                        } else {
                            resolve({ buddies: (stdout || '').trim().split('\n') });
                        }
                    });
                });
            },
        });

        context.registerTool({
            name: 'install_skill',
            description: 'Install and enable a skill for a specific buddy.',
            parameters: Type.Object({
                buddy_name: Type.String({ description: 'The name of the buddy (e.g. ess)' }),
                skill_id: Type.String({ description: 'The ID of the skill to enable (e.g. memory-lancedb)' }),
                config: Type.Optional(Type.Any({ description: 'Optional configuration for the skill' })),
            }),
            async execute({ buddy_name, skill_id, config }) {
                const configPath = `/bots/${buddy_name}/config/clawdbot.json`;
                return new Promise((resolve) => {
                    fs.readFile(configPath, 'utf8', (err, data) => {
                        if (err) return resolve({ error: `Could not read config for ${buddy_name}: ${err.message}` });

                        try {
                            const json = JSON.parse(data);
                            if (!json.plugins) json.plugins = { entries: {} };
                            if (!json.plugins.entries) json.plugins.entries = {};

                            json.plugins.entries[skill_id] = {
                                enabled: true,
                                ...(config ? { config } : {})
                            };

                            const updatedData = JSON.stringify(json, null, 2);
                            fs.writeFile(configPath, updatedData, (writeErr) => {
                                if (writeErr) return resolve({ error: `Could not write config: ${writeErr.message}` });

                                // Restart the buddy container to apply changes
                                exec(`docker restart buddy-${buddy_name}`, (restartErr) => {
                                    if (restartErr) return resolve({ message: `Config updated for ${buddy_name}, but restart failed.`, error: restartErr.message });
                                    resolve({ message: `Skill '${skill_id}' successfully installed and ${buddy_name} restarted.` });
                                });
                            });
                        } catch (parseErr) {
                            resolve({ error: `Could not parse config: ${parseErr.message}` });
                        }
                    });
                });
            },
        });

        context.registerTool({
            name: 'send_buddy_message',
            description: 'Send an administrative message to a specific buddy (via their owner).',
            parameters: Type.Object({
                buddy_name: Type.String({ description: 'The name of the buddy' }),
                message: Type.String({ description: 'The message content' }),
            }),
            async execute({ buddy_name, message }) {
                return new Promise((resolve) => {
                    const configPath = `/bots/${buddy_name}/config/clawdbot.json`;
                    try {
                        const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                        const owners = cfg.channels?.whatsapp?.allowFrom || [];
                        if (owners.length > 0) {
                            exec(`docker exec buddy-${buddy_name} clawdbot message send --target ${owners[0]} --message "[SWARM MSG] ${message}"`, (error, stdout, stderr) => {
                                if (error) {
                                    resolve({ error: error.message, details: stderr });
                                } else {
                                    resolve({ message: `Message sent to ${buddy_name}'s owner.` });
                                }
                            });
                        } else {
                            resolve({ error: `No owner found for ${buddy_name}` });
                        }
                    } catch (e) {
                        resolve({ error: `Could not read config for ${buddy_name}: ${e.message}` });
                    }
                });
            },
        });

        context.registerTool({
            name: 'broadcast_swarm_message',
            description: 'Send an administrative message to all Humans in the swarm.',
            parameters: Type.Object({
                message: Type.String({ description: 'The message content' }),
            }),
            async execute({ message }) {
                return new Promise((resolve) => {
                    exec('docker ps --filter "name=buddy-" --format "{{.Names}}"', (error, stdout, stderr) => {
                        if (error) return resolve({ error: error.message });
                        const names = (stdout || '').trim().split('\n');
                        const results = [];
                        let pending = names.length;

                        if (pending === 0) return resolve({ message: 'No buddies found to broadcast to.' });

                        names.forEach((containerName) => {
                            const shortName = containerName.replace('buddy-', '');
                            const configPath = `/bots/${shortName}/config/clawdbot.json`;
                            try {
                                const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                                const owners = cfg.channels?.whatsapp?.allowFrom || [];
                                if (owners.length > 0) {
                                    exec(`docker exec ${containerName} clawdbot message send --target ${owners[0]} --message "[SWARM MESSAGE] ${message}"`, (err) => {
                                        results.push(`${containerName}: ${err ? 'Failed' : 'Success'}`);
                                        if (--pending === 0) resolve({ results });
                                    });
                                } else {
                                    results.push(`${containerName}: No Owner found`);
                                    if (--pending === 0) resolve({ results });
                                }
                            } catch (e) {
                                results.push(`${containerName}: Config Error`);
                                if (--pending === 0) resolve({ results });
                            }
                        });
                    });
                });
            },
        });
    }
};

module.exports = plugin;
