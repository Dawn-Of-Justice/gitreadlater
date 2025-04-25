# Git ReadLater Backend Server

This is the backend server for the Git ReadLater application, handling Paddle integration for subscription management.

## Features

- Create Paddle checkout sessions for subscription purchases
- Create Paddle customer portal sessions for subscription management
- Process Paddle webhooks for subscription lifecycle events
- Update Supabase database based on subscription changes

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Paddle account
- Supabase project with appropriate tables set up

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file based on `.env.example`:

```
# Paddle API Keys
Paddle_SECRET_KEY=your_Paddle_secret_key
Paddle_WEBHOOK_SECRET=your_Paddle_webhook_secret

# Supabase API Keys
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Server
PORT=3000
```

3. Start the server:

```bash
npm start
```

For development with automatic restarts:

```bash
npm run dev
```

## Paddle Setup

1. Create a Paddle account at [Paddle.com](https://Paddle.com)
2. In the Paddle Dashboard, go to Developers > API keys and copy your Secret Key
3. Create a product and subscription price:
   - Go to Products > Create Product
   - Set the product name (e.g., "Git ReadLater Premium")
   - Add a price (e.g., $3/month)
   - Copy the Price ID (starts with "price_")
4. Set up webhook:
   - Go to Developers > Webhooks > Add endpoint
   - Set the endpoint URL to `https://your-server-url/webhook`
   - Select events to listen for:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
   - Get the Webhook Secret for your `.env` file

## Supabase Service Role Key

The server uses the Supabase Service Role Key to update user subscription data. To get this key:

1. Go to your Supabase project
2. Navigate to Project Settings > API
3. Find the "service_role" key (with the warning about having full access)
4. Use this key in your `.env` file

⚠️ **Warning**: The service role key has full admin rights to your database. Keep it secure and never expose it in client-side code.

## API Endpoints

### POST /create-checkout-session

Creates a Paddle checkout session for subscription purchase.

Request body:
```json
{
  "userId": "user_id_from_supabase",
  "priceId": "price_id_from_Paddle",
  "successUrl": "https://your-app.com/success",
  "cancelUrl": "https://your-app.com/cancel"
}
```

### POST /create-portal-session

Creates a Paddle customer portal session for subscription management.

Request body:
```json
{
  "userId": "user_id_from_supabase",
  "returnUrl": "https://your-app.com/subscription"
}
```

### POST /webhook

Endpoint for Paddle webhook events. This URL needs to be configured in your Paddle dashboard.

## Deployment

### Vercel

Create a `vercel.json` file:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "index.js"
    }
  ]
}
```

Then deploy with the Vercel CLI.

### Heroku

```bash
heroku create
git push heroku main
```

Set environment variables in Heroku dashboard or using CLI:

```bash
heroku config:set Paddle_SECRET_KEY=your_key
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.