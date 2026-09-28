export type ConceitoEsperado = {
  chave: string;
  rotulo: string;
  termos: string[];
};

export const CONCEITOS_UNICOS_ESPERADOS: ConceitoEsperado[] = [
  {
    chave: "overfitting",
    rotulo: "Overfitting (definição)",
    termos: ["overfitting", "superajuste", "decorou o treino", "decorar o treino"],
  },
  {
    chave: "vies_variancia",
    rotulo: "Viés e variância",
    termos: ["viés", "vies", "variância", "variancia"],
  },
  {
    chave: "saturacao",
    rotulo: "Saturação quando p > n",
    termos: ["p > n", "p>n", "erro de treino cai a zero", "erro de treino cai a 0"],
  },
  {
    chave: "regularizacao",
    rotulo: "Regularização",
    termos: ["regularização", "regularizacao", "penaliza pesos"],
  },
  {
    chave: "excecao",
    rotulo: "Exceção da regularização",
    termos: ["não corrige dado errado", "nao corrige dado errado", "rótulo invertido", "rotulo invertido"],
  },
  {
    chave: "vazamento",
    rotulo: "Vazamento de dados",
    termos: ["vazamento", "leakage", "informação do teste"],
  },
];

export const DEVE_CORTAR = [
  "quetelet",
  "preâmbulo histórico",
  "século xix",
];
