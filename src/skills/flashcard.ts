import { temDadoDeConteudo } from "../guardrails";
import {
  limparRelogioApostila,
  pareceFragmento,
  respostaDeEstudo,
  temDefinicao,
  temExcecao,
  temMecanismo,
  temTese,
  tituloDeConceito,
} from "../logic/texto";
import { conceitoNomeavel, temLogica } from "./logica";
import type { Afirmacao, Card, Perfil, SaidaEstruturada } from "../types";

export function flashcardsDeAfirmacoes(
  afirmacoes: Afirmacao[],
  secaoId: string,
): Card[] {
  return afirmacoes
    .filter((a) => temTese(a.formulacao) && !pareceFragmento(a.formulacao))
    .map((a, i) => {
      const limpa = limparRelogioApostila(a.formulacao);
      const conceito = tituloDeConceito(limpa);
      const resposta = respostaDeEstudo(limpa, 420);
      const saida: SaidaEstruturada = {
        conceito,
        pergunta: perguntaDe(limpa, conceito),
        resposta,
        pagina: a.paginas[0],
        trecho: respostaDeEstudo(a.trecho || limpa, 220),
        classe: a.classe,
        distancia: 0,
      };
      return cardDeSaida(saida, secaoId, `${secaoId}-c${i + 1}`);
    })
    .filter((c) => conceitoNomeavel(c.conceito) && temLogica(c));
}

export function cardDeSaida(s: SaidaEstruturada, secaoId: string, id: string): Card {
  const resposta = respostaDeEstudo(s.resposta, 420);
  return {
    id,
    conceito: s.conceito.trim(),
    pergunta: s.pergunta.trim(),
    resposta,
    pagina: s.pagina,
    paginas: [s.pagina],
    trecho: respostaDeEstudo(s.trecho || resposta, 220),
    classe: s.classe,
    secaoId,
    distancia: s.distancia ?? 0,
  };
}

function perguntaDe(texto: string, conceito: string): string {
  if (temExcecao(texto)) return `Qual a exceção citada sobre ${conceito}?`;
  if (temDadoDeConteudo(texto)) return `Qual dado numérico o texto cita sobre ${conceito}?`;
  if (temDefinicao(texto)) return `O que é ${conceito}?`;
  if (temMecanismo(texto)) return `Qual o mecanismo de ${conceito}?`;
  return `O que o texto afirma sobre ${conceito}?`;
}

export function evitarCardsInuteis(cards: Card[], perfil: Perfil): Card[] {
  if (!perfil.cardsInuteis.length) return cards;
  return cards.filter((c) => {
    return !perfil.cardsInuteis.some((m) => {
      const q = m.pergunta.toLowerCase();
      return (
        c.pergunta.toLowerCase().includes(q.slice(0, 40)) ||
        c.conceito.toLowerCase() === m.conceito.toLowerCase()
      );
    });
  });
}
