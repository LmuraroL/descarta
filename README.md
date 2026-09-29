# Descarta

**Trabalho acadêmico de MBA** (Data Science e IA para causar disrupção de mercado). Os direitos de uso são **exclusivamente educacionais, acadêmicos e de pesquisa**. Uso comercial não é autorizado.

Leitor **pessoal** de PDFs dos livros e materiais do curso. O sistema lê uma seção de cada vez, colapsa repetição, preserva o que aparece uma única vez e entrega um **índice clicável** de flashcards — sempre com a **página de origem**.

A disrupção não é “mais um chat em cima de PDF”. Ferramentas comuns devolvem resumo genérico e aumentam texto. O Descarta vende **descarte com critério explícito**: repetição colapsada, conceito único preservado, card sem página rejeitado.

Isto **não** redistribui o livro. O arquivo continua com o dono. O app guarda só conceito, pergunta, resposta, página e um trecho curto de apoio.

---

## A ideia

O excesso de informação intoxica o estudo: o mesmo argumento volta três vezes, o preâmbulo histórico não ensina o mecanismo, o exemplo não acrescenta caso. O valor está no que **sai**.

Quatro peças:

1. **Perfil** — classes nomeadas de corte, mais o que você marcou como card inútil ou conceito ausente.
2. **Skills** — extração (trecho + página), deduplicação, flashcard, índice.
3. **Guardrails** — sem página não aparece; não inventa número nem definição; único não some por parecer óbvio; corte só nas classes do perfil.
4. **Harness** — processa por seção, exige saída estruturada, rejeita o que não tem origem.

---

## Como usar

```bash
cd descarta
npm install
npm run dev
```

O navegador abre em geral em `http://localhost:5173`.

1. **Abrir PDF do MBA** (texto selecionável, não foto).
2. Esperar o processamento **por seção**.
3. Clicar numa entrada do índice.
4. Ler os flashcards: pergunta, resposta curta, página.
5. Marcar **card inútil** ou **conceito que faltou** — isso atualiza o perfil e entra na avaliação.

Há um **capítulo de prova** (texto original, não é livro de terceiros) para medir o descarte: cards sem página (deve ser zero), repetição residual, conceitos únicos que não podem sumir.

### Modelo local e IA gratuita

O Descarta tenta o [Ollama](https://ollama.com) nesta máquina só quando você roda `npm run dev`. **GitHub Pages não sobe LLM** — é só arquivo estático.

Para a página pública julgar se a pergunta faz sentido, cada pessoa cola a própria chave gratuita:

1. Groq (recomendado): [console.groq.com/keys](https://console.groq.com/keys) — a chave começa com `gsk_`
2. Gemini: [aistudio.google.com/apikey](https://aistudio.google.com/apikey) — a chave começa com `AIza`

A chave fica no `localStorage` do navegador. Não vá no repositório. Sem chave o app ainda lê o PDF e monta cards com as skills locais.

```bash
ollama pull llama3.2
```

---

## GitHub Pages

O site público é o **build** (pasta `dist`), não o código-fonte. Depois do push em `main`, o Actions publica a branch `gh-pages`.

1. Settings → Pages
2. Branch: **gh-pages** / pasta **/** (root)
3. Abra https://lmurarol.github.io/descarta/

Se a tela ficar branca, o Pages ainda está apontando para `main` (arquivo `index.html` cru, que pede `/src/main.tsx`).

---

## O que isto é (e o que não é)

- É um protótipo acadêmico de extração + corte + cards citados.
- É um PDF **por vez**, na máquina de quem estuda.
- **Não** é resumo longo do capítulo.
- **Não** é leitor de blogs, RSS, nuvem, conta ou app mobile.
- **Não** faz OCR de PDF escaneado.

---

## Perfil de corte

Só cai fora o que estiver numa classe nomeada:

- preâmbulo histórico que não ensina o mecanismo
- exemplo que repete a mesma afirmação sem acrescentar caso, número ou exceção
- reformulação da mesma frase

Regra fixa: repetiu, colapsa e fica a formulação mais clara. Apareceu uma vez, permanece. Definição, número, causa, mecanismo e exceção ficam, mesmo que o texto seja curto.

---

## Prova (a parte de data science)

No capítulo rotulado o app mede:

- card marcado como inútil
- conceito marcado como ausente
- card sem página (alvo: zero)
- repetição que ainda gerou dois cards da mesma afirmação
- se um conceito que aparece **uma única vez** (no conjunto de teste: vazamento de dados) foi apagado

O sucesso não é “gerou texto”. É acertar o descarte.
