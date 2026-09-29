import type { Card } from "../types";

export type ProvedorIa = "groq" | "gemini";

export type JulgamentoCard = {
  i: number;
  ok: boolean;
  motivo: string;
};

const CHAVE_IA = "descarta.ia";
const GROQ_MODELOS = ["llama-3.1-8b-instant", "llama-3.3-70b-versatile"];

export function carregarChaveIa(): string {
  try {
    return localStorage.getItem(CHAVE_IA)?.trim() ?? "";
  } catch {
    return "";
  }
}

export function salvarChaveIa(chave: string): void {
  const t = chave.trim();
  if (!t) {
    localStorage.removeItem(CHAVE_IA);
    return;
  }
  localStorage.setItem(CHAVE_IA, t);
}

export function provedorDaChave(chave: string): ProvedorIa | undefined {
  const t = chave.trim();
  if (t.startsWith("gsk_")) return "groq";
  if (t.startsWith("AIza")) return "gemini";
  return undefined;
}

export async function filtrarCardsComIa(cards: Card[], chave: string): Promise<{
  cards: Card[];
  usou: boolean;
  provedor?: ProvedorIa;
}> {
  const provedor = provedorDaChave(chave);
  if (!provedor || !cards.length) return { cards, usou: false };

  const vivos = new Set(cards.map((_, i) => i));
  const tamanho = 6;

  for (let ini = 0; ini < cards.length; ini += tamanho) {
    const lote = cards.slice(ini, ini + tamanho).map((c, k) => ({
      i: ini + k,
      pergunta: c.pergunta,
      resposta: c.resposta,
      conceito: c.conceito,
    }));
    const julgamentos = await julgarLote(lote, chave, provedor);
    if (!julgamentos) return { cards, usou: false, provedor };
    for (const j of julgamentos) {
      if (j.ok === false) vivos.delete(j.i);
    }
  }

  return {
    cards: cards.filter((_, i) => vivos.has(i)),
    usou: true,
    provedor,
  };
}

async function julgarLote(
  lote: { i: number; pergunta: string; resposta: string; conceito: string }[],
  chave: string,
  provedor: ProvedorIa,
): Promise<JulgamentoCard[] | null> {
  const prompt = [
    "Você julga flashcards de estudo em português.",
    "ok=true só se TODAS forem verdade: a pergunta é clara e fala do tema (aula, case, palavra-chave ou exercício); a resposta é a tese perto desse tema; o texto não está embaralhado nem colado; o conceito é o tema ou o termo definido.",
    "ok=false se a pergunta recorta a resposta, se o texto é lixo de apostila (bibliografia, relógio, veja as) ou se não dá para estudar.",
    'Devolva só JSON: {"julgamentos":[{"i":0,"ok":true,"motivo":""}]}',
    "",
    ...lote.map(
      (c) =>
        `${c.i}. conceito: ${c.conceito}\npergunta: ${c.pergunta}\nresposta: ${c.resposta.slice(0, 420)}`,
    ),
  ].join("\n");

  try {
    const bruto = provedor === "groq" ? await chatGroq(chave, prompt) : await chatGemini(chave, prompt);
    if (!bruto) return null;
    return parseJulgamentos(bruto, lote.map((c) => c.i));
  } catch {
    return null;
  }
}

async function chatGroq(chave: string, prompt: string): Promise<string | null> {
  for (const model of GROQ_MODELOS) {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${chave}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(12000),
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "Você só devolve JSON válido. Sem markdown.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (r.status === 400) continue;
    if (!r.ok) return null;
    const data = (await r.json()) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content ?? null;
  }
  return null;
}

async function chatGemini(chave: string, prompt: string): Promise<string | null> {
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" +
    encodeURIComponent(chave);
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(12000),
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0, responseMimeType: "application/json" },
    }),
  });
  if (!r.ok) return null;
  const data = (await r.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

function parseJulgamentos(raw: string, indices: number[]): JulgamentoCard[] | null {
  const t = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    const j = JSON.parse(t) as { julgamentos?: JulgamentoCard[] } | JulgamentoCard[];
    const lista = Array.isArray(j) ? j : j.julgamentos;
    if (!Array.isArray(lista)) return null;
    const mapa = new Map<number, JulgamentoCard>();
    for (const item of lista) {
      if (typeof item?.i !== "number") continue;
      mapa.set(item.i, { i: item.i, ok: Boolean(item.ok), motivo: String(item.motivo ?? "") });
    }
    return indices.map((i) => mapa.get(i) ?? { i, ok: true, motivo: "sem julgamento" });
  } catch {
    return null;
  }
}
