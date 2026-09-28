import { jaccard } from "../logic/texto";
import type { Card, EntradaIndice } from "../types";

export function montarIndice(cards: Card[]): EntradaIndice[] {
  const validos = cards.filter((c) => !c.incerto && !c.inutil && c.pagina > 0 && c.trecho);
  const grupos: Card[][] = [];
  const usado = new Set<string>();

  const ordenados = [...validos].sort((a, b) => a.pagina - b.pagina || a.conceito.localeCompare(b.conceito));
  for (const card of ordenados) {
    if (usado.has(card.id)) continue;
    const grupo = [card];
    usado.add(card.id);
    for (const outro of ordenados) {
      if (usado.has(outro.id)) continue;
      if (
        jaccard(card.conceito, outro.conceito) >= 0.45 ||
        card.conceito.toLowerCase() === outro.conceito.toLowerCase()
      ) {
        grupo.push(outro);
        usado.add(outro.id);
      }
    }
    grupos.push(grupo);
  }

  return grupos.map((grupo, i) => {
    const pagina = Math.min(...grupo.map((c) => c.pagina));
    const titulo = grupo[0].conceito;
    return {
      id: `i${i + 1}`,
      titulo,
      pagina,
      cardIds: grupo.map((c) => c.id),
    };
  });
}
