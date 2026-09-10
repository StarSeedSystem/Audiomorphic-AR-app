import React from 'react';
import { ExternalLink } from 'lucide-react';

const LINKS: [string, string, string, string][] = [
  ['🌌', 'StarSeed Nexus', 'El portal del ecosistema', 'https://starseed-nexus.vercel.app'],
  ['🪐', 'StarSeed OS', 'Tu sistema operativo soberano', 'https://starseed-os.vercel.app'],
  ['☕', 'StarSeed Café', 'Comunidad, menú y economía de Granos & Semillas', 'https://starseed-cafe.vercel.app/cafe/'],
  ['🎨', 'Estudio & Audiomorphic', 'Arte, música y consciencia (Telegram)', 'https://t.me/+VIUqsUmMZWczZTYx'],
  ['🌱', 'Comunidad StarSeed', 'La Sangha digital (Telegram)', 'https://t.me/+eWHmQmw5A5s3ODhh'],
];

export const StarSeedLinks: React.FC = () => (
  <div className="mt-8 rounded-2xl border border-white/10 bg-black/30 p-5">
    <h3 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">Audiomorphic es parte de StarSeed</h3>
    <p className="text-xs text-gray-400 mt-1 mb-4">Tu cuenta es la misma en todo el ecosistema — un solo inicio de sesión para Audiomorphic, el Café, el OS y el Nexus. Explora el resto:</p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {LINKS.map(([emo, t, d, url]) => (
        <a key={url} href={url} target="_blank" rel="noopener" className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-cyan-500/30 transition-all p-3 group">
          <span className="text-xl">{emo}</span>
          <span className="flex-1 min-w-0"><span className="block text-sm font-medium text-white truncate">{t}</span><span className="block text-[11px] text-gray-400 truncate">{d}</span></span>
          <ExternalLink size={14} className="text-gray-500 group-hover:text-cyan-400 shrink-0" />
        </a>
      ))}
    </div>
  </div>
);
