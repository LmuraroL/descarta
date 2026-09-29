import { temDadoDeConteudo } from "../guardrails";
import { parsePalavrasChave } from "./extracao";
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
import type { Afirmacao, Card, Perfil, SaidaEstruturada, Secao } from "../types";

const MAX_CARDS_BLOCO = 4;

export function flashcardsDaSecao(afirmacoes: Afirmacao[], secao: Secao): Card[] {
  if (secao.tipo === "palavra_chave") return cardsPalavraChave(afirmacoes, secao);
  if (secao.tipo === "exercicio") return cardsExercicio(afirmacoes, secao);
  return flashcardsDeAfirmacoes(afirmacoes, secao);
}

export function flashcardsDeAfirmacoes(afirmacoes: Afirmacao[], secao: Secao | string): Card[] {
  const bloco = typeof secao === "string" ? undefined : secao;
  const secaoId = typeof secao === "string" ? secao : secao.id;
  const ancora = bloco?.ancora?.trim() ?? "";

  const cards = afirmacoes
    .filter((a) => temTese(a.formulacao) && !pareceFragmento(a.formulacao))
    .map((a, i) => {
      const limpa = limparRelogioApostila(a.formulacao);
      const conceito = ancora || tituloDeConceito(limpa);
      const resposta = respostaDeEstudo(limpa, 480);
      const saida: SaidaEstruturada = {
        conceito,
        pergunta: ancora ? perguntaAncorada(limpa, ancora) : perguntaDe(limpa, conceito),
        resposta,
        pagina: a.paginas[0],
        trecho: respostaDeEstudo(a.trecho || limpa, 280),
        classe: a.classe,
        distancia: i === 0 ? 0 : 1,
      };
      return cardDeSaida(saida, secaoId, `${secaoId}-c${i + 1}`);
    })
    .filter((c) => temLogica(c));

  return limitarPorPergunta(cards).slice(0, MAX_CARDS_BLOCO);
}

export function cardDeSaida(s: SaidaEstruturada, secaoId: string, id: string): Card {
  const resposta = respostaDeEstudo(s.resposta, 480);
  return {
    id,
    conceito: s.conceito.trim(),
    pergunta: s.pergunta.trim(),
    resposta,
    pagina: s.pagina,
    paginas: [s.pagina],
    trecho: respostaDeEstudo(s.trecho || resposta, 280),
    classe: s.classe,
    secaoId,
    distancia: s.distancia ?? 0,
  };
}

function cardsPalavraChave(afirmacoes: Afirmacao[], secao: Secao): Card[] {
  const defs = parsePalavrasChave(secao.texto);
  const fonte = defs.length
    ? defs.map((d, i) => ({
        termo: d.termo || secao.ancora,
        definicao: d.definicao,
        pagina: secao.paginaInicio,
        i,
      }))
    : afirmacoes.map((a, i) => {
        const d = parsePalavrasChave(a.formulacao)[0];
        return {
          termo: d?.termo || tituloDeConceito(a.formulacao),
          definicao: d?.definicao || a.formulacao,
          pagina: a.paginas[0],
          i,
        };
      });

  return fonte
    .filter((d) => d.termo && d.definicao.length > 24)
    .map((d) =>
      cardDeSaida(
        {
          conceito: d.termo,
          pergunta: `O que é ${d.termo}?`,
          resposta: respostaDeEstudo(d.definicao, 480),
          pagina: d.pagina,
          trecho: respostaDeEstudo(d.definicao, 280),
          classe: "unico",
          distancia: 0,
        },
        secao.id,
        `${secao.id}-pc${d.i + 1}`,
      ),
    )
    .filter((c) => temLogica(c) || (conceitoNomeavel(c.conceito) && c.pergunta.endsWith("?")));
}

function cardsExercicio(afirmacoes: Afirmacao[], secao: Secao): Card[] {
  const a = afirmacoes[0];
  if (!a) return [];
  const ancora = secao.ancora?.trim() || "esta aula";
  const resposta = respostaDeEstudo(limparRelogioApostila(a.formulacao), 480);
  const card = cardDeSaida(
    {
      conceito: ancora,
      pergunta: `No tema «${ancora}», o que o exercício de fixação afirma?`,
      resposta,
      pagina: a.paginas[0],
      trecho: respostaDeEstudo(a.trecho || resposta, 280),
      classe: a.classe,
      distancia: 0,
    },
    secao.id,
    `${secao.id}-ex1`,
  );
  return temLogica(card) ? [card] : [];
}

export function perguntaAncorada(texto: string, ancora: string): string {
  const tema = ancora.replace(/\s+/g, " ").trim();
  if (/met[aá]fora/i.test(texto)) {
    return `No tema «${tema}», o que a metáfora explica?`;
  }
  if (/\bo que diferencia\b/i.test(texto)) {
    return `No tema «${tema}», o que diferencia as duas ideias?`;
  }
  if (temExcecao(texto)) return `No tema «${tema}», qual a exceção citada?`;
  if (temDadoDeConteudo(texto)) return `No tema «${tema}», qual dado o texto cita?`;
  if (temDefinicao(texto)) {
    const foco = tituloDeConceito(texto);
    if (foco && foco.length < 42 && !/^no tema\b/i.test(foco) && conceitoNomeavel(foco)) {
      return `No tema «${tema}», o que é ${foco}?`;
    }
    return `No tema «${tema}», o que o texto define?`;
  }
  if (temMecanismo(texto)) return `No tema «${tema}», qual o mecanismo descrito?`;
  return `No tema «${tema}», o que o texto afirma?`;
}

function perguntaDe(texto: string, conceito: string): string {
  if (temExcecao(texto)) return `Qual a exceção citada sobre ${conceito}?`;
  if (temDadoDeConteudo(texto)) return `Qual dado numérico o texto cita sobre ${conceito}?`;
  if (temDefinicao(texto)) return `O que é ${conceito}?`;
  if (temMecanismo(texto)) return `Qual o mecanismo de ${conceito}?`;
  return `O que o texto afirma sobre ${conceito}?`;
}

function limitarPorPergunta(cards: Card[]): Card[] {
  const vistos = new Set<string>();
  const out: Card[] = [];
  for (const c of cards) {
    const chave = c.pergunta.toLowerCase();
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    out.push(c);
  }
  return out;
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
