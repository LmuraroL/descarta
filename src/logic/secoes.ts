import type { PaginaTexto, Secao } from "../types";

export const MARCA_AULA = /^AULA\s+\d+\s*[•·]\s*PARTE\s+\d+/i;
const FIM_DIDATICO = /^(resumo da disciplina|avalia[cç][aã]o)$/i;

export function pareceTitulo(linha: string): boolean {
  const t = linha.trim();
  if (MARCA_AULA.test(t)) return true;
  if (t.length < 6 || t.length > 90) return false;
  if (/[.!?]$/.test(t) && !/^\d+\.\d+/.test(t)) return false;
  if (/^\d+\.\d+/.test(t)) return true;
  if (/^cap[ií]tulo\s+\d+/i.test(t)) return true;
  if (/^se[cç][aã]o\s+\d+/i.test(t)) return true;
  return /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇ\s,]{8,80}$/.test(t);
}

export function partirEmSecoes(paginas: PaginaTexto[]): Secao[] {
  const linhas: { pagina: number; linha: string }[] = [];
  for (const p of paginas) {
    for (const linha of p.texto.split("\n")) {
      const t = linha.trim();
      if (t) linhas.push({ pagina: p.pagina, linha: t });
    }
  }

  const aulas = cortesDeAula(linhas);
  if (aulas.length) return aulas;

  return partirPorTitulosOuPaginas(linhas, paginas);
}

function cortesDeAula(linhas: { pagina: number; linha: string }[]): Secao[] {
  const cortes: { titulo: string; inicio: number }[] = [];
  let fimDidatico: number | undefined;

  linhas.forEach((item, i) => {
    if (MARCA_AULA.test(item.linha)) {
      cortes.push({ titulo: tituloDaAula(linhas, i), inicio: i });
    }
    if (FIM_DIDATICO.test(item.linha) && cortes.length && fimDidatico === undefined) {
      fimDidatico = i;
    }
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
      paginaInicio: Math.min(...paginasBloco),
      paginaFim: Math.max(...paginasBloco),
      texto: bloco.map((b) => b.linha).join("\n"),
    });
  }
  return secoes;
}

function tituloDaAula(
  linhas: { pagina: number; linha: string }[],
  i: number,
): string {
  const marca = linhas[i].linha.replace(/\s+/g, " ").trim();
  const extra: string[] = [];
  for (let k = i + 1; k < i + 5 && k < linhas.length; k++) {
    const t = linhas[k].linha.trim();
    if (MARCA_AULA.test(t) || FIM_DIDATICO.test(t)) break;
    if (t.length > 68) break;
    if (
      /^(neste|nesta|o professor|a entrada|muitas|tradicionalmente|eduardo|leo|no entanto|hoje|para o|o marketing)\b/i.test(
        t,
      )
    ) {
      break;
    }
    extra.push(t);
  }
  return extra.length ? `${marca} — ${extra.join(" ")}` : marca;
}

function partirPorTitulosOuPaginas(
  linhas: { pagina: number; linha: string }[],
  paginas: PaginaTexto[],
): Secao[] {
  const cortes: { titulo: string; inicio: number }[] = [];
  linhas.forEach((item, i) => {
    if (pareceTitulo(item.linha) && (i === 0 || item.linha.length < 70)) {
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
    secoes.push({
      id: `s${secoes.length + 1}`,
      titulo: `Páginas ${fatia[0].pagina}–${fatia[fatia.length - 1].pagina}`,
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
    if (anterior && s.texto.length < 280) {
      anterior.texto += `\n${s.texto}`;
      anterior.paginaFim = s.paginaFim;
      anterior.titulo = `${anterior.titulo} / ${s.titulo}`;
    } else {
      out.push({ ...s });
    }
  }
  return out.length ? out : secoes;
}
