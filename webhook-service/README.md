# MyBuddy Webhook Service

Handles Stripe webhooks and sends Telegram notifications for subscription events.

## Events Handled

| Event | Notification |
|-------|--------------|
| `checkout.session.completed` | 🎉 Nieuwe betaling! |
| `customer.subscription.created` | 🆕 Nieuwe subscription! |
| `customer.subscription.deleted` | ⚠️ Subscription gestopt! |
| `invoice.payment_failed` | ❌ Betaling mislukt! |

## Environment Variables

```
PORT=3000
STRIPE_WEBHOOK_SECRET=whsec_xxx
TELEGRAM_NOTIFY_BOT_TOKEN=xxx  # Bot to send notifications
TELEGRAM_NOTIFY_CHAT_IDS=123,456  # Comma-separated chat IDs (Roel, Esther)
```

## Deployment

Deploy to Railway as a separate service:
```bash
railway add --service "Webhooks" --repo "roelsmelt/mybuddyswarm" --root-directory "webhook-service"
```

## Stripe Webhook Setup

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://<railway-domain>/webhook/stripe`
3. Select events: checkout.session.completed, customer.subscription.*
4. Copy signing secret → Set as `STRIPE_WEBHOOK_SECRET`
