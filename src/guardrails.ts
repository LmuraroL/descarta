import {
  pareceFragmento,
  perguntaCopiaResposta,
  temDefinicao,
  temExcecao,
  temMecanismo,
  temNumero,
  temTese,
  trechoCabeNoTexto,
} from "./logic/texto";
import { identificarLixo } from "./skills/lixo";
import { temLogica } from "./skills/logica";
import type { Card, ClasseGuardrail, SaidaEstruturada, Secao } from "./types";

const MAX_TRECHO = 480;
const MAX_RESPOSTA = 520;

export function temDadoDeConteudo(texto: string): boolean {
  if (/\d+\s*%/.test(texto)) return true;
  if (/\d+[.,]\d+/.test(texto)) return true;
  if (/\bp\s*[><=]\s*n\b/i.test(texto)) return true;
  if (/\b\d+\s*(anos?|dias?|horas?|pessoas?|casos?|vezes|milh[oõ]es|mil)\b/i.test(texto)) {
    return true;
  }
  if (/\b(1[89]\d{2}|20\d{2})\b/.test(texto) && (temDefinicao(texto) || temMecanismo(texto))) {
    return true;
  }
  return false;
}

export function ensinaConteudo(texto: string): boolean {
  return temDefinicao(texto) || temMecanismo(texto) || temExcecao(texto) || temDadoDeConteudo(texto);
}

export function motivoGuardrail(classe: ClasseGuardrail): string {
  switch (classe) {
    case "bibliografia":
      return "Lista ou título de referências — norma de apostila, não matéria.";
    case "navegacao_apostila":
      return "Sumário ou índice — só organiza o arquivo.";
    case "rotulo_disciplina":
      return "Rótulo de disciplina/aula — não é dado de estudo.";
    case "capa_ementa":
      return "Capa, ementa ou ficha da disciplina.";
    case "instrucao_leitor":
      return "Instrução ao leitor (veja, consulte, clique), não um conceito.";
    case "biografia_autor":
      return "Biografia ou currículo do professor — não é o tema da aula.";
    case "mapa_apostila":
      return "Legenda da apostila (mapa, destaques, relógio da videoaula).";
    case "longe_do_tema":
      return "Longe do tema da aula — não interessa para card.";
    case "titulo_sem_afirmacao":
      return "Título sem afirmação que se estude.";
    case "nao_ensina":
      return "Não é definição, mecanismo, causa, exceção nem dado de estudo.";
    case "fragmento_sem_tese":
      return "Fragmento sem tese: não dá para estudar isto como card.";
    case "pergunta_copia_resposta":
      return "A pergunta só recorta a resposta — não há conceito.";
    case "sem_logica":
      return "Pergunta ou resposta sem lógica: não dá para estudar isto.";
    case "preambulo_historico":
      return "Preâmbulo histórico que não ensina o mecanismo.";
    case "exemplo_repetido":
      return "Exemplo que repete a afirmação sem caso, número ou exceção.";
    case "reformulacao":
      return "Reformulação da mesma frase.";
  }
}

export function validarSaida(s: Partial<SaidaEstruturada>, secao: Secao): string[] {
  const erros: string[] = [];
  if (!s.conceito?.trim()) erros.push("conceito vazio");
  if (!s.pergunta?.trim()) erros.push("pergunta vazia");
  if (!s.resposta?.trim()) erros.push("resposta vazia");
  if (!s.pagina || s.pagina < 1) erros.push("página ausente");
  if (!s.trecho?.trim()) erros.push("trecho de apoio ausente");
  if (s.classe !== "unico" && s.classe !== "repeticao_colapsada") {
    erros.push("classe inválida");
  }
  if (s.pagina && (s.pagina < secao.paginaInicio || s.pagina > secao.paginaFim)) {
    erros.push("página fora da seção");
  }
  if (s.trecho && !trechoCabeNoTexto(s.trecho, secao.texto)) {
    erros.push("trecho não está na seção");
  }
  if (s.resposta && inventouNumero(s.resposta, secao.texto)) {
    erros.push("número que não está na seção");
  }
  if (s.trecho && s.trecho.length > MAX_TRECHO) erros.push("trecho longo demais");
  if (s.resposta && s.resposta.length > MAX_RESPOSTA) erros.push("resposta longa demais");
  const blob = `${s.conceito ?? ""} ${s.pergunta ?? ""} ${s.resposta ?? ""} ${s.trecho ?? ""}`;
  const lixo = identificarLixo(blob);
  if (lixo) erros.push(lixo.classe);
  if (s.resposta && pareceFragmento(s.resposta)) erros.push("fragmento_sem_tese");
  if (s.conceito && /^[a-záéíóúâêôãõç]/.test(s.conceito.trim())) {
    erros.push("fragmento_sem_tese");
  }
  if (s.pergunta && s.resposta && perguntaCopiaResposta(s.pergunta, s.resposta)) {
    erros.push("pergunta_copia_resposta");
  }
  if (s.resposta && !ensinaConteudo(s.resposta) && !temTese(s.resposta)) {
    erros.push("nao_ensina");
  }
  if (
    s.conceito &&
    s.pergunta &&
    s.resposta &&
    !temLogica({ conceito: s.conceito, pergunta: s.pergunta, resposta: s.resposta })
  ) {
    erros.push("sem_logica");
  }
  return erros;
}

export function cardValido(card: Card, secao: Secao): boolean {
  return validarSaida(card, secao).length === 0;
}

function inventouNumero(resposta: string, secao: string): boolean {
  const nums = resposta.match(/\d+(?:[.,]\d+)?/g) ?? [];
  if (!nums.length) return false;
  const texto = secao.replace(/\s+/g, " ");
  return nums.some((n) => temNumero(n) && !texto.includes(n) && !texto.includes(n.replace(",", ".")));
}

export function rejeitarSemOrigem(cards: Card[]): Card[] {
  return cards.filter((c) => c.pagina > 0 && c.trecho.trim().length > 0);
}

export function cardFazSentido(card: Card): boolean {
  if (pareceFragmento(card.resposta)) return false;
  if (/^[a-záéíóúâêôãõç]/.test(card.conceito.trim())) return false;
  if (/[,;:]\s*\??$/.test(card.pergunta.trim())) return false;
  if (/,\s*$/.test(card.conceito.trim())) return false;
  if (/\b(após|apos|sem existir|depois de)\b/i.test(card.conceito)) return false;
  if (perguntaCopiaResposta(card.pergunta, card.resposta)) return false;
  if (!temTese(card.resposta) && !ensinaConteudo(card.resposta)) return false;
  if (!temLogica(card)) return false;
  return true;
}
