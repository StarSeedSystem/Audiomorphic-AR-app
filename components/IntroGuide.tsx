import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Mic,
  Glasses,
  SlidersHorizontal,
  BrainCircuit,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

interface IntroGuideProps {
  open: boolean;
  onClose: () => void;
  /** Called when the user finishes or skips; persists the "seen" flag. */
  onComplete: () => void;
  /** Optional: open the full system guide from the last step. */
  onOpenSystemGuide?: () => void;
}

interface IntroStep {
  icon: React.ReactNode;
  title: string;
  body: string;
  accent: string;
}

const STEPS: IntroStep[] = [
  {
    icon: <Sparkles className="w-8 h-8" />,
    title: 'Bienvenido a Audiomorphic',
    body: 'Un visualizador de geometría sonora que transforma el sonido en patrones fractales, geometría sagrada y mundos AR/VR en tiempo real.',
    accent: 'text-cyan-300 drop-shadow-[0_0_12px_rgba(0,242,254,0.7)]',
  },
  {
    icon: <Mic className="w-8 h-8" />,
    title: 'Activa el sonido',
    body: 'Pulsa “Iniciar Micrófono” en el panel de control para que el visualizador reaccione a la música o tu voz. El indicador “MIC LIVE” confirmará que está escuchando.',
    accent: 'text-red-300 drop-shadow-[0_0_12px_rgba(239,68,68,0.6)]',
  },
  {
    icon: <BrainCircuit className="w-8 h-8" />,
    title: 'Piloto Automático',
    body: 'Deja que la app evolucione sola. Elige entre Deriva, Armónico o Génesis Geométrico para que las formas respiren y muten al ritmo del sonido.',
    accent: 'text-indigo-300 drop-shadow-[0_0_12px_rgba(99,102,241,0.6)]',
  },
  {
    icon: <Glasses className="w-8 h-8" />,
    title: 'Modos AR y VR',
    body: 'Sumérgete en 3D con el Modo VR, o usa el Modo AR con tu cámara y filtros psicodélicos. Perfecto para gafas o para proyectar.',
    accent: 'text-purple-300 drop-shadow-[0_0_12px_rgba(168,85,247,0.6)]',
  },
  {
    icon: <SlidersHorizontal className="w-8 h-8" />,
    title: 'Todo está en el panel',
    body: 'Mueve el ratón (o toca la pantalla) para mostrar el panel de control. Ahí ajustas color, geometría, reactividad y más. ¿Dudas? Abre la guía completa desde el botón “?”.',
    accent: 'text-emerald-300 drop-shadow-[0_0_12px_rgba(16,185,129,0.6)]',
  },
];

const IntroGuide: React.FC<IntroGuideProps> = ({
  open,
  onClose,
  onComplete,
  onOpenSystemGuide,
}) => {
  const [step, setStep] = useState(0);

  if (!open) return null;

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  const finish = () => {
    onComplete();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/75 backdrop-blur-lg animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-label="Guía de introducción"
    >
      <div className="relative w-full max-w-lg rounded-[32px] border border-white/15 bg-[rgba(15,15,25,0.6)] backdrop-blur-2xl shadow-[0_30px_80px_rgba(0,0,0,0.6),inset_0_1px_2px_rgba(255,255,255,0.35)] p-7 sm:p-9">
        {/* Skip */}
        <button
          onClick={finish}
          className="absolute top-4 right-4 px-3 py-1.5 rounded-full text-xs font-semibold bg-black/30 border border-white/10 text-gray-400 hover:text-white hover:border-white/30 transition-all flex items-center gap-1"
        >
          Saltar <X className="w-3.5 h-3.5" />
        </button>

        {/* Icon */}
        <div className={`mb-5 ${current.accent}`}>{current.icon}</div>

        {/* Content */}
        <h2 className="text-2xl font-bold text-white mb-3">{current.title}</h2>
        <p className="text-sm text-gray-300 leading-relaxed min-h-[5.5rem]">{current.body}</p>

        {/* Dots */}
        <div className="flex items-center gap-2 mt-6 mb-7">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              aria-label={`Ir al paso ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-7 bg-cyan-400 shadow-[0_0_10px_rgba(0,242,254,0.7)]' : 'w-2.5 bg-white/20 hover:bg-white/40'
              }`}
            />
          ))}
        </div>

        {/* Nav */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold border transition-all flex items-center gap-1 ${
              step === 0
                ? 'opacity-40 cursor-not-allowed border-white/10 text-gray-600'
                : 'border-white/15 text-gray-300 hover:bg-white/5'
            }`}
          >
            <ChevronLeft className="w-4 h-4" /> Atrás
          </button>

          {isLast ? (
            <div className="flex items-center gap-2">
              {onOpenSystemGuide && (
                <button
                  onClick={() => {
                    finish();
                    onOpenSystemGuide();
                  }}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold border border-white/15 text-gray-300 hover:bg-white/5 transition-all"
                >
                  Ver guía completa
                </button>
              )}
              <button
                onClick={finish}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/30 transition-all shadow-[0_0_20px_rgba(0,242,254,0.2)]"
              >
                Empezar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              className="px-5 py-2.5 rounded-xl text-sm font-bold bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/30 transition-all flex items-center gap-1"
            >
              Siguiente <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default IntroGuide;
