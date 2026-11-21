import React, { useState, useRef, useEffect } from 'react';

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
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min || 1)) * 100));

  const handleInteraction = (clientX: number) => {
    if (!containerRef.current || disabled) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const rawValue = (x / rect.width) * (max - min) + min;
    const steppedValue = Math.round(rawValue / step) * step;
    onChange(Math.max(min, Math.min(max, steppedValue)));
  };

  const onMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleInteraction(e.clientX);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    handleInteraction(e.touches[0].clientX);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) handleInteraction(e.clientX);
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging) handleInteraction(e.touches[0].clientX);
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div
      ref={containerRef}
      className={`relative h-6 flex items-center group ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    >
      <div className="absolute inset-0 h-1.5 my-auto w-full bg-white/10 rounded-full overflow-hidden border border-white/10 shadow-inner" />

      <div
        className="absolute h-1.5 my-auto rounded-full transition-all duration-75 ease-out"
        style={{
          width: `${percentage}%`,
          background:
            'linear-gradient(90deg, hsl(var(--morph-hue-1) 90% 56%), hsl(var(--morph-hue-2) 88% 60%), hsl(var(--morph-hue-3) 88% 60%))',
          boxShadow: '0 0 12px hsla(var(--morph-hue-1) 92% 60% / 0.45)',
        }}
      />

      <div
        className={`absolute h-4 w-4 rounded-full border border-white/70 transition-all duration-75 ease-out z-10 ${
          isDragging ? 'scale-125 ring-4 ring-white/15' : 'group-hover:scale-110'
        }`}
        style={{
          left: `calc(${percentage}% - 8px)`,
          background:
            'radial-gradient(circle at 30% 30%, #ffffff, hsl(var(--morph-hue-1) 92% 64%))',
          boxShadow: '0 0 14px hsla(var(--morph-hue-1) 94% 64% / 0.65)',
        }}
      >
        {(isDragging || !disabled) && (
          <div
            className={`absolute -top-8 left-1/2 -translate-x-1/2 bg-black/85 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-mono morph-accent-text border transition-opacity duration-200 ${
              isDragging ? 'opacity-100 scale-110' : 'opacity-0 scale-95 group-hover:opacity-100'
            }`}
            style={{ borderColor: 'var(--morph-border)' }}
          >
            {value.toFixed(1)}
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
