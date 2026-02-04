#!/usr/bin/env node
require('dotenv').config();
const axios = require('axios');

const RAILWAY_API_TOKEN = process.env.RAILWAY_API_TOKEN;
const RAILWAY_PROJECT_ID = process.env.RAILWAY_PROJECT_ID;
const RAILWAY_API = 'https://backboard.railway.app/graphql/v2';

if (!RAILWAY_API_TOKEN || !RAILWAY_PROJECT_ID) {
    console.error('❌ Missing required environment variables:');
    console.error('   RAILWAY_API_TOKEN and RAILWAY_PROJECT_ID must be set');
    console.error('   Copy .env.example to .env and configure');
    process.exit(1);
}

const railwayClient = axios.create({
    baseURL: RAILWAY_API,
    headers: {
        'Authorization': `Bearer ${RAILWAY_API_TOKEN}`,
        'Content-Type': 'application/json',
    },
});

async function graphqlQuery(query, variables = {}) {
    try {
        const response = await railwayClient.post('', {
            query,
            variables,
        });

        if (response.data.errors) {
            throw new Error(JSON.stringify(response.data.errors, null, 2));
        }

        return response.data.data;
    } catch (error) {
        console.error('❌ Railway API Error:', error.message);
        if (error.response?.data) {
            console.error('Details:', JSON.stringify(error.response.data, null, 2));
        }
        throw error;
    }
}

async function listBuddies() {
    const query = `
        query GetProjectServices($projectId: String!) {
            project(id: $projectId) {
                id
                name
                services {
                    edges {
                        node {
                            id
                            name
                            createdAt
                            updatedAt
                        }
                    }
                }
            }
        }
    `;

    const data = await graphqlQuery(query, { projectId: RAILWAY_PROJECT_ID });
    const services = data.project.services.edges.map(edge => edge.node);

    console.log(`\n🐝 Railway Buddies (Project: ${data.project.name})\n`);

    if (services.length === 0) {
        console.log('   No services found.');
        return;
    }

    services.forEach((service, idx) => {
        console.log(`${idx + 1}. ${service.name}`);
        console.log(`   ID: ${service.id}`);
        console.log(`   Created: ${new Date(service.createdAt).toLocaleString()}`);
        console.log('');
    });
}

async function getBuddyStatus(serviceName) {
    const query = `
        query GetProjectServices($projectId: String!) {
            project(id: $projectId) {
                services {
                    edges {
                        node {
                            id
                            name
                            deployments {
                                edges {
                                    node {
                                        id
                                        status
                                        createdAt
                                        staticUrl
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    `;

    const data = await graphqlQuery(query, { projectId: RAILWAY_PROJECT_ID });
    const service = data.project.services.edges
        .map(edge => edge.node)
        .find(s => s.name === serviceName);

    if (!service) {
        console.error(`❌ Buddy '${serviceName}' not found`);
        return;
    }

    console.log(`\n🐝 Buddy: ${service.name}\n`);
    console.log(`Service ID: ${service.id}`);

    const deployments = service.deployments.edges.map(edge => edge.node);

    if (deployments.length === 0) {
        console.log('No deployments yet.');
        return;
    }

    const latest = deployments[0];
    console.log(`\nLatest Deployment:`);
    console.log(`  Status: ${latest.status}`);
    console.log(`  Created: ${new Date(latest.createdAt).toLocaleString()}`);
    if (latest.staticUrl) {
        console.log(`  URL: ${latest.staticUrl}`);
    }
    console.log('');
}

async function getBuddyLogs(serviceName, lines = 100) {
    console.log(`\n📋 Fetching logs for ${serviceName}...\n`);
    console.log('⚠️  Note: Railway GraphQL API does not expose logs directly.');
    console.log('   Use Railway CLI or Dashboard to view logs:');
    console.log(`   railway logs --service ${serviceName}\n`);
}

function printUsage() {
    console.log(`
Railway Buddy Manager

Usage:
  node index.js list                    List all buddies
  node index.js status <name>           Get buddy status
  node index.js logs <name>             View buddy logs (reminder)

Examples:
  node index.js list
  node index.js status buddy-roel-emrys
  node index.js logs buddy-ess-morgan

Setup:
  1. Copy .env.example to .env
  2. Get Railway API token from: https://railway.app/account/tokens
  3. Get Project ID from your Railway dashboard URL
  4. Run: npm install
`);
}

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    if (!command) {
        printUsage();
        return;
    }

    try {
        switch (command) {
            case 'list':
                await listBuddies();
                break;
            case 'status':
                const serviceName = args[1];
                if (!serviceName) {
                    console.error('❌ Service name required');
                    console.log('Usage: node index.js status <service-name>');
                    process.exit(1);
                }
                await getBuddyStatus(serviceName);
                break;
            case 'logs':
                const logServiceName = args[1];
                if (!logServiceName) {
                    console.error('❌ Service name required');
                    console.log('Usage: node index.js logs <service-name>');
                    process.exit(1);
                }
                await getBuddyLogs(logServiceName);
                break;
            case 'help':
            case '--help':
            case '-h':
                printUsage();
                break;
            default:
                console.error(`❌ Unknown command: ${command}`);
                printUsage();
                process.exit(1);
        }
    } catch (error) {
        console.error('\n❌ Command failed:', error.message);
        process.exit(1);
    }
}

main();
