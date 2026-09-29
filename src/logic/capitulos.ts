import { tokens } from "./texto";
import { MARCA_AULA, pareceTitulo } from "./secoes";
import type { PaginaTexto, Secao, TemaCapitulo } from "../types";

const LIXO_NO_TITULO =
  /\b(bibliografia|refer[eê]ncias|sum[aá]rio|[ií]ndice|ementa|disciplina\s*\d+|conhe[cç]a seus professores)\b/i;

const IGNORAR_TEMA = new Set([
  "capitulo", "unidade", "parte", "secao", "aula", "modulo",
  "disciplina", "apostila", "pdf", "pagina", "paginas", "mba", "curso",
  "bibliografia", "referencias", "sumario", "indice", "ementa",
  "neste", "nesta", "professor", "eduardo", "prange", "texto", "conteudo",
]);

export function numeroAula(titulo: string): number | undefined {
  const m = titulo.match(/AULA\s+(\d+)/i);
  return m ? Number(m[1]) : undefined;
}

export function temasPorPagina(paginas: PaginaTexto[]): Map<number, TemaCapitulo> {
  const mapa = new Map<number, TemaCapitulo>();
  let atual = temaInicial(paginas);

  for (const p of paginas) {
    const achado = acharTemaNaPagina(p);
    if (achado) atual = achado;
    mapa.set(p.pagina, atual);
  }

  return mapa;
}

export function temasPorAula(secoes: Secao[]): Map<number, TemaCapitulo> {
  const mapa = new Map<number, TemaCapitulo>();
  for (const s of secoes) {
    const n = numeroAula(s.titulo);
    if (n === undefined || mapa.has(n)) continue;
    mapa.set(n, montarTema(tituloDaAula(s.titulo), s.paginaInicio));
  }
  return mapa;
}

function temaInicial(paginas: PaginaTexto[]): TemaCapitulo {
  for (const p of paginas) {
    const achado = acharTemaNaPagina(p);
    if (achado && !LIXO_NO_TITULO.test(achado.titulo)) return achado;
  }
  for (const p of paginas) {
    for (const linha of p.texto.split("\n")) {
      const t = linha.trim();
      if (!pareceTitulo(t) || LIXO_NO_TITULO.test(t)) continue;
      if (/^páginas?\s+\d/i.test(t)) continue;
      return montarTema(t, p.pagina);
    }
  }
  const primeiro = paginas[0];
  return montarTema(primeiro?.texto.split("\n").find((l) => l.trim().length > 12) ?? "Conteúdo", primeiro?.pagina ?? 1);
}

function acharTemaNaPagina(p: PaginaTexto): TemaCapitulo | undefined {
  const linhas = p.texto.split("\n").map((l) => l.trim()).filter(Boolean);
  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    if (!MARCA_AULA.test(linha)) continue;
    const extra: string[] = [];
    for (let k = i + 1; k < i + 5 && k < linhas.length; k++) {
      const t = linhas[k];
      if (MARCA_AULA.test(t) || t.length > 68) break;
      if (/^(neste|nesta|o professor|a entrada|muitas|eduardo|leo)\b/i.test(t)) break;
      extra.push(t);
    }
    const titulo = extra.length ? extra.join(" ") : linha;
    return montarTema(tituloDaAula(`${linha} — ${titulo}`), p.pagina);
  }
  return undefined;
}

export function montarTema(titulo: string, pagina: number): TemaCapitulo {
  const limpo = titulo.replace(/\s+/g, " ").trim();
  const nucleo = tokensDoTitulo(limpo);
  return {
    titulo: limpo,
    pagina,
    nucleo,
    tokens: nucleo,
  };
}

function tokensDoTitulo(titulo: string): string[] {
  return [...tokens(titulo)].filter(
    (t) => t.length > 3 && !IGNORAR_TEMA.has(t) && !/^\d+$/.test(t),
  );
}

function tituloDaAula(titulo: string): string {
  const n = numeroAula(titulo);
  const nome = titulo.includes("—") ? titulo.slice(titulo.indexOf("—") + 1).trim() : titulo;
  const limpo = nome.replace(MARCA_AULA, "").replace(/^[•·\-\s]+/, "").trim() || titulo;
  return n !== undefined ? `Aula ${n} — ${limpo}` : limpo;
}

export function temaDaSecao(
  secao: Secao,
  temasAula: Map<number, TemaCapitulo>,
  temasPagina: Map<number, TemaCapitulo>,
): TemaCapitulo {
  const n = numeroAula(secao.titulo);
  const aula = n !== undefined ? temasAula.get(n) : undefined;
  const daPagina = temasPagina.get(secao.paginaInicio);
  const base = aula ?? daPagina ?? montarTema(secao.titulo, secao.paginaInicio);
  const nomeParte = secao.titulo.includes("—")
    ? secao.titulo.slice(secao.titulo.indexOf("—") + 1)
    : secao.titulo;
  const extraTitulo = LIXO_NO_TITULO.test(nomeParte) ? [] : tokensDoTitulo(nomeParte);
  const nucleo = [...new Set([...(base.nucleo ?? base.tokens), ...extraTitulo])].filter(
    (t) => t !== "tema" && t !== "material" && t !== "conteudo",
  );
  const porFrase = expandirComFrasesDoTema(nucleo, secao.texto);
  const porFreq = nucleo.length < 3 ? expandirPorFrequencia(secao.texto) : [];
  return {
    titulo: nucleo.length ? base.titulo : secao.titulo,
    pagina: base.pagina,
    nucleo: nucleo.length ? nucleo : porFreq.slice(0, 8),
    tokens: [...new Set([...nucleo, ...porFrase, ...porFreq])].slice(0, 48),
  };
}

function expandirPorFrequencia(texto: string): string[] {
  const conta = new Map<string, number>();
  for (const w of tokens(texto)) {
    if (w.length < 5 || IGNORAR_TEMA.has(w) || /^\d+$/.test(w)) continue;
    conta.set(w, (conta.get(w) ?? 0) + 1);
  }
  return [...conta.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w)
    .slice(0, 20);
}

function expandirComFrasesDoTema(nucleo: string[], texto: string): string[] {
  if (!nucleo.length) return [];
  const nucleoSet = new Set(nucleo);
  const extra: string[] = [];
  const frases = texto.split(/(?<=[.!?])\s+/);
  for (const frase of frases) {
    const t = tokens(frase);
    let inter = 0;
    for (const w of t) if (nucleoSet.has(w)) inter += 1;
    if (inter < 1) continue;
    for (const w of t) {
      if (w.length > 4 && !IGNORAR_TEMA.has(w) && !nucleoSet.has(w)) extra.push(w);
    }
  }
  return [...new Set(extra)].slice(0, 24);
}
