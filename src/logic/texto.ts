const STOP = new Set([
  "a", "o", "os", "as", "um", "uma", "uns", "umas", "de", "da", "do", "das",
  "dos", "em", "no", "na", "nos", "nas", "e", "ou", "que", "se", "por", "para",
  "com", "sem", "ao", "aos", "à", "às", "é", "ser", "foi", "são", "como",
  "mais", "menos", "muito", "já", "não", "sim", "isso", "este", "esta", "isto",
  "aquele", "quando", "onde", "também", "ainda", "entre", "sobre", "pelo",
  "pela", "pelos", "pelas", "seu", "sua", "seus", "suas", "the", "and", "of",
]);

export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokens(texto: string): Set<string> {
  const out = new Set<string>();
  for (const w of normalizar(texto).split(" ")) {
    if (w.length > 2 && !STOP.has(w)) out.add(w);
  }
  return out;
}

export function jaccard(a: string, b: string): number {
  const A = tokens(a);
  const B = tokens(b);
  if (!A.size && !B.size) return 1;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter += 1;
  const union = A.size + B.size - inter;
  return union ? inter / union : 0;
}

export function trechoCabeNoTexto(trecho: string, texto: string): boolean {
  const n = normalizar(trecho);
  const t = normalizar(texto);
  if (!n || n.length < 8) return false;
  if (t.includes(n)) return true;
  const palavras = n.split(" ").filter((p) => p.length > 2);
  if (palavras.length < 4) return t.includes(palavras.join(" "));
  let achou = 0;
  for (const p of palavras) if (t.includes(p)) achou += 1;
  return achou / palavras.length >= 0.7;
}

export function limparRelogioApostila(texto: string): string {
  return texto
    .replace(/\d{1,2}:\d{2}\s*/g, " ")
    .replace(/[“”][^“”]{0,120}[“”]/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;:])/g, "$1")
    .trim();
}

export function respostaDeEstudo(texto: string, max = 420): string {
  const limpo = limparRelogioApostila(texto.replace(/\s+/g, " "));
  if (limpo.length <= max) return limpo;
  const fatia = limpo.slice(0, max);
  const ponto = Math.max(fatia.lastIndexOf(". "), fatia.lastIndexOf("? "), fatia.lastIndexOf("! "));
  if (ponto > 80) return fatia.slice(0, ponto + 1).trim();
  return `${fatia.trim()}…`;
}

export function cortarTrecho(texto: string, max = 240): string {
  return respostaDeEstudo(texto, max);
}

export function trechoRepeteResposta(resposta: string, trecho: string): boolean {
  const a = normalizar(resposta);
  const b = normalizar(trecho);
  if (!b) return true;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  return jaccard(resposta, trecho) > 0.72;
}

export function idCurto(prefixo: string, n: number): string {
  return `${prefixo}-${n.toString(36)}`;
}

const HISTORIA =
  /\b(século|seculo|historicamente|antiguidade|aos olhos da história|legado de|quetelet|gauss nasceu|no s[eé]culo|desde os tempos)\b/i;
const MECANISMO =
  /\b(mecanismo|porque|devido|causa|leva a|quando o modelo|consiste em|define-se|é o|é a|chamamos|chama-se|exceto|salvo|a menos|não se aplica|regulariza)\b/i;
const EXEMPLO = /\b(por exemplo|ex\.|exemplo:|como em|imagine que)\b/i;
const REFORMULA =
  /\b(reformule|mesma afirma[cç][aã]o|outras palavras|dito de novo|continua sendo)\b/i;
const META_EXEMPLO = /\b(o exemplo n[aã]o acrescenta|s[oó] repete a defini)/i;
const EXCECAO = /\b(exceto|salvo|a menos que|não se aplica|não corrige|exceção)\b/i;
const DEFINICAO =
  /\b(é o|é a|é deixar|é quando|são o|define-se|chama-se|chamamos|consiste em|significa)\b/i;
const NUMERO = /\d+/;

export function temNumero(texto: string): boolean {
  return NUMERO.test(texto);
}

export function temDefinicao(texto: string): boolean {
  return DEFINICAO.test(texto);
}

export function temMecanismo(texto: string): boolean {
  return MECANISMO.test(texto);
}

export function temExcecao(texto: string): boolean {
  return EXCECAO.test(texto);
}

export function parecePreambuloHistorico(texto: string): boolean {
  return HISTORIA.test(texto) && !temMecanismo(texto) && !temDefinicao(texto) && !temNumero(texto) && !temExcecao(texto);
}

export function pareceExemploVazio(texto: string): boolean {
  if (META_EXEMPLO.test(texto)) return true;
  return EXEMPLO.test(texto) && !temNumero(texto) && !temExcecao(texto);
}

export function pareceReformulacao(texto: string): boolean {
  return REFORMULA.test(texto) && !temNumero(texto) && !temExcecao(texto);
}

export function devePreservar(texto: string): boolean {
  return temDefinicao(texto) || temMecanismo(texto) || temExcecao(texto);
}

const VERBO_TESE =
  /\b(é|são|está|estão|foi|foram|será|serão|consiste|significa|define|definido|chamamos|chama-se|torna|tornou|deixou|deixa|muda|transforma|transformou|cria|gera|exige|permite|impede|ocorre|depende|resulta|leva|causa|produz|representa|inclui|trata|refere|disputa|compete|relaciona|diferencia|converte|registra|organiza|precisa|podem|devem|utiliza|garante|estabelece|considera|mede|avalia|implica|envolve|assegura|determina)\b/i;

export function temTese(texto: string): boolean {
  const t = texto.replace(/\s+/g, " ").trim();
  if (t.length < 42) return false;
  return VERBO_TESE.test(t) || temDefinicao(t) || temMecanismo(t) || temExcecao(t);
}

export function pareceFragmento(texto: string): boolean {
  const t = texto.replace(/\s+/g, " ").trim();
  if (t.length < 48) return true;
  if (/^[a-záéíóúâêôãõç]/.test(t)) return true;
  if (/^(e|ou|mas|sem|como|quando|enquanto|além|alem|também|tambem)\b/i.test(t)) return true;
  if (/, sem (existir|haver|ter)\b/i.test(t) && !/^[A-ZÁÉÍÓÚ]/.test(t)) return true;
  const virgulas = (t.match(/,/g) ?? []).length;
  if (virgulas >= 2 && !VERBO_TESE.test(t) && !temDefinicao(t)) return true;
  if (!temTese(t) && !/[.!?]$/.test(t)) return true;
  return false;
}

export function perguntaCopiaResposta(pergunta: string, resposta: string): boolean {
  const q = normalizar(pergunta)
    .replace(/^o que o texto afirma sobre /, "")
    .replace(/^o que e /, "")
    .replace(/^qual o mecanismo de /, "")
    .replace(/^qual a excecao citada sobre /, "")
    .replace(/^qual dado numerico o texto cita sobre /, "")
    .replace(/\?$/, "")
    .trim();
  const r = normalizar(resposta);
  if (!q || q.length < 12) return true;
  const extra = r.length - q.length;
  if (r.startsWith(q) && extra < 48) return true;
  if (q.startsWith(r) && r.length < 80) return true;
  return extra < 36 && jaccard(q, r) >= 0.72;
}

export function frasesComPagina(
  texto: string,
  pagina: number,
): { frase: string; pagina: number }[] {
  const partes = texto
    .split(/(?<=[.!?])\s+/)
    .map((f) => f.replace(/\s+/g, " ").trim())
    .filter((f) => f.length > 42 && !pareceFragmento(f));
  return partes.map((frase) => ({ frase, pagina }));
}

export function tituloDeConceito(texto: string): string {
  const limpo = texto.replace(/\s+/g, " ").trim();
  const definicao = limpo.match(
    /^(.{8,72}?)\s+(é o|é a|são o|são a|consiste em|significa|define-se|chama-se|chamamos)\b/i,
  );
  if (definicao?.[1] && !pareceFragmento(definicao[1])) {
    return definicao[1].trim();
  }
  const ateVirgula = limpo.split(",")[0] ?? limpo;
  const base = ateVirgula.length >= 12 && ateVirgula.length <= 72 ? ateVirgula : limpo;
  const palavras = base.split(" ").filter(Boolean).slice(0, 7);
  const corte = palavras.join(" ");
  if (corte.length <= 72) return corte;
  return `${corte.slice(0, 69).trim()}…`;
}
