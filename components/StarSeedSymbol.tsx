import React, { useState } from 'react';

export type StarSeedSymbolSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface StarSeedSymbolProps {
  size?: StarSeedSymbolSize;
  glow?: boolean;
  className?: string;
  alt?: string;
}

const SIZE_CLASSES: Record<StarSeedSymbolSize, string> = {
  xs: 'w-4 h-4',
  sm: 'w-5 h-5',
  md: 'w-7 h-7',
  lg: 'w-11 h-11',
  xl: 'w-16 h-16',
};

export const StarSeedSymbol: React.FC<StarSeedSymbolProps> = ({
  size = 'sm',
  glow = false,
  className = '',
  alt = 'Símbolo StarSeed OS',
}) => {
  const [src, setSrc] = useState('./starseed/starseed-simbolo-3d.webp');

  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      decoding="async"
      onError={() => {
        if (src !== './starseed/starseed-symbol.png') {
          setSrc('./starseed/starseed-symbol.png');
        }
      }}
      className={`${SIZE_CLASSES[size]} object-contain select-none shrink-0 transition-transform duration-300 ${className}`}
      style={
        glow
          ? {
              filter:
                'drop-shadow(0 0 10px hsla(var(--morph-hue-1, 175) 95% 65% / 0.55)) drop-shadow(0 0 18px hsla(var(--morph-hue-2, 312) 90% 62% / 0.35))',
            }
          : undefined
      }
    />
  );
};

export default StarSeedSymbol;
