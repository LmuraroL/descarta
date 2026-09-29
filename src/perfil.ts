import type { Perfil } from "./types";

export const CLASSES_CORTE_PADRAO = `A apostila tem âncoras: AULA N • PARTE N (tema da parte), CASE (outro tema), PALAVRA-CHAVE (definição) e EXERCÍCIO DE FIXAÇÃO.

A pergunta do card nasce da âncora. A resposta é o trecho didático logo abaixo do título — proximidade física ao tema, não um recorte solto da frase.

Palavra-chave vira “O que é X?”. Exercício de fixação vira card do enunciado no tema da aula/case. Relógio da videoaula e “os tempos marcam…” não viram card.

Fragmento sem tese não vira card. Páginas antes da primeira aula, biografia, resumo e avaliação não geram card.

Lixo: bibliografia, ementa, sumário, “veja as referências”, currículo do professor.

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
