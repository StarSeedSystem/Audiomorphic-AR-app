import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Stripe requires the raw body to verify the signature
export const config = { api: { bodyParser: false } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { auth: { persistSession: false } }
);

async function rawBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const c of req as any) chunks.push(typeof c === 'string' ? Buffer.from(c) : c);
  return Buffer.concat(chunks);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  let event: Stripe.Event;
  try {
    const buf = await rawBody(req);
    const sig = req.headers['stripe-signature'] as string;
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET as string);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${(err as Error).message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const s = event.data.object as Stripe.Checkout.Session;
      const userId = s.client_reference_id;
      if (userId && s.payment_status === 'paid') {
        const amount = s.amount_total || 0;
        const plan = amount > 50000 ? 'lifetime' : 'annual'; // lifetime > $500
        await supabase.from('audiomorphic_subscriptions').upsert({
          user_id: userId, status: 'active', plan,
          stripe_customer_id: typeof s.customer === 'string' ? s.customer : null,
          stripe_subscription_id: typeof s.subscription === 'string' ? s.subscription : null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      }
    } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription;
      const cust = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
      const active = sub.status === 'active' || sub.status === 'trialing';
      const cpe = (sub as any).current_period_end;
      await supabase.from('audiomorphic_subscriptions').update({
        status: active ? 'active' : 'canceled',
        plan: active ? 'annual' : 'free',
        current_period_end: cpe ? new Date(cpe * 1000).toISOString() : null,
        updated_at: new Date().toISOString(),
      }).eq('stripe_customer_id', cust);
    }
  } catch (e) {
    console.error('webhook handler error', e);
    return res.status(500).json({ error: 'Internal Server Error' });
  }

  res.status(200).json({ received: true });
}
