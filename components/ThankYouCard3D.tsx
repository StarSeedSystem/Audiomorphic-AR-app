import React, { useState } from 'react';
import { Sparkles, RotateCw, Folder, Check, ShieldCheck, Heart, Award } from 'lucide-react';
import { useDeviceTilt } from '../hooks/useDeviceTilt';
import { ThankYouCardRecord } from '../lib/starseedDb';

interface ThankYouCard3DProps {
  card: ThankYouCardRecord;
  onUpdateFolder?: (newFolder: string) => void;
  availableFolders?: string[];
}

export const ThankYouCard3D: React.FC<ThankYouCard3DProps> = ({
  card,
  onUpdateFolder,
  availableFolders = [
    'Biblioteca/Donaciones y Agradecimientos',
    'Biblioteca/Mecenas y Donadores',
    'Biblioteca/Colección Especial',
    'Biblioteca/Perfil/Insignias',
  ],
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isEditingFolder, setIsEditingFolder] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState(card.folderPath);
  const [customFolder, setCustomFolder] = useState('');

  const { rotateX, rotateY, glareX, glareY, isGyroActive, onPointerMove, onPointerLeave } = useDeviceTilt(22);

  const handleSaveFolder = (folder: string) => {
    const target = folder.trim() || card.folderPath;
    setSelectedFolder(target);
    setIsEditingFolder(false);
    if (onUpdateFolder) {
      onUpdateFolder(target);
    }
  };

  const isGold = card.cardTheme === 'gold' || card.tierId === 'premium';
  const isPurple = card.cardTheme === 'iridescent' || card.tierId === 'starseed';
  const isCyan = card.cardTheme === 'holographic' || card.tierId === 'code';

  const themeGradient = isGold
    ? 'linear-gradient(135deg, rgba(255,215,0,0.25) 0%, rgba(218,165,32,0.15) 35%, rgba(255,248,220,0.3) 70%, rgba(184,134,11,0.25) 100%)'
    : isPurple
    ? 'linear-gradient(135deg, rgba(168,85,247,0.25) 0%, rgba(236,72,153,0.18) 40%, rgba(59,130,246,0.25) 80%, rgba(147,51,234,0.2) 100%)'
    : isCyan
    ? 'linear-gradient(135deg, rgba(0,242,254,0.25) 0%, rgba(79,172,254,0.18) 45%, rgba(16,185,129,0.22) 85%, rgba(0,242,254,0.2) 100%)'
    : 'linear-gradient(135deg, rgba(16,185,129,0.25) 0%, rgba(52,211,153,0.18) 45%, rgba(6,182,212,0.22) 85%, rgba(16,185,129,0.2) 100%)';

  const foilBorder = isGold
    ? 'rgba(255, 215, 0, 0.45)'
    : isPurple
    ? 'rgba(216, 180, 254, 0.45)'
    : isCyan
    ? 'rgba(103, 232, 249, 0.45)'
    : 'rgba(110, 231, 183, 0.45)';

  const cardTransform = `rotateX(${rotateX}deg) rotateY(${rotateY + (isFlipped ? 180 : 0)}deg)`;

  return (
    <div className="flex flex-col items-center w-full max-w-sm mx-auto select-none">
      {/* 3D Scene viewport */}
      <div
        className="w-full relative py-4 flex items-center justify-center cursor-pointer"
        style={{ perspective: '1100px' }}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        onClick={() => !isEditingFolder && setIsFlipped(!isFlipped)}
      >
        {/* The 3D Card Object */}
        <div
          className="relative w-[320px] sm:w-[350px] h-[480px] rounded-[28px] transition-transform duration-100 ease-out"
          style={{
            transformStyle: 'preserve-3d',
            transform: cardTransform,
            boxShadow: isGold
              ? '0 30px 60px -12px rgba(245,158,11,0.35), 0 0 40px rgba(255,215,0,0.2)'
              : '0 30px 60px -12px rgba(0,242,254,0.25), 0 0 35px rgba(168,85,247,0.2)',
          }}
        >
          {/* FRONT FACE */}
          <div
            className="absolute inset-0 rounded-[28px] p-6 flex flex-col justify-between overflow-hidden backdrop-blur-2xl"
            style={{
              backfaceVisibility: 'hidden',
              background: themeGradient,
              border: `1.5px solid ${foilBorder}`,
              boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.4), inset 0 -1px 2px rgba(0,0,0,0.5)',
            }}
          >
            {/* Holographic foil sheen overlay */}
            <div
              className="absolute inset-0 pointer-events-none mix-blend-color-dodge opacity-60 transition-opacity duration-300"
              style={{
                background: `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.85) 0%, rgba(255,215,0,0.4) 25%, rgba(0,242,254,0.3) 50%, rgba(236,72,153,0.2) 75%, transparent 100%)`,
              }}
            />

            {/* Sacred Geometry Watermark in Background */}
            <svg
              className="absolute -right-12 -bottom-12 w-64 h-64 opacity-15 pointer-events-none text-white animate-spin"
              style={{ animationDuration: '70s' }}
              viewBox="0 0 100 100"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.75"
            >
              <circle cx="50" cy="50" r="30" />
              <circle cx="50" cy="20" r="30" />
              <circle cx="50" cy="80" r="30" />
              <circle cx="24" cy="35" r="30" />
              <circle cx="76" cy="35" r="30" />
              <circle cx="24" cy="65" r="30" />
              <circle cx="76" cy="65" r="30" />
            </svg>

            {/* Header: StarSeed OS Seal & Tier Badge */}
            <div className="flex justify-between items-start relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/30 flex items-center justify-center shadow-lg backdrop-blur-md">
                  <Sparkles className={`w-5 h-5 ${isGold ? 'text-amber-300' : 'text-cyan-300'}`} />
                </div>
                <div>
                  <span className="text-[10px] font-mono tracking-widest uppercase text-white/70 block">StarSeed OS</span>
                  <span className="text-xs font-bold tracking-wider text-white flex items-center gap-1">
                    Audiomorphic AR <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  </span>
                </div>
              </div>

              <div
                className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border backdrop-blur-md ${
                  isGold
                    ? 'bg-amber-400/20 text-amber-200 border-amber-400/40 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                    : isPurple
                    ? 'bg-purple-500/20 text-purple-200 border-purple-400/40 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                    : 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40 shadow-[0_0_12px_rgba(0,242,254,0.3)]'
                }`}
              >
                {card.tierName}
              </div>
            </div>

            {/* Center: Holographic Medal & Donor Acknowledgment */}
            <div className="relative z-10 text-center my-auto py-4">
              <div className="inline-flex p-4 rounded-full bg-white/10 border border-white/20 mb-3 shadow-[0_0_30px_rgba(255,255,255,0.15)]">
                <Award className={`w-12 h-12 ${isGold ? 'text-amber-300 animate-pulse' : 'text-cyan-300'}`} />
              </div>
              <h4 className="text-xs uppercase tracking-widest text-white/60 mb-1">Tarjeta de Agradecimiento</h4>
              <h3 className="text-2xl font-extrabold text-white tracking-tight drop-shadow-md">
                {card.donorName}
              </h3>
              <p className="text-xs text-white/80 font-medium mt-2 max-w-[260px] mx-auto line-clamp-2">
                {card.message || 'Tu aporte enriquece la investigación sonora y la geometría sagrada.'}
              </p>
            </div>

            {/* Footer: Amount, Date & Flip prompt */}
            <div className="relative z-10 pt-3 border-t border-white/15 flex justify-between items-end">
              <div>
                <span className="text-[10px] text-white/60 uppercase font-mono block">Aporte Simbólico</span>
                <span className="text-lg font-mono font-bold text-white tracking-wider">{card.amount}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-white/60 font-mono block">
                  {new Date(card.issuedAt).toLocaleDateString()}
                </span>
                <span className="text-[10px] text-white/90 font-medium flex items-center justify-end gap-1 mt-0.5">
                  Girar tarjeta <RotateCw className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>

          {/* BACK FACE */}
          <div
            className="absolute inset-0 rounded-[28px] p-6 flex flex-col justify-between overflow-hidden backdrop-blur-2xl"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              background: 'linear-gradient(135deg, rgba(20,20,35,0.85) 0%, rgba(10,10,20,0.92) 100%)',
              border: `1.5px solid ${foilBorder}`,
              boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.3)',
            }}
          >
            {/* Header back */}
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Heart className="w-4 h-4 text-pink-400" /> Registro de Gratitud
              </div>
              <span className="text-[10px] font-mono text-white/50">ID: {card.id.slice(0, 12)}</span>
            </div>

            {/* Back content: Manifesto / message */}
            <div className="space-y-3 text-xs text-gray-300 leading-relaxed my-auto">
              <p className="italic text-white/90">
                “El sonido es la arquitectura invisible de la realidad. Gracias por apoyar la exploración libre y soberana de las ondas que nos conectan.”
              </p>
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between text-gray-400">
                  <span>Mecenas:</span>
                  <span className="text-white font-semibold">{card.donorName}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Categoría:</span>
                  <span className="text-cyan-300">{card.tierName}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Red:</span>
                  <span className="text-emerald-300">StarSeed OS Soberano</span>
                </div>
              </div>
            </div>

            {/* Back footer: Folder location */}
            <div className="pt-3 border-t border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-amber-300 font-medium">
                  <Folder className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[190px]">{selectedFolder}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingFolder(!isEditingFolder);
                  }}
                  className="text-[11px] text-white/80 hover:text-white underline font-medium"
                >
                  {isEditingFolder ? 'Cerrar' : 'Cambiar carpeta'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gyroscope status badge for mobile */}
      {isGyroActive && (
        <div className="mt-1 text-[10px] text-cyan-300/80 font-mono flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          Giroscopio activo (mueve tu dispositivo)
        </div>
      )}

      {/* Folder Assignment Drawer (if user clicks "Cambiar carpeta") */}
      {isEditingFolder && (
        <div className="w-full mt-3 p-4 rounded-2xl bg-black/50 border border-white/15 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-300 text-xs text-white">
          <div className="font-bold mb-2 flex items-center gap-1.5 text-cyan-300">
            <Folder className="w-4 h-4" /> Ubicación en tu Biblioteca
          </div>
          <p className="text-[11px] text-gray-400 mb-3">
            La tarjeta se guarda automáticamente en tu perfil y recuerda esta ubicación:
          </p>

          <div className="space-y-1.5 mb-3">
            {availableFolders.map((folder) => (
              <button
                key={folder}
                type="button"
                onClick={() => handleSaveFolder(folder)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex items-center justify-between ${
                  selectedFolder === folder
                    ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 font-semibold'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-transparent'
                }`}
              >
                <span className="truncate">{folder}</span>
                {selectedFolder === folder && <Check className="w-3.5 h-3.5 text-cyan-300" />}
              </button>
            ))}
          </div>

          {/* Custom folder entry */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nueva carpeta personalizada..."
              value={customFolder}
              onChange={(e) => setCustomFolder(e.target.value)}
              className="flex-1 bg-black/40 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 outline-none focus:border-cyan-400"
            />
            <button
              type="button"
              onClick={() => {
                if (customFolder.trim()) handleSaveFolder(customFolder.trim());
              }}
              className="px-3 py-1.5 rounded-xl bg-cyan-500/30 border border-cyan-400/50 text-cyan-200 font-bold hover:bg-cyan-500/40"
            >
              Guardar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThankYouCard3D;
