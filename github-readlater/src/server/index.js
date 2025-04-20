const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Middleware
app.use(cors());
app.use(express.json());

// Webhook signing secret
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Helper to update user subscription
async function updateUserSubscription(userId, tier, validUntil = null, stripeCustomerId = null, stripeSubscriptionId = null) {
  try {
    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        tier,
        valid_until: validUntil,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error updating user subscription:', error);
    return false;
  }
}

// Create a checkout session
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { userId, priceId, successUrl, cancelUrl } = req.body;
    
    // Get user from Supabase
    const { data: userData, error: userError } = await supabase
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();
    
    if (userError) throw userError;
    
    // Check if we need to create a new customer or use existing one
    let customerId = userData.stripe_customer_id;
    
    if (!customerId) {
      // Get user email from auth
      const { data: authData, error: authError } = await supabase.auth.admin.getUserById(userId);
      
      if (authError) throw authError;
      
      // Create a new customer in Stripe
      const customer = await stripe.customers.create({
        email: authData.user.email,
        metadata: {
          userId: userId
        }
      });
      
      customerId = customer.id;
      
      // Update user with Stripe customer ID
      await updateUserSubscription(userId, 'free', null, customerId, null);
    }
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: userId
      }
    });
    
    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a portal session
app.post('/create-portal-session', async (req, res) => {
  try {
    const { userId, returnUrl } = req.body;
    
    // Get customer ID from Supabase
    const { data: userData, error: userError } = await supabase
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();
    
    if (userError) throw userError;
    
    if (!userData.stripe_customer_id) {
      throw new Error('User does not have a Stripe customer ID');
    }
    
    // Create customer portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: userData.stripe_customer_id,
      return_url: returnUrl,
    });
    
    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Webhook to handle subscription events
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Store event in Supabase for audit
  try {
    const { error } = await supabase
      .from('stripe_events')
      .insert([
        {
          stripe_event_id: event.id,
          event_type: event.type,
          user_id: event.data.object.metadata?.userId,
          data: event.data.object,
          processed: false,
          created_at: new Date().toISOString()
        }
      ]);
    
    if (error) throw error;
  } catch (err) {
    console.error(`Error storing event: ${err.message}`);
    // Continue processing even if storage fails
  }
  
  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = session.metadata.userId;
      
      // If payment was successful, update the user's subscription
      if (session.payment_status === 'paid') {
        // Get subscription details
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        
        // Calculate valid until date (1 year from now for simplicity)
        const validUntil = new Date();
        validUntil.setFullYear(validUntil.getFullYear() + 1);
        
        // Update user subscription
        await updateUserSubscription(
          userId,
          'premium',
          validUntil.toISOString(),
          session.customer,
          session.subscription
        );
        
        // Mark event as processed
        await supabase
          .from('stripe_events')
          .update({ processed: true })
          .eq('stripe_event_id', event.id);
      }
      break;
    }
    
    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      
      // Get the user ID from the customer
      const customer = await stripe.customers.retrieve(subscription.customer);
      const userId = customer.metadata.userId;
      
      if (subscription.status === 'active') {
        // Subscription is active - set to premium
        const validUntil = new Date(subscription.current_period_end * 1000);
        
        await updateUserSubscription(
          userId,
          'premium',
          validUntil.toISOString(),
          subscription.customer,
          subscription.id
        );
      } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
        // Subscription is canceled or unpaid - downgrade to free
        await updateUserSubscription(
          userId,
          'free',
          null,
          subscription.customer,
          subscription.id
        );
      }
      
      // Mark event as processed
      await supabase
        .from('stripe_events')
        .update({ processed: true })
        .eq('stripe_event_id', event.id);
      
      break;
    }
    
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      
      // Get the user ID from the customer
      const customer = await stripe.customers.retrieve(subscription.customer);
      const userId = customer.metadata.userId;
      
      // Subscription is canceled - downgrade to free
      await updateUserSubscription(
        userId,
        'free',
        null,
        subscription.customer,
        null
      );
      
      // Mark event as processed
      await supabase
        .from('stripe_events')
        .update({ processed: true })
        .eq('stripe_event_id', event.id);
      
      break;
    }
    
    default:
      console.log(`Unhandled event type ${event.type}`);
  }
  
  res.json({ received: true });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});