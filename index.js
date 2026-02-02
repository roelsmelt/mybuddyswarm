const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function main() {
    try {
        console.log("🐝 Spawning Moltbot Swarm Buddies...");

        // Configuration
        const buddies = [
            {
                name: "esther-buddy-kazeh",
                phone: "+31654377400",
                telegram_token: "", // Optional
                personality: "De digitale assistent van Esther. Je beheert haar agenda, herinnert haar aan taken en helpt haar met dagelijkse dingen. Je bent proactief, vriendelijk en efficiënt.",
                volume: "vol_vz5zeqq0no01pnjv"
            }
        ];

        for (const buddy of buddies) {
            const { name, phone, telegram_token, personality, volume } = buddy;
            console.log(` -> Spawning buddy: ${name}`);

            // Generate a safe machine name
            const machineName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
            // Safe owner metadata (using email from env or default)
            const safeOwner = (process.env.GOG_ACCOUNT || 'unknown').replace(/@/g, '-at-').replace(/\./g, '-dot-');

            // Check if machine exists (basic check, could be improved)
            // Ideally we check `fly machines list` but for now we just try to create/start

            let volumeFlag = "";
            if (volume) {
                // If explicit volume ID is provided, mount it
                echo " -> Attaching volume: ${volume}"
                volumeFlag = `--volume ${volume}:/root/clawd`;
            } else {
                // No volume? Maybe ephemeral or new volume logic
                // For now, we assume volume is key for persistence
            }

            // Command construction
            // NOTE: We increased memory for buddies too via NODE_OPTIONS just in case
            // And use quoted IPv6 [::] for GOG_GATEWAY_HOST
            const cmd = `fly machines run viriya-mybuddy \
            --name ${machineName} \
            --region ams \
            --org personal \
            --metadata role=buddy \
            --metadata owner=${safeOwner} \
            ${volumeFlag} \
            -e role=buddy \
            -e NODE_ENV=production \
            -e GOG_GATEWAY_HOST='[::]' \
            -e NODE_OPTIONS='--max-old-space-size=819' \
            -e GOG_GATEWAY_PORT=18789 \
            -e GOG_ACCOUNT=rulerulez@gmail.com \
            -e GEMINI_API_KEY=${process.env.GEMINI_API_KEY} \
            -e CLAWDBOT_WHATSAPP_ALLOW_FROM=${phone || ''} \
            -e CLAWDBOT_TELEGRAM_TOKEN=${telegram_token || ''} \
            -e CLAWDBOT_NAME=${name} \
            -e CLAWDBOT_PERSONALITY="${personality || 'Helpful Buddy'}" \
            --port 18789:18789`;

            console.log(`    Running: ${cmd}`);
            await execPromise(cmd);
            console.log(`    Success!`);
        }

    } catch (error) {
        console.error("❌ Error spawning buddies:", error);
        process.exit(1);
    }
}

main();
