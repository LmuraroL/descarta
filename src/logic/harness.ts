import { cardFazSentido, cardValido, motivoGuardrail, rejeitarSemOrigem } from "../guardrails";
import { temaDaSecao, temasPorAula, temasPorPagina } from "./capitulos";
import { textoDoPerfil } from "../perfil";
import { filtrarCardsComIa } from "./iaLivre";
import { julgarSecaoComModelo, statusModelo } from "./modelo";
import { deduplicar } from "../skills/deduplicacao";
import { dentroDoTema, distanciaDoTema, valeNoTema } from "../skills/distancia";
import { extrairTrechos } from "../skills/extracao";
import { cardDeSaida, evitarCardsInuteis, flashcardsDaSecao } from "../skills/flashcard";
import { montarIndice } from "../skills/indice";
import { ehLixo, identificarLixo } from "../skills/lixo";
import type {
  Card,
  Descartes,
  DistanciaTema,
  PaginaTexto,
  Perfil,
  ProgressoSecao,
  ResultadoEstudo,
  RuntimeModelo,
  Secao,
  TemaCapitulo,
  TrechoExtraido,
} from "../types";

export async function processarSecao(
  secao: Secao,
  paginas: PaginaTexto[],
  perfil: Perfil,
  tentarModelo: boolean,
  tema: TemaCapitulo,
): Promise<{ cards: Card[]; descartes: Descartes[]; incerto: boolean; usouModelo: boolean }> {
  const descartes: Descartes[] = [];
  const blocoDidatico =
    secao.tipo === "aula" ||
    secao.tipo === "case" ||
    secao.tipo === "palavra_chave" ||
    secao.tipo === "exercicio";
  const lixoSecao = blocoDidatico
    ? undefined
    : identificarLixo(`${secao.titulo} ${secao.texto.slice(0, 240)}`);
  if (lixoSecao) {
    descartes.push({
      classe: lixoSecao.classe,
      pagina: secao.paginaInicio,
      motivo: lixoSecao.motivo,
    });
    return { cards: [], descartes, incerto: false, usouModelo: false };
  }

  const brutos = extrairTrechos(secao, paginas);
  const trechos: TrechoExtraido[] = [];
  for (const t of brutos) {
    const lixo = identificarLixo(t.texto);
    if (lixo) {
      descartes.push({ classe: lixo.classe, pagina: t.pagina, motivo: lixo.motivo });
      continue;
    }
    const distancia = distanciaDoTema(t.texto, tema);
    if (!blocoDidatico && !valeNoTema(t.texto, tema)) {
      descartes.push({
        classe: "longe_do_tema",
        pagina: t.pagina,
        motivo: motivoGuardrail(distancia === 2 ? "longe_do_tema" : "nao_ensina"),
      });
      continue;
    }
    trechos.push(t);
  }

  const { afirmacoes, descartes: cortes } = deduplicar(trechos);
  descartes.push(...cortes);

  let cards: Card[] = [];
  let usouModelo = false;

  if (tentarModelo) {
    const julgados = await julgarSecaoComModelo(secao, trechos, textoDoPerfil(perfil), tema);
    if (julgados?.length) {
      const candidatos = julgados.map((s, i) => cardDeSaida(s, secao.id, `${secao.id}-m${i + 1}`));
      const validos = candidatos.filter(
        (c) => cardValido(c, secao) && cardFazSentido(c) && !ehLixo(`${c.pergunta} ${c.resposta}`),
      );
      if (validos.length) {
        cards = validos;
        usouModelo = true;
      }
    }
  }

  if (!cards.length) {
    cards = flashcardsDaSecao(afirmacoes, secao);
  }

  cards = rejeitarSemOrigem(cards)
    .filter((c) => !ehLixo(`${c.conceito} ${c.pergunta} ${c.resposta} ${c.trecho}`))
    .filter((c) => cardFazSentido(c))
    .map((c, i) => {
      if (blocoDidatico) {
        const distancia: DistanciaTema = i === 0 ? 0 : 1;
        return { ...c, distancia };
      }
      const distancia = distanciaDoTema(`${c.conceito} ${c.resposta}`, tema);
      return { ...c, distancia };
    })
    .filter((c) => blocoDidatico || (valeNoTema(`${c.conceito} ${c.resposta}`, tema) && dentroDoTema(c.distancia)))
    .map((c) => {
      if (!c.pagina || !c.trecho.trim()) return { ...c, incerto: true };
      return c;
    });
  cards = evitarCardsInuteis(cards, perfil);

  const incerto = cards.length > 0 && cards.every((c) => c.incerto);
  return { cards, descartes, incerto, usouModelo };
}

export async function processarDocumento(
  arquivo: string,
  paginas: PaginaTexto[],
  secoes: Secao[],
  perfil: Perfil,
  prova: boolean,
  onProgresso?: (secoes: ProgressoSecao[]) => void,
  chaveIa?: string,
): Promise<ResultadoEstudo> {
  const temasPagina = temasPorPagina(paginas);
  const temasAula = temasPorAula(secoes);
  const status = await statusModelo();
  let tentarModelo = status.ok;
  let runtime: RuntimeModelo = tentarModelo ? "ollama" : "skills_locais";

  const progresso: ProgressoSecao[] = secoes.map((s) => ({
    id: s.id,
    titulo: s.titulo,
    status: "fila",
  }));
  onProgresso?.(progresso);

  const cards: Card[] = [];
  const descartes: Descartes[] = [];
  let usouModelo = false;

  for (let i = 0; i < secoes.length; i++) {
    progresso[i] = { ...progresso[i], status: "processando" };
    onProgresso?.([...progresso]);

    const tema = temaDaSecao(secoes[i], temasAula, temasPagina);
    const r = await processarSecao(secoes[i], paginas, perfil, tentarModelo, tema);
    usouModelo = usouModelo || r.usouModelo;
    if (tentarModelo && !r.usouModelo) tentarModelo = false;
    cards.push(...r.cards);
    descartes.push(...r.descartes);
    progresso[i] = {
      ...progresso[i],
      status: r.incerto ? "incerto" : r.cards.length ? "ok" : "falha",
    };
    onProgresso?.([...progresso]);
  }

  if (!usouModelo) runtime = "skills_locais";

  let finais = cards;
  if (chaveIa?.trim()) {
    const ia = await filtrarCardsComIa(cards, chaveIa);
    if (ia.usou) {
      finais = ia.cards;
      if (ia.provedor) runtime = ia.provedor;
    }
  }

  return {
    arquivo,
    runtime,
    modelo: status.modelo,
    prova,
    secoes: progresso,
    cards: finais,
    indice: montarIndice(finais),
    descartes,
  };
}
