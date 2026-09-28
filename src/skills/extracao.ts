import { pareceTitulo } from "../logic/secoes";
import { cortarTrecho, frasesComPagina, limparRelogioApostila } from "../logic/texto";
import type { PaginaTexto, Secao, TrechoExtraido } from "../types";

export function extrairTrechos(secao: Secao, paginas: PaginaTexto[]): TrechoExtraido[] {
  const doIntervalo = paginas.filter(
    (p) => p.pagina >= secao.paginaInicio && p.pagina <= secao.paginaFim,
  );
  const fonte = doIntervalo.length ? doIntervalo : [{ pagina: secao.paginaInicio, texto: secao.texto }];
  const out: TrechoExtraido[] = [];

  for (const p of fonte) {
    const texto = limparRelogioApostila(
      p.texto
        .split("\n")
        .filter((linha) => !pareceTitulo(linha.trim()))
        .join(" "),
    );
    for (const { frase, pagina } of frasesComPagina(texto, p.pagina)) {
      out.push({
        texto: frase,
        pagina,
        trecho: cortarTrecho(frase, 240),
      });
    }
  }

  return out;
}
