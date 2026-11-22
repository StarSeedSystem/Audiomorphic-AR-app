export type EcosystemCategory = 'nucleo' | 'creacion' | 'red' | 'utilidades';

export interface StarSeedEcosystemApp {
  id: string;
  name: string;
  tagline: string;
  badge: string;
  category: EcosystemCategory;
  iconSrc: string;
  accent: string;
  summary: string;
  highlights: string[];
  connection: string;
  url: string;
  isCurrentApp?: boolean;
}

export const STARSEED_OS_URL = 'https://starseed-os.vercel.app';

export const STARSEED_ECOSYSTEM_APPS: StarSeedEcosystemApp[] = [
  {
    id: 'starseed-os',
    name: 'StarSeed OS',
    tagline: 'Tu Sistema Operativo Soberano',
    badge: 'Núcleo OS · 100% Integrado',
    category: 'nucleo',
    iconSrc: './starseed/starseed-simbolo-3d.webp',
    accent: '#22D3EE',
    summary:
      'Escritorio cuántico personalizable con ventanas vivas, cerebros de memoria compartida, neuronas interconectadas, Dock dinámico e identidad unificada.',
    highlights: [
      'Cerebros y Folders compartidos en tiempo real',
      'Malla de dispositivos (Neuronas) sincronizados',
      'Tema vivo reactivo Omnifrecuencias & Audiomorphic',
    ],
    connection:
      'Audiomorphic corre de forma nativa dentro del OS como área visual y sincroniza directamente sus presets en tus Cerebros.',
    url: STARSEED_OS_URL,
  },
  {
    id: 'omnifrecuencias',
    name: 'Omnifrecuencias Holográficas',
    tagline: 'Estudio de Frecuencias Funcionales & Bioacústica',
    badge: 'App Hermana · Sinestesia Sonora',
    category: 'creacion',
    iconSrc: './starseed/app-icons/omnifrecuencias.png',
    accent: '#D946EF',
    summary:
      'Sintetizador cristalino multi-tono, pulsos binaurales e isocrónicos, Solfeggio, resonancia Schumann y campos armónicos con interfaz viva reactiva.',
    highlights: [
      'Síntesis binaural, isocrónica y Solfeggio de precisión',
      'Estética iridiscente reactiva al espectro cromático',
      'Sincroniza frecuencias con el visualizador AR en vivo',
    ],
    connection:
      'Inspira la estética viva cromática y enlaza directamente con los modos armónicos y geometrías sagradas de Audiomorphic.',
    url: 'https://omnifrecuencias.vercel.app',
  },
  {
    id: 'starseed-nexus',
    name: 'StarSeed Nexus',
    tagline: 'Portal Tridimensional del Ecosistema',
    badge: 'Portal 3D · Explorador Vivo',
    category: 'nucleo',
    iconSrc: './starseed/app-icons/nexus.png',
    accent: '#39FF14',
    summary:
      'Navega la arquitectura viviente del ecosistema en WebGL 3D interactivo: las 6 áreas fundacionales conectadas bajo una sola identidad soberana.',
    highlights: [
      'Mapa 3D orgánico de áreas y portales',
      'Transición unificada con tu sesión StarSeed',
      'Puerta de entrada para nuevos viajeros y creadores',
    ],
    connection:
      'Conecta directamente tu cuenta con Audiomorphic y enlaza tus experiencias visuales al portal central.',
    url: 'https://starseed-nexus.vercel.app',
  },
  {
    id: 'audiomorphic',
    name: 'Audiomorphic AR',
    tagline: 'Visualizador Matemático Sinestésico + VR/AR',
    badge: 'App Actual · Autónoma Offline',
    category: 'creacion',
    iconSrc: './starseed/app-icons/audiomorphic.png',
    accent: '#A855F7',
    summary:
      'Convierte cualquier fuente de sonido en fractales complejos, Flor de la Vida, Cubo de Metatrón y portales inmersivos 3D/VR/AR en tiempo real.',
    highlights: [
      '100% operativa offline y multiplataforma (Web, Mac, Win, Linux, Android)',
      'Seguimiento 3D/VR, manos libres y modos Deriva/Génesis',
      'Guarda presets por Cerebro y Folder sincronizados',
    ],
    connection:
      'Estás aquí: motor visual principal de sinestesia sonora del ecosistema StarSeed.',
    url: 'https://audiomorphic.vercel.app',
    isCurrentApp: true,
  },
  {
    id: 'starseed-cafe',
    name: 'StarSeed Café',
    tagline: 'Encuentro Físico, Cultura & Economía Viva',
    badge: 'Comunidad & Granos',
    category: 'red',
    iconSrc: './starseed/app-icons/cafe.png',
    accent: '#F59E0B',
    summary:
      'La capa presencial y social del movimiento: menú vivo, Alquimista 3D, economía de Granos & Semillas y eventos culturales colaborativos.',
    highlights: [
      'Economía regenerativa de Granos y Semillas',
      'Eventos de arte, música y conciencia en vivo',
      'Misma identidad StarSeed sin registros adicionales',
    ],
    connection:
      'Comparte tu cuenta, insignias de apoyo y visuales ambientales proyectables en comunidad.',
    url: 'https://starseed-nexus.vercel.app/cafe/',
  },
  {
    id: 'astraura',
    name: 'Astraura · Exocórtex IA',
    tagline: 'Inteligencia Personal Soberana (BitNet 1.58-bit)',
    badge: 'IA Personal · Lealtad al Usuario',
    category: 'nucleo',
    iconSrc: './starseed/app-icons/agent.png',
    accent: '#6366F1',
    summary:
      'Tu asistente y enjambre de agentes con memoria estructurada por Cerebros, personalidades y privacidad total bajo control del usuario.',
    highlights: [
      'Memoria compartida en Cerebros de StarSeed OS',
      'Ejecución local/híbrida 1.58-bit de alta eficiencia',
      'Asistencia creativa sobre parámetros y presets',
    ],
    connection:
      'Comparte el mismo almacén de Cerebros (`brain_memory_files`) para leer y organizar tus colecciones.',
    url: `${STARSEED_OS_URL}/agent`,
  },
  {
    id: 'red-starseed',
    name: 'Red StarSeed',
    tagline: 'Topología Social, Cultura y Colaboración',
    badge: 'Comunidad & Malla P2P',
    category: 'red',
    iconSrc: './starseed/app-icons/network.png',
    accent: '#10B981',
    summary:
      'Red social descentralizada y mapa vivo de neuronas: espacios de Cultura, Educación, Política y transmisión comunitaria sin algoritmos opacos.',
    highlights: [
      'Topología en tiempo real de nodos y neuronas',
      'Espacios temáticos abiertos y soberanos',
      'Sin rastreo ni publicidad invasiva',
    ],
    connection:
      'Publica y descubre visualizaciones y sesiones compartidas por otros creadores de la comunidad.',
    url: `${STARSEED_OS_URL}/network`,
  },
  {
    id: 'biblioteca',
    name: 'Biblioteca StarSeed',
    tagline: 'Archivo Vivo de Apps, Presets y Conocimiento',
    badge: 'Archivo & Instaladores',
    category: 'utilidades',
    iconSrc: './starseed/app-icons/library.png',
    accent: '#FBBF24',
    summary:
      'Centro unificado para instalar apps nativas, resguardar archivos en Cerebros y acceder a tratados y documentación del ecosistema.',
    highlights: [
      'Gestión de instalaciones en tus Neuronas',
      'Organización jerárquica por Folders y Cerebros',
      'Respaldo portátil en formato abierto JSON',
    ],
    connection:
      'Indexa tus colecciones e instaladores nativos de Audiomorphic para cada plataforma.',
    url: `${STARSEED_OS_URL}/library`,
  },
  {
    id: 'mensajes',
    name: 'Mensajes (Uplink Neural)',
    tagline: 'Comunicación Directa entre Neuronas',
    badge: 'Chat & Colaboración',
    category: 'red',
    iconSrc: './starseed/app-icons/messages.png',
    accent: '#38BDF8',
    summary:
      'Canal directo y cifrado entre miembros del ecosistema para coordinar sesiones audiovisuales, compartir presets y colaborar en vivo.',
    highlights: [
      'Envío instantáneo con identidad @handle',
      'Presencia en tiempo real entre dispositivos',
      'Integrado en el menú rápido del OS',
    ],
    connection:
      'Comparte enlaces a tus presets comunitarios de Audiomorphic en un toque.',
    url: `${STARSEED_OS_URL}/messages`,
  },
  {
    id: 'radio',
    name: 'Radio & Estaciones en Vivo',
    tagline: 'Transmisiones Libres de Audio, Música y XR',
    badge: 'Streaming en Vivo',
    category: 'creacion',
    iconSrc: './starseed/app-icons/radio.png',
    accent: '#FB923C',
    summary:
      'Directorio abierto de estaciones de audio, sets en directo y emisoras de la malla con estudio de producción integrado.',
    highlights: [
      'Captura directa con el analizador de Audiomorphic',
      'Emisiones de audio, video y salas XR',
      'Calidad adaptativa sin intermediarios',
    ],
    connection:
      'Alimenta en tiempo real las geometrías de Audiomorphic al sintonizar cualquier estación.',
    url: `${STARSEED_OS_URL}/estaciones?tipo=audio`,
  },
  {
    id: 'musica',
    name: 'Música StarSeed',
    tagline: 'Reproductor, Listas y Producción Sonora',
    badge: 'Audio & Catálogo',
    category: 'creacion',
    iconSrc: './starseed/app-icons/musica.png',
    accent: '#F472B6',
    summary:
      'Espacio musical del ecosistema para organizar pistas, álbumes comunitarios y experiencias listas para acompañar visualización sinestésica.',
    highlights: [
      'Recomendaciones musicales vinculadas a presets',
      'Curaduría colaborativa por estados armónicos',
      'Control unificado desde el OS',
    ],
    connection:
      'Complementa la sección de Música Recomendada dentro de cada preset de Audiomorphic.',
    url: `${STARSEED_OS_URL}/estaciones`,
  },
  {
    id: 'clima',
    name: 'Clima & Atmósfera',
    tagline: 'Telemetría Terrestre, Solar y Espacial',
    badge: 'Telemetría Viva',
    category: 'utilidades',
    iconSrc: './starseed/app-icons/clima.png',
    accent: '#38BDF8',
    summary:
      'Monitor atmosférico y geomagnético del entorno planetario y actividad solar con visualización dinámica reactiva.',
    highlights: [
      'Datos ambientales y climáticos en vivo',
      'Estética cristalina sincronizada con el OS',
      'Ideal para sesiones contemplativas y ambientales',
    ],
    connection:
      'Comparte lenguaje visual atmosférico y cromático con los fondos generativos del sistema.',
    url: `${STARSEED_OS_URL}/atmosphere`,
  },
];
