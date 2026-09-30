import { useMemo, useRef, useState } from "react";
import { cardFazSentido } from "./guardrails";
import { processarDocumento } from "./logic/harness";
import { carregarChaveIa, provedorDaChave, salvarChaveIa } from "./logic/iaLivre";
import { partirEmSecoes } from "./logic/secoes";
import { respostaDeEstudo, trechoRepeteResposta } from "./logic/texto";
import { extrairPaginasPdf } from "./pdf";
import { carregarEstudo, carregarPerfil, salvarEstudo, salvarPerfil } from "./storage";
import type { Card, Perfil, ResultadoEstudo } from "./types";

function cardVisivel(c: Card): boolean {
  return !c.inutil && !c.incerto && c.pagina > 0 && Boolean(c.trecho) && cardFazSentido(c);
}

type Fase = "upload" | "desinfoxicando" | "cards";

export default function App() {
  const [estudo, setEstudo] = useState<ResultadoEstudo | null>(() => carregarEstudo());
  const [fase, setFase] = useState<Fase>(() => (carregarEstudo() ? "cards" : "upload"));
  const [perfil, setPerfil] = useState<Perfil>(() => carregarPerfil());
  const [indice, setIndice] = useState(0);
  const [virado, setVirado] = useState(false);
  const [sentido, setSentido] = useState<"frente" | "volta">("frente");
  const [erro, setErro] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const [chaveIa, setChaveIa] = useState(() => carregarChaveIa());
  const fileRef = useRef<HTMLInputElement>(null);

  const cards = useMemo(() => {
    if (!estudo) return [];
    return estudo.cards
      .filter(cardVisivel)
      .sort((a, b) => a.pagina - b.pagina);
  }, [estudo]);

  const atual = cards[indice] ?? null;

  async function enviarPdf(arquivo: File) {
    setErro(null);
    setFase("desinfoxicando");
    setIndice(0);
    setVirado(false);
    try {
      const paginas = await extrairPaginasPdf(arquivo);
      const letras = paginas.reduce((n, p) => n + p.texto.replace(/\s/g, "").length, 0);
      if (letras < 80) {
        throw new Error("Este PDF quase não tem texto. Envie um arquivo com texto selecionável.");
      }
      const secoes = partirEmSecoes(paginas);
      const resultado = await processarDocumento(
        arquivo.name,
        paginas,
        secoes,
        perfil,
        false,
        undefined,
        chaveIa,
      );
      const visiveis = resultado.cards.filter(cardVisivel);
      if (!visiveis.length) {
        throw new Error("Não sobrou flashcard com página. Tente outro PDF.");
      }
      salvarEstudo(resultado);
      setEstudo(resultado);
      setFase("cards");
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
      setFase("upload");
    }
  }

  function receberArquivo(lista: FileList | null) {
    const f = lista?.[0];
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".pdf") && f.type !== "application/pdf") {
      setErro("Envie um PDF.");
      return;
    }
    void enviarPdf(f);
  }

  function marcarInutil(card: Card) {
    if (!estudo) return;
    const prox: ResultadoEstudo = {
      ...estudo,
      cards: estudo.cards.map((c) => (c.id === card.id ? { ...c, inutil: true } : c)),
    };
    const novoPerfil: Perfil = {
      ...perfil,
      cardsInuteis: [
        ...perfil.cardsInuteis,
        { id: card.id, conceito: card.conceito, pergunta: card.pergunta },
      ],
    };
    setPerfil(novoPerfil);
    salvarPerfil(novoPerfil);
    salvarEstudo(prox);
    setEstudo(prox);
    setVirado(false);
    setIndice((i) => {
      const restantes = prox.cards.filter(cardVisivel);
      if (!restantes.length) return 0;
      return Math.min(i, restantes.length - 1);
    });
  }

  function ir(delta: number) {
    setVirado(false);
    setSentido(delta > 0 ? "frente" : "volta");
    setIndice((i) => Math.min(cards.length - 1, Math.max(0, i + delta)));
  }

  function novoArquivo() {
    setEstudo(null);
    setIndice(0);
    setVirado(false);
    setErro(null);
    setFase("upload");
  }

  return (
    <div className="app">
      {fase === "upload" && (
        <TelaUpload
          erro={erro}
          arrastando={arrastando}
          chaveIa={chaveIa}
          onChave={(v) => {
            setChaveIa(v);
            salvarChaveIa(v);
          }}
          onEscolher={() => fileRef.current?.click()}
          onArrastar={(v) => setArrastando(v)}
          onSoltar={(files) => {
            setArrastando(false);
            receberArquivo(files);
          }}
        />
      )}

      {fase === "desinfoxicando" && <TelaLoad temIa={Boolean(provedorDaChave(chaveIa))} />}

      {fase === "cards" && atual && (
        <TelaCards
          arquivo={estudo?.arquivo ?? ""}
          card={atual}
          posicao={indice + 1}
          total={cards.length}
          virado={virado}
          sentido={sentido}
          onVirar={() => setVirado((v) => !v)}
          onAnterior={() => ir(-1)}
          onProximo={() => ir(1)}
          onInutil={() => marcarInutil(atual)}
          onNovo={novoArquivo}
        />
      )}

      {fase === "cards" && !atual && (
        <main className="fase centro">
          <h1>Nada relevante sobrou</h1>
          <button type="button" className="btn" onClick={novoArquivo}>
            Enviar outro PDF
          </button>
        </main>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,.pdf"
        hidden
        onChange={(e) => {
          receberArquivo(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function TelaUpload({
  erro,
  arrastando,
  chaveIa,
  onChave,
  onEscolher,
  onArrastar,
  onSoltar,
}: {
  erro: string | null;
  arrastando: boolean;
  chaveIa: string;
  onChave: (v: string) => void;
  onEscolher: () => void;
  onArrastar: (v: boolean) => void;
  onSoltar: (files: FileList | null) => void;
}) {
  const provedor = provedorDaChave(chaveIa);
  return (
    <main className="fase centro">
      <p className="marca">Descarta</p>
      <h1>Envie o PDF</h1>
      <p className="lead">O conteúdo repetido sai. Ficam flashcards só do que importa.</p>

      <button
        type="button"
        className={`drop ${arrastando ? "ativo" : ""}`}
        onClick={onEscolher}
        onDragEnter={(e) => {
          e.preventDefault();
          onArrastar(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          onArrastar(true);
        }}
        onDragLeave={() => onArrastar(false)}
        onDrop={(e) => {
          e.preventDefault();
          onSoltar(e.dataTransfer.files);
        }}
      >
        <strong>Selecionar PDF</strong>
        <span>ou arraste o arquivo para cá</span>
      </button>

      <label className="chave-ia">
        <span>IA gratuita (opcional)</span>
        <input
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder="chave Groq (gsk_…) ou Gemini (AIza…)"
          value={chaveIa}
          onChange={(e) => onChave(e.target.value)}
        />
        <small>
          {provedor
            ? `A ${provedor === "groq" ? "Groq" : "Gemini"} vai julgar se cada pergunta faz sentido.`
            : "Sem chave o app ainda funciona. Com chave, a IA descarta card sem lógica."}{" "}
          Groq grátis em{" "}
          <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer">
            console.groq.com/keys
          </a>
          . A chave fica só neste navegador.
        </small>
      </label>

      {erro && <p className="alerta">{erro}</p>}
    </main>
  );
}

function DicaVirar({ texto }: { texto: string }) {
  return (
    <span className="dica-virar">
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 6V3L8 7l4 4V8c2.76 0 5 2.24 5 5a5 5 0 0 1-8.9 3.1L6.7 17.5A7 7 0 0 0 19 13c0-3.87-3.13-7-7-7zm0 12v3l4-4-4-4v3a5 5 0 0 1-5-5c0-.85.2-1.65.55-2.36L6.1 7.2A7 7 0 0 0 5 13c0 3.87 3.13 7 7 7z"
        />
      </svg>
      {texto}
    </span>
  );
}

function TelaLoad({ temIa }: { temIa: boolean }) {
  return (
    <main className="fase centro load">
      <span className="pulso" aria-hidden="true" />
      <h1>desinfoxicando o conteúdo</h1>
      <p className="lead">
        {temIa
          ? "A IA gratuita está conferindo se cada pergunta faz sentido."
          : "Filtrando o que não ensina o tema da aula."}
      </p>
    </main>
  );
}

function TelaCards({
  arquivo,
  card,
  posicao,
  total,
  virado,
  sentido,
  onVirar,
  onAnterior,
  onProximo,
  onInutil,
  onNovo,
}: {
  arquivo: string;
  card: Card;
  posicao: number;
  total: number;
  virado: boolean;
  sentido: "frente" | "volta";
  onVirar: () => void;
  onAnterior: () => void;
  onProximo: () => void;
  onInutil: () => void;
  onNovo: () => void;
}) {
  const resposta = respostaDeEstudo(card.resposta, 800);
  const trecho = respostaDeEstudo(card.trecho, 280);
  const mostrarTrecho = !trechoRepeteResposta(resposta, trecho);

  return (
    <main className={`fase cards-fase ${virado ? "revelado" : ""}`}>
      <header className="barra">
        <p className="marca">Descarta</p>
        <button type="button" className="link" onClick={onNovo}>
          Enviar outro PDF
        </button>
      </header>

      <p className="arquivo">{arquivo}</p>
      <p className="contador">
        {posicao} / {total}
      </p>
      <div className="progresso" aria-hidden="true">
        <span style={{ width: `${(posicao / Math.max(total, 1)) * 100}%` }} />
      </div>

      <div key={card.id} className={`flash-cena ${sentido}`}>
        <button
          type="button"
          className={`flash ${virado ? "virado" : ""}`}
          onClick={onVirar}
          aria-pressed={virado}
          aria-label={virado ? "Resposta. Toque para ver a pergunta." : "Pergunta. Toque para ver a resposta."}
        >
          <span className="face frente" aria-hidden={virado}>
            <span className="topo">
              <span className="pagina">p. {card.pagina}</span>
              <span className="lado">pergunta</span>
            </span>
            <p className="corpo">{card.pergunta}</p>
            <DicaVirar texto="Toque para ver a resposta" />
          </span>
          <span className="face verso" aria-hidden={!virado}>
            <span className="topo">
              <span className="pagina">p. {card.pagina}</span>
              <span className="lado">resposta</span>
            </span>
            <p className="corpo">{resposta}</p>
            {mostrarTrecho && <small>{trecho}</small>}
            <DicaVirar texto="Toque para ver a pergunta" />
          </span>
        </button>
      </div>

      <button type="button" className="btn virar-cta" onClick={onVirar}>
        {virado ? "Ver pergunta" : "Ver resposta"}
      </button>

      <div className="controles">
        <button type="button" className="btn secundario" onClick={onAnterior} disabled={posicao === 1}>
          Anterior
        </button>
        <button type="button" className="btn" onClick={onProximo} disabled={posicao === total}>
          Próximo
        </button>
      </div>

      <button type="button" className="link inutil" onClick={onInutil}>
        Este card não é relevante
      </button>
    </main>
  );
}
