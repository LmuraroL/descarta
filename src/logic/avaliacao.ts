import { jaccard, normalizar } from "./texto";
import type { Card, ConceitoAusente, RelatorioAvaliacao } from "../types";
import type { ConceitoEsperado } from "../prova/rotulos";

export function avaliarEstudo(
  cards: Card[],
  esperados: ConceitoEsperado[],
  conceitosAusentes: ConceitoAusente[],
): RelatorioAvaliacao {
  const visiveis = cards.filter((c) => !c.inutil);
  const cardsSemPagina = visiveis.filter((c) => !c.pagina || c.pagina < 1).length;

  const repeticoesResiduais: RelatorioAvaliacao["repeticoesResiduais"] = [];
  for (let i = 0; i < visiveis.length; i++) {
    for (let j = i + 1; j < visiveis.length; j++) {
      const similaridade = jaccard(visiveis[i].resposta, visiveis[j].resposta);
      if (similaridade >= 0.62) {
        repeticoesResiduais.push({
          a: visiveis[i].conceito,
          b: visiveis[j].conceito,
          similaridade: Math.round(similaridade * 100) / 100,
        });
      }
    }
  }

  const blob = normalizar(
    visiveis.map((c) => `${c.conceito} ${c.pergunta} ${c.resposta}`).join(" "),
  );

  const conceitosUnicosEsperados = esperados.map((e) => ({
    chave: e.chave,
    rotulo: e.rotulo,
    presente: e.termos.some((t) => blob.includes(normalizar(t))),
  }));

  const unicosApagados = conceitosUnicosEsperados
    .filter((c) => !c.presente)
    .map((c) => c.rotulo);

  return {
    cardsSemPagina,
    repeticoesResiduais,
    cardsInuteisMarcados: cards.filter((c) => c.inutil).length,
    conceitosAusentesMarcados: conceitosAusentes.length,
    conceitosUnicosEsperados,
    unicosApagados,
  };
}

export function textoContem(hay: string, needle: string): boolean {
  return normalizar(hay).includes(normalizar(needle));
}
