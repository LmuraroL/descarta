export type ClasseCard = "unico" | "repeticao_colapsada";

export type ClasseCorte =
  | "preambulo_historico"
  | "exemplo_repetido"
  | "reformulacao";

export type DistanciaTema = 0 | 1 | 2;

export type ClasseLixo =
  | "bibliografia"
  | "navegacao_apostila"
  | "rotulo_disciplina"
  | "capa_ementa"
  | "instrucao_leitor"
  | "biografia_autor"
  | "mapa_apostila";

export type ClasseGuardrail =
  | ClasseCorte
  | ClasseLixo
  | "longe_do_tema"
  | "nao_ensina"
  | "titulo_sem_afirmacao"
  | "fragmento_sem_tese"
  | "pergunta_copia_resposta"
  | "sem_logica";

export type TemaCapitulo = {
  titulo: string;
  pagina: number;
  tokens: string[];
  nucleo: string[];
};

export type RuntimeModelo = "ollama" | "skills_locais" | "groq" | "gemini";

export type PaginaTexto = {
  pagina: number;
  texto: string;
};

export type Secao = {
  id: string;
  titulo: string;
  paginaInicio: number;
  paginaFim: number;
  texto: string;
};

export type TrechoExtraido = {
  texto: string;
  pagina: number;
  trecho: string;
};

export type Afirmacao = {
  id: string;
  formulacao: string;
  paginas: number[];
  trecho: string;
  classe: ClasseCard;
  corte?: ClasseCorte;
};

export type Card = {
  id: string;
  conceito: string;
  pergunta: string;
  resposta: string;
  pagina: number;
  paginas: number[];
  trecho: string;
  classe: ClasseCard;
  secaoId: string;
  distancia: DistanciaTema;
  incerto?: boolean;
  inutil?: boolean;
};

export type Descartes = {
  classe: ClasseGuardrail;
  pagina: number;
  motivo: string;
};

export type EntradaIndice = {
  id: string;
  titulo: string;
  pagina: number;
  cardIds: string[];
};

export type CardInutil = {
  id: string;
  conceito: string;
  pergunta: string;
  nota?: string;
};

export type ConceitoAusente = {
  id: string;
  conceito: string;
  pagina?: number;
  nota?: string;
};

export type Perfil = {
  classesCorte: string;
  cardsInuteis: CardInutil[];
  conceitosAusentes: ConceitoAusente[];
};

export type StatusSecao = "fila" | "processando" | "ok" | "incerto" | "falha";

export type ProgressoSecao = {
  id: string;
  titulo: string;
  status: StatusSecao;
};

export type RelatorioAvaliacao = {
  cardsSemPagina: number;
  repeticoesResiduais: { a: string; b: string; similaridade: number }[];
  cardsInuteisMarcados: number;
  conceitosAusentesMarcados: number;
  conceitosUnicosEsperados: { chave: string; rotulo: string; presente: boolean }[];
  unicosApagados: string[];
};

export type ResultadoEstudo = {
  arquivo: string;
  runtime: RuntimeModelo;
  modelo?: string;
  prova: boolean;
  secoes: ProgressoSecao[];
  cards: Card[];
  indice: EntradaIndice[];
  descartes: Descartes[];
  avaliacao?: RelatorioAvaliacao;
};

export type SaidaEstruturada = {
  conceito: string;
  pergunta: string;
  resposta: string;
  pagina: number;
  trecho: string;
  classe: ClasseCard;
  distancia?: DistanciaTema;
};
