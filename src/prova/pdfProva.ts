import { PAGINAS_PROVA } from "./capitulo";

const WINANSI: Record<string, string> = {
  á: "\\341",
  à: "\\340",
  â: "\\342",
  ã: "\\343",
  é: "\\351",
  ê: "\\352",
  í: "\\355",
  ó: "\\363",
  ô: "\\364",
  õ: "\\365",
  ú: "\\372",
  ç: "\\347",
  Á: "\\301",
  É: "\\311",
  Í: "\\315",
  Ó: "\\323",
  Ú: "\\332",
  Ã: "\\303",
  Õ: "\\325",
  Ç: "\\307",
  Ê: "\\312",
  Â: "\\302",
  Ô: "\\324",
  "—": "---",
  "“": "\"",
  "”": "\"",
  "’": "'",
};

function escapar(texto: string): string {
  const base = texto.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  return base.replace(/[áàâãéêíóôõúçÁÉÍÓÚÃÕÇÊÂÔ—“”’]/g, (ch) => WINANSI[ch] ?? ch);
}

function streamDaPagina(texto: string): string {
  const linhas: string[] = [];
  for (const bruto of texto.split("\n")) {
    const t = bruto.trimEnd();
    if (!t) {
      linhas.push("");
      continue;
    }
    const palavras = t.split(" ");
    let atual = "";
    for (const p of palavras) {
      const tentativa = atual ? `${atual} ${p}` : p;
      if (tentativa.length > 86) {
        linhas.push(atual);
        atual = p;
      } else {
        atual = tentativa;
      }
    }
    if (atual) linhas.push(atual);
  }

  const cmds = ["BT", "/F1 10 Tf", "50 740 Td"];
  linhas.forEach((linha, i) => {
    if (i > 0) cmds.push("0 -14 Td");
    if (linha) cmds.push(`(${escapar(linha.slice(0, 92))}) Tj`);
  });
  cmds.push("ET");
  return cmds.join("\n");
}

export function blobPdfProva(): Blob {
  const paginas = PAGINAS_PROVA.map(streamDaPagina);
  const objs: string[] = [];
  objs.push("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj");
  const kids = paginas.map((_, i) => `${3 + i * 2} 0 R`).join(" ");
  objs.push(`2 0 obj << /Type /Pages /Kids [${kids}] /Count ${paginas.length} >> endobj`);

  const fontId = 3 + paginas.length * 2;
  paginas.forEach((stream, i) => {
    const pageId = 3 + i * 2;
    const contentId = pageId + 1;
    objs.push(
      `${pageId} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >> endobj`,
    );
    objs.push(
      `${contentId} 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`,
    );
  });
  objs.push(`${fontId} 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >> endobj`);

  let body = "%PDF-1.4\n";
  const offsets = [0];
  for (const obj of objs) {
    offsets.push(body.length);
    body += `${obj}\n`;
  }
  const xrefPos = body.length;
  body += `xref\n0 ${objs.length + 1}\n`;
  body += "0000000000 65535 f \n";
  for (let i = 1; i <= objs.length; i++) {
    body += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer << /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  return new Blob([body], { type: "application/pdf" });
}
