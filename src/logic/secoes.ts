import type { PaginaTexto, Secao, TipoSecao } from "../types";

export const MARCA_AULA = /^AULA\s+\d+\s*[•·]\s*PARTE\s+\d+/i;
export const MARCA_CASE = /^(CASE|CASO)\b/i;
export const MARCA_PALAVRA = /^PALAVRA[\s\-–—]*CHAVE\b/i;
export const MARCA_EXERCICIO = /^EXERC[IÍ]CIO(?:S)?\s+DE\s+FIXA[CÇ][AÃ]O\b/i;
const FIM_DIDATICO = /^(resumo da disciplina|avalia[cç][aã]o)$/i;
const LEGENDA_TEMPO = /^os tempos marcam\b/i;
const SO_RELOGIO = /^\d{1,2}:\d{2}$/;

const PROSA_INICIAL =
  /^(neste|nesta|o professor|a entrada|muitas|tradicionalmente|eduardo|leo|no entanto|hoje|para o|o marketing|o principal|verdadeiro|falso)\b/i;

export function tipoDaMarca(linha: string): TipoSecao | undefined {
  const t = linha.trim();
  if (MARCA_AULA.test(t)) return "aula";
  if (MARCA_PALAVRA.test(t)) return "palavra_chave";
  if (MARCA_EXERCICIO.test(t)) return "exercicio";
  if (MARCA_CASE.test(t) && t.length < 48) return "case";
  return undefined;
}

export function ehCabecalhoEstrutural(linha: string): boolean {
  const t = linha.trim();
  if (!t) return true;
  if (tipoDaMarca(t)) return true;
  if (SO_RELOGIO.test(t)) return true;
  if (LEGENDA_TEMPO.test(t)) return true;
  if (FIM_DIDATICO.test(t)) return true;
  return false;
}

export function pareceTitulo(linha: string): boolean {
  const t = linha.trim();
  if (tipoDaMarca(t)) return true;
  if (t.length < 6 || t.length > 90) return false;
  if (/[.!?]$/.test(t) && !/^\d+\.\d+/.test(t)) return false;
  if (/^\d+\.\d+/.test(t)) return true;
  if (/^cap[ií]tulo\s+\d+/i.test(t)) return true;
  if (/^se[cç][aã]o\s+\d+/i.test(t)) return true;
  return /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇ\s,]{8,80}$/.test(t);
}

export function pareceAncora(linha: string): boolean {
  const t = linha.trim();
  if (ehCabecalhoEstrutural(t)) return false;
  if (t.length < 8 || t.length > 92) return false;
  if (/[.!?]$/.test(t)) return false;
  if (PROSA_INICIAL.test(t)) return false;
  if (/\d{1,2}:\d{2}/.test(t)) return false;
  const palavras = t.split(/\s+/).filter(Boolean);
  if (palavras.length < 2 || palavras.length > 16) return false;
  if (!/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(t)) return false;
  const artigos = new Set(["e", "a", "o", "os", "as", "da", "de", "do", "dos", "das", "à", "ao", "em", "no", "na"]);
  const conteudo = palavras.filter((p) => !artigos.has(p.toLowerCase()));
  if (conteudo.length < 2) return false;
  const caps = conteudo.filter((p) => /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(p));
  return caps.length >= 2 && caps.length / conteudo.length >= 0.5;
}

export function partirEmSecoes(paginas: PaginaTexto[]): Secao[] {
  const linhas: { pagina: number; linha: string }[] = [];
  for (const p of paginas) {
    for (const linha of p.texto.split("\n")) {
      const t = linha.trim();
      if (t) linhas.push({ pagina: p.pagina, linha: t });
    }
  }

  const aulas = cortesDidaticos(linhas);
  if (aulas.length) return subdividirTemasInternos(aulas);

  return partirPorTitulosOuPaginas(linhas, paginas);
}

function cortesDidaticos(linhas: { pagina: number; linha: string }[]): Secao[] {
  const cortes: { tipo: TipoSecao; titulo: string; ancora: string; inicio: number }[] = [];
  let fimDidatico: number | undefined;
  let marcaAula = "";
  let ancoraAtual = "";

  linhas.forEach((item, i) => {
    if (FIM_DIDATICO.test(item.linha) && cortes.length && fimDidatico === undefined) {
      fimDidatico = i;
      return;
    }
    const tipo = tipoDaMarca(item.linha);
    if (!tipo) return;

    if (tipo === "aula") {
      marcaAula = item.linha.replace(/\s+/g, " ").trim();
      ancoraAtual = coletarAncora(linhas, i);
      cortes.push({
        tipo,
        titulo: ancoraAtual ? `${marcaAula} — ${ancoraAtual}` : marcaAula,
        ancora: ancoraAtual || marcaAula,
        inicio: i,
      });
      return;
    }

    if (tipo === "case") {
      const resto = item.linha.replace(/^(CASE|CASO)\s*[:\-–—]?\s*/i, "").trim();
      const ancora = (resto.length >= 8 ? resto : coletarAncora(linhas, i)) || "Case";
      ancoraAtual = ancora;
      const prefixo = marcaAula ? `${marcaAula} — CASE` : "CASE";
      cortes.push({
        tipo,
        titulo: `${prefixo} — ${ancora}`,
        ancora,
        inicio: i,
      });
      return;
    }

    const ancora = ancoraAtual || marcaAula || tituloDoBloco(tipo);
    cortes.push({
      tipo,
      titulo: `${tituloDoBloco(tipo)} — ${ancora}`,
      ancora,
      inicio: i,
    });
  });

  if (!cortes.length) return [];

  const secoes: Secao[] = [];
  for (let i = 0; i < cortes.length; i++) {
    const ini = cortes[i].inicio;
    let fim = i + 1 < cortes.length ? cortes[i + 1].inicio : linhas.length;
    if (fimDidatico !== undefined && fimDidatico > ini && fimDidatico < fim) {
      fim = fimDidatico;
    }
    if (fimDidatico !== undefined && ini >= fimDidatico) continue;
    const bloco = linhas.slice(ini, fim);
    if (!bloco.length) continue;
    const paginasBloco = bloco.map((b) => b.pagina);
    secoes.push({
      id: `s${secoes.length + 1}`,
      titulo: cortes[i].titulo,
      ancora: cortes[i].ancora,
      tipo: cortes[i].tipo,
      paginaInicio: Math.min(...paginasBloco),
      paginaFim: Math.max(...paginasBloco),
      texto: bloco.map((b) => b.linha).join("\n"),
    });
  }
  return secoes;
}

function tituloDoBloco(tipo: TipoSecao): string {
  if (tipo === "palavra_chave") return "PALAVRA-CHAVE";
  if (tipo === "exercicio") return "EXERCÍCIO DE FIXAÇÃO";
  if (tipo === "case") return "CASE";
  return "AULA";
}

function coletarAncora(
  linhas: { pagina: number; linha: string }[],
  i: number,
): string {
  const extra: string[] = [];
  for (let k = i + 1; k < i + 7 && k < linhas.length; k++) {
    const t = linhas[k].linha.trim();
    if (tipoDaMarca(t) || FIM_DIDATICO.test(t) || LEGENDA_TEMPO.test(t)) break;
    if (SO_RELOGIO.test(t)) continue;
    if (t.length > 92) break;
    if (PROSA_INICIAL.test(t)) break;
    if (!pareceAncora(t)) {
      if (
        extra.length &&
        /^(e|da|do|das|dos|de|à|a|ao)\s+\S+/i.test(t) &&
        t.length < 70 &&
        !/[.!?]$/.test(t)
      ) {
        extra.push(t);
        continue;
      }
      break;
    }
    extra.push(t);
    if (extra.join(" ").length > 88) break;
  }
  return extra.join(" ").replace(/\s+/g, " ").trim();
}

function subdividirTemasInternos(secoes: Secao[]): Secao[] {
  const out: Secao[] = [];
  for (const s of secoes) {
    if (s.tipo !== "aula" && s.tipo !== "case") {
      out.push(s);
      continue;
    }
    const linhas = s.texto.split("\n").map((l) => l.trim()).filter(Boolean);
    const cortes: { ancora: string; inicio: number }[] = [{ ancora: s.ancora, inicio: 0 }];
    let k = tipoDaMarca(linhas[0] ?? "") ? 1 : 0;
    const ancoraNorm = s.ancora.replace(/\s+/g, " ").toLowerCase();
    while (k < linhas.length) {
      const t = linhas[k];
      if (SO_RELOGIO.test(t) || ehCabecalhoEstrutural(t)) {
        k += 1;
        continue;
      }
      if (pareceAncora(t) && ancoraNorm.includes(t.toLowerCase())) {
        k += 1;
        continue;
      }
      if (/^(e|da|do|das|dos|de|à|a|ao)\s+\S+/i.test(t) && ancoraNorm.includes(t.toLowerCase())) {
        k += 1;
        continue;
      }
      break;
    }
    for (let i = k; i < linhas.length; i++) {
      const t = linhas[i];
      if (!pareceAncora(t) || tipoDaMarca(t)) continue;
      const extra = [t];
      let j = i + 1;
      while (j < linhas.length) {
        const n = linhas[j];
        if (
          /^(e|da|do|das|dos|de|à|a|ao)\s+\S+/i.test(n) &&
          n.length < 70 &&
          !/[.!?]$/.test(n) &&
          !tipoDaMarca(n)
        ) {
          extra.push(n);
          j += 1;
          continue;
        }
        break;
      }
      const ancora = extra.join(" ").replace(/\s+/g, " ").trim();
      if (ancora.length < 12) continue;
      if (ancora.toLowerCase() === s.ancora.toLowerCase()) continue;
      if (cortes.some((c) => c.ancora.toLowerCase() === ancora.toLowerCase())) continue;
      cortes.push({ ancora, inicio: i });
      i = j - 1;
    }
    if (cortes.length === 1) {
      out.push(s);
      continue;
    }
    for (let i = 0; i < cortes.length; i++) {
      const ini = cortes[i].inicio;
      const fim = i + 1 < cortes.length ? cortes[i + 1].inicio : linhas.length;
      const bloco = linhas.slice(ini, fim);
      if (!bloco.length) continue;
      const ancora = cortes[i].ancora;
      const marca = s.titulo.split(" — ")[0] ?? s.titulo;
      out.push({
        id: `s${out.length + 1}`,
        tipo: s.tipo,
        ancora,
        titulo: `${marca} — ${ancora}`,
        paginaInicio: s.paginaInicio,
        paginaFim: s.paginaFim,
        texto: bloco.join("\n"),
      });
    }
  }
  return out.map((s, i) => ({ ...s, id: `s${i + 1}` }));
}

function partirPorTitulosOuPaginas(
  linhas: { pagina: number; linha: string }[],
  paginas: PaginaTexto[],
): Secao[] {
  const cortes: { titulo: string; inicio: number }[] = [];
  linhas.forEach((item, i) => {
    if ((pareceAncora(item.linha) || pareceTitulo(item.linha)) && (i === 0 || item.linha.length < 70)) {
      cortes.push({ titulo: item.linha, inicio: i });
    }
  });

  if (cortes.length >= 2) {
    const secoes: Secao[] = [];
    for (let i = 0; i < cortes.length; i++) {
      const ini = cortes[i].inicio;
      const fim = i + 1 < cortes.length ? cortes[i + 1].inicio : linhas.length;
      const bloco = linhas.slice(ini, fim);
      const paginasBloco = bloco.map((b) => b.pagina);
      secoes.push({
        id: `s${i + 1}`,
        titulo: cortes[i].titulo,
        ancora: cortes[i].titulo,
        tipo: "aula",
        paginaInicio: Math.min(...paginasBloco),
        paginaFim: Math.max(...paginasBloco),
        texto: bloco.map((b) => b.linha).join("\n"),
      });
    }
    return fundirSecoesCurtas(secoes);
  }

  return partirPorPaginas(paginas, 2);
}

function partirPorPaginas(paginas: PaginaTexto[], tamanho: number): Secao[] {
  const secoes: Secao[] = [];
  for (let i = 0; i < paginas.length; i += tamanho) {
    const fatia = paginas.slice(i, i + tamanho);
    const titulo = `Páginas ${fatia[0].pagina}–${fatia[fatia.length - 1].pagina}`;
    secoes.push({
      id: `s${secoes.length + 1}`,
      titulo,
      ancora: titulo,
      tipo: "aula",
      paginaInicio: fatia[0].pagina,
      paginaFim: fatia[fatia.length - 1].pagina,
      texto: fatia.map((p) => p.texto).join("\n"),
    });
  }
  return secoes;
}

function fundirSecoesCurtas(secoes: Secao[]): Secao[] {
  const out: Secao[] = [];
  for (const s of secoes) {
    const anterior = out[out.length - 1];
    if (anterior && s.texto.length < 280 && s.tipo === anterior.tipo) {
      anterior.texto += `\n${s.texto}`;
      anterior.paginaFim = s.paginaFim;
      anterior.titulo = `${anterior.titulo} / ${s.titulo}`;
    } else {
      out.push({ ...s });
    }
  }
  return out.length ? out : secoes;
}
