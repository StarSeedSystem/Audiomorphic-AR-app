// Migra usuarios de Firestore -> Supabase (auth + audiomorphic_subscriptions).
// Las cuentas antiguas son de prueba; esto es opcional. Idempotente.
// Requiere: FIREBASE_SERVICE_ACCOUNT (base64 del JSON), SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';

const svc = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8'));
admin.initializeApp({ credential: admin.credential.cert(svc) });
const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const snap = await admin.firestore().collection('users').get();
console.log(`Firestore users: ${snap.size}`);
let ok = 0;
for (const doc of snap.docs) {
  const u = doc.data();
  if (!u.email) continue;
  // crea (o ignora si existe) la cuenta en Supabase Auth
  const { data: created, error } = await supa.auth.admin.createUser({ email: u.email, email_confirm: true });
  const userId = created?.user?.id || (await supa.auth.admin.listUsers()).data.users.find(x => x.email === u.email)?.id;
  if (!userId) { console.warn('no uid for', u.email, error?.message); continue; }
  const plan = u.subscriptionTier && u.subscriptionTier !== 'free' ? u.subscriptionTier : null;
  if (plan) {
    await supa.from('audiomorphic_subscriptions').upsert(
      { user_id: userId, status: 'active', plan, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  }
  ok++;
}
console.log(`Migrados: ${ok}`);
process.exit(0);
