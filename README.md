# Descarta

Trabalho acadêmico de MBA (Data Science e IA para causar disrupção de mercado). Uso **educacional, acadêmico e de pesquisa**. Uso comercial não é autorizado. Ver [LICENSE](LICENSE).

O Descarta lê **um PDF de estudo por vez** e entrega flashcards só do que importa: o repetido sai, o lixo de apostila sai, e cada card cita a **página**.

Não é chat em cima de PDF. O valor está no que **não** vira card.

O arquivo do livro **não sobe para o GitHub**. Fica no navegador. O app guarda no `localStorage` só conceito, pergunta, resposta, página e um trecho curto.

**Versão pública:** [lmurarol.github.io/descarta](https://lmurarol.github.io/descarta/)

---

## Como usar

1. Abra o site (ou rode localmente).
2. Opcional: cole uma chave de IA gratuita (Groq `gsk_…` ou Gemini `AIza…`) no campo da tela inicial. Sem chave o app funciona igual, só com as regras locais.
3. Envie um PDF **com texto selecionável** (não foto / scan).
4. Espere **desinfoxicando o conteúdo**.
5. Estude no card: toque para virar (pergunta creme → resposta verde), **Anterior** / **Próximo**, página no canto.
6. **Este card não é relevante** tira aquele card. **Enviar outro PDF** recomeça.

---

## O que o app descarta

A apostila é lida por **âncoras**: `AULA N • PARTE N`, títulos de tema (ex.: *Da Abundância de Dados à Síntese Inteligente*), `CASE`, `PALAVRA-CHAVE` e `EXERCÍCIO DE FIXAÇÃO`. A pergunta nasce do tema; a resposta é o texto **logo abaixo** desse título.

Também não vira card:

- capa, ementa, bibliografia, sumário, currículo do professor
- relógio de videoaula (`04:21`) e citação da margem colada no texto
- fragmento sem tese (frase cortada, lista solta)
- pergunta que só recorta a resposta
- repetição da mesma afirmação (fica a formulação mais clara)

O que ensina e está no tema permanece: metáfora, definição (palavra-chave vira “O que é X?”), mecanismo, enunciado de exercício, causa, exceção — sempre com página.

---

## IA (opcional)

| Onde | O que faz |
| --- | --- |
| Site no GitHub Pages | Skills no navegador. Se você colar a chave, Groq ou Gemini **julga se a pergunta faz sentido** e corta card sem lógica. |
| `npm run dev` | Tenta também o [Ollama](https://ollama.com) nesta máquina. Se não estiver rodando, cai nas skills locais. |

A chave fica só neste navegador. Não vá no repositório.

- Groq: [console.groq.com/keys](https://console.groq.com/keys)
- Gemini: [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

GitHub Pages **não hospeda LLM**. Não coloque pesos de modelo no git.

---

## Rodar localmente

```bash
npm install
npm run dev
```

Em geral: `http://localhost:5173` (ou a porta seguinte, se a 5173 estiver ocupada).

```bash
npm run build
npm run preview
```

Ollama, se quiser no desenvolvimento:

```bash
ollama pull llama3.2
```

---

## GitHub Pages

O que o visitante vê é o **build** (`dist/`), publicado na branch `gh-pages` a cada push em `main`.

1. Settings → Pages
2. Branch: **gh-pages** / pasta **/** (root)
3. Site: https://lmurarol.github.io/descarta/

Se a tela ficar branca, o Pages ainda está em `main` (o `index.html` cru pede `/src/main.tsx` e quebra).

---

## O que isto não é

- Resumo longo do capítulo
- Chat genérico com o livro
- OCR de PDF escaneado
- Leitor de blogs, RSS, nuvem ou app mobile
- Redistribuição do material protegido
