import React, { useMemo, useState } from 'react';
import {
  X,
  Search,
  Mic,
  BrainCircuit,
  SlidersHorizontal,
  Palette,
  Glasses,
  Maximize,
  RotateCw,
  HelpCircle,
} from 'lucide-react';

interface SystemGuideProps {
  open: boolean;
  onClose: () => void;
}

interface GuideItem {
  term: string;
  desc: string;
}

interface GuideSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  accent: string;
  intro: string;
  items: GuideItem[];
}

const SECTIONS: GuideSection[] = [
  {
    id: 'audio',
    title: 'Audio (Micrófono y Analizador)',
    icon: <Mic className="w-5 h-5" />,
    accent: 'text-red-300',
    intro:
      'Audiomorphic escucha el sonido a través del micrófono y traduce su energía en movimiento. Pulsa “Iniciar Micrófono” en el panel; el indicador “MIC LIVE” se enciende cuando hay señal.',
    items: [
      {
        term: '¿Cómo reacciona el analizador?',
        desc: 'El analizador mide dos cosas en tiempo real: el VOLUMEN (qué tan fuerte suena) y la FRECUENCIA (graves vs. agudos, mediante el centroide espectral). El volumen hace que las formas “respiren” y crezcan; la frecuencia modula el color y la rotación.',
      },
      {
        term: 'Puerta de ruido',
        desc: 'Se ignora el sonido muy bajo para evitar parpadeos por ruido de fondo. Si el visualizador no reacciona, sube el volumen de la fuente o la Sensibilidad.',
      },
      {
        term: 'Permisos del micrófono',
        desc: 'La primera vez el navegador (o la app) pedirá permiso para el micrófono. Si lo rechazas, el visualizador seguirá funcionando con el Piloto Automático, pero sin reaccionar al sonido.',
      },
      {
        term: 'Privacidad',
        desc: 'El audio se procesa localmente en tu dispositivo para generar los gráficos. No se graba ni se envía a ningún servidor.',
      },
    ],
  },
  {
    id: 'auto',
    title: 'Ajustes Automáticos (Auto-Reactividad)',
    icon: <BrainCircuit className="w-5 h-5" />,
    accent: 'text-indigo-300',
    intro:
      'El Piloto Automático evoluciona los parámetros por ti, en armonía con el sonido. Actívalo con el interruptor “Piloto Automático”. Tiene tres modos:',
    items: [
      {
        term: 'Modo Deriva',
        desc: 'La forma deriva suavemente y reacciona a los “beats” fuertes con giros aleatorios. Ideal para un fondo hipnótico y continuo. Ajusta “Velocidad Deriva” para acelerar o frenar.',
      },
      {
        term: 'Modo Armónico',
        desc: 'Traduce las notas musicales a geometrías (triángulo, cuadrado, hexágono…) según los intervalos respecto a la nota raíz. El color sigue el círculo de quintas.',
      },
      {
        term: 'Modo Génesis Geométrico',
        desc: 'Recorre las etapas de la “Génesis” (Vacío, Vesica Piscis, Semilla, Huevo, Flor, Fruto, Cubo de Metatrón) según la energía del sonido, mostrando la geometría sagrada activa y su régimen.',
      },
      {
        term: 'Viscosidad',
        desc: 'Controla la suavidad de las transiciones automáticas. Valores bajos = cambios rápidos y nerviosos (agua); valores altos = movimiento lento y fluido (miel).',
      },
      {
        term: 'Resonancia Automática (Génesis)',
        desc: 'Cuando está activa, la app gestiona inteligentemente todos los parámetros de la geometría sagrada (complejidad, escala, opacidad, flujo) sincronizados con el audio. Desactívala para ajustarlos a mano.',
      },
      {
        term: 'Indicadores',
        desc: 'En la esquina superior derecha verás el estado del micrófono y el modo automático activo. Puedes ocultarlos en Interfaz → “Mostrar Indicadores”.',
      },
    ],
  },
  {
    id: 'basic',
    title: 'Configuración Básica (Parámetros)',
    icon: <SlidersHorizontal className="w-5 h-5" />,
    accent: 'text-cyan-300',
    intro:
      'El panel de control reúne todos los parámetros. Aparece al mover el ratón o tocar la pantalla y se oculta solo tras unos segundos de inactividad. Estos son los controles principales:',
    items: [
      { term: 'Reactividad · Sensibilidad', desc: 'Cuánto amplifica la app la señal del micrófono. Súbela si el sonido es bajo o el visualizador apenas se mueve.' },
      { term: 'Reactividad · Espectro Freq', desc: 'Qué porción del espectro se analiza. Valores bajos se centran en los graves; valores altos incluyen agudos.' },
      { term: 'Reactividad · Persistencia', desc: 'El “rastro” o estela de los fotogramas anteriores. Alta persistencia deja trazos largos y luminosos; baja limpia la pantalla más rápido.' },
      { term: 'Geometría Base · Factor K (Expansión)', desc: 'El factor de crecimiento de la espiral fractal. Cerca de 1.0 mantiene la forma estable y a pantalla completa. (Lo gestiona el Piloto Automático cuando está activo.)' },
      { term: 'Geometría Base · Detalle (Iteraciones)', desc: 'Número de iteraciones por fotograma. Más iteraciones = más detalle y densidad, pero más carga para el dispositivo.' },
      { term: 'Geometría Base · Profundidad (Zoom)', desc: 'Escala visual de la forma: acerca o aleja el patrón.' },
      { term: 'Transformación · Ángulo ψ', desc: 'El ángulo de giro base de la recurrencia. Por defecto usa el ángulo áureo. (Automático con el Piloto activo.)' },
      { term: 'Transformación · Desplazamiento X / Y', desc: 'Mueve el centro de la espiral horizontal y verticalmente. Usa “CENTRAR” para volver al origen.' },
      { term: 'Cromatismo · Color Armónico', desc: 'Sincroniza el color con la frecuencia del sonido. Al activarlo aparecen “Sensibilidad Color” y “Profundidad Color”.' },
      { term: 'Cromatismo · Tono Base / Velocidad Ciclo', desc: 'Con Color Armónico desactivado, fijas un tono inicial (0–360°) y la velocidad a la que cicla el color por sí solo.' },
      { term: 'Cromatismo · Rango Gradiente', desc: 'La amplitud del degradado de color que recorre la forma.' },
      { term: 'Cromatismo · Saturación / Brillo Base', desc: 'Intensidad del color y luminosidad mínima de la imagen.' },
    ],
  },
  {
    id: 'sacred',
    title: 'Geometría Sagrada (Génesis)',
    icon: <Maximize className="w-5 h-5" />,
    accent: 'text-emerald-300',
    intro:
      'Disponible en el modo Génesis del Piloto Automático. Combina estilos de resonancia para construir capas de geometría viva.',
    items: [
      { term: 'Estilos de Resonancia', desc: 'Activa uno o varios: Espiral Áurea, Flor de la Vida, Onda Cuántica y Toroide. Se superponen para crear composiciones complejas.' },
      { term: 'Modo de Dibujo', desc: '“Capas Infinitas” dibuja planos superpuestos; “Nodos en Espiral” emana puntos a lo largo de una espiral.' },
      { term: 'Ajustes Independientes', desc: 'Con la Resonancia Automática desactivada puedes editar por estilo: complejidad, distancia de conexión, escala, opacidad de líneas y fondo, grosor, velocidad de flujo y reactividad al audio.' },
    ],
  },
  {
    id: 'arvr',
    title: 'Realidad Virtual y AR',
    icon: <Glasses className="w-5 h-5" />,
    accent: 'text-purple-300',
    intro:
      'Lleva el visualizador a 3D o superponlo sobre el mundo real con la cámara.',
    items: [
      { term: 'Modo VR 3D', desc: 'Activa una escena tridimensional con profundidad. Úsalo con gafas o para una experiencia inmersiva en pantalla.' },
      { term: 'Modo AR (Cámara)', desc: 'Usa la cámara del dispositivo como fondo y proyecta la geometría encima. Pedirá permiso de cámara.' },
      { term: 'Filtros AR', desc: 'Estilos visuales para el modo AR: Psicodélico, Noir, Neón, Glitch, Sueño e Hipnótico. Ajusta su fuerza con “Intensidad Filtro”.' },
      { term: 'Profundidad, Radio, Grosor, Desplazamiento', desc: 'Controlan la forma del “portal” 3D: su profundidad en Z, el radio del túnel, el grosor de las líneas y el desplazamiento de la cámara.' },
      { term: 'Rotación Manual / Pantalla Dividida / Portal Infinito', desc: 'Gira la escena con el dedo/ratón, divide la imagen para visores estéreo o activa un portal simétrico que parece infinito.' },
    ],
  },
  {
    id: 'interface',
    title: 'Interfaz y Atajos',
    icon: <RotateCw className="w-5 h-5" />,
    accent: 'text-yellow-300',
    intro: 'Pequeños detalles para una experiencia más cómoda.',
    items: [
      { term: 'Mostrar / ocultar el panel', desc: 'El panel aparece al mover el ratón o tocar la pantalla, y se oculta tras unos segundos de inactividad para no estorbar la visualización.' },
      { term: 'Pantalla Completa', desc: 'Botón “Pantalla Completa” en el panel (o la versión de escritorio) para una experiencia sin distracciones.' },
      { term: 'Mostrar Indicadores', desc: 'Activa o desactiva los indicadores de estado (micrófono y modo automático) de la esquina.' },
      { term: 'Suscripción', desc: 'El botón con la corona abre los planes: Gratis vía StarSeed OS, Código, StarSeed y Premium. Si entras desde StarSeed OS, el plan Gratis se activa automáticamente.' },
    ],
  },
];

// Strip accents/diacritics so search matches with or without tildes.
const DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g');
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(DIACRITICS, '');

const SystemGuide: React.FC<SystemGuideProps> = ({ open, onClose }) => {
  const [query, setQuery] = useState('');
  const [activeSection, setActiveSection] = useState<string>('audio');

  const filtered = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return SECTIONS;
    return SECTIONS.map((sec) => {
      const sectionMatches = norm(sec.title).includes(q) || norm(sec.intro).includes(q);
      const items = sec.items.filter(
        (it) => norm(it.term).includes(q) || norm(it.desc).includes(q)
      );
      if (sectionMatches || items.length > 0) {
        return { ...sec, items: sectionMatches && items.length === 0 ? sec.items : items };
      }
      return null;
    }).filter(Boolean) as GuideSection[];
  }, [query]);

  if (!open) return null;

  const isSearching = query.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-300"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Guía completa del sistema"
    >
      <style>{`
        .guide-scroll::-webkit-scrollbar { width: 8px; }
        .guide-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); border-radius: 8px; }
        .guide-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.25); border-radius: 8px; }
      `}</style>

      <div
        className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-[32px] border border-white/15 bg-[rgba(15,15,25,0.6)] backdrop-blur-2xl shadow-[0_30px_80px_rgba(0,0,0,0.6),inset_0_1px_2px_rgba(255,255,255,0.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 sm:px-8 py-5 border-b border-white/10 flex justify-between items-center bg-white/5 rounded-t-[32px]">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3 text-cyan-200">
              <HelpCircle className="w-7 h-7 text-cyan-300 drop-shadow-[0_0_10px_rgba(0,242,254,0.7)]" />
              Guía completa
            </h2>
            <p className="text-sm text-cyan-100/70 mt-1 font-medium tracking-wide">
              Audio · Ajustes automáticos · Configuración básica
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

        {/* Search */}
        <div className="px-6 sm:px-8 pt-5">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar en la guía (ej: micrófono, viscosidad, color)…"
              className="w-full bg-black/50 border border-white/10 text-gray-200 text-sm rounded-xl pl-11 pr-4 py-3 outline-none focus:border-cyan-400 transition-all placeholder:text-gray-500"
            />
          </div>
        </div>

        {/* Section chips (hidden while searching) */}
        {!isSearching && (
          <div className="px-6 sm:px-8 pt-4 flex flex-wrap gap-2">
            {SECTIONS.map((sec) => (
              <button
                key={sec.id}
                onClick={() => {
                  setActiveSection(sec.id);
                  const el = document.getElementById(`guide-sec-${sec.id}`);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  activeSection === sec.id
                    ? 'bg-white/10 border-white/25 text-white'
                    : 'bg-black/20 border-white/10 text-gray-400 hover:text-gray-200 hover:border-white/20'
                }`}
              >
                <span className={sec.accent}>{sec.icon}</span>
                {sec.title.split(' (')[0]}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="p-6 sm:p-8 overflow-y-auto guide-scroll flex-1 space-y-8">
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Search className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No se encontraron resultados para “{query}”.</p>
            </div>
          )}

          {filtered.map((sec) => (
            <section key={sec.id} id={`guide-sec-${sec.id}`} className="scroll-mt-4">
              <h3 className={`text-lg font-bold flex items-center gap-2 mb-2 ${sec.accent}`}>
                {sec.icon}
                {sec.title}
              </h3>
              <p className="text-sm text-gray-400 mb-4 leading-relaxed">{sec.intro}</p>
              <div className="space-y-3">
                {sec.items.map((it, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-2xl bg-black/30 border border-white/10 hover:border-white/20 transition-colors"
                  >
                    <p className="text-sm font-semibold text-gray-100 mb-1">{it.term}</p>
                    <p className="text-xs text-gray-400 leading-relaxed">{it.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SystemGuide;
