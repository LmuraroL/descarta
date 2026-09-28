import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { PaginaTexto } from "./types";

GlobalWorkerOptions.workerSrc = workerSrc;

type ItemTexto = {
  str: string;
  x: number;
  y: number;
};

const GAP_COLUNA = 72;

export async function extrairPaginasPdf(arquivo: File | ArrayBuffer): Promise<PaginaTexto[]> {
  const data = arquivo instanceof File ? await arquivo.arrayBuffer() : arquivo;
  const pdf = await getDocument({ data }).promise;
  const paginas: PaginaTexto[] = [];

  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const content = await page.getTextContent();
    const items: ItemTexto[] = [];
    for (const raw of content.items) {
      if (!("str" in raw) || !raw.str.trim()) continue;
      const t = raw.transform;
      items.push({ str: raw.str, x: t[4], y: t[5] });
    }
    paginas.push({
      pagina: n,
      texto: linhasPorPosicao(items).join("\n"),
    });
  }

  return paginas;
}

function linhasPorPosicao(items: ItemTexto[]): string[] {
  const linhas = new Map<number, ItemTexto[]>();
  for (const item of items) {
    const y = Math.round(item.y / 4) * 4;
    const lista = linhas.get(y) ?? [];
    lista.push(item);
    linhas.set(y, lista);
  }
  const ys = [...linhas.keys()].sort((a, b) => b - a);
  const saida: string[] = [];

  for (const y of ys) {
    const daLinha = (linhas.get(y) ?? []).sort((a, b) => a.x - b.x);
    const colunas = separarColunas(daLinha);
    const corpo = colunas.find((c) => !eCitacaoLateral(c)) ?? colunas[0];
    if (!corpo) continue;
    const texto = corpo
      .map((i) => i.str)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (texto) saida.push(texto);
  }

  return saida;
}

function separarColunas(items: ItemTexto[]): ItemTexto[][] {
  if (!items.length) return [];
  const colunas: ItemTexto[][] = [[items[0]]];
  for (let i = 1; i < items.length; i++) {
    const prev = items[i - 1];
    const cur = items[i];
    if (cur.x - prev.x > GAP_COLUNA) colunas.push([cur]);
    else colunas[colunas.length - 1].push(cur);
  }
  return colunas;
}

function eCitacaoLateral(col: ItemTexto[]): boolean {
  const t = col.map((i) => i.str).join(" ");
  if (/^\d{1,2}:\d{2}\b/.test(t.trim())) return true;
  if (/^[“"']/.test(t.trim()) && t.length < 180) return true;
  const xs = col.map((i) => i.x);
  const minX = Math.min(...xs);
  return minX > 320 && t.length < 220;
}
