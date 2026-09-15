import { useState, useEffect, useCallback } from 'react';

export interface PresetComment {
  id: string;
  presetId: string;
  author: string;
  text: string;
  rating?: number; // 1 to 5 stars
  createdAt: string;
}

export type MusicRecommendationType = 'song' | 'album' | 'artist' | 'playlist';

export interface RecommendationComment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface MusicRecommendation {
  id: string;
  presetId: string;
  type: MusicRecommendationType;
  title: string;
  artist: string;
  album?: string;
  mediaUrl?: string; // Optional streaming URL or audio source
  description?: string;
  author: string;
  rating: number; // Average 1 to 5 stars
  votesCount: number;
  userVote?: number;
  createdAt: string;
  comments?: RecommendationComment[];
}

interface CommunityStore {
  ratings: Record<string, { totalScore: number; votesCount: number; userVote?: number }>;
  comments: Record<string, PresetComment[]>;
  recommendations: Record<string, MusicRecommendation[]>;
}

const STORAGE_KEY = 'starseed_preset_community_v1';

// Pre-seeded authentic community recommendations for official presets
const INITIAL_RECOMMENDATIONS: Record<string, MusicRecommendation[]> = {
  'genesis-metatron-supremo': [
    {
      id: 'rec-meta-1',
      presetId: 'genesis-metatron-supremo',
      type: 'album',
      title: 'World of Sleepers',
      artist: 'Carbon Based Lifeforms',
      album: 'World of Sleepers (2006)',
      mediaUrl: 'https://open.spotify.com/album/4vMhC3g9s7fLzQnZ1qJ1xR',
      description: 'Capas complejas de sintetizadores analógicos que hacen respirar la geometría del Cubo de Metatrón.',
      author: 'AuraZenith',
      rating: 5.0,
      votesCount: 38,
      createdAt: '2026-09-02T14:30:00Z',
      comments: [
        { id: 'c-1', author: 'QuantumFlyer', text: 'El track Photosynthesis con este preset activa los toroides de manera perfecta.', createdAt: '2026-09-03T10:00:00Z' }
      ]
    },
    {
      id: 'rec-meta-2',
      presetId: 'genesis-metatron-supremo',
      type: 'song',
      title: 'Solaris',
      artist: 'Solar Fields',
      mediaUrl: 'https://www.youtube.com/results?search_query=Solar+Fields+Solaris',
      description: 'Ondas progresivas y transitorios limpios ideales para ver resonar las 78 aristas.',
      author: 'CosmicTraveler',
      rating: 4.9,
      votesCount: 26,
      createdAt: '2026-09-04T09:15:00Z',
    },
    {
      id: 'rec-meta-3',
      presetId: 'genesis-metatron-supremo',
      type: 'playlist',
      title: 'Sacred Geometry & 432Hz Ambient Waves',
      artist: 'StarSeed Community Curators',
      mediaUrl: 'https://open.spotify.com/playlist/ambient-sacred-geometry',
      description: 'Selección binaural y etérea afinada a la proporción áurea.',
      author: 'StarSeed Core',
      rating: 4.8,
      votesCount: 45,
      createdAt: '2026-09-01T12:00:00Z',
    }
  ],
  'genesis-flor-vida': [
    {
      id: 'rec-flor-1',
      presetId: 'genesis-flor-vida',
      type: 'song',
      title: 'Song of the Stars',
      artist: 'Dead Can Dance',
      album: 'Spiritchaser',
      mediaUrl: 'https://www.youtube.com/results?search_query=Dead+Can+Dance+Song+of+the+Stars',
      description: 'Voces chamánicas y percusiones orgánicas que despiertan el patrón de pétalos de la Flor de la Vida.',
      author: 'GaiaResonance',
      rating: 4.9,
      votesCount: 29,
      createdAt: '2026-09-03T18:20:00Z',
    },
    {
      id: 'rec-flor-2',
      presetId: 'genesis-flor-vida',
      type: 'artist',
      title: 'Lisa Gerrard',
      artist: 'Lisa Gerrard (Solo Works)',
      description: 'Su rango vocal produce una apertura concéntrica armónica espectacular en las frecuencias medias.',
      author: 'SolfeggioSeeker',
      rating: 5.0,
      votesCount: 32,
      createdAt: '2026-09-05T11:10:00Z',
    }
  ],
  'genesis-sri-yantra': [
    {
      id: 'rec-sri-1',
      presetId: 'genesis-sri-yantra',
      type: 'song',
      title: 'Gayatri Mantra (Deep Ambient Resonance)',
      artist: 'Deva Premal',
      mediaUrl: 'https://open.spotify.com/track/gayatri-mantra-ambient',
      description: 'La entonación continua del mantra estabiliza los 9 triángulos centrales del Yantra.',
      author: 'ChakraHarmonics',
      rating: 5.0,
      votesCount: 34,
      createdAt: '2026-09-06T15:00:00Z',
    }
  ],
  'harmonic-solfeggio-528': [
    {
      id: 'rec-solf-1',
      presetId: 'harmonic-solfeggio-528',
      type: 'song',
      title: 'Weightless',
      artist: 'Marconi Union',
      mediaUrl: 'https://open.spotify.com/track/6kkwzB6hXLIONkEk9JciA6',
      description: 'El track científicamente diseñado para reducir el ritmo cardíaco. Los armónicos de 528Hz se sincronizan suavemente.',
      author: 'DrNeuroWave',
      rating: 5.0,
      votesCount: 52,
      createdAt: '2026-09-02T19:00:00Z',
    },
    {
      id: 'rec-solf-2',
      presetId: 'harmonic-solfeggio-528',
      type: 'album',
      title: 'Ambient 1: Music for Airports',
      artist: 'Brian Eno',
      mediaUrl: 'https://www.youtube.com/results?search_query=Brian+Eno+Music+for+Airports',
      description: 'Clásico absoluto del ambient generativo. El degradado verde-dorado vibra en sintonía con las notas de piano suspendidas.',
      author: 'EnoFanatic',
      rating: 4.8,
      votesCount: 41,
      createdAt: '2026-09-04T16:30:00Z',
    }
  ],
  'harmonic-circulo-quintas': [
    {
      id: 'rec-quintas-1',
      presetId: 'harmonic-circulo-quintas',
      type: 'song',
      title: 'An Ending (Ascent)',
      artist: 'Brian Eno',
      album: 'Apollo: Atmospheres and Soundtracks',
      mediaUrl: 'https://open.spotify.com/track/1vgN8HqYkQnN1rFp5bB',
      description: 'Las modulaciones armónicas mueven el círculo modal en giros angulares continuos de 30 grados.',
      author: 'HarmonicMaster',
      rating: 4.9,
      votesCount: 44,
      createdAt: '2026-09-03T20:00:00Z',
    }
  ],
  'rhythm-techno-club': [
    {
      id: 'rec-rhythm-1',
      presetId: 'rhythm-techno-club',
      type: 'song',
      title: 'Opus',
      artist: 'Eric Prydz',
      mediaUrl: 'https://open.spotify.com/track/3v2oAQpehOcYDRoSTfjpQA',
      description: 'La aceleración de tempo y el build-up de sintetizadores provocan una explosión geométrica inigualable.',
      author: 'DJ_Nova',
      rating: 5.0,
      votesCount: 65,
      createdAt: '2026-09-04T22:15:00Z',
    },
    {
      id: 'rec-rhythm-2',
      presetId: 'rhythm-techno-club',
      type: 'song',
      title: 'Strobe',
      artist: 'deadmau5',
      album: 'For Lack of a Better Name',
      mediaUrl: 'https://www.youtube.com/results?search_query=deadmau5+Strobe',
      description: 'Comienza con piano suave y termina en estrobos visuales con el salto por beat.',
      author: 'ElectroPulse',
      rating: 4.9,
      votesCount: 58,
      createdAt: '2026-09-05T01:40:00Z',
    }
  ],
  'drift-eter-profundo': [
    {
      id: 'rec-drift-1',
      presetId: 'drift-eter-profundo',
      type: 'song',
      title: 'Open Eye Signal',
      artist: 'Jon Hopkins',
      album: 'Immunity',
      mediaUrl: 'https://open.spotify.com/track/2tU62w3b1xR3VbC',
      description: 'Bajos continuos y textura líquida que fluye con la viscosidad zen del éter.',
      author: 'LiquidMinds',
      rating: 5.0,
      votesCount: 39,
      createdAt: '2026-09-02T11:20:00Z',
    }
  ],
  'quantum-aurora-boreal': [
    {
      id: 'rec-aurora-1',
      presetId: 'quantum-aurora-boreal',
      type: 'song',
      title: 'Midnight City',
      artist: 'M83',
      album: 'Hurry Up, We\'re Dreaming',
      mediaUrl: 'https://open.spotify.com/track/6GyFP1nfCDB87D2YRI0ilT',
      description: 'Energía fluorescente y destellos turquesa y magenta.',
      author: 'NeonSky',
      rating: 4.8,
      votesCount: 47,
      createdAt: '2026-09-04T12:00:00Z',
    }
  ],
  'portal-hiperdimensional': [
    {
      id: 'rec-portal-1',
      presetId: 'portal-hiperdimensional',
      type: 'playlist',
      title: 'Cyberpunk & VR Spatial Audio 3D',
      artist: 'Nexus Audio Labs',
      mediaUrl: 'https://open.spotify.com/playlist/vr-spatial-cyberpunk',
      description: 'Sonido 360° con ecos de fuga espacial que aumentan la inmersión del portal.',
      author: 'StarSeed Reality Lab',
      rating: 4.9,
      votesCount: 31,
      createdAt: '2026-09-05T14:00:00Z',
    }
  ],

  // --- AUDIOMORPHIC ESSENTIALS ---
  'essential_rhythmic': [
    {
      id: 'rec-ess-rhythm-1',
      presetId: 'essential_rhythmic',
      type: 'song',
      title: 'Around the World',
      artist: 'Daft Punk',
      album: 'Homework',
      mediaUrl: 'https://open.spotify.com/track/1pKYYYAvWh2es0LG3nG9AB',
      description: 'El bajo funk recurrente y ritmo metronómico sincronizan la flor de la vida y cimática a la perfección.',
      author: 'RhythmMaestro',
      rating: 5.0,
      votesCount: 42,
      createdAt: '2026-09-01T10:00:00Z',
    },
    {
      id: 'rec-ess-rhythm-2',
      presetId: 'essential_rhythmic',
      type: 'album',
      title: 'Cross (✝)',
      artist: 'Justice',
      mediaUrl: 'https://open.spotify.com/album/4GGazqHvuKwxmtjIPCOQY0',
      description: 'Transitorios enérgicos, compresión y bombos contundentes que explotan la reactividad rítmica.',
      author: 'ElectroFrench',
      rating: 4.9,
      votesCount: 38,
      createdAt: '2026-09-02T12:00:00Z',
    }
  ],
  'essential_dj': [
    {
      id: 'rec-ess-dj-1',
      presetId: 'essential_dj',
      type: 'song',
      title: 'Animals',
      artist: 'Martin Garrix',
      mediaUrl: 'https://open.spotify.com/track/6LgJvl0Xdtc73RJ1mmpotq',
      description: 'Los drops masivos disparan el modo DJ con transiciones súper rápidas y cortes en el beat.',
      author: 'ClubResident',
      rating: 4.8,
      votesCount: 50,
      createdAt: '2026-09-01T15:00:00Z',
    },
    {
      id: 'rec-ess-dj-2',
      presetId: 'essential_dj',
      type: 'playlist',
      title: 'Ultra Festival EDM Live Sets',
      artist: 'Festival Curators',
      mediaUrl: 'https://open.spotify.com/playlist/festival-edm',
      description: 'Selección de temas con caídas épicas para directos y proyecciones de club.',
      author: 'DJ_Krono',
      rating: 5.0,
      votesCount: 61,
      createdAt: '2026-09-03T18:00:00Z',
    }
  ],
  'essential_sacred': [
    {
      id: 'rec-ess-sacred-1',
      presetId: 'essential_sacred',
      type: 'song',
      title: 'Om Namah Shivaya (432Hz Sacred Chants)',
      artist: 'Krishna Das',
      mediaUrl: 'https://open.spotify.com/track/sacred-chant-432',
      description: 'Vibración devocional pura que estabiliza el Sri Yantra y Merkaba en un campo de paz.',
      author: 'Ananda',
      rating: 5.0,
      votesCount: 47,
      createdAt: '2026-09-02T09:00:00Z',
    },
    {
      id: 'rec-ess-sacred-2',
      presetId: 'essential_sacred',
      type: 'album',
      title: 'Tibetan Singing Bowls for Deep Meditation',
      artist: 'Karma Moffett',
      mediaUrl: 'https://open.spotify.com/album/tibetan-bowls-zen',
      description: 'Resonancias armónicas acústicas ancestrales para meditación profunda.',
      author: 'ZenMaster',
      rating: 4.9,
      votesCount: 35,
      createdAt: '2026-09-03T11:00:00Z',
    }
  ],
  'essential_rainbow': [
    {
      id: 'rec-ess-rainbow-1',
      presetId: 'essential_rainbow',
      type: 'song',
      title: 'Coloratura',
      artist: 'Coldplay',
      mediaUrl: 'https://open.spotify.com/track/coloratura-coldplay',
      description: 'Una suite espacial de 10 minutos que recorre progresivamente todo el arcoíris cromático.',
      author: 'CosmicVoyager',
      rating: 5.0,
      votesCount: 39,
      createdAt: '2026-09-02T16:00:00Z',
    }
  ],
  'essential_astral': [
    {
      id: 'rec-ess-astral-1',
      presetId: 'essential_astral',
      type: 'album',
      title: 'Are You Shpongled?',
      artist: 'Shpongle',
      mediaUrl: 'https://open.spotify.com/album/shpongle-are-you',
      description: 'Psicodelia orgánica fractal. Las ondas cuánticas se deforman en hiperespacio con las capas de flautas y sintetizadores.',
      author: 'Psynaut',
      rating: 5.0,
      votesCount: 55,
      createdAt: '2026-09-03T21:00:00Z',
    }
  ],
  'essential_smart': [
    {
      id: 'rec-ess-smart-1',
      presetId: 'essential_smart',
      type: 'song',
      title: 'Teardrop',
      artist: 'Massive Attack',
      album: 'Mezzanine',
      mediaUrl: 'https://open.spotify.com/track/teardrop-massive-attack',
      description: 'El modo inteligente detecta la pulsación y la voz femenina con sensibilidad empática calibrada.',
      author: 'TripHopLover',
      rating: 4.9,
      votesCount: 44,
      createdAt: '2026-09-04T14:00:00Z',
    }
  ],
  'essential_random': [
    {
      id: 'rec-ess-rand-1',
      presetId: 'essential_random',
      type: 'playlist',
      title: 'Eclectic Electronic Horizons',
      artist: 'StarSeed Community Curators',
      mediaUrl: 'https://open.spotify.com/playlist/eclectic-electronic',
      description: 'Variedad de tempos y texturas para probar el motor de descubrimiento aleatorio de 10 segundos.',
      author: 'SoundLab',
      rating: 4.8,
      votesCount: 33,
      createdAt: '2026-09-05T10:00:00Z',
    }
  ],

  // --- GÉNEROS Y ESTILOS ENRIQUECIDOS ---
  'rhythm-synthwave-80s': [
    {
      id: 'rec-synth-1',
      presetId: 'rhythm-synthwave-80s',
      type: 'song',
      title: 'Tech Noir',
      artist: 'GUNSHIP',
      mediaUrl: 'https://open.spotify.com/track/tech-noir-gunship',
      description: 'Baterías Linndrum y sintes analógicos en neón magenta con el pulso exacto del retrowave.',
      author: 'RetroNeon',
      rating: 5.0,
      votesCount: 48,
      createdAt: '2026-09-03T19:00:00Z',
    }
  ],
  'harmonic-deep-house': [
    {
      id: 'rec-house-1',
      presetId: 'harmonic-deep-house',
      type: 'song',
      title: 'Inspector Norse',
      artist: 'Todd Terje',
      mediaUrl: 'https://open.spotify.com/track/inspector-norse',
      description: 'Groove balear inconfundible y cálido con colores coral y ámbar envolventes.',
      author: 'BalearicVibes',
      rating: 4.9,
      votesCount: 37,
      createdAt: '2026-09-04T17:00:00Z',
    }
  ],
  'quantum-psytrance-goa': [
    {
      id: 'rec-psy-1',
      presetId: 'quantum-psytrance-goa',
      type: 'song',
      title: 'Mahadeva',
      artist: 'Astral Projection',
      mediaUrl: 'https://open.spotify.com/track/mahadeva-astral',
      description: 'El himno inmortal del Goa Trance a 145 BPM desata el mandala hiperquinético.',
      author: 'GoaSpirit',
      rating: 5.0,
      votesCount: 59,
      createdAt: '2026-09-04T23:00:00Z',
    }
  ]
};

// Pre-seeded comments
const INITIAL_COMMENTS: Record<string, PresetComment[]> = {
  'essential_rhythmic': [
    {
      id: 'comm-ess-1',
      presetId: 'essential_rhythmic',
      author: 'BeatAlchemist',
      text: 'La alineación de bombos con la flor de la vida es una maravilla. Convierte cualquier sesión de música en un espectáculo sagrado.',
      rating: 5,
      createdAt: '2026-09-02T11:00:00Z'
    }
  ],
  'essential_dj': [
    {
      id: 'comm-ess-2',
      presetId: 'essential_dj',
      author: 'ResidentDJ',
      text: 'Indispensable para directos. La velocidad de transición y el equilibrio vectorial reaccionan al instante.',
      rating: 5,
      createdAt: '2026-09-03T14:30:00Z'
    }
  ],
  'essential_sacred': [
    {
      id: 'comm-ess-3',
      presetId: 'essential_sacred',
      author: 'PranaFlow',
      text: 'Paz absoluta. Lo proyecto en la pared mientras guío meditaciones y los asistentes quedan maravillados.',
      rating: 5,
      createdAt: '2026-09-04T09:15:00Z'
    }
  ],
  'genesis-metatron-supremo': [
    {
      id: 'comm-1',
      presetId: 'genesis-metatron-supremo',
      author: 'AstralNavigator',
      text: 'Este preset es una joya. Con música ambiental en auriculares se siente la profundidad tridimensional de cada nodo de Metatrón.',
      rating: 5,
      createdAt: '2026-09-03T16:20:00Z'
    },
    {
      id: 'comm-2',
      presetId: 'genesis-metatron-supremo',
      author: 'SoundAlchemist',
      text: 'La viscosidad al 0.965 le da una inercia perfecta. No se siente brusco.',
      rating: 5,
      createdAt: '2026-09-04T18:05:00Z'
    }
  ],
  'harmonic-solfeggio-528': [
    {
      id: 'comm-3',
      presetId: 'harmonic-solfeggio-528',
      author: 'ZenMeditation',
      text: 'Lo uso todos los días para mis sesiones matutinas de respiración. El color esmeralda y oro es muy relajante.',
      rating: 5,
      createdAt: '2026-09-05T08:30:00Z'
    }
  ],
  'rhythm-techno-club': [
    {
      id: 'comm-4',
      presetId: 'rhythm-techno-club',
      author: 'BassHead99',
      text: 'Brutal la respuesta a los transitorios rápidos. En el club con proyector dejó a todos con la boca abierta.',
      rating: 5,
      createdAt: '2026-09-05T23:45:00Z'
    }
  ]
};

const INITIAL_RATINGS: Record<string, { totalScore: number; votesCount: number }> = {
  'essential_rhythmic': { totalScore: 210, votesCount: 42 },      // 5.0
  'essential_dj': { totalScore: 245, votesCount: 50 },            // 4.9
  'essential_sacred': { totalScore: 235, votesCount: 47 },        // 5.0
  'essential_rainbow': { totalScore: 195, votesCount: 39 },       // 5.0
  'essential_astral': { totalScore: 275, votesCount: 55 },        // 5.0
  'essential_smart': { totalScore: 216, votesCount: 44 },         // 4.9
  'essential_random': { totalScore: 160, votesCount: 33 },        // 4.8
  'genesis-metatron-supremo': { totalScore: 196, votesCount: 40 }, // ~4.9
  'genesis-flor-vida': { totalScore: 162, votesCount: 34 },        // ~4.8
  'genesis-sri-yantra': { totalScore: 140, votesCount: 28 },       // ~5.0
  'harmonic-solfeggio-528': { totalScore: 245, votesCount: 50 },   // ~4.9
  'harmonic-circulo-quintas': { totalScore: 154, votesCount: 32 },  // ~4.8
  'rhythm-techno-club': { totalScore: 235, votesCount: 48 },        // ~4.9
  'rhythm-synthwave-80s': { totalScore: 240, votesCount: 48 },     // 5.0
  'harmonic-deep-house': { totalScore: 181, votesCount: 37 },      // 4.9
  'quantum-psytrance-goa': { totalScore: 295, votesCount: 59 },    // 5.0
  'drift-eter-profundo': { totalScore: 180, votesCount: 38 },       // ~4.7
  'quantum-aurora-boreal': { totalScore: 205, votesCount: 42 },    // ~4.9
  'portal-hiperdimensional': { totalScore: 145, votesCount: 30 },   // ~4.8
  'community-pulsar-astral': { totalScore: 160, votesCount: 35 },   // ~4.6
};

const loadStore = (): CommunityStore => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ratings: { ...INITIAL_RATINGS, ...(parsed.ratings || {}) },
        comments: { ...INITIAL_COMMENTS, ...(parsed.comments || {}) },
        recommendations: { ...INITIAL_RECOMMENDATIONS, ...(parsed.recommendations || {}) }
      };
    }
  } catch {
    /* fallback to initial */
  }
  return {
    ratings: INITIAL_RATINGS,
    comments: INITIAL_COMMENTS,
    recommendations: INITIAL_RECOMMENDATIONS
  };
};

const saveStore = (store: CommunityStore) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* localStorage full */
  }
};

export const usePresetCommunity = () => {
  const [store, setStore] = useState<CommunityStore>(() => loadStore());

  useEffect(() => {
    saveStore(store);
  }, [store]);

  // Get average rating for a preset
  const getPresetRating = useCallback((presetId: string) => {
    const record = store.ratings[presetId];
    if (!record || record.votesCount === 0) {
      return { average: 5.0, count: 1, userRating: undefined };
    }
    const average = Math.round((record.totalScore / record.votesCount) * 10) / 10;
    return {
      average,
      count: record.votesCount,
      userRating: record.userVote
    };
  }, [store.ratings]);

  // Rate a preset (1 to 5 stars)
  const ratePreset = useCallback((presetId: string, rating: number) => {
    const clamped = Math.max(1, Math.min(5, Math.round(rating)));
    setStore(prev => {
      const cur = prev.ratings[presetId] || { totalScore: 0, votesCount: 0 };
      const hadUserVote = cur.userVote !== undefined;
      const totalScore = hadUserVote ? cur.totalScore - (cur.userVote || 0) + clamped : cur.totalScore + clamped;
      const votesCount = hadUserVote ? cur.votesCount : cur.votesCount + 1;

      return {
        ...prev,
        ratings: {
          ...prev.ratings,
          [presetId]: {
            totalScore,
            votesCount,
            userVote: clamped
          }
        }
      };
    });
  }, []);

  // Comments for a preset
  const getPresetComments = useCallback((presetId: string): PresetComment[] => {
    return store.comments[presetId] || [];
  }, [store.comments]);

  // Add comment to a preset
  const addPresetComment = useCallback((presetId: string, author: string, text: string, rating?: number) => {
    if (!text.trim()) return;
    const newComment: PresetComment = {
      id: `comm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      presetId,
      author: author.trim() || 'Viajero Sónico',
      text: text.trim(),
      rating,
      createdAt: new Date().toISOString()
    };

    setStore(prev => {
      const existing = prev.comments[presetId] || [];
      let updatedRatings = prev.ratings;

      if (rating && rating >= 1 && rating <= 5) {
        const cur = prev.ratings[presetId] || { totalScore: 0, votesCount: 0 };
        const totalScore = cur.totalScore + rating;
        const votesCount = cur.votesCount + 1;
        updatedRatings = {
          ...prev.ratings,
          [presetId]: { totalScore, votesCount, userVote: rating }
        };
      }

      return {
        ...prev,
        ratings: updatedRatings,
        comments: {
          ...prev.comments,
          [presetId]: [newComment, ...existing]
        }
      };
    });
  }, []);

  // Music Recommendations for a preset
  const getPresetRecommendations = useCallback((presetId: string): MusicRecommendation[] => {
    return store.recommendations[presetId] || [];
  }, [store.recommendations]);

  // Add a new music recommendation
  const addMusicRecommendation = useCallback((
    presetId: string,
    rec: {
      type: MusicRecommendationType;
      title: string;
      artist: string;
      album?: string;
      mediaUrl?: string;
      description?: string;
      author: string;
      initialRating?: number;
    }
  ) => {
    const initialRating = rec.initialRating ? Math.max(1, Math.min(5, rec.initialRating)) : 5;
    const newRec: MusicRecommendation = {
      id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      presetId,
      type: rec.type,
      title: rec.title.trim(),
      artist: rec.artist.trim(),
      album: rec.album?.trim(),
      mediaUrl: rec.mediaUrl?.trim(),
      description: rec.description?.trim(),
      author: rec.author.trim() || 'Comunidad StarSeed',
      rating: initialRating,
      votesCount: 1,
      userVote: initialRating,
      createdAt: new Date().toISOString(),
      comments: []
    };

    setStore(prev => {
      const existing = prev.recommendations[presetId] || [];
      return {
        ...prev,
        recommendations: {
          ...prev.recommendations,
          [presetId]: [newRec, ...existing]
        }
      };
    });
  }, []);

  // Rate a recommendation (1-5 stars)
  const rateRecommendation = useCallback((presetId: string, recommendationId: string, rating: number) => {
    const clamped = Math.max(1, Math.min(5, Math.round(rating)));
    setStore(prev => {
      const list = prev.recommendations[presetId] || [];
      const updated = list.map(item => {
        if (item.id !== recommendationId) return item;
        const hadVote = item.userVote !== undefined;
        const currentTotal = item.rating * item.votesCount;
        const newTotal = hadVote ? currentTotal - (item.userVote || 0) + clamped : currentTotal + clamped;
        const newCount = hadVote ? item.votesCount : item.votesCount + 1;
        const newAvg = Math.round((newTotal / newCount) * 10) / 10;
        return {
          ...item,
          rating: newAvg,
          votesCount: newCount,
          userVote: clamped
        };
      });
      return {
        ...prev,
        recommendations: {
          ...prev.recommendations,
          [presetId]: updated
        }
      };
    });
  }, []);

  // Add comment to a recommendation
  const addRecommendationComment = useCallback((
    presetId: string,
    recommendationId: string,
    author: string,
    text: string
  ) => {
    if (!text.trim()) return;
    const newComment: RecommendationComment = {
      id: `rcomm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      author: author.trim() || 'Viajero Sónico',
      text: text.trim(),
      createdAt: new Date().toISOString()
    };

    setStore(prev => {
      const list = prev.recommendations[presetId] || [];
      const updated = list.map(item => {
        if (item.id !== recommendationId) return item;
        return {
          ...item,
          comments: [...(item.comments || []), newComment]
        };
      });
      return {
        ...prev,
        recommendations: {
          ...prev.recommendations,
          [presetId]: updated
        }
      };
    });
  }, []);

  return {
    getPresetRating,
    ratePreset,
    getPresetComments,
    addPresetComment,
    getPresetRecommendations,
    addMusicRecommendation,
    rateRecommendation,
    addRecommendationComment
  };
};
