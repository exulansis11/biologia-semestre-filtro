# Ampliação das trilhas — plano para o Codex

Objetivo: deixar cada uma das 8 trilhas no nível da prova de Biologia do **semestre filtro de Medicina na Itália** (antigo TOLC-MED / test di Medicina), com mais detalhe e **números que caem** (tamanhos de componentes celulares, distâncias, espessuras, concentrações, tempos, estequiometrias), e com **questões em italiano + tradução em português** e **explicação detalhada**. O conteúdo para o professor explicar fica em português.

Os dados originais estão preservados em `referencia/dados-originais/` (não altere essa pasta).

## Arquitetura (não edite os JSON principais à mão)

1. Cada trilha tem UM arquivo de ampliação: `src/data/ampliacao/t1.json` … `t8.json` (formato abaixo).
2. `scripts/mesclar-ampliacao.mjs` lê **sempre** os originais de `referencia/dados-originais/` + todos os `src/data/ampliacao/t*.json` e grava os JSON principais em `src/data/` (`conteudo.json`, `questoes.json`, `resolvidas.json`, `trilhas.json`, `questoes-por-assunto.json`, `traducao-pt.json`). Como parte sempre dos originais, rodar duas vezes dá o mesmo resultado. Script npm: `"mesclar": "node scripts/mesclar-ampliacao.mjs"`. O script valida e falha com mensagem clara se: id duplicado; seção inexistente; resolvida/questão sem tradução de `q` ou de qualquer opção; `mc` sem exatamente 5 opções; `c` fora do intervalo; passo de trilha apontando para id inexistente; trilha que perdeu algum passo original.
3. Interface (`src/study.js`), renderizar os campos novos opcionais:
   - Conteúdo: depois do texto, card **"Números e medidas que caem"** (tabela de `num`: Grandeza · Valor · Para lembrar) e card **"Vocabulário da prova (IT → PT)"** (tabela de `voc`). Tabelas com rolagem horizontal própria em telas estreitas (a página não pode rolar na horizontal a 360 px).
   - Questões (`questoes.json`): quando houver `exp`, mostrar abaixo do `ex` um bloco **"Explicação detalhada"** com lista numerada (`inl()` para negrito/itálico) em TODOS os lugares onde o comentário aparece (Verifique, Quiz, correção do Simulado, Caderno de erros).
   - Nada mais muda na interface.
4. `scripts/verificar-interface.mjs`: manter tudo passando e acrescentar verificações: ids únicos; toda questão/resolvida com `q` e opções traduzidas; toda seção com `num` ≥ 6 linhas e `voc` ≥ 8 linhas *quando a seção já tiver ampliação*; renderização de uma seção com `num`/`voc` e de uma questão com `exp`.
5. Atualizar as contagens no `README.md`.

## Formato de `src/data/ampliacao/tN.json`

```json
{
  "trilha": "t1",
  "secoes": {
    "c5_1": {
      "txt": ["… texto completo reescrito e ampliado (substitui o original) …"],
      "chave": ["… substitui o original, 5–8 itens …"],
      "pega": "… substitui o original (pode manter) …",
      "num": [["Espessura da membrana plasmática", "≈ 7–10 nm", "≈ 1/1000 da espessura de uma folha de papel; vista só ao ME"]],
      "voc": [["doppio strato fosfolipidico", "bicamada fosfolipídica"]]
    }
  },
  "questoes": [
    {"id": "xt1_01", "tipo": "mc", "u": 5, "ct": "c5_1", "q": "…italiano…", "opts": ["correta", "d1", "d2", "d3", "d4"], "ex": "1–2 frases PT", "exp": ["passo 1 PT", "…", "Por que as outras erram: …"]},
    {"id": "xt1_02", "tipo": "cp", "u": 5, "ct": "c5_1", "q": "…con ____ …", "acc": ["resposta", "variante"], "ex": "…", "exp": ["…"]}
  ],
  "resolvidas": [
    {"id": "rt1_01", "u": 5, "ct": "c5_1", "q": "…italiano…", "o": ["…5 opções…"], "c": 2, "passos": ["…PT…"], "por": ["por que a opção 0 erra", "", "…"], "pega": "…"}
  ],
  "traducao": {"texto italiano exato de q e de cada opção": "tradução PT"},
  "passos": [["c","c5_1","ponte"], ["r","rt1_01","ponte"], "… lista COMPLETA de passos da trilha: todos os originais, na mesma ordem relativa, mais os novos …"]
}
```
- `campo ct` nas questões é usado para acrescentar o id em `questoes-por-assunto.json` (o campo pode ficar no JSON final).
- Questões `mc`: a 1ª opção é a correta (o app embaralha). Resolvidas: `c` = índice da correta e `por` com 5 posições (vazia na correta). Siga exatamente o formato das existentes em `referencia/dados-originais/resolvidas.json` (inclusive resolvidas `tipo:"cp"` se usar).

## Regras de conteúdo (as mais importantes)

- **Nível e estilo:** prova italiana de Biologia para Medicina (syllabus em `src/data/units.json`, campo `topicos`). Questões curtas, 5 alternativas, distratores plausíveis, pegadinhas de leitura, comparação de grandezas e unidades (nm, µm, mm; Å), ordem de grandeza, “qual é a MENOR/MAIOR”, “quale affermazione è FALSA”, cálculo simples (ex.: nº de voltas da hélice, comprimento de DNA, rendimento de ATP).
- **Precisão acima de tudo.** Use valores consensuais de livros-texto (Alberts *Essential Cell Biology* / *Molecular Biology of the Cell*, Campbell, Sadava/Purves, Lodish, e os textos italianos usuais). Quando as fontes divergem, dê faixa e “≈”. **Se não tiver certeza de um número, não o use.** Não invente epônimos, siglas ou valores.
- Exemplos de grandezas esperadas (use as pertinentes a cada seção, com valores corretos): célula animal, bactéria, vírus, núcleo, poro nuclear, nucléolo, mitocôndria, cloroplasto, ribossomo 70S/80S e subunidades, lisossomo e pH, peroxissomo, vesículas, espessura da membrana, diâmetro de microtúbulo/actina/filamento intermediário, DNA (2 nm, 0,34 nm/pb, 10,5 pb/volta, 3,4 nm/volta), nucleossomo (147 pb, ≈11 nm, fibra de 30 nm), cromossomo metafásico, genoma humano (≈3,1×10⁹ pb, ≈20 000 genes codificantes, ≈2 m de DNA por célula diploide), potenciais de membrana e concentrações iônicas, velocidade de condução, rendimento de ATP, tempo do ciclo celular, telômeros (TTAGGG), códons, etc.
- **Texto (`txt`)** em português do Brasil, reescrito e ampliado: mantém TODOS os fatos do original e acrescenta mecanismo + números; 450–800 palavras por seção; markdown simples (`**negrito**`, `*itálico*`, linhas `- ` para listas; uma linha `### Subtítulo` permitida). Termos da prova em italiano entre parênteses na primeira vez (ex.: “bicamada (*doppio strato*)”).
- **`num`:** 6–15 linhas por seção. **`voc`:** 8–15 termos por seção.
- **Questões de exercício:** por seção, **≥ 8 novas** (≥ 6 `mc` e ≥ 2 `cp`), das quais **≥ 3 numéricas/de grandeza**. `q`/`opts` em italiano correto; toda `q` e toda opção com entrada em `traducao`. `exp` com 3–6 passos em PT explicando o raciocínio **e por que cada distrator está errado**.
- **Resolvidas (questões com resposta explicada dentro da trilha):** por seção, **≥ 2 novas**, inseridas nos `passos` logo depois do passo `c` daquela seção, com uma ponte curta em PT (como as existentes).
- `u` de cada questão = unidade da seção.
- Ids: questões `xtN_01…`, resolvidas `rtN_01…` (N = número da trilha). Nunca reutilize ids existentes.

## Divisão por trilha (cada seção pertence a uma só trilha)

| Trilha | Seções que ela amplia |
|---|---|
| t1 | c5_1, c5_2, c5_9 |
| t2 | c2_2, c3_1, c3_2, c3_3, c3_5, c3_6, c3_7, c3_4 |
| t3 | c5_8, c5_7, c5_10 |
| t4 | c1_4, c5_4, c5_5, c5_6 |
| t5 | c6_1, c6_2, c6_3, c6_4, c7_1, c7_2, c7_5 |
| t6 | c4_1, c4_2, c7_4, c4_3, c4_4, c4_5 |
| t7 | c1_3, c1_5, c1_1, c1_2, c2_1, c2_4, c2_3 |
| t8 | c5_3, c5_11, c7_3 |

Uma trilha pode ter passos que apontam para seções de outra trilha (ex.: t3 passa por c5_9 e c3_6); não amplie essas, só as da sua linha.

## Conferência ao fim de cada trilha
`npm run mesclar && npm run typecheck && npm test && npm run build` sem erros. Relate em até 10 linhas: palavras por seção, nº de linhas `num`/`voc`, nº de questões e resolvidas novas, e qualquer número sobre o qual tenha dúvida.
