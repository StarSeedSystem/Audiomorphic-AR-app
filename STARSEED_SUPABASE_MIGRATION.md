# Audiomorphic → StarSeed (Supabase) — rama `feat/supabase-auth`

Migra Audiomorphic de Firebase Auth/Firestore al **Supabase unificado de StarSeed**
(`nxstilnyidvkqeosofuh`). Una sola cuenta para Audiomorphic + Café + OS + Nexus.

## Qué cambia
- `lib/supabaseClient.ts` — cliente Supabase (storageKey `starseed.auth`, compartido con todo StarSeed).
- `contexts/AuthContext.tsx` — auth con Supabase (email/contraseña + Google OAuth); el tier sale de `audiomorphic_subscriptions`; añade `redeemCode()`.
- `components/AuthModal.tsx` — login con Supabase.
- `components/StarSeedLinks.tsx` — enlaces + explicación del ecosistema (en el menú de suscripciones).
- `components/RedeemCode.tsx` — canje de código (llama al RPC `redeem_code`; el valor del código NO está en el cliente).
- `api/webhook.ts` — Stripe → `audiomorphic_subscriptions` (service role desde ENV).
- `scripts/migrate-firestore-to-supabase.mjs` — migración opcional de usuarios.

## Variables de entorno (Vercel) — NUNCA en el código
- `VITE_SUPABASE_URL` = https://nxstilnyidvkqeosofuh.supabase.co
- `VITE_SUPABASE_ANON_KEY` = (publishable key, pública)
- `SUPABASE_URL` = igual que arriba
- `SUPABASE_SERVICE_ROLE_KEY` = (secreta — solo para el webhook/migración)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

## Pasos para activar
1. En Supabase → Authentication → Providers: habilita **Email** y **Google** (OAuth client de Google + redirect `https://<dominio>`).
2. En Vercel (proyecto audiomorphic): añade las env vars de arriba.
3. Stripe: crea un webhook a `/api/webhook` (evento `checkout.session.completed`) y pon `STRIPE_WEBHOOK_SECRET`. En los Payment Links añade `?client_reference_id=<user.id>` (ya lo hace `createStripeCheckout`).
4. Deploy de la rama (preview) → prueba registro/login/canje → merge a `main`.

## Migración de datos (opcional — las cuentas actuales son de prueba)
Las cuentas viejas son desechables; esto solo si quieres conservarlas:
```bash
FIREBASE_SERVICE_ACCOUNT="$(base64 -i ruta/serviceAccount.json)" \
SUPABASE_URL="https://nxstilnyidvkqeosofuh.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<service_role_key>" \
node scripts/migrate-firestore-to-supabase.mjs
```

## Código de canje
El código de cortesía vive **solo en la base de datos** (`public.promo_codes`, RLS bloqueada) y se canjea por el RPC `redeem_code`. No aparece en el sitio ni en este repo. (Su valor está en tus memorias privadas de StarSeed.)

> Pendiente para producción: hay otros archivos que aún importan `firebase` (p. ej. utilidades). Esta rama deja la auth/billing en Supabase; el resto se puede limpiar tras verificar en preview.
