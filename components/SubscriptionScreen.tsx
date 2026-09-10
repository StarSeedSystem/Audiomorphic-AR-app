import React, { useState } from 'react';
import { X, Check, Heart, Star, Zap, Shield, Sparkles, Sprout, Glasses, LogIn, Lock, RotateCw, Tag, ArrowRight, Coffee, Globe2, Radio, Boxes, Music, Infinity as InfinityIcon, ExternalLink } from 'lucide-react';
import { SubscriptionTier } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { RedeemCode } from './RedeemCode';

interface SubscriptionScreenProps {
  onClose: () => void;
  onSubscribe: (tier: SubscriptionTier, trialDurationMs?: number) => Promise<void>;
  onShowAbout: () => void;
}

const OS_URL = 'https://starseed-os.vercel.app';
const LIFETIME_LINK = 'https://donate.stripe.com/9B6eVfdxp0qmbfD5DR6Na00';

// Ecosistema StarSeed — Audiomorphic es una de las áreas de un sistema mayor.
const SYSTEMS: Array<{ icon: React.ReactNode; name: string; gradient: string; summary: string; connection: string; url: string }> = [
  {
    icon: <Globe2 size={20} />, name: 'StarSeed OS', gradient: 'from-violet-500 to-indigo-600',
    summary: 'Tu sistema operativo soberano: cuenta, perfil, agente Astraura, lienzos, conocimiento y red social descentralizada.',
    connection: 'Desde aquí Audiomorphic se usa 100% gratis y tu cuenta es la misma en todo el ecosistema.',
    url: OS_URL,
  },
  {
    icon: <Sparkles size={20} />, name: 'StarSeed Nexus', gradient: 'from-cyan-500 to-emerald-500',
    summary: 'El portal de entrada: explora todas las áreas, funciones y la materia viva del ecosistema en 3D.',
    connection: 'Comparte tu identidad y abre el OS con tu sesión en un clic.',
    url: 'https://starseed-nexus.vercel.app',
  },
  {
    icon: <Coffee size={20} />, name: 'StarSeed Café', gradient: 'from-amber-500 to-orange-600',
    summary: 'Comunidad, menú y economía de Granos & Semillas. La capa física y social del movimiento.',
    connection: 'Misma cuenta, mismos grupos y comunidades sincronizadas en tiempo real.',
    url: 'https://starseed-cafe.vercel.app/cafe/',
  },
  {
    icon: <Radio size={20} />, name: 'Omnifrecuencias', gradient: 'from-fuchsia-500 to-pink-600',
    summary: 'Frecuencias, sonido y consciencia. El laboratorio sonoro hermano de Audiomorphic.',
    connection: 'Tus presets y memorias viajan contigo por todo StarSeed.',
    url: OS_URL + '/omnifrecuencias',
  },
];

// Vistas previas premium con animación en bucle (estilo realista de las funciones).
const PREMIUM = [
  { key: 'geo', icon: <Sprout size={14} />, label: 'Geometría Sagrada', color: 'text-emerald-300',
    desc: 'Patrones matemáticos como la Flor de la Vida y el Cubo de Metatrón, sincronizados con tu música.' },
  { key: 'vr', icon: <Glasses size={14} />, label: 'Realidad Virtual & AR', color: 'text-purple-300',
    desc: 'Sumérgete en portales infinitos en 3D que responden a cada latido del sonido.' },
  { key: 'drift', icon: <Sparkles size={14} />, label: 'Piloto Automático: Deriva', color: 'text-cyan-300',
    desc: 'La IA toma el control y explora evoluciones visuales asombrosas de forma autónoma.' },
];

const SubscriptionScreen: React.FC<SubscriptionScreenProps> = ({ onClose, onSubscribe, onShowAbout }) => {
  const { user, userData, login } = useAuth();
  const currentTier = userData?.subscriptionTier || 'free';
  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState('');
  const [isActivating, setIsActivating] = useState(false);

  // Descuento (p.ej. 639hz: $963 -> $639), validado server-side vía RPC check_discount.
  const [discCode, setDiscCode] = useState('');
  const [disc, setDisc] = useState<{ code: string; list: number; price: number; currency: string; stripeUrl?: string } | null>(null);
  const [discMsg, setDiscMsg] = useState('');
  const [discBusy, setDiscBusy] = useState(false);

  const money = (cents: number, cur: string) => `$${(cents / 100).toLocaleString('es-MX')} ${cur.toUpperCase()}`;

  const applyDiscount = async () => {
    const c = discCode.trim();
    if (!c) return;
    setDiscBusy(true); setDiscMsg('');
    try {
      const { data, error } = await supabase.rpc('check_discount', { p_code: c });
      if (error || !data || !(data as any).valid) {
        setDisc(null); setDiscMsg('Código de descuento no válido.');
      } else {
        const d = data as any;
        setDisc({ code: d.code, list: d.list_price_cents, price: d.price_cents, currency: d.currency, stripeUrl: d.stripe_url || undefined });
        setDiscMsg('');
      }
    } catch {
      setDisc(null); setDiscMsg('No se pudo validar el código.');
    } finally { setDiscBusy(false); }
  };

  const handleTrialSubscribe = async () => {
    const hasLegacyTrial = userData?.subscriptionTier === 'trial';
    if (userData?.hasUsedTrial || hasLegacyTrial) { setPromoError('Ya has utilizado una prueba gratuita anteriormente.'); return; }
    const normalizedCode = promoCode.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    if (normalizedCode === 'espiral') {
      setPromoError(''); setIsActivating(true);
      try { await onSubscribe('trial', 15 * 24 * 60 * 60 * 1000); }
      catch (error: any) { setPromoError(`Error: ${error.message || String(error)}`); }
      finally { setIsActivating(false); }
    } else { setPromoError('Este código no es válido.'); }
  };

  const handleViajeroTrial = async () => {
    setIsActivating(true);
    try { await onSubscribe('trial', 1 * 60 * 60 * 1000); }
    catch (error) { console.error('Error activating trial:', error); }
    finally { setIsActivating(false); }
  };

  const lifetimeHref = (disc?.stripeUrl || LIFETIME_LINK) +
    `?prefilled_email=${encodeURIComponent(user?.email || '')}&client_reference_id=${user?.uid || ''}` +
    (disc ? `&utm_discount=${encodeURIComponent(disc.code)}` : '');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-500 overflow-y-auto">
      {/* Animaciones en bucle para las vistas premium */}
      <style>{`
        @keyframes ssSpin { to { transform: rotate(360deg); } }
        @keyframes ssSpinRev { to { transform: rotate(-360deg); } }
        @keyframes ssPulse { 0%,100% { transform: scale(.82); opacity:.5; } 50% { transform: scale(1.05); opacity:1; } }
        @keyframes ssDrift { 0% { transform: translate(0,0) scale(1);} 33% { transform: translate(14%,-10%) scale(1.25);} 66% { transform: translate(-12%,8%) scale(.85);} 100% { transform: translate(0,0) scale(1);} }
        @keyframes ssHue { to { filter: hue-rotate(360deg); } }
        @keyframes ssTunnel { 0% { transform: scale(.2); opacity:0;} 20%{opacity:.9;} 100% { transform: scale(2.4); opacity:0;} }
        .ss-anim-geo > * { transform-origin: 50% 50%; }
      `}</style>

      <div className="relative w-full max-w-6xl bg-gray-900/90 border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col my-auto">

        {/* Header */}
        <div className="relative p-6 sm:p-8 border-b border-white/10 text-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-emerald-500/20 opacity-50 pointer-events-none"></div>
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }} className="absolute top-4 right-4 md:top-6 md:right-6 text-gray-400 hover:text-white transition-colors z-[100] bg-black/50 p-2 rounded-full hover:bg-white/10 cursor-pointer pointer-events-auto">
            <X size={24} />
          </button>
          <h2 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-emerald-400 mb-4 relative z-10">Desbloquea el Universo</h2>
          <p className="text-gray-300 max-w-2xl mx-auto text-sm sm:text-base relative z-10 mb-4">Experimenta la sinestesia completa: todas las geometrías sagradas, modos de realidad virtual y aumentada, y control total sobre la experiencia visual.</p>
          {!user ? (
            <button onClick={login} className="relative z-10 inline-flex items-center gap-2 px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium transition-colors"><LogIn size={18} /> Iniciar Sesión para Suscribirse</button>
          ) : (
            <div className="relative z-10 inline-flex items-center gap-2 px-6 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-medium"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Conectado como {user.email} (Nivel: {currentTier.toUpperCase()})</div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 overflow-y-auto">

          {/* GRATIS vía StarSeed OS */}
          <a href={OS_URL} target="_blank" rel="noopener noreferrer" className="group block mb-8 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-violet-500/10 hover:border-emerald-400/60 transition-all p-5">
            <div className="flex items-center gap-4">
              <div className="shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-black"><InfinityIcon size={24} /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap"><span className="text-sm sm:text-base font-bold text-white">Úsalo 100% GRATIS dentro de StarSeed OS</span><span className="text-[10px] uppercase tracking-wider bg-emerald-500 text-black font-bold px-2 py-0.5 rounded-full">sin costo</span></div>
                <p className="text-xs text-gray-300/90 mt-1">Audiomorphic es un área del sistema StarSeed. Si entras desde el OS y lo usas dentro del sistema, tienes la versión completa sin pagar. Tu cuenta es la misma en todo el ecosistema.</p>
              </div>
              <ArrowRight size={20} className="text-emerald-300 shrink-0 group-hover:translate-x-1 transition-transform" />
            </div>
          </a>

          {/* Contribution */}
          <div className="mb-10 text-center">
            <button onClick={onShowAbout} className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-pink-500/20 to-orange-500/20 border border-pink-500/30 hover:border-pink-500/60 transition-all group">
              <Heart className="w-5 h-5 text-pink-400 group-hover:scale-110 transition-transform" />
              <div className="text-left"><span className="block text-sm font-bold text-pink-200">¿Cómo ayuda tu contribución?</span><span className="block text-xs text-pink-300/80">Apoya el desarrollo y a la Fundación StarSeed</span></div>
            </button>
          </div>

          {/* Tiers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Free */}
            <div className="bg-black/40 border border-white/10 rounded-2xl p-6 flex flex-col relative overflow-hidden group hover:border-white/20 transition-all">
              <div className="mb-4"><h3 className="text-xl font-bold text-gray-300 mb-2">Explorador</h3><div className="text-3xl font-bold text-white mb-1">Gratis</div><p className="text-xs text-gray-500">Acceso básico</p></div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-start gap-2 text-sm text-gray-400"><Check size={16} className="text-gray-500 shrink-0 mt-0.5" /> Visualización de audio básica</li>
                <li className="flex items-start gap-2 text-sm text-gray-400"><Check size={16} className="text-gray-500 shrink-0 mt-0.5" /> Controles de color limitados</li>
                <li className="flex items-start gap-2 text-sm text-gray-400"><Check size={16} className="text-emerald-500 shrink-0 mt-0.5" /> Geometría Sagrada manual</li>
                <li className="flex items-start gap-2 text-sm text-gray-400"><Check size={16} className="text-emerald-500 shrink-0 mt-0.5" /> Ajustes Automáticos: Aleatorio Total</li>
                <li className="flex items-start gap-2 text-sm text-gray-500 opacity-60"><Lock size={14} className="text-yellow-500 shrink-0 mt-0.5" /> Deriva y Avanzados (Bloqueado)</li>
              </ul>
              <button onClick={onClose} className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold transition-colors border border-white/10">Continuar Gratis</button>
            </div>

            {/* Trial */}
            <div className="bg-gradient-to-b from-cyan-900/40 to-black/40 border border-cyan-500/30 rounded-2xl p-6 flex flex-col relative overflow-hidden group hover:border-cyan-500/50 transition-all">
              <div className="absolute top-0 right-0 bg-cyan-500 text-black text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">Prueba</div>
              <div className="mb-4"><h3 className="text-xl font-bold text-cyan-300 mb-2">Viajero</h3><div className="text-3xl font-bold text-white mb-1">1 Hora</div><p className="text-xs text-cyan-500/80">Acceso completo temporal</p></div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-start gap-2 text-sm text-gray-300"><Check size={16} className="text-cyan-400 shrink-0 mt-0.5" /> Todas las funciones Premium</li>
                <li className="flex items-start gap-2 text-sm text-gray-300"><Check size={16} className="text-cyan-400 shrink-0 mt-0.5" /> Geometría Sagrada</li>
                <li className="flex items-start gap-2 text-sm text-gray-300"><Check size={16} className="text-cyan-400 shrink-0 mt-0.5" /> Realidad Virtual y AR</li>
              </ul>
              <button onClick={handleViajeroTrial} disabled={!user || currentTier !== 'free' || userData?.hasUsedTrial || isActivating} className={`w-full py-3 rounded-xl font-semibold transition-colors border flex items-center justify-center gap-2 ${(!user || currentTier !== 'free' || userData?.hasUsedTrial || isActivating) ? 'bg-gray-800/50 text-gray-500 border-gray-700 cursor-not-allowed' : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border-cyan-500/50'}`}>
                {isActivating ? (<><RotateCw size={18} className="animate-spin" /> Activando...</>) : (<><Zap size={18} /> Iniciar Prueba (1 Hora)</>)}
              </button>
            </div>

            {/* Annual */}
            <div className="bg-gradient-to-b from-purple-900/40 to-black/40 border border-purple-500/50 rounded-2xl p-6 flex flex-col relative overflow-hidden group hover:border-purple-500/70 transition-all transform md:-translate-y-2 shadow-[0_10px_30px_rgba(168,85,247,0.2)]">
              <div className="absolute top-0 right-0 bg-purple-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">Popular</div>
              <div className="mb-4"><h3 className="text-xl font-bold text-purple-300 mb-2">Creador</h3><div className="text-3xl font-bold text-white mb-1">$369<span className="text-lg text-gray-400 font-normal"> MXN/año</span></div><p className="text-xs text-purple-400/80">Facturado anualmente</p></div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-start gap-2 text-sm text-gray-200"><Check size={16} className="text-purple-400 shrink-0 mt-0.5" /> Todas las funciones Premium</li>
                <li className="flex items-start gap-2 text-sm text-gray-200"><Check size={16} className="text-purple-400 shrink-0 mt-0.5" /> Geometría Sagrada Completa</li>
                <li className="flex items-start gap-2 text-sm text-gray-200"><Check size={16} className="text-purple-400 shrink-0 mt-0.5" /> Realidad Virtual y AR</li>
                <li className="flex items-start gap-2 text-sm text-gray-200"><Check size={16} className="text-purple-400 shrink-0 mt-0.5" /> Presets ilimitados</li>
              </ul>
              {!user ? (
                <button onClick={() => login()} className="w-full py-3 rounded-xl font-bold transition-colors shadow-[0_0_15px_rgba(168,85,247,0.5)] flex items-center justify-center gap-2 bg-purple-500 hover:bg-purple-600 text-white">Iniciar sesión para suscribirse</button>
              ) : currentTier === 'annual' || currentTier === 'lifetime' ? (
                <button disabled className="w-full py-3 rounded-xl font-bold bg-gray-800/50 text-gray-500 cursor-not-allowed flex items-center justify-center gap-2"><Star size={18} /> {currentTier === 'annual' ? 'Suscrito' : 'Incluido en Maestro'}</button>
              ) : (
                <a href={`https://buy.stripe.com/8x2dRbdxpa0W1F3giv6Na01?prefilled_email=${encodeURIComponent(user.email || '')}&client_reference_id=${user.uid}`} target="_blank" rel="noopener noreferrer" className="w-full py-3 rounded-xl font-bold transition-colors shadow-[0_0_15px_rgba(168,85,247,0.5)] flex items-center justify-center gap-2 bg-purple-500 hover:bg-purple-600 text-white"><Star size={18} /> Suscribirse a Creador</a>
              )}
            </div>

            {/* Lifetime (Maestro) con descuento 639hz */}
            <div className="bg-gradient-to-b from-emerald-900/40 to-black/40 border border-emerald-500/30 rounded-2xl p-6 flex flex-col relative overflow-hidden group hover:border-emerald-500/50 transition-all">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-emerald-300 mb-2">Maestro</h3>
                {disc ? (
                  <div className="mb-1">
                    <span className="text-lg text-gray-500 line-through mr-2">{money(disc.list, disc.currency)}</span>
                    <span className="text-3xl font-bold text-white">{money(disc.price, disc.currency)}</span>
                    <span className="ml-2 text-[10px] uppercase font-bold bg-emerald-500 text-black px-2 py-0.5 rounded-full">−{Math.round((1 - disc.price / disc.list) * 100)}%</span>
                  </div>
                ) : (
                  <div className="text-3xl font-bold text-white mb-1">$963<span className="text-lg text-gray-400 font-normal"> MXN</span></div>
                )}
                <p className="text-xs text-emerald-500/80">Pago único de por vida</p>
              </div>
              <ul className="space-y-3 mb-6 flex-1">
                <li className="flex items-start gap-2 text-sm text-gray-300"><Check size={16} className="text-emerald-400 shrink-0 mt-0.5" /> Acceso de por vida</li>
                <li className="flex items-start gap-2 text-sm text-gray-300"><Check size={16} className="text-emerald-400 shrink-0 mt-0.5" /> Todas las actualizaciones futuras</li>
                <li className="flex items-start gap-2 text-sm text-gray-300"><Check size={16} className="text-emerald-400 shrink-0 mt-0.5" /> Soporte prioritario</li>
              </ul>

              {/* Código de descuento */}
              <div className="mb-4">
                <div className="flex gap-2">
                  <input value={discCode} onChange={(e) => setDiscCode(e.target.value)} placeholder="Código de descuento" className="flex-1 bg-black/50 border border-emerald-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400" />
                  <button onClick={applyDiscount} disabled={discBusy || !discCode.trim()} className="px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-medium disabled:opacity-50 flex items-center gap-1">{discBusy ? <RotateCw size={14} className="animate-spin" /> : <Tag size={14} />} Aplicar</button>
                </div>
                {disc && <p className="mt-2 text-[11px] text-emerald-400 flex items-center gap-1"><Check size={12} /> Descuento {disc.code.toUpperCase()} aplicado.</p>}
                {discMsg && <p className="mt-2 text-[11px] text-red-400">{discMsg}</p>}
              </div>

              {!user ? (
                <button onClick={() => login()} className="w-full py-3 rounded-xl font-semibold transition-colors border flex items-center justify-center gap-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/50">Iniciar sesión para suscribirse</button>
              ) : currentTier === 'lifetime' ? (
                <button disabled className="w-full py-3 rounded-xl font-semibold border bg-gray-800/50 text-gray-500 border-gray-700 cursor-not-allowed flex items-center justify-center gap-2"><Shield size={18} /> Desbloqueado</button>
              ) : (
                <a href={lifetimeHref} target="_blank" rel="noopener noreferrer" className="w-full py-3 rounded-xl font-semibold transition-colors border flex items-center justify-center gap-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/50"><Shield size={18} /> {disc ? `Obtener por ${money(disc.price, disc.currency)}` : 'Obtener Acceso'}</a>
              )}
              {disc && !disc.stripeUrl && <p className="mt-2 text-[10px] text-gray-500 text-center">Aplica también el código <b>{disc.code}</b> en la pantalla de pago.</p>}
            </div>
          </div>

          <div className="mt-6 text-center"><p className="text-xs text-gray-400">Tras el pago puede tardar unos momentos en sincronizarse. Si no ves los cambios, recarga la página.</p></div>

          {/* Código de acceso completo (starsoul, etc.) */}
          <RedeemCode />

          {/* Descubre el Poder Premium — animaciones en bucle */}
          <div className="mt-12 pt-8 border-t border-white/10">
            <h3 className="text-2xl font-bold text-center text-white mb-2">Descubre el Poder Premium</h3>
            <p className="text-center text-xs text-gray-400 mb-8">Ejemplos reales de lo que se desbloquea — en movimiento.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {PREMIUM.map((p) => (
                <div key={p.key} className="bg-black/30 rounded-xl overflow-hidden border border-white/5 group">
                  <div className="aspect-video relative flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_50%,#11182f,#05060d)]">
                    {/* Geometría sagrada: anillos girando + flor de la vida */}
                    {p.key === 'geo' && (
                      <svg viewBox="0 0 120 120" className="w-32 h-32" style={{ animation: 'ssSpin 18s linear infinite' }}>
                        <g fill="none" stroke="#34d399" strokeWidth="1" opacity="0.85">
                          {[0, 60, 120, 180, 240, 300].map((a) => (<circle key={a} cx={60 + 18 * Math.cos((a * Math.PI) / 180)} cy={60 + 18 * Math.sin((a * Math.PI) / 180)} r="18" />))}
                          <circle cx="60" cy="60" r="18" /><circle cx="60" cy="60" r="36" stroke="#22d3ee" opacity="0.5" />
                        </g>
                      </svg>
                    )}
                    {/* VR: túnel de portales */}
                    {p.key === 'vr' && (
                      <div className="absolute inset-0 flex items-center justify-center" style={{ animation: 'ssHue 8s linear infinite' }}>
                        {[0, 1, 2, 3].map((i) => (<span key={i} className="absolute rounded-full border-2 border-purple-400/70" style={{ width: 24, height: 24, animation: `ssTunnel 3s linear ${i * 0.75}s infinite` }} />))}
                        <Glasses className="text-purple-200/90 relative z-10" size={26} />
                      </div>
                    )}
                    {/* Deriva: blobs morphing */}
                    {p.key === 'drift' && (
                      <div className="absolute inset-0" style={{ animation: 'ssHue 10s linear infinite' }}>
                        <span className="absolute left-1/3 top-1/2 w-16 h-16 rounded-full bg-cyan-400/50 blur-xl" style={{ animation: 'ssDrift 7s ease-in-out infinite' }} />
                        <span className="absolute left-1/2 top-1/3 w-14 h-14 rounded-full bg-fuchsia-400/50 blur-xl" style={{ animation: 'ssDrift 9s ease-in-out infinite reverse' }} />
                        <span className="absolute left-2/3 top-2/3 w-12 h-12 rounded-full bg-emerald-400/40 blur-xl" style={{ animation: 'ssDrift 11s ease-in-out infinite' }} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none"></div>
                    <span className={`absolute bottom-3 left-3 text-sm font-bold ${p.color} flex items-center gap-2`}>{p.icon} {p.label}</span>
                    <span className="absolute top-2 right-2 text-[9px] uppercase tracking-wider bg-white/10 text-white/80 px-2 py-0.5 rounded-full">en vivo</span>
                  </div>
                  <div className="p-4"><p className="text-xs text-gray-400">{p.desc}</p></div>
                </div>
              ))}
            </div>
          </div>

          {/* Ecosistema StarSeed — áreas, resúmenes y conexiones */}
          <div className="mt-12 pt-8 border-t border-white/10">
            <h3 className="text-2xl font-bold text-center text-white mb-2">Audiomorphic es parte de StarSeed</h3>
            <p className="text-center text-xs text-gray-400 mb-8">Un solo inicio de sesión para todo el ecosistema. Explora las demás áreas y cómo se conectan.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SYSTEMS.map((s) => (
                <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer" className="group rounded-2xl border border-white/10 bg-black/30 hover:border-cyan-500/40 transition-all overflow-hidden flex">
                  <div className={`w-24 shrink-0 bg-gradient-to-br ${s.gradient} flex items-center justify-center text-white relative overflow-hidden`}>
                    <div className="absolute inset-0 opacity-30" style={{ animation: 'ssHue 12s linear infinite', background: 'radial-gradient(circle at 30% 30%, #fff6, transparent 60%)' }} />
                    <span className="relative z-10">{s.icon}</span>
                  </div>
                  <div className="p-4 min-w-0">
                    <div className="flex items-center gap-2"><span className="text-sm font-bold text-white">{s.name}</span><ExternalLink size={12} className="text-gray-500 group-hover:text-cyan-400" /></div>
                    <p className="text-[11px] text-gray-400 mt-1">{s.summary}</p>
                    <p className="text-[11px] text-cyan-300/80 mt-2 flex items-start gap-1"><Boxes size={12} className="shrink-0 mt-0.5" /> {s.connection}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SubscriptionScreen;
