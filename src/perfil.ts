import type { Perfil } from "./types";

export const CLASSES_CORTE_PADRAO = `A unidade de tema é a AULA (Aula 1, Aula 2…). Cada parte herda o tema da aula.

Distância até o tema da aula: 0 no assunto, 1 perto só se ensina (definição, mecanismo, causa, exceção), 2 longe. Distância 2 não vira card.

Fragmento sem tese não vira card (frase que começa minúscula, lista solta, pergunta que só recorta a resposta).

Páginas antes da primeira aula (capa, professores, ementa, bibliografia, mapa da apostila) não geram card.
Biografia do autor não gera card. Resumo final e avaliação não geram card.

Lixo de apostila: bibliografia, ementa, sumário, “veja as referências”, disciplina 5, currículo do professor, relógio da videoaula.

Não invente. Card sem página é inválido.`;

export function perfilVazio(): Perfil {
  return {
    classesCorte: CLASSES_CORTE_PADRAO,
    cardsInuteis: [],
    conceitosAusentes: [],
  };
}

export function textoDoPerfil(perfil: Perfil): string {
  const partes = [perfil.classesCorte.trim()];

  if (perfil.cardsInuteis.length) {
    partes.push("Cards que o usuário marcou como inúteis (não repetir este tipo de saída):");
    for (const c of perfil.cardsInuteis) {
      partes.push(
        `- ${c.conceito}: ${c.pergunta}${c.nota ? ` (${c.nota})` : ""}`,
      );
    }
  }

  if (perfil.conceitosAusentes.length) {
    partes.push("Conceitos que o usuário marcou como ausentes (preservar se aparecerem):");
    for (const c of perfil.conceitosAusentes) {
      const pag = c.pagina ? ` (p. ${c.pagina})` : "";
      partes.push(`- ${c.conceito}${pag}${c.nota ? `: ${c.nota}` : ""}`);
    }
  }

  return partes.join("\n\n");
}
