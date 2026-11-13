# Fase 2 — detalhes "cri-cri", mais questões e imagens públicas

Continua o `PLANO-AMPLIACAO.md` (leia-o: formato dos arquivos `src/data/ampliacao/tN.json`, regras de precisão, ids, tradução). Tudo o que já existe nos `tN.json` foi revisado e está correto: **não reescreva textos, `num`, `voc` nem questões existentes**, só ACRESCENTE.

A prova (semestre filtro de Medicina na Itália) adora detalhes "cri-cri": exceções, comparações finas, nomenclatura exata, "qual é FALSA", ordens de grandeza, unidades trocadas, localização exata (qual membrana, qual compartimento, qual lado, qual extremidade 5'/3', N/C-terminal), quem é a exceção à regra, falsos amigos IT↔PT.

## A) Conteúdo — em CADA seção da sua trilha, acrescente ao objeto da seção:

1. `"detalhes"`: 10–15 strings em PT, cada uma um detalhe que a prova cobra e que o aluno costuma errar. Formato: frase curta e afirmativa, com o termo em italiano entre parênteses quando útil, e **negrito** no ponto-chave. Exemplos do tipo esperado (use só os pertinentes e corretos):
   - "**Hemácias maduras** de mamíferos não têm núcleo **nem mitocôndrias**: fazem só glicólise."
   - "Células vegetais superiores **não têm centríolos**, mas formam fuso."
   - "Mitocôndrias e cloroplastos têm ribossomos **70S**, não 80S."
   - "A **SRP** reconhece a sequência-sinal **na proteína nascente**, não no mRNA."
   - "**Ångström**: 1 Å = 0,1 nm (≠ 1 nm)."
2. `"img_pedidos"`: 1–3 imagens do **Wikimedia Commons** que ajudem a explicar a seção (micrografias ME/MO reais, diagramas com legenda). Para cada uma:
   `{"titulo": "File:Nome exato.svg|png|jpg (o que você acredita existir no Commons)", "busca": "consulta em inglês para achar alternativa no Commons se o título não existir", "legenda": "legenda didática em PT (1–2 frases, com o que observar)", "legenda_it": "a mesma em italiano", "alt": "descrição curta PT"}`.
   Prefira autores conhecidos de diagramas em domínio público (ex.: LadyofHats / Mariana Ruiz Villarreal) e micrografias de domínio público (NIH, CDC/PHIL, Dartmouth Electron Microscope Facility). Não use imagens de livros ou com marca d'água.

## B) Questões — em CADA seção, acrescente:
- **≥ 5 questões "cri-cri"** novas (≥ 4 `mc`, ≥ 1 `cp`) sobre os `detalhes`: exceções, "quale affermazione è FALSA/ERRATA", "tutte le seguenti TRANNE", unidades/ordens de grandeza, localização exata. Mesmo formato e exigências das existentes (`exp` 3–6 passos explicando também os distratores; `q` e TODAS as opções em `traducao`).
- **1 resolvida "cri-cri"** nova, inserida nos `passos` logo após as resolvidas daquela seção.
- Ids: continue a numeração existente do arquivo (`xtN_..`, `rtN_..`), sem repetir.

## C) Só para a t2
A t2 ficou incompleta: faltam **todas** as resolvidas e a lista `passos`. Crie ≥ 2 resolvidas por seção (como em t3–t8) + a resolvida cri-cri do item B, e monte `passos` completo: todos os passos originais da t2 (`referencia/dados-originais/trilhas.json`), **exatamente na mesma ordem relativa**, com as novas resolvidas logo depois do passo `c` de cada seção.

## Validação (por trilha, sem tocar em outros arquivos)
`node scripts/mesclar-ampliacao.mjs --so-validar --trilha tN` deve passar. O script ainda não conhece `detalhes`/`img_pedidos`; tudo bem, ele ignora campos extras. Não rode mesclar/test/build: outros processos trabalham em paralelo.

---

## D) Infraestrutura (UM processo separado, depois do conteúdo)
1. `scripts/baixar-imagens.mjs` (`npm run imagens`): lê `img_pedidos` de todos os `tN.json`; para cada pedido usa a API do Commons (`action=query&prop=imageinfo&iiprop=url|extmetadata|mime&iiurlwidth=900`) pelo `titulo`; se não existir ou a licença não for livre, usa `list=search` (`srnamespace=6`) com `busca` e pega o 1º resultado de imagem com licença aceita. Licenças aceitas: domínio público, CC0, CC BY, CC BY-SA (qualquer versão). Baixa o thumbnail de até 900 px para `public/imagens/<secao>-<n>.<ext>` e grava `src/data/imagens.json`: `{ "<secao>": [{ "arquivo": "imagens/…", "legenda", "legenda_it", "alt", "titulo_commons", "autor" (texto puro, sem HTML), "licenca", "licenca_url", "pagina": "https://commons.wikimedia.org/wiki/File:…", "trocada": true|false }] }`. User-Agent identificando o app. Pausa de ~300 ms entre pedidos. Idempotente (não baixa de novo o que já existe). Relata pedidos sem imagem.
2. `scripts/mesclar-ampliacao.mjs`: passar `detalhes` para `conteudo.json` (validar 10–15 itens quando a seção tiver ampliação) e anexar `img` (de `imagens.json`) às seções; ignorar `img_pedidos` no JSON final.
3. `src/study.js`, na página de conteúdo: card **"Detalhes que a prova cobra"** (lista, `inl()`) logo depois de "Pegadinha de prova"; figuras (`<figure>` com `<img loading="lazy" alt>` responsiva, legenda PT, legenda IT em itálico menor quando a tradução estiver ligada, e linha de crédito "Autor · Licença · Wikimedia Commons" com links) depois do texto. Na página **Referências**, seção "Créditos das imagens" listando todas.
4. PWA (`vite.config.ts`): não colocar as imagens no precache; usar `runtimeCaching` CacheFirst para `/imagens/` (assim ficam offline depois de vistas).
5. `scripts/verificar-interface.mjs`: verificar detalhes, figuras com alt e crédito, e que todo arquivo em `imagens.json` existe.
6. README: contagens e seção "Imagens" (origem, licenças, como rebaixar).
7. Rodar `npm run imagens && npm run mesclar && npm run typecheck && npm test && npm run build`.
