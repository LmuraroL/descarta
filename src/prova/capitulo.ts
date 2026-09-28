export const PAGINAS_PROVA: string[] = [
  `Capítulo 4 — Viés, variância e o excesso de variáveis

4.1 Uma história que não ensina

No século XIX, Adolphe Quetelet popularizou a ideia de um “homem médio” e coletou medidas sociais com entusiasmo de gabinete. Gauss nasceu em 1777 e deixou um legado de curvas que ainda ilustra capas de livro. Essa genealogia é pitoresca, mas não descreve o que acontece dentro de um modelo que vê variáveis demais. É preâmbulo. O mecanismo ainda não começou.`,

  `4.2 O que é overfitting

Overfitting é o ajuste excessivo ao ruído da amostra de treino: o modelo decora o treino e perde capacidade de generalizar para dados novos. Essa definição aparece aqui uma vez, de forma direta.

Há quem reformule: o modelo ficou tão íntimo da amostra que parou de servir para o mundo. É a mesma afirmação, com outras palavras.

Outra volta: memorizar o conjunto de treino não é aprender a regra que gera os dados. Continua sendo overfitting, dito de novo.`,

  `4.3 Viés, variância e um número

O mecanismo de viés e variância diz o seguinte: erro esperado de previsão decompõe-se em viés (o modelo é simples demais para a função verdadeira) e variância (o modelo oscila demais quando a amostra muda). Overfitting é o regime em que a variância domina.

Quando o número de variáveis p supera o número de observações n, um modelo saturado pode fazer o erro de treino cair a 0. Esse número importa: p > n é o sinal de saturação, não um enfeite.

Por exemplo, imagine que o modelo “foi mal no teste porque decorou o treino”. O exemplo não acrescenta caso, número nem exceção; só repete a definição já dada.`,

  `4.4 Regularização e a exceção

Regularização penaliza pesos grandes para reduzir variância e conter o overfitting. O mecanismo é a restrição da complexidade efetiva do modelo.

Exceção: regularização não corrige dado errado. Se o rótulo está invertido, penalizar pesos não conserta a mentira na tabela. Essa exceção é curta e deve permanecer.

4.5 Vazamento, um conceito que aparece uma vez

Vazamento de dados (data leakage) é deixar chegar ao treino uma informação do teste ou do futuro, por exemplo um identificador que só existe depois do evento. O conceito aparece nesta seção e em nenhuma outra. Não é óbvio demais para descartar: apareceu uma vez, permanece.`,
];

export const TITULO_PROVA = "Capítulo de prova — viés, variância e excesso de variáveis";
