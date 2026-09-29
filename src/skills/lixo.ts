import type { ClasseLixo } from "../types";

export type AchadoLixo = {
  lixo: true;
  classe: ClasseLixo;
  motivo: string;
};

const BIBLIOGRAFIA =
  /\b(bibliografia|refer[eê]ncias(\s+bibliogr[aá]ficas)?|refer[eê]ncias principais|obras citadas|leituras (obrigat[oó]rias|sugeridas))\b/i;

const CAPA_EMENTA =
  /\b(ementa|ficha catalogr[aá]fica|isbn|issn|conte[uú]do program[aá]tico|objetivos da disciplina|carga hor[aá]ria|conhe[cç]a o livro)\b/i;

const NAVEGACAO =
  /\b(sum[aá]rio|[ií]ndice(\s+remissivo)?|tabela de conte[uú]do|table of contents|conhe[cç]a o livro da disciplina)\b/i;

const INSTRUCAO =
  /\b(veja as|veja o|veja refer|consulte|confira como|relembre os|veja as informa[cç][oõ]es sobre o teste|na vers[aã]o online|clique nas alternativas|clique em|acesse o)\b/i;

const ROTULO = /\bdisciplina\s*\d+\b/i;

const BIOGRAFIA =
  /\b(conhe[cç]a seus professores|possui gradua[cç][aã]o|mestrado em|doutorado em|professor (assistente|convidado|pucrs)|ceo e cofundador|minicurr[ií]culo|curr[ií]culo lattes)\b/i;

const MAPA_APOSTILA =
  /\b(o que comp[oõ]e o mapa da aula|mapa da aula s[aã]o os cap[ií]tulos|destaques conte[uú]dos essenciais|os tempos marcam os principais momentos)\b/i;

export function identificarLixo(texto: string): AchadoLixo | undefined {
  const t = texto.replace(/\s+/g, " ").trim();
  if (!t) {
    return { lixo: true, classe: "navegacao_apostila", motivo: "Trecho vazio." };
  }
  if (/^AULA\s+\d+\s*[•·]\s*PARTE\s+\d+/i.test(t) && t.length < 80) {
    return undefined;
  }
  if (/^\d{1,2}:\d{2}$/.test(t)) {
    return {
      lixo: true,
      classe: "mapa_apostila",
      motivo: "Marcação de tempo da videoaula, não matéria.",
    };
  }
  if (BIOGRAFIA.test(t)) {
    return {
      lixo: true,
      classe: "biografia_autor",
      motivo: "Biografia ou currículo do professor — não é o tema da aula.",
    };
  }
  if (MAPA_APOSTILA.test(t)) {
    return {
      lixo: true,
      classe: "mapa_apostila",
      motivo: "Legenda da apostila (mapa, destaques, relógio da videoaula), não conteúdo da aula.",
    };
  }
  if (BIBLIOGRAFIA.test(t)) {
    return {
      lixo: true,
      classe: "bibliografia",
      motivo: "Lista ou título de referências — norma de apostila, não matéria.",
    };
  }
  if (CAPA_EMENTA.test(t)) {
    return {
      lixo: true,
      classe: "capa_ementa",
      motivo: "Capa, ementa ou ficha da disciplina — não é conteúdo didático.",
    };
  }
  if (NAVEGACAO.test(t)) {
    return {
      lixo: true,
      classe: "navegacao_apostila",
      motivo: "Sumário ou índice — só organiza o arquivo.",
    };
  }
  if (INSTRUCAO.test(t) && !/\b(verdadeiro|falso)\b/i.test(t) && !/exerc[ií]cio de fixa/i.test(t)) {
    return {
      lixo: true,
      classe: "instrucao_leitor",
      motivo: "Instrução ao leitor (veja, consulte, clique), não um conceito.",
    };
  }
  if (ROTULO.test(t) && !/[.!?].{20,}/.test(t)) {
    return {
      lixo: true,
      classe: "rotulo_disciplina",
      motivo: "Rótulo de catálogo da disciplina, não dado de estudo.",
    };
  }
  return undefined;
}

export function ehLixo(texto: string): boolean {
  return Boolean(identificarLixo(texto));
}
