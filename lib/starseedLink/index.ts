/**
 * StarSeed Link barrel for Audiomorphic + Omnifrecuencias real-time stations,
 * common NTP clock, cryptographic signatures/encryption, OS postMessage bridge,
 * and offline SSL1 P2P pairing.
 */

export * from './config';
export * from './supabase';
export * from './puente-os';
export {
  RelojComun,
  estimarDesfase,
  muestraNtp,
  programarSondeo,
  type EstadoReloj,
  type EstimacionReloj,
  type MuestraReloj,
  type ModoReloj,
  type PingReloj,
  type PongReloj,
} from './reloj';
export {
  entonacionDesdeOsciladores,
  osciladoresDesdeEntonacion,
  visualDesdeParametros,
  parametrosDesdeVisual,
  enlaceDeSesion,
  leerEnlaceSesion,
  posicionEn,
  valoresOscilador,
  inicioEnFase,
  sanearParametros,
  sanearFicha,
  esEnlaceEnVivo,
  FUENTES_TRANSMISION,
  PREFIJO_VIVO,
  SUFIJO_LISTA,
  type EntonacionParam,
  type OsciladorApp,
  type OsciladorParam,
  type ParametrosSesion,
  type FichaSesion,
  type FaseSesion,
  type FuenteTransmision,
  type ValorVisual,
  type AccionLinea,
  type PosicionSesion,
  type ValoresOscilador,
} from './modelo';
export {
  crearLlaves,
  idDeLlave,
  crearToken,
  temaPublico,
  temaPrivado,
  cifrar,
  descifrar,
  firmar,
  verificar,
} from './cripto';
export { SesionEnVivo, type CanalEstacion, type FotoSesion, type TipoCanal } from './sesion';
export { canalInternet, canalDeEnlaceLocal, engancharEnlacesLocales } from './canales';
export {
  iniciarEmparejamiento,
  responderEmparejamiento,
  enlacesLocales,
  alCambiarEnlacesLocales,
  registrarEnlaceLocal,
  soportaEmparejado,
  MOTIVO_SIN_RED,
  MOTIVO_NO_ALCANZA,
  type EnlaceLocal,
  type Emparejamiento,
  type EstadoEmparejado,
  type ParLocal,
} from './emparejar';

import * as estacionMod from './estacion';
import { RelojComun, type OpcionesReloj } from './reloj';

export const estacion = {
  publicar: estacionMod.publicar,
  seguir: estacionMod.seguir,
  retomar: estacionMod.retomar,
  directorio: estacionMod.directorio,
  directorioApps: estacionMod.directorioApps,
  misEstaciones: estacionMod.misEstaciones,
};

export type {
  EstacionViva,
  FotoEstacion,
  DatosPublicar,
  OpcionesEstacion,
  FilaDirectorio,
  AccionEstacion,
} from './estacion';

export function relojComun(op: OpcionesReloj = {}): RelojComun {
  return new RelojComun(op);
}

export function motivoDe(r: { ok: boolean }): string | null {
  if (r.ok) return null;
  const m = (r as { motivo?: unknown }).motivo;
  return typeof m === 'string' && m ? m : 'No se pudo.';
}
