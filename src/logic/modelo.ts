import type { SaidaEstruturada, Secao, TemaCapitulo, TrechoExtraido } from "../types";

export type StatusModelo = {
  ok: boolean;
  modelo?: string;
  erro?: string;
};

export async function statusModelo(): Promise<StatusModelo> {
  try {
    const r = await fetch("/api/modelo", { method: "GET", signal: AbortSignal.timeout(4000) });
    if (!r.ok) return { ok: false, erro: `HTTP ${r.status}` };
    return (await r.json()) as StatusModelo;
  } catch {
    return { ok: false, erro: "Ollama indisponível neste computador." };
  }
}

export async function julgarSecaoComModelo(
  secao: Secao,
  trechos: TrechoExtraido[],
  perfil: string,
  tema: TemaCapitulo,
): Promise<SaidaEstruturada[] | null> {
  try {
    const r = await fetch("/api/modelo/julgar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({
        secao: {
          titulo: secao.titulo,
          paginaInicio: secao.paginaInicio,
          paginaFim: secao.paginaFim,
          texto: secao.texto.slice(0, 8000),
        },
        tema,
        trechos: trechos.slice(0, 40).map((t) => ({
          texto: t.texto.slice(0, 400),
          pagina: t.pagina,
          trecho: t.trecho,
        })),
        perfil,
      }),
    });
    if (!r.ok) return null;
    const corpo = (await r.json()) as { cards?: SaidaEstruturada[] };
    return Array.isArray(corpo.cards) ? corpo.cards : null;
  } catch {
    return null;
  }
}
