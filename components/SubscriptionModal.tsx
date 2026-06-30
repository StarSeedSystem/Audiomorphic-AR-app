import React, { useState } from 'react';
import { X, Crown, Check, Sparkles, Ticket, Star, Lock, Gift } from 'lucide-react';
import {
  TierDefinition,
  PlanId,
  RedeemResult,
} from '../hooks/useSubscription';

interface SubscriptionModalProps {
  open: boolean;
  onClose: () => void;
  tiers: TierDefinition[];
  currentPlan: PlanId;
  viaStarSeed?: boolean;
  redeemedCode?: string;
  hasStarSeed: boolean;
  starSeedName?: string | null;
  onSelectPlan: (plan: PlanId) => void;
  onRedeemCode: (code: string) => RedeemResult;
}

const ACCENTS: Record<
  TierDefinition['accent'],
  { text: string; border: string; glow: string; chip: string; btn: string }
> = {
  cyan: {
    text: 'text-cyan-300',
    border: 'border-cyan-500/40',
    glow: 'shadow-[0_0_30px_rgba(0,242,254,0.18)]',
    chip: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    btn: 'text-cyan-200',
  },
  emerald: {
    text: 'text-emerald-300',
    border: 'border-emerald-500/40',
    glow: 'shadow-[0_0_30px_rgba(16,185,129,0.2)]',
    chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    btn: 'text-emerald-200',
  },
  purple: {
    text: 'text-purple-300',
    border: 'border-purple-500/40',
    glow: 'shadow-[0_0_30px_rgba(168,85,247,0.2)]',
    chip: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    btn: 'text-purple-200',
  },
  amber: {
    text: 'text-amber-300',
    border: 'border-amber-500/40',
    glow: 'shadow-[0_0_30px_rgba(245,158,11,0.22)]',
    chip: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    btn: 'text-amber-200',
  },
};

const TIER_ICON: Record<PlanId, React.ReactNode> = {
  free: <Gift className="w-5 h-5" />,
  code: <Ticket className="w-5 h-5" />,
  starseed: <Star className="w-5 h-5" />,
  premium: <Crown className="w-5 h-5" />,
};

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  open,
  onClose,
  tiers,
  currentPlan,
  viaStarSeed,
  redeemedCode,
  hasStarSeed,
  starSeedName,
  onSelectPlan,
  onRedeemCode,
}) => {
  const [codeInput, setCodeInput] = useState('');
  const [feedback, setFeedback] = useState<RedeemResult | null>(null);

  if (!open) return null;

  const handleRedeem = () => {
    try {
      const result = onRedeemCode(codeInput);
      setFeedback(result);
      if (result.ok) setCodeInput('');
    } catch {
      setFeedback({ ok: false, message: 'No se pudo canjear el código. Inténtalo de nuevo.' });
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-300"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Suscripción Audiomorphic"
    >
      <style>{`
        .sub-panel {
          background: rgba(15, 15, 25, 0.55);
          backdrop-filter: blur(40px) saturate(180%);
          -webkit-backdrop-filter: blur(40px) saturate(180%);
          border: 1px solid rgba(255,255,255,0.15);
          box-shadow: 0 30px 80px rgba(0,0,0,0.6), inset 0 1px 2px rgba(255,255,255,0.35);
          border-radius: 32px;
        }
        .sub-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 24px;
          transition: transform .35s cubic-bezier(0.34,1.56,0.64,1), box-shadow .35s ease, border-color .35s ease;
        }
        .sub-card:hover { transform: translateY(-4px); }
        .sub-scroll::-webkit-scrollbar { width: 8px; }
        .sub-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); border-radius: 8px; }
        .sub-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.25); border-radius: 8px; }
      `}</style>

      <div
        className="sub-panel w-full max-w-5xl max-h-[90vh] flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 sm:px-8 py-5 border-b border-white/10 flex justify-between items-center bg-white/5 rounded-t-[32px]">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3 text-amber-200">
              <Crown className="w-7 h-7 text-amber-300 drop-shadow-[0_0_10px_rgba(245,158,11,0.7)]" />
              Suscripción
            </h2>
            <p className="text-sm text-amber-100/70 mt-1 font-medium tracking-wide">
              Elige tu plan y desbloquea Audiomorphic
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="p-2 rounded-full bg-black/30 border border-white/10 text-gray-300 hover:text-white hover:border-white/30 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 sm:p-8 overflow-y-auto sub-scroll flex-1">
          {/* Current plan + StarSeed banner */}
          <div className="mb-6 flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-black/30 border border-white/10">
              <span className="text-xs uppercase tracking-widest text-gray-400">Plan actual</span>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold bg-white/10 border border-white/15 text-white">
                {TIER_ICON[currentPlan]}
                {tiers.find((t) => t.id === currentPlan)?.name || currentPlan}
              </span>
              {viaStarSeed && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <Sparkles className="w-3 h-3" /> Activo con StarSeed
                </span>
              )}
              {redeemedCode && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  <Ticket className="w-3 h-3" /> {redeemedCode}
                </span>
              )}
            </div>

            {hasStarSeed ? (
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-emerald-900/20 border border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                <div className="flex items-center gap-3">
                  <Star className="w-6 h-6 text-emerald-300 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                  <div>
                    <p className="text-sm font-bold text-emerald-200">
                      Gratis con tu cuenta StarSeed
                    </p>
                    <p className="text-xs text-emerald-100/70">
                      {starSeedName ? `Sesión: ${starSeedName}. ` : ''}
                      Disfruta del plan Gratis vía StarSeed OS sin coste.
                    </p>
                  </div>
                </div>
                {currentPlan !== 'free' && (
                  <button
                    onClick={() => onSelectPlan('free')}
                    className="px-4 py-2 rounded-xl text-sm font-bold bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/30 transition-all"
                  >
                    Activar plan gratis
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-black/20 border border-white/10">
                <Star className="w-5 h-5 text-gray-400" />
                <p className="text-xs text-gray-400">
                  Inicia sesión o entra desde StarSeed OS para obtener el plan{' '}
                  <span className="text-emerald-300 font-semibold">Gratis</span> automáticamente.
                </p>
              </div>
            )}
          </div>

          {/* Tiers grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            {tiers.map((tier) => {
              const a = ACCENTS[tier.accent];
              const isCurrent = tier.id === currentPlan;
              const isFreeLocked = tier.id === 'free' && !hasStarSeed;
              return (
                <div
                  key={tier.id}
                  className={`sub-card p-5 flex flex-col ${isCurrent ? `${a.border} ${a.glow}` : 'border-white/10'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`inline-flex items-center gap-2 font-bold ${a.text}`}>
                      {TIER_ICON[tier.id]}
                      {tier.name}
                    </span>
                    {isCurrent && (
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${a.chip}`}>
                        Actual
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mb-3 min-h-[2rem]">{tier.tagline}</p>
                  <div className={`text-2xl font-bold mb-4 ${a.text}`}>{tier.price}</div>

                  <ul className="space-y-2 mb-5 flex-1">
                    {tier.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs">
                        {f.included ? (
                          <Check className={`w-4 h-4 mt-0.5 shrink-0 ${a.text}`} />
                        ) : (
                          <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0 text-gray-600" />
                        )}
                        <span className={f.included ? 'text-gray-200' : 'text-gray-500 line-through'}>
                          {f.label}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <button
                    disabled={isCurrent || isFreeLocked}
                    onClick={() => onSelectPlan(tier.id)}
                    title={isFreeLocked ? 'Requiere una cuenta StarSeed' : undefined}
                    className={`w-full py-2.5 rounded-xl text-sm font-bold border transition-all ${
                      isCurrent
                        ? 'bg-white/5 border-white/10 text-gray-500 cursor-default'
                        : isFreeLocked
                          ? 'bg-black/30 border-white/10 text-gray-600 cursor-not-allowed'
                          : `bg-white/5 ${a.border} ${a.btn} hover:bg-white/10`
                    }`}
                  >
                    {isCurrent
                      ? 'Plan activo'
                      : isFreeLocked
                        ? 'Requiere StarSeed'
                        : tier.id === 'premium'
                          ? 'Mejorar a Premium'
                          : 'Elegir plan'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Redeem code */}
          <div className="p-5 rounded-2xl bg-black/30 border border-white/10">
            <h3 className="text-sm font-bold text-cyan-200 flex items-center gap-2 mb-3">
              <Ticket className="w-4 h-4" /> Canjear un código
            </h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={codeInput}
                onChange={(e) => {
                  setCodeInput(e.target.value.toUpperCase());
                  if (feedback) setFeedback(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRedeem();
                }}
                placeholder="Ej: SS-XXXX o AUDIO-PREMIUM"
                maxLength={32}
                className="flex-1 bg-black/50 border border-white/10 text-cyan-200 font-mono text-sm rounded-xl px-4 py-3 outline-none focus:border-cyan-400 transition-all uppercase placeholder:normal-case placeholder:text-gray-500"
              />
              <button
                onClick={handleRedeem}
                className="px-6 py-3 rounded-xl text-sm font-bold bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/30 transition-all"
              >
                Canjear
              </button>
            </div>
            {feedback && (
              <p
                className={`mt-3 text-xs font-medium ${
                  feedback.ok ? 'text-emerald-300' : 'text-red-300'
                }`}
              >
                {feedback.message}
              </p>
            )}
            <p className="mt-3 text-[11px] text-gray-500">
              Los códigos que empiezan por{' '}
              <span className="font-mono text-purple-300">SS-</span> activan el plan StarSeed.
              También se aceptan códigos de campaña.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionModal;
