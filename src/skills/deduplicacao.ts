import {
  devePreservar,
  jaccard,
  pareceExemploVazio,
  parecePreambuloHistorico,
  pareceReformulacao,
} from "../logic/texto";
import type { Afirmacao, ClasseCorte, Descartes, TrechoExtraido } from "../types";

const LIMIAR = 0.52;
const HISTORIA_FORTE =
  /\b(quetelet|gauss nasceu|legado de|século xix|seculo xix|homem m[eé]dio|pre[aâ]mbulo|genealogia|pitoresca)\b/i;

export function deduplicar(trechos: TrechoExtraido[]): {
  afirmacoes: Afirmacao[];
  descartes: Descartes[];
} {
  const usados = new Set<number>();
  const afirmacoes: Afirmacao[] = [];
  const descartes: Descartes[] = [];
  let n = 0;

  for (let i = 0; i < trechos.length; i++) {
    if (usados.has(i)) continue;
    const grupo = [trechos[i]];
    usados.add(i);
    for (let j = i + 1; j < trechos.length; j++) {
      if (usados.has(j)) continue;
      if (jaccard(trechos[i].texto, trechos[j].texto) >= LIMIAR) {
        grupo.push(trechos[j]);
        usados.add(j);
      }
    }

    const escolhido = formulacaoMaisClara(grupo);
    const corte = classificarCorte(escolhido, afirmacoes);
    const paginas = [...new Set(grupo.map((g) => g.pagina))].sort((a, b) => a - b);
    const historiaForte = HISTORIA_FORTE.test(escolhido.texto);
    const manterApesarDoPreambulo =
      corte === "preambulo_historico" && devePreservar(escolhido.texto) && !historiaForte;

    if (corte && !manterApesarDoPreambulo) {
      descartes.push({
        classe: corte,
        pagina: escolhido.pagina,
        motivo: motivoCorte(corte),
      });
      continue;
    }

    if (grupo.length > 1) {
      for (const g of grupo) {
        if (g === escolhido) continue;
        descartes.push({
          classe: "reformulacao",
          pagina: g.pagina,
          motivo: "Mesma afirmação dita de novo; ficou a formulação mais clara.",
        });
      }
    }

    n += 1;
    afirmacoes.push({
      id: `a${n}`,
      formulacao: escolhido.texto,
      paginas,
      trecho: escolhido.trecho,
      classe: grupo.length > 1 ? "repeticao_colapsada" : "unico",
    });
  }

  return { afirmacoes, descartes };
}

function formulacaoMaisClara(grupo: TrechoExtraido[]): TrechoExtraido {
  const pontua = (t: TrechoExtraido): number => {
    let s = 0;
    if (devePreservar(t.texto)) s += 4;
    const tam = t.texto.length;
    if (tam >= 60 && tam <= 220) s += 2;
    else if (tam < 40) s -= 1;
    if (/[.]$/.test(t.texto)) s += 1;
    return s;
  };
  return [...grupo].sort((a, b) => pontua(b) - pontua(a) || a.texto.length - b.texto.length)[0];
}

function classificarCorte(
  escolhido: TrechoExtraido,
  jaMantidas: Afirmacao[],
): ClasseCorte | undefined {
  if (HISTORIA_FORTE.test(escolhido.texto) || parecePreambuloHistorico(escolhido.texto)) {
    return "preambulo_historico";
  }
  if (pareceReformulacao(escolhido.texto)) return "reformulacao";
  if (pareceExemploVazio(escolhido.texto)) {
    if (/\bimagine que\b/i.test(escolhido.texto) || /\bn[aã]o acrescenta\b/i.test(escolhido.texto)) {
      return "exemplo_repetido";
    }
    const repete = jaMantidas.some((a) => jaccard(a.formulacao, escolhido.texto) >= 0.3);
    if (repete) return "exemplo_repetido";
  }
  return undefined;
}

function motivoCorte(classe: ClasseCorte): string {
  if (classe === "preambulo_historico") {
    return "Preâmbulo histórico que não ensina o mecanismo.";
  }
  if (classe === "exemplo_repetido") {
    return "Exemplo que repete a afirmação sem caso, número ou exceção.";
  }
  return "Reformulação da mesma frase.";
}
