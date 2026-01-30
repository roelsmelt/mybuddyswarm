
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
    }
};

module.exports = plugin;
