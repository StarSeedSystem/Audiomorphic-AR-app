import React, { useState } from 'react';
import { X, ExternalLink, Heart, BrainCircuit, Music, Sparkles, Rocket, Star, AtSign, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

interface AboutScreenProps {
  onClose: () => void;
}

const ECOSYSTEM: [string, string, string][] = [
  ['🌌', 'StarSeed Nexus', 'https://starseed-nexus.vercel.app'],
  ['🪐', 'StarSeed OS', 'https://starseed-os.vercel.app'],
  ['☕', 'StarSeed Café', 'https://starseed-cafe.vercel.app/cafe/'],
];

const AboutScreen: React.FC<AboutScreenProps> = ({ onClose }) => {
  const { user, profile, setAuthModalOpen } = useAuth();
  const [handoffLoading, setHandoffLoading] = useState(false);

  const handle = profile?.handle ?? null;
  const displayName = profile?.displayName || (handle ? `@${handle}` : null) || user?.email?.split('@')[0] || null;
  const avatarUrl = profile?.avatarUrl ?? null;
  const starseedAddress = profile?.starseedAddress ?? (handle ? `${handle}@star.seed` : null);

  // SSO: abrir StarSeed OS con la sesion actual (token handoff).
  const handleOpenStarSeedOS = async () => {
    setHandoffLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) { setAuthModalOpen(true); return; }
      const params = new URLSearchParams({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        token_type: 'bearer',
        expires_in: '3600',
        type: 'signup',
      });
      window.open(`https://starseed-os.vercel.app/funciones#${params.toString()}`, '_blank', 'noopener');
    } catch (e) {
      window.open('https://starseed-os.vercel.app/funciones', '_blank', 'noopener');
    } finally {
      setHandoffLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-2xl animate-in fade-in duration-500 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-gray-900/95 border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col my-auto">
        
        {/* Header */}
        <div className="relative p-6 sm:p-8 border-b border-white/10 text-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-indigo-500/20 opacity-50"></div>
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors z-10 bg-black/50 p-2 rounded-full hover:bg-white/10"
          >
            <X size={24} />
          </button>
          
          <h2 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 mb-4 relative z-10">
            Sobre el Proyecto
          </h2>
          <p className="text-gray-300 max-w-2xl mx-auto text-sm sm:text-base relative z-10">
            Descubre la ciencia, el arte y el propósito detrás de la visualización sinestésica.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-12">

          {/* Section 0: Cuenta StarSeed (sesion real) */}
          <section className="bg-gradient-to-br from-cyan-900/30 to-indigo-900/30 border border-cyan-500/30 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
            <h3 className="text-2xl font-bold text-cyan-300 flex items-center gap-3 mb-2 relative z-10">
              <Star className="text-cyan-400" /> Tu cuenta StarSeed
            </h3>
            <p className="text-gray-300 leading-relaxed text-sm sm:text-base mb-5 relative z-10">
              Una sola cuenta para todo el ecosistema: Audiomorphic, el Café, el OS y el Nexus. El mismo inicio de sesión funciona en todas partes.
            </p>

            {user ? (
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-black/30 border border-white/10">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold border-2 border-cyan-400/50 bg-cyan-500/20 text-cyan-200 overflow-hidden shrink-0">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      (displayName || 'U').charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-bold text-white truncate">{displayName || 'Usuario'}</p>
                    {handle && (
                      <p className="text-xs text-cyan-300 truncate flex items-center gap-0.5">
                        <AtSign size={11} className="shrink-0" />{handle}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                    {starseedAddress && (
                      <p className="text-xs font-mono text-emerald-300 truncate mt-1">{starseedAddress}</p>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleOpenStarSeedOS}
                  disabled={handoffLoading}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold transition-colors shadow-[0_0_20px_rgba(6,182,212,0.4)] disabled:opacity-60"
                >
                  {handoffLoading ? (
                    <span className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  ) : (
                    <Rocket size={18} />
                  )}
                  Abrir StarSeed OS con mi sesión
                </button>
              </div>
            ) : (
              <div className="relative z-10">
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold transition-colors shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                >
                  <LogIn size={18} /> Iniciar sesión o crear cuenta
                </button>
              </div>
            )}

            <div className="relative z-10 mt-6 flex flex-wrap gap-2">
              {ECOSYSTEM.map(([emo, name, url]) => (
                <a key={url} href={url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-cyan-500/30 transition-all text-sm text-gray-200">
                  <span>{emo}</span><span>{name}</span><ExternalLink size={12} className="text-gray-500" />
                </a>
              ))}
            </div>
          </section>
          
          {/* Section 1: Functionality */}
          <section className="space-y-4">
            <h3 className="text-2xl font-bold text-white flex items-center gap-3">
              <BrainCircuit className="text-cyan-400" /> ¿Cómo Funciona?
            </h3>
            <p className="text-gray-300 leading-relaxed text-sm sm:text-base">
              Esta aplicación es un motor de visualización de audio en tiempo real que traduce las frecuencias sonoras en complejas estructuras geométricas 3D. Utilizando la Web Audio API, analizamos el espectro de audio capturado por tu micrófono o dispositivo, dividiéndolo en bandas de frecuencia (bajos, medios, agudos). Estos datos alimentan un sistema de partículas y mallas en WebGL (a través de Three.js), creando una experiencia visual inmersiva y reactiva.
            </p>
          </section>

          {/* Section 2: Math Principles */}
          <section className="space-y-4">
            <h3 className="text-2xl font-bold text-white flex items-center gap-3">
              <Sparkles className="text-emerald-400" /> Principios Matemáticos
            </h3>
            <p className="text-gray-300 leading-relaxed text-sm sm:text-base">
              Las formas que observas no son aleatorias. Están fundamentadas en la <strong>Geometría Sagrada</strong> y proporciones matemáticas universales, como la Proporción Áurea (Phi) y la secuencia de Fibonacci.
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 text-sm sm:text-base ml-4">
              <li><strong>Flor de la Vida:</strong> Patrones de círculos superpuestos que representan la creación y la interconectividad.</li>
              <li><strong>Cubo de Metatrón:</strong> Una figura geométrica compleja derivada de la Flor de la Vida, que contiene los cinco sólidos platónicos.</li>
              <li><strong>Fractales:</strong> Estructuras auto-similares a diferentes escalas, generadas mediante algoritmos recursivos que responden a la intensidad del audio.</li>
            </ul>
          </section>

          {/* Section 3: Sound & Vision */}
          <section className="space-y-4">
            <h3 className="text-2xl font-bold text-white flex items-center gap-3">
              <Music className="text-purple-400" /> Sonido y Visión (Sinestesia)
            </h3>
            <p className="text-gray-300 leading-relaxed text-sm sm:text-base">
              Buscamos simular la <em>sinestesia</em>, un fenómeno neurológico donde la estimulación de un sentido (el oído) provoca una experiencia automática en otro (la vista). Los bajos profundos expanden la geometría base, los tonos medios alteran la complejidad de los patrones, y los agudos dictan la velocidad y el brillo de las partículas. El color se mapea dinámicamente a las frecuencias dominantes, creando una traducción visual directa de la música.
            </p>
          </section>

          {/* Section 4: Fundación Starseed */}
          <section className="bg-gradient-to-br from-pink-900/30 to-purple-900/30 border border-pink-500/30 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
            
            <h3 className="text-2xl font-bold text-pink-300 flex items-center gap-3 mb-4 relative z-10">
              <Heart className="text-pink-400" /> Fundación Starseed
            </h3>
            <p className="text-gray-200 leading-relaxed text-sm sm:text-base mb-6 relative z-10">
              Tu suscripción y contribuciones no solo apoyan el desarrollo continuo de esta herramienta, sino que también financian directamente a la <strong>Fundación Starseed</strong>. Nuestra misión es promover la educación, la conciencia y la sanación a través del arte, la tecnología y la conexión comunitaria. Creemos en el poder transformador de la frecuencia y la geometría para elevar el espíritu humano.
            </p>
            
            <a 
              href="https://linktr.ee/FundacionStarseed" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-bold transition-colors shadow-[0_0_20px_rgba(236,72,153,0.4)] relative z-10"
            >
              Conoce más sobre la Fundación <ExternalLink size={18} />
            </a>
          </section>

        </div>
      </div>
    </div>
  );
};

export default AboutScreen;
