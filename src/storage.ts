const CHAVE_PERFIL = "descarta.perfil";
const CHAVE_ESTUDO = "descarta.estudo";

import { perfilVazio } from "./perfil";
import type { Perfil, ResultadoEstudo } from "./types";

export function carregarPerfil(): Perfil {
  try {
    const bruto = localStorage.getItem(CHAVE_PERFIL);
    if (!bruto) return perfilVazio();
    const lido = JSON.parse(bruto) as Partial<Perfil>;
    const base = perfilVazio();
    return {
      classesCorte: lido.classesCorte?.trim() ? lido.classesCorte : base.classesCorte,
      cardsInuteis: Array.isArray(lido.cardsInuteis) ? lido.cardsInuteis : [],
      conceitosAusentes: Array.isArray(lido.conceitosAusentes)
        ? lido.conceitosAusentes
        : [],
    };
  } catch {
    return perfilVazio();
  }
}

export function salvarPerfil(perfil: Perfil): void {
  localStorage.setItem(CHAVE_PERFIL, JSON.stringify(perfil));
}

export function carregarEstudo(): ResultadoEstudo | null {
  try {
    const bruto = localStorage.getItem(CHAVE_ESTUDO);
    if (!bruto) return null;
    return JSON.parse(bruto) as ResultadoEstudo;
  } catch {
    return null;
  }
}

export function salvarEstudo(estudo: ResultadoEstudo): void {
  localStorage.setItem(CHAVE_ESTUDO, JSON.stringify(estudo));
}

export function limparEstudo(): void {
  localStorage.removeItem(CHAVE_ESTUDO);
}
