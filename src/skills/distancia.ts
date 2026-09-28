import { devePreservar, tokens } from "../logic/texto";
import type { DistanciaTema, TemaCapitulo } from "../types";

export const DISTANCIA_MAXIMA = 1;

export function distanciaDoTema(texto: string, tema: TemaCapitulo): DistanciaTema {
  const nucleo = new Set(tema.nucleo?.length ? tema.nucleo : tema.tokens);
  const expandido = new Set(tema.tokens);
  const t = tokens(texto);

  if (!t.size) return 2;

  let interNucleo = 0;
  let inter = 0;
  for (const w of t) {
    if (expandido.has(w)) inter += 1;
    if (nucleo.has(w)) interNucleo += 1;
  }

  if (!nucleo.size) {
    return devePreservar(texto) ? 1 : 2;
  }

  if (interNucleo >= 2) return 0;
  if (interNucleo >= 1 && (devePreservar(texto) || inter >= 2)) return 0;
  if (inter >= 2) return 1;
  if (interNucleo >= 1 && devePreservar(texto)) return 1;
  return 2;
}

export function dentroDoTema(distancia: DistanciaTema): boolean {
  return distancia <= DISTANCIA_MAXIMA;
}

export function valeNoTema(texto: string, tema: TemaCapitulo): boolean {
  const d = distanciaDoTema(texto, tema);
  if (d === 2) return false;
  if (d === 1 && !devePreservar(texto)) return false;
  return true;
}
