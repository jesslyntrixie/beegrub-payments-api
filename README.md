# BeeGrub Payments API

Secure Midtrans QRIS helper service for the BeeGrub mobile app.

## Requirements

- Node.js 18+
- Midtrans sandbox account (server + client key)
- Supabase project with `payments` / `orders` tables and a service-role key

## Environment Setup

Copy the sample and fill it with your real credentials:

```bash
cp .env.example .env
```

| Variable | Description |
| --- | --- |
| `PORT` | Local port (defaults to 4000) |
| `MIDTRANS_SERVER_KEY` | Midtrans server key (never expose publicly) |
| `MIDTRANS_CLIENT_KEY` | Midtrans client key |
| `MIDTRANS_IS_PRODUCTION` | `false` for sandbox |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key to update payment/order tables |

## Running Locally

```bash
npm install
npm run dev
```

Server starts on `http://localhost:4000` (or the `PORT` you set).

## REST Endpoints

### `GET /health`
Quick uptime probe used by deployment platforms.

### `POST /payments/qris`
Creates a Midtrans QRIS transaction.

```json
{
  "orderId": "order-123",
  "amount": 25000,
  "customer": {
    "name": "Student User",
    "email": "student@beegrub.app",
    "phone": "+628123456"
  },
  "description": "Order #123"
}
```

Response mirrors Midtrans Snap payload. Use `transaction.qr_string` to show the QR in the app.

### `POST /webhooks/midtrans`
Receives Midtrans notifications. The handler verifies the signature, normalizes the status, and updates Supabase via the service-role key. Configure this URL inside the Midtrans dashboard (`Settings → Configuration → Payment Notification URL`).

## Deployment Notes

- Works out of the box on Vercel/Render/Fly. On Vercel, export the Express handler via the default export in `src/server.js` (already supported).
- Add the `.env` values to the hosting provider and never ship them with the app bundle.
- Lock down the webhook route with an allow-list if your provider supports it.

## Next Steps

1. Hook the React Native app to call `/payments/qris` before presenting the QR screen.
2. Add retry + polling logic on the frontend to refresh payment status after scanning.
3. Monitor Midtrans dashboard to confirm webhook deliveries.
