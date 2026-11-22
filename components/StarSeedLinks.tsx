import React from 'react';
import { ExternalLink } from 'lucide-react';
import { STARSEED_ECOSYSTEM_APPS } from '../lib/starseedEcosystem';
import StarSeedSymbol from './StarSeedSymbol';

const FEATURED_LINKS = STARSEED_ECOSYSTEM_APPS.filter((a) => !a.isCurrentApp).slice(0, 6);

export const StarSeedLinks: React.FC = () => (
  <div className="mt-8 rounded-2xl quantum-glass p-5">
    <div className="flex items-center gap-2.5">
      <StarSeedSymbol size="sm" glow />
      <h3 className="text-sm font-bold starseed-text-gradient">Audiomorphic es parte del Ecosistema StarSeed</h3>
    </div>
    <p className="text-xs text-slate-300 mt-1.5 mb-4">
      Tu cuenta, Cerebros y Neuronas son los mismos en todo el ecosistema — un solo inicio de sesión para Audiomorphic, Omnifrecuencias, StarSeed OS, Nexus y Café.
    </p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {FEATURED_LINKS.map((app) => (
        <a
          key={app.id}
          href={app.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/35 hover:bg-white/10 transition-opacity duration-200 p-3 group"
        >
          <div className="w-9 h-9 starseed-app-squircle flex items-center justify-center shrink-0 p-0.5">
            <img src={app.iconSrc} alt={app.name} className="w-full h-full object-cover rounded-[20%]" />
          </div>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-semibold text-white truncate">{app.name}</span>
            <span className="block text-[11px] text-slate-400 truncate">{app.tagline}</span>
          </span>
          <ExternalLink size={14} className="text-slate-400 group-hover:text-cyan-300 shrink-0" />
        </a>
      ))}
    </div>
  </div>
);
