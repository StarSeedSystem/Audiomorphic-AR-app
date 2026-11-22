import React, { useState, useRef } from 'react';

interface LiquidSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  disabled?: boolean;
}

const LiquidSlider: React.FC<LiquidSliderProps> = ({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  className = '',
  disabled = false,
}) => {
  const safeMin = typeof min === 'number' && Number.isFinite(min) ? min : 0;
  const safeMax = typeof max === 'number' && Number.isFinite(max) ? max : 100;
  const safeStep = typeof step === 'number' && Number.isFinite(step) && step > 0 ? step : 1;
  const safeValue = typeof value === 'number' && Number.isFinite(value) ? value : safeMin;

  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const latestRef = useRef({ onChange, min: safeMin, max: safeMax, step: safeStep, disabled });
  latestRef.current = { onChange, min: safeMin, max: safeMax, step: safeStep, disabled };

  const percentage = Math.max(0, Math.min(100, ((safeValue - safeMin) / (safeMax - safeMin || 1)) * 100));

  const updateFromClientX = (clientX: number) => {
    const { onChange: emit, min: lo, max: hi, step: st, disabled: isDis } = latestRef.current;
    if (!containerRef.current || isDis) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const rawValue = (x / rect.width) * (hi - lo) + lo;
    const stepped = Math.round(rawValue / st) * st;
    const clamped = Math.max(lo, Math.min(hi, stepped));
    emit(clamped);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore capture errors on synthetic events */
    }
    setIsDragging(true);
    updateFromClientX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || disabled) return;
    e.stopPropagation();
    updateFromClientX(e.clientX);
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.stopPropagation();
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      /* ignore */
    }
    setIsDragging(false);
  };

  return (
    <div
      ref={containerRef}
      className={`relative h-6 flex items-center group touch-none select-none ${
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
      } ${className}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      role="slider"
      aria-valuemin={safeMin}
      aria-valuemax={safeMax}
      aria-valuenow={safeValue}
      aria-disabled={disabled}
    >
      <div className="absolute inset-0 h-1.5 my-auto w-full bg-white/10 rounded-full overflow-hidden border border-white/10 shadow-inner" />

      <div
        className={`absolute h-1.5 my-auto rounded-full ${isDragging ? '' : 'transition-[width] duration-75 ease-out'}`}
        style={{
          width: `${percentage}%`,
          background:
            'linear-gradient(90deg, hsl(var(--morph-hue-1), 90%, 56%), hsl(var(--morph-hue-2), 88%, 60%), hsl(var(--morph-hue-3), 88%, 60%))',
          boxShadow: '0 0 12px hsla(var(--morph-hue-1), 92%, 60%, 0.45)',
        }}
      />

      <div
        className={`absolute h-4 w-4 rounded-full border border-white/75 z-10 ${
          isDragging
            ? 'scale-125 ring-4 ring-white/15'
            : 'transition-transform duration-100 ease-out group-hover:scale-110'
        }`}
        style={{
          left: `calc(${percentage}% - 8px)`,
          background:
            'radial-gradient(circle at 30% 30%, #ffffff, hsl(var(--morph-hue-1), 92%, 64%))',
          boxShadow: '0 0 14px hsla(var(--morph-hue-1), 94%, 64%, 0.65)',
        }}
      >
        {!disabled && (
          <div
            className={`absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-950/95 px-1.5 py-0.5 rounded text-[10px] font-mono morph-accent-text border pointer-events-none transition-[opacity,transform] duration-150 ${
              isDragging ? 'opacity-100 scale-110' : 'opacity-0 scale-95 group-hover:opacity-100'
            }`}
            style={{ borderColor: 'var(--morph-border)' }}
          >
            {safeValue.toFixed(1)}
          </div>
        )}
      </div>

      <div className="absolute inset-0 h-1.5 my-auto pointer-events-none flex justify-between px-1 opacity-20">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="w-[1px] h-1 bg-white/50" />
        ))}
      </div>
    </div>
  );
};

export default LiquidSlider;
