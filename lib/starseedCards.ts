import { ThankYouCardRecord } from './starseedDb';

export type StarSeedEditionId =
  | 'pioneros'
  | 'solsticio'
  | 'red_neuronal'
  | 'metagenesis'
  | 'soberania';

export type StarSeedCardStatus = 'prototype' | 'ready' | 'concept';

export type StarSeedArea =
  | 'Fundación & Arquitectura'
  | 'Audio & Sinestesia'
  | 'Hardware & Neuronas'
  | 'IA & Consciencia'
  | 'Comunidad & Cultura';

export interface StarSeedCardDesign {
  designId: string;
  editionId: StarSeedEditionId;
  editionTitle: string;
  cardNumber: number;
  editionSize: number;
  title: string;
  subtitle: string;
  phase: string;
  area: StarSeedArea;
  status: StarSeedCardStatus;
  modelUrl?: string;
  previewImage?: string;
  environment4D: string;
  symbolicMotif: string;
  materialsSummary: string;
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    iridescenceNm: [number, number];
  };
  minContributionHint: string;
}

export interface EditionRuleSpec {
  editionId: StarSeedEditionId;
  name: string;
  triggerContext: string;
  developmentPhase: string;
  supplyCap: string;
  rarityTier: string;
  symbolicAnchor: string;
  ambient4DStyle: string;
}

/**
 * Serie 01 — Edición Fundacional Limitada: "Pioneros StarSeed" (12 diseños únicos).
 * Todos conservan fielmente el símbolo sagrado StarSeed:
 * - Dos círculos de la Vesica Piscis (Luz plata/blanco arriba · Materia negro/obsidiana abajo)
 * - Ojo central en la lente horizontal con pupila negra y destello blanco superior derecho
 * - Trinidad superior de la Luz (Rojo · Verde · Azul) y Trinidad inferior de la Materia (Rojo · Amarillo · Azul)
 */
export const PIONEROS_12_CATALOG: StarSeedCardDesign[] = [
  {
    designId: 'pioneros-01',
    editionId: 'pioneros',
    editionTitle: 'Pioneros StarSeed',
    cardNumber: 1,
    editionSize: 12,
    title: 'Tejedores del Micelio',
    subtitle: 'Edición Fundacional · Serie #001 / 012',
    phase: 'Fase I · Génesis del Micelio',
    area: 'Fundación & Arquitectura',
    status: 'ready',
    modelUrl: './cards/pioneros-01.glb',
    previewImage: './cards/previews/pioneros-01.webp',
    environment4D: 'Cámara abisal de Flor de la Vida áurea y esporas lumínicas en paralaje 4D',
    symbolicMotif: 'Lemniscata viva de micelio dorado acunando la Vesica Piscis con cuarzo y amatista en las esquinas',
    materialsSummary: 'Obsidiana volcánica, plata cepillada anisotrópica, latón patinado, titanio tornasol 510nm y prismas RGB/RYB',
    palette: { primary: '#22d3ee', secondary: '#a855f7', accent: '#f59e0b', iridescenceNm: [380, 620] },
    minContributionHint: 'Pioneros Fundacionales · Ed. Limitada 12 diseños',
  },
  {
    designId: 'pioneros-02',
    editionId: 'pioneros',
    editionTitle: 'Pioneros StarSeed',
    cardNumber: 2,
    editionSize: 12,
    title: 'Semilla de la Luz',
    subtitle: 'Edición Fundacional · Serie #002 / 012',
    phase: 'Fase I · Génesis del Micelio',
    area: 'Audio & Sinestesia',
    status: 'ready',
    modelUrl: './cards/pioneros-02.glb',
    previewImage: './cards/previews/pioneros-02.webp',
    environment4D: 'Cámara solar opalescente con 7 pétalos de la Semilla de la Vida y lanzas solares orbitales',
    symbolicMotif: 'Núcleo Vesica Piscis irradiando 7 círculos armónicos y 12 rayos dorados en órbita 4D',
    materialsSummary: 'Ópalo blanco lunar, obsidiana especular, oro champán 360nm, cristal solar y citrino',
    palette: { primary: '#fde047', secondary: '#38bdf8', accent: '#ffffff', iridescenceNm: [320, 540] },
    minContributionHint: 'Edición Pioneros · Serie Limitada',
  },
  {
    designId: 'pioneros-03',
    editionId: 'pioneros',
    editionTitle: 'Pioneros StarSeed',
    cardNumber: 3,
    editionSize: 12,
    title: 'Ojo de la Vesica',
    subtitle: 'Edición Fundacional · Serie #003 / 012',
    phase: 'Fase I · Génesis del Micelio',
    area: 'IA & Consciencia',
    status: 'ready',
    modelUrl: './cards/pioneros-03.glb',
    previewImage: './cards/previews/pioneros-03.webp',
    environment4D: 'Astrolabio óptico de anillos concéntricos con 24 trazos orbitales y pupila gravitacional',
    symbolicMotif: 'Bisel doble en bronce antiguo con circuitos cian grabados en la esfera de Materia',
    materialsSummary: 'Bronce patinado, zafiro tallado en facetas diamante, obsidiana e incrustación cian 440nm',
    palette: { primary: '#06b6d4', secondary: '#eab308', accent: '#38bdf8', iridescenceNm: [420, 650] },
    minContributionHint: 'Edición Pioneros · Serie Limitada',
  },
  {
    designId: 'pioneros-04',
    editionId: 'pioneros',
    editionTitle: 'Pioneros StarSeed',
    cardNumber: 4,
    editionSize: 12,
    title: 'Prisma de la Trinidad',
    subtitle: 'Edición Fundacional · Serie #004 / 012',
    phase: 'Fase I · Génesis del Micelio',
    area: 'Audio & Sinestesia',
    status: 'ready',
    modelUrl: './cards/pioneros-04.glb',
    previewImage: './cards/previews/pioneros-04.webp',
    environment4D: 'Doble hexagrama prismático con rayos espectrales RGB (Luz) y RYB (Materia) reactivos al sonido',
    symbolicMotif: 'Geometría estelar platino refractando haces coherentes al inclinar la tarjeta',
    materialsSummary: 'Platino cepillado, cristal óptico de alto IOR, titanio negro PVD e iridiscencia 540nm',
    palette: { primary: '#ef4444', secondary: '#22c55e', accent: '#3b82f6', iridescenceNm: [350, 680] },
    minContributionHint: 'Edición Pioneros · Serie Limitada',
  },
  {
    designId: 'pioneros-05',
    editionId: 'pioneros',
    editionTitle: 'Pioneros StarSeed',
    cardNumber: 5,
    editionSize: 12,
    title: 'Flor del Éter',
    subtitle: 'Edición Fundacional · Serie #005 / 012',
    phase: 'Fase I · Génesis del Micelio',
    area: 'Fundación & Arquitectura',
    status: 'ready',
    modelUrl: './cards/pioneros-05.glb',
    previewImage: './cards/previews/pioneros-05.webp',
    environment4D: 'Flor de la Vida escalonada en 3 planos de profundidad Z con nodos estelares orbitando',
    symbolicMotif: 'Estrella etérica de 19 círculos suspendida sobre cámara índigo-violeta multicapa',
    materialsSummary: 'Oro blanco luminoso, laca cósmica índigo, cuarzo rosa, piedra lunar e iridiscencia 560nm',
    palette: { primary: '#818cf8', secondary: '#f472b6', accent: '#fde68a', iridescenceNm: [400, 600] },
    minContributionHint: 'Edición Pioneros · Serie Limitada',
  },
  {
    designId: 'pioneros-06',
    editionId: 'pioneros',
    editionTitle: 'Pioneros StarSeed',
    cardNumber: 6,
    editionSize: 12,
    title: 'Cubo de Metatrón',
    subtitle: 'Edición Fundacional · Serie #006 / 012',
    phase: 'Fase I · Génesis del Micelio',
    area: 'Hardware & Neuronas',
    status: 'ready',
    modelUrl: './cards/pioneros-06.glb',
    previewImage: './cards/previews/pioneros-06.webp',
    environment4D: 'Matriz de 13 esferas del Fruto de la Vida enlazadas por todos los vectores del Cubo de Metatrón',
    symbolicMotif: 'Armazón geodésico CNC en latón dorado resguardando la Vesica Piscis tricolor',
    materialsSummary: 'Latón mecanizado CNC, grafito forjado, turquesa cristalina y película delgada 420nm',
    palette: { primary: '#f59e0b', secondary: '#14b8a6', accent: '#6366f1', iridescenceNm: [370, 590] },
    minContributionHint: 'Edición Pioneros · Serie Limitada',
  },
  {
    designId: 'pioneros-07',
    editionId: 'pioneros',
    editionTitle: 'Pioneros StarSeed',
    cardNumber: 7,
    editionSize: 12,
    title: 'Raíces Cuánticas',
    subtitle: 'Edición Fundacional · Serie #007 / 012',
    phase: 'Fase I · Génesis del Micelio',
    area: 'Hardware & Neuronas',
    status: 'ready',
    modelUrl: './cards/pioneros-07.glb',
    previewImage: './cards/previews/pioneros-07.webp',
    environment4D: 'Pulsos sinápticos verdes recorriendo raíces orgánicas y nodos bioluminiscentes en paralelo 4D',
    symbolicMotif: 'Marco orgánico en ébano y cobre nativo conectado a bulbos sinápticos vivos',
    materialsSummary: 'Ébano petrificado, cobre nativo, esmeralda cristalina y cuarzo ahumado 470nm',
    palette: { primary: '#10b981', secondary: '#d97706', accent: '#a855f7', iridescenceNm: [410, 610] },
    minContributionHint: 'Edición Pioneros · Serie Limitada',
  },
  {
    designId: 'pioneros-08',
    editionId: 'pioneros',
    editionTitle: 'Pioneros StarSeed',
    cardNumber: 8,
    editionSize: 12,
    title: 'Cristal de Amatista',
    subtitle: 'Edición Fundacional · Serie #008 / 012',
    phase: 'Fase I · Génesis del Micelio',
    area: 'Comunidad & Cultura',
    status: 'ready',
    modelUrl: './cards/pioneros-08.glb',
    previewImage: './cards/previews/pioneros-08.webp',
    environment4D: 'Geoda hexagonal ultravioleta con 12 agujas de amatista convergiendo hacia el centro 4D',
    symbolicMotif: 'Drusa cristalina ampliada de amatista y turmalina enmarcando la Vesica Piscis',
    materialsSummary: 'Amatista translúcida, plata esterlina oxidada, recubrimiento tornasol violeta 610nm',
    palette: { primary: '#c084fc', secondary: '#f43f5e', accent: '#22d3ee', iridescenceNm: [460, 700] },
    minContributionHint: 'Edición Pioneros · Serie Limitada',
  },
  {
    designId: 'pioneros-09',
    editionId: 'pioneros',
    editionTitle: 'Pioneros StarSeed',
    cardNumber: 9,
    editionSize: 12,
    title: 'Puerta de la Malla',
    subtitle: 'Edición Fundacional · Serie #009 / 012',
    phase: 'Fase I · Génesis del Micelio',
    area: 'Hardware & Neuronas',
    status: 'ready',
    modelUrl: './cards/pioneros-09.glb',
    previewImage: './cards/previews/pioneros-09.webp',
    environment4D: 'Vórtice toroidal de 12 anillos cruzados y constelación neuronal P2P proyectada al fondo 4D',
    symbolicMotif: 'Portal topológico en titanio azulado con red descentralizada de neuronas luminosas',
    materialsSummary: 'Titanio anodizado al azul fuego, fibra de carbono, zafiro y película 520nm',
    palette: { primary: '#38bdf8', secondary: '#818cf8', accent: '#34d399', iridescenceNm: [340, 560] },
    minContributionHint: 'Edición Pioneros · Serie Limitada',
  },
  {
    designId: 'pioneros-10',
    editionId: 'pioneros',
    editionTitle: 'Pioneros StarSeed',
    cardNumber: 10,
    editionSize: 12,
    title: 'Alquimista del Sonido',
    subtitle: 'Edición Fundacional · Serie #010 / 012',
    phase: 'Fase I · Génesis del Micelio',
    area: 'Audio & Sinestesia',
    status: 'ready',
    modelUrl: './cards/pioneros-10.glb',
    previewImage: './cards/previews/pioneros-10.webp',
    environment4D: 'Ondas estacionarias cimáticas de Chladni vibrando alrededor del Ojo y nodos armónicos',
    symbolicMotif: 'Anillos cimáticos resonadores en oro rosa cepillado reactivos al volumen y graves',
    materialsSummary: 'Oro rosa cepillado, laca acústica negra, ámbar citrino y rubí perlado 480nm',
    palette: { primary: '#fb7185', secondary: '#fbbf24', accent: '#2dd4bf', iridescenceNm: [390, 640] },
    minContributionHint: 'Edición Pioneros · Serie Limitada',
  },
  {
    designId: 'pioneros-11',
    editionId: 'pioneros',
    editionTitle: 'Pioneros StarSeed',
    cardNumber: 11,
    editionSize: 12,
    title: 'Corona de Neuronas',
    subtitle: 'Edición Fundacional · Serie #011 / 012',
    phase: 'Fase I · Génesis del Micelio',
    area: 'Comunidad & Cultura',
    status: 'ready',
    modelUrl: './cards/pioneros-11.glb',
    previewImage: './cards/previews/pioneros-11.webp',
    environment4D: 'Corona ceremonial de 12 nodos interconectados en órbita aurea inspirada en la medalla Pioneros',
    symbolicMotif: 'Anillo exterior de pilares y arcos sinápticos honrando la cadena humana del micelio',
    materialsSummary: 'Bronce ceremonial dorado, obsidiana satinada, zafiro cian y película 450nm',
    palette: { primary: '#eab308', secondary: '#06b6d4', accent: '#ec4899', iridescenceNm: [360, 580] },
    minContributionHint: 'Edición Pioneros · Serie Limitada',
  },
  {
    designId: 'pioneros-12',
    editionId: 'pioneros',
    editionTitle: 'Pioneros StarSeed',
    cardNumber: 12,
    editionSize: 12,
    title: 'Nexo Soberano',
    subtitle: 'Pieza Cúspide · Serie #012 / 012',
    phase: 'Fase I · Génesis del Micelio',
    area: 'Fundación & Arquitectura',
    status: 'ready',
    modelUrl: './cards/pioneros-12.glb',
    previewImage: './cards/previews/pioneros-12.webp',
    environment4D: 'Merkaba tridimensional giratoria rodeada por 12 estrellas zodiacales en platino iridiscente',
    symbolicMotif: 'Sello maestro Omega de la serie Pioneros con doble tetraedro y corona diamantina',
    materialsSummary: 'Platino iridiscente 590nm, obsidiana estelar, oro soberano, diamante y amatista real',
    palette: { primary: '#f8fafc', secondary: '#a855f7', accent: '#22d3ee', iridescenceNm: [300, 720] },
    minContributionHint: 'Pieza Cúspide · Edición Pioneros 12/12',
  },
];

/**
 * Arquitectura escalable para futuras ediciones temáticas según temporada,
 * fase de desarrollo, área de aporte y nivel/tipo de contribución.
 */
export const FUTURE_EDITIONS_FRAMEWORK: EditionRuleSpec[] = [
  {
    editionId: 'pioneros',
    name: 'Edición Fundacional · Pioneros StarSeed',
    triggerContext: 'Primeros mecenas y tejedores del ecosistema',
    developmentPhase: 'Fase I · Génesis & Autonomía Offline',
    supplyCap: '12 diseños únicos limitados',
    rarityTier: 'Reliquia Fundacional',
    symbolicAnchor: 'Micelio dorado, cuarzo y Flor de la Vida clásica',
    ambient4DStyle: 'Bosque cuántico abisal + cámara prismática viva',
  },
  {
    editionId: 'solsticio',
    name: 'Ediciones Estacionales · Solsticios y Equinoccios',
    triggerContext: 'Campañas temporales de estación solar/lunar',
    developmentPhase: 'Ciclos Estacionales Continuos',
    supplyCap: '4 a 8 diseños por estación (ventana temporal cerrada)',
    rarityTier: 'Edición Temporal Irrepetible',
    symbolicAnchor: 'Ejes astronómicos, auroras polares y geometría solar/lunar sobre la Vesica',
    ambient4DStyle: 'Cielos espectrales dependientes de la luz real captada por cámara',
  },
  {
    editionId: 'red_neuronal',
    name: 'Edición Red Neuronal & Cerebros',
    triggerContext: 'Aportes destinados a infraestructura P2P, Cerebros y Neuronas',
    developmentPhase: 'Fase II · Malla Distribuida',
    supplyCap: '9 diseños modulares según rol de nodo',
    rarityTier: 'Edición Arquitectónica',
    symbolicAnchor: 'Topologías de grafos vivos y sinapsis bioluminiscentes en la esfera de Materia',
    ambient4DStyle: 'Red tridimensional interactiva que reacciona a giroscopio y voz',
  },
  {
    editionId: 'metagenesis',
    name: 'Edición Metagénesis 3D & AR',
    triggerContext: 'Impulsores de herramientas creativas, Blender, WebXR y sinestesia',
    developmentPhase: 'Fase III · Creatividad Espacial',
    supplyCap: '6 diseños escultóricos de alta complejidad',
    rarityTier: 'Edición Maestra de Taller',
    symbolicAnchor: 'Poliedros platónicos anidados y refracción cromática en tiempo real',
    ambient4DStyle: 'Portales volumétricos 4D con profundidad de campo y estelas de partículas',
  },
  {
    editionId: 'soberania',
    name: 'Edición Soberanía Total',
    triggerContext: 'Contribuciones extraordinarias o patrocinio integral de área',
    developmentPhase: 'Fase IV · Ecosistema Autónomo Completo',
    supplyCap: '3 diseños por área · Numeración personalizada 1/1 en metadatos',
    rarityTier: 'Edición Única Personalizada',
    symbolicAnchor: 'Estela orbital personalizada del mecenas incrustada en el reverso 3D',
    ambient4DStyle: 'Escena multicapa completa reactiva a giroscopio, luz ambiente y espectro musical',
  },
];

export function computeCardFingerprint(seedText: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < seedText.length; i++) {
    const ch = seedText.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 = Math.imul(h2 ^ ch, 0x85ebca6b);
  }
  const partA = (h1 >>> 0).toString(16).toUpperCase().padStart(8, '0');
  const partB = (h2 >>> 0).toString(16).toUpperCase().padStart(6, '0').slice(0, 6);
  return `SS-PNR-${partA.slice(0, 4)}-${partB}`;
}

export function getDesignById(designId?: string | null): StarSeedCardDesign {
  if (designId) {
    const found = PIONEROS_12_CATALOG.find((d) => d.designId === designId);
    if (found) return found;
  }
  return PIONEROS_12_CATALOG[0];
}

export function resolveCardDesign(card: ThankYouCardRecord): {
  design: StarSeedCardDesign;
  serialLabel: string;
  fingerprint: string;
  portableModelUrl: string;
} {
  const design = getDesignById(card.designId);
  const cardNum = card.cardNumber || design.cardNumber;
  const editionSize = card.editionSize || design.editionSize;
  const serialLabel = `#${String(cardNum).padStart(3, '0')} / ${String(editionSize).padStart(3, '0')}`;
  const fingerprint =
    card.verificationHash ||
    computeCardFingerprint(`${card.id}|${card.donorName}|${card.tierId}|${design.designId}|${card.issuedAt}`);
  return {
    design,
    serialLabel,
    fingerprint,
    portableModelUrl: design.modelUrl || './cards/pioneros-01.glb',
  };
}
