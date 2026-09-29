import { jaccard, normalizar, tokens } from "../logic/texto";
import type { Card } from "../types";

const PERGUNTA_OK = /^(O que|Qual|Quais|Como|Por que|No tema|Sobre)\b/;

const CONCEITO_NAO_E_TERMO =
  /\b(alerta importante|deste encerramento|neste cap[ií]tulo|nesta aula|o principal objetivo|conhe[cç]a o|veja as|um alerta|desta parte)\b/i;

export function conceitoNomeavel(conceito: string): boolean {
  const c = conceito.replace(/\s+/g, " ").trim();
  if (c.length < 3 || c.length > 92) return false;
  const palavras = c.split(" ").filter(Boolean);
  if (palavras.length < 1 || palavras.length > 16) return false;
  if (palavras.length === 1 && c.length < 3) return false;
  if (/^[a-záéíóúâêôãõç]/.test(c)) return false;
  if (/[.!?;:]/.test(c)) return false;
  if (CONCEITO_NAO_E_TERMO.test(c)) return false;
  if (/\b(após|apos|enquanto|quando|porque)\b/i.test(c) && palavras.length <= 4) return false;
  return true;
}

export function perguntaNoTema(pergunta: string): boolean {
  return /^No tema\s+«/.test(pergunta.replace(/\s+/g, " ").trim());
}

export function perguntaBemFormada(pergunta: string, conceito: string): boolean {
  const p = pergunta.replace(/\s+/g, " ").trim();
  if (!p.endsWith("?")) return false;
  if (p.length < 14 || p.length > 220) return false;
  if (!PERGUNTA_OK.test(p)) return false;
  if (/[,;:]\s*\?$/.test(p)) return false;
  if (!conceitoNomeavel(conceito)) return false;
  if (p.toLowerCase().includes(conceito.toLowerCase()) === false) return false;
  return true;
}

export function textoColado(texto: string): boolean {
  const t = texto.replace(/\s+/g, " ").trim();
  if (/[a-záéíóúãõâêôç]{5,}[A-ZÁÉÍÓÚ][a-záéíóú]{2,}/.test(t)) return true;
  if (/\bde e \b/i.test(t)) return true;
  if (/\bnas é\b/i.test(t)) return true;
  const copulas = t.match(/\bé\b/gi) ?? [];
  if (copulas.length >= 4) return true;
  return false;
}

export function respostaRespondePergunta(pergunta: string, conceito: string, resposta: string): boolean {
  if (textoColado(resposta)) return false;
  const corpo = resposta.replace(/\s+/g, " ").trim();
  if (perguntaNoTema(pergunta)) return corpo.length >= 40;
  if (normalizar(pergunta).startsWith("o que e")) return corpo.length >= 24;
  const c = tokens(conceito);
  const r = tokens(resposta);
  if (!c.size || !r.size) return false;
  let inter = 0;
  for (const w of c) if (r.has(w)) inter += 1;
  if (inter < 1) return false;
  if (jaccard(conceito, resposta) < 0.04 && inter < 2) return false;
  return true;
}

export function temLogica(card: Pick<Card, "conceito" | "pergunta" | "resposta">): boolean {
  if (!conceitoNomeavel(card.conceito)) return false;
  if (!perguntaBemFormada(card.pergunta, card.conceito)) return false;
  if (!respostaRespondePergunta(card.pergunta, card.conceito, card.resposta)) return false;
  return true;
}
