# Git ReadLater Monetization Guide

This guide provides a detailed overview of the monetization strategy for the Git ReadLater application.

## Business Model

Git ReadLater uses a freemium business model with tiered subscription plans:

1. **Free Tier:**
   - Up to 100 saved repositories
   - Basic search functionality
   - Simple tagging system
   - Import from GitHub stars

2. **Premium Tier ($3/month):**
   - Unlimited saved repositories
   - Advanced search with multiple filters
   - Rich tagging system with nested tags
   - Automatic categorization suggestions
   - Export to third-party services (Notion, etc.)

## Implementation Details

### User Tiers and Repository Limits

The system tracks user subscription status and enforces repository limits:

- Free users are limited to 100 repositories
- Premium users have unlimited repositories
- The system notifies free users when they approach their limit (80% and above)
- When a free user reaches their limit, they cannot save additional repositories

### Stripe Integration

Stripe handles all payment processing, subscription management, and invoicing:

1. **Checkout Process:**
   - User clicks "Upgrade to Premium" button
   - System creates a Stripe checkout session
   - User is redirected to Stripe's hosted checkout page
   - After successful payment, Stripe webhook notifies our system
   - User's tier is updated in the database

2. **Subscription Management:**
   - Users can access Stripe's Customer Portal to:
     - Update payment methods
     - View invoices
     - Cancel subscription

3. **Subscription Lifecycle:**
   - Webhooks handle subscription events:
     - `checkout.session.completed`: Initial subscription payment
     - `customer.subscription.updated`: Renewal or plan change
     - `customer.subscription.deleted`: Cancellation

### Database Structure

The `user_subscriptions` table tracks subscription status:

```sql
CREATE TABLE user_subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'free',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  valid_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Feature Implementation

The system enforces feature availability based on subscription tier:

1. **Repository Limit Enforcement:**
   - `canSaveRepository()` checks user's tier and current repository count
   - Dashboard shows subscription status and repository count
   - Save Repository page blocks saving when limit is reached

2. **Premium Features Access:**
   - Advanced search filters are only enabled for premium users
   - Rich tagging features are only available to premium users
   - Export functionality is limited to premium subscribers

## Stripe Setup Instructions

### 1. Create Products and Prices

In the Stripe Dashboard:

1. Go to **Products** > **Add Product**
2. Create a product for "Git ReadLater Premium"
3. Add a recurring price of $3/month
4. Note the Price ID (starts with "price_") for your configuration

### 2. API Keys

Get your API keys from the Stripe Dashboard:

1. Go to **Developers** > **API keys**
2. Use the **Publishable key** for your frontend
3. Use the **Secret key** for your backend server

### 3. Webhook Configuration

Set up webhooks to receive subscription events:

1. Go to **Developers** > **Webhooks** > **Add endpoint**
2. Set the endpoint URL to `https://your-server.com/webhook`
3. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Get the **Signing Secret** for your webhook configuration

## Testing the Subscription System

### Test Mode

All Stripe development should be done in Test Mode:

1. Make sure you're in Test Mode in the Stripe Dashboard
2. Use Stripe's test credit cards for payments:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`

### Testing Workflow

1. **New Subscription:**
   - Click "Upgrade to Premium" in the app
   - Complete checkout with test card `4242 4242 4242 4242`
   - Confirm user's tier is updated to Premium

2. **Subscription Management:**
   - Access Customer Portal
   - Update payment method
   - View upcoming invoices

3. **Cancellation:**
   - Cancel subscription through Customer Portal
   - Confirm user is downgraded to Free tier

## Analytics and Metrics

Track key subscription metrics:

1. **Conversion Rate:**
   - Percentage of free users who upgrade to Premium
   - Funnel analysis from free signup to Premium conversion

2. **Retention:**
   - Monthly churn rate
   - Subscription renewal rate

3. **Revenue Metrics:**
   - Monthly Recurring Revenue (MRR)
   - Annual Recurring Revenue (ARR)
   - Average Revenue Per User (ARPU)

## Future Monetization Opportunities

Potential expansion of the monetization strategy:

1. **Team/Organization Plans:**
   - Shared repository collections for teams
   - Collaborative tagging and notes
   - Team management features

2. **Additional Tiers:**
   - Pro tier with advanced features for $8/month
   - Enterprise tier with organization-wide features

3. **Add-on Features:**
   - Advanced analytics of saved repositories
   - Custom integrations with developer tools
   - Priority support

## Implementation Checklist

- [x] Define subscription tiers and pricing
- [x] Set up Stripe product and price
- [x] Create subscription database tables
- [x] Implement repository limit checking
- [x] Create subscription management UI
- [x] Add upgrade prompts for free tier users
- [x] Implement Stripe checkout process
- [x] Handle Stripe webhooks for subscription events
- [x] Test the complete subscription lifecycle
- [ ] Set up analytics for conversion tracking
- [ ] Monitor key subscription metrics
- [ ] Iterate based on user feedback

## References

- [Stripe Documentation](https://stripe.com/docs)
- [Supabase Authentication](https://supabase.com/docs/guides/auth)
- [Freemium Business Model](https://en.wikipedia.org/wiki/Freemium)