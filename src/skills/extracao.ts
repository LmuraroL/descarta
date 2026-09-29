import { ehCabecalhoEstrutural, pareceAncora, tipoDaMarca } from "../logic/secoes";
import { cortarTrecho, frasesComPagina, limparRelogioApostila, temTese } from "../logic/texto";
import type { PaginaTexto, Secao, TrechoExtraido } from "../types";

export function extrairTrechos(secao: Secao, paginas: PaginaTexto[]): TrechoExtraido[] {
  if (secao.tipo === "palavra_chave") return trechosPalavraChave(secao);
  if (secao.tipo === "exercicio") return trechosExercicio(secao);

  const corpo = corpoDaSecao(secao);
  if (!corpo.trim()) return [];

  const pagina = paginaDe(corpo, secao, paginas);
  const frases = frasesComPagina(limparRelogioApostila(corpo), pagina);
  if (!frases.length) return [];

  const passagem: string[] = [];
  for (const f of frases) {
    const junta = [...passagem, f.frase].join(" ");
    if (passagem.length && junta.length > 520) break;
    passagem.push(f.frase);
    if (passagem.length >= 2 && temTese(junta) && junta.length >= 140) break;
    if (passagem.length >= 3) break;
  }

  const lead = passagem.join(" ");
  const out: TrechoExtraido[] = [];
  if (lead.length > 48) {
    out.push({
      texto: lead,
      pagina,
      trecho: cortarTrecho(lead, 280),
    });
  }

  const ja = new Set(passagem);
  for (const f of frases) {
    if (ja.has(f.frase)) continue;
    out.push({
      texto: f.frase,
      pagina: f.pagina,
      trecho: cortarTrecho(f.frase, 240),
    });
  }
  return out;
}

export function parsePalavrasChave(texto: string): { termo: string; definicao: string }[] {
  const linhas = texto
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !tipoDaMarca(l) && !ehCabecalhoEstrutural(l));
  const blob = linhas.join(" ").replace(/\s+/g, " ").trim();
  const comDoisPontos = blob.match(/^(.{2,48}?):\s+(.+)$/);
  if (comDoisPontos) {
    return [{ termo: comDoisPontos[1].trim(), definicao: comDoisPontos[2].trim() }];
  }
  if (linhas.length >= 2 && linhas[0].length < 48 && !/[.!?]$/.test(linhas[0])) {
    return [
      {
        termo: linhas[0].replace(/:$/, "").trim(),
        definicao: linhas.slice(1).join(" ").replace(/\s+/g, " ").trim(),
      },
    ];
  }
  if (blob.length > 40) return [{ termo: "", definicao: blob }];
  return [];
}

function corpoDaSecao(secao: Secao): string {
  return secao.texto
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !ehCabecalhoEstrutural(l) && !pareceAncora(l))
    .join(" ");
}

function trechosPalavraChave(secao: Secao): TrechoExtraido[] {
  return parsePalavrasChave(secao.texto).map((d) => ({
    texto: d.termo ? `${d.termo}: ${d.definicao}` : d.definicao,
    pagina: secao.paginaInicio,
    trecho: cortarTrecho(d.definicao, 240),
  }));
}

function trechosExercicio(secao: Secao): TrechoExtraido[] {
  const corpo = secao.texto
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !tipoDaMarca(l) && !/^(verdadeiro|falso)$/i.test(l))
    .join(" ")
    .replace(/\b(Verdadeiro|Falso)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (corpo.length < 40) return [];
  return [
    {
      texto: corpo,
      pagina: secao.paginaInicio,
      trecho: cortarTrecho(corpo, 280),
    },
  ];
}

function paginaDe(texto: string, secao: Secao, paginas: PaginaTexto[]): number {
  const trecho = texto.slice(0, 48);
  for (const p of paginas) {
    if (p.pagina < secao.paginaInicio || p.pagina > secao.paginaFim) continue;
    if (trecho && p.texto.includes(trecho.slice(0, 32))) return p.pagina;
  }
  return secao.paginaInicio;
}
