import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const OLLAMA = process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434";

function apiPlugin(): Plugin {
  return {
    name: "descarta-api",
    configureServer(server) {
      server.middlewares.use(apiMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(apiMiddleware);
    },
  };
}

async function apiMiddleware(
  req: { url?: string; method?: string },
  res: {
    setHeader: (k: string, v: string) => void;
    end: (s: string) => void;
    statusCode: number;
  },
  next: () => void,
) {
  const url = req.url ?? "";
  if (!url.startsWith("/api/")) {
    next();
    return;
  }

  res.setHeader("Content-Type", "application/json");
  try {
    if (req.method === "GET" && url.startsWith("/api/modelo")) {
      const modelo = await escolherModelo();
      res.end(
        JSON.stringify(
          modelo
            ? { ok: true, modelo }
            : {
                ok: false,
                erro: "Nenhum modelo no Ollama. Instale o Ollama e rode: ollama pull llama3.2",
              },
        ),
      );
      return;
    }

    if (req.method === "POST" && url.startsWith("/api/modelo/julgar")) {
      const modelo = await escolherModelo();
      if (!modelo) {
        res.statusCode = 503;
        res.end(JSON.stringify({ error: "sem modelo" }));
        return;
      }
      const body = JSON.parse(await lerCorpo(req as NodeReadable));
      const user = [
        `Âncora do bloco: ${body.secao.ancora ?? body.secao.titulo}`,
        `Tema: ${body.tema?.titulo ?? ""}`,
        `Núcleo do tema: ${(body.tema?.nucleo ?? body.tema?.tokens ?? []).join(", ")}`,
        "A pergunta nasce da âncora (título da aula, case, palavra-chave ou exercício). A resposta é o texto logo abaixo do título.",
        "CASE é outro tema, não misturar com a parte da aula. Palavra-chave vira definição. Exercício de fixação vira o enunciado.",
        "Sem card de fragmento, bibliografia, sumário, ementa, veja/consulte ou relógio da videoaula.",
        "",
        `Seção "${body.secao.titulo}" (páginas ${body.secao.paginaInicio}–${body.secao.paginaFim}):`,
        body.secao.texto,
        "",
        "Trechos já extraídos com página:",
        JSON.stringify(body.trechos),
        "",
        "Devolva só JSON com a chave cards. Cada card: conceito, pergunta, resposta curta, pagina, trecho (cópia da seção), classe unico ou repeticao_colapsada, distancia 0 ou 1.",
      ].join("\n");
      const bruto = await chatOllama(modelo, promptSistema(body.perfil), user);
      res.end(JSON.stringify({ cards: parseCards(bruto), modelo }));
      return;
    }

    res.statusCode = 404;
    res.end(JSON.stringify({ error: "not found" }));
  } catch (erro) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: String(erro) }));
  }
}

type NodeReadable = {
  on: (ev: string, fn: (arg?: Buffer | string) => void) => void;
};

function lerCorpo(req: NodeReadable): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => {
      if (c) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", () => reject(new Error("falha ao ler o corpo")));
  });
}

async function escolherModelo(): Promise<string | null> {
  try {
    const r = await fetch(`${OLLAMA}/api/tags`, { signal: AbortSignal.timeout(1500) });
    if (!r.ok) return null;
    const data = (await r.json()) as { models?: { name: string }[] };
    const nomes = (data.models ?? []).map((m) => m.name);
    const ordem = ["llama3.2", "llama3.1", "qwen2.5", "gemma2", "mistral", "phi3", "llama3"];
    for (const p of ordem) {
      const hit = nomes.find((n) => n.toLowerCase().startsWith(p));
      if (hit) return hit;
    }
    return nomes[0] ?? null;
  } catch {
    return null;
  }
}

function promptSistema(perfil: string): string {
  return [
    "Você julga o que sobrevive num material de estudo. Não é um chat sobre o livro.",
    "Perfil de corte (obrigatório em todo julgamento):",
    perfil,
    "",
    "Referência: âncora do bloco (AULA/PARTE, CASE, PALAVRA-CHAVE, EXERCÍCIO). Pergunta sobre o tema; resposta = trecho próximo ao título.",
    "Fragmento sem tese não vira card. Pergunta não pode ser recorte da resposta.",
    "Lixo de apostila não vira card: bibliografia, referências, sumário, ementa, veja/consulte, relógio da videoaula.",
    "Regras: repetiu, colapsa; definição, metáfora, mecanismo, causa, exceção e dado de conteúdo ficam se estiverem no bloco do tema;",
    "não invente; todo card precisa de página e trecho da seção.",
    'Saída: {"cards":[{"conceito":"","pergunta":"","resposta":"","pagina":1,"trecho":"","classe":"unico"}]}',
  ].join("\n");
}

async function chatOllama(model: string, system: string, user: string): Promise<string> {
  const r = await fetch(`${OLLAMA}/api/chat`, {
    signal: AbortSignal.timeout(8000),
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      format: "json",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!r.ok) throw new Error(`Ollama HTTP ${r.status}`);
  const data = (await r.json()) as { message?: { content?: string } };
  return data.message?.content ?? "";
}

function parseCards(raw: string): unknown[] {
  const t = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    const j = JSON.parse(t) as { cards?: unknown[] } | unknown[];
    if (Array.isArray(j)) return j;
    if (j && typeof j === "object" && Array.isArray(j.cards)) return j.cards;
  } catch {
    return [];
  }
  return [];
}

export default defineConfig({
  plugins: [react(), apiPlugin()],
  base: "./",
});
