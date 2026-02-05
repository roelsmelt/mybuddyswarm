const express = require('express');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Stripe webhook secret - set in Railway
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// Telegram config - for notifications to Roel & Esther
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_NOTIFY_BOT_TOKEN;
const TELEGRAM_CHAT_IDS = (process.env.TELEGRAM_NOTIFY_CHAT_IDS || '').split(',');

// Raw body needed for Stripe signature verification
app.use('/webhook/stripe', express.raw({ type: 'application/json' }));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ ok: true, service: 'mybuddy-webhooks' });
});

// Send Telegram message
async function sendTelegramNotification(message) {
    if (!TELEGRAM_BOT_TOKEN || TELEGRAM_CHAT_IDS.length === 0) {
        console.log('[telegram] Not configured, skipping notification');
        return;
    }

    for (const chatId of TELEGRAM_CHAT_IDS) {
        if (!chatId.trim()) continue;

        try {
            const response = await fetch(
                `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId.trim(),
                        text: message,
                        parse_mode: 'HTML'
                    })
                }
            );

            if (!response.ok) {
                console.error(`[telegram] Failed to send to ${chatId}:`, await response.text());
            } else {
                console.log(`[telegram] Sent notification to ${chatId}`);
            }
        } catch (err) {
            console.error(`[telegram] Error sending to ${chatId}:`, err.message);
        }
    }
}

// Verify Stripe webhook signature
function verifyStripeSignature(payload, signature) {
    if (!STRIPE_WEBHOOK_SECRET) {
        console.warn('[stripe] No webhook secret configured, skipping verification');
        return true;
    }

    const elements = signature.split(',');
    const timestamp = elements.find(e => e.startsWith('t='))?.split('=')[1];
    const v1Signature = elements.find(e => e.startsWith('v1='))?.split('=')[1];

    if (!timestamp || !v1Signature) return false;

    const signedPayload = `${timestamp}.${payload}`;
    const expectedSignature = crypto
        .createHmac('sha256', STRIPE_WEBHOOK_SECRET)
        .update(signedPayload)
        .digest('hex');

    return crypto.timingSafeEqual(
        Buffer.from(v1Signature),
        Buffer.from(expectedSignature)
    );
}

// Stripe webhook handler
app.post('/webhook/stripe', async (req, res) => {
    const signature = req.headers['stripe-signature'];
    const payload = req.body.toString();

    // Verify signature
    if (!verifyStripeSignature(payload, signature)) {
        console.error('[stripe] Invalid signature');
        return res.status(400).json({ error: 'Invalid signature' });
    }

    let event;
    try {
        event = JSON.parse(payload);
    } catch (err) {
        console.error('[stripe] Invalid JSON:', err.message);
        return res.status(400).json({ error: 'Invalid JSON' });
    }

    console.log(`[stripe] Received event: ${event.type}`);

    // Handle events
    switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
            const subscription = event.data.object;
            const customerId = subscription.customer;
            const status = subscription.status;
            const planId = subscription.items?.data?.[0]?.price?.id;

            // Get customer email (need to fetch from API)
            const customerEmail = subscription.customer_email || customerId;

            const message = status === 'trialing'
                ? `🆕 <b>Nieuwe trial gestart!</b>\n\nKlant: ${customerEmail}\nPlan: ${planId}\nStatus: ${status}\n\n<i>Actie: Maak buddy via /create-buddy</i>`
                : `📝 <b>Subscription update</b>\n\nKlant: ${customerEmail}\nPlan: ${planId}\nStatus: ${status}`;

            await sendTelegramNotification(message);
            break;
        }

        case 'customer.subscription.deleted': {
            const subscription = event.data.object;
            const customerEmail = subscription.customer_email || subscription.customer;

            const message = `⚠️ <b>Subscription gestopt!</b>\n\nKlant: ${customerEmail}\n\n<i>Actie: Stop buddy service</i>`;

            await sendTelegramNotification(message);
            break;
        }

        case 'checkout.session.completed': {
            const session = event.data.object;
            const customerEmail = session.customer_email || session.customer_details?.email;
            const customerName = session.customer_details?.name || 'Onbekend';

            const message = `🎉 <b>Nieuwe betaling!</b>\n\nNaam: ${customerName}\nEmail: ${customerEmail}\n\n<i>Buddy wordt zo aangemaakt...</i>`;

            await sendTelegramNotification(message);
            break;
        }

        case 'invoice.payment_failed': {
            const invoice = event.data.object;
            const customerEmail = invoice.customer_email || invoice.customer;

            const message = `❌ <b>Betaling mislukt!</b>\n\nKlant: ${customerEmail}\n\n<i>Stripe stuurt automatisch herinnering</i>`;

            await sendTelegramNotification(message);
            break;
        }

        default:
            console.log(`[stripe] Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
});

app.listen(PORT, () => {
    console.log(`[webhooks] Server running on port ${PORT}`);
    console.log(`[webhooks] Telegram notifications: ${TELEGRAM_CHAT_IDS.length > 0 ? 'enabled' : 'disabled'}`);
});
