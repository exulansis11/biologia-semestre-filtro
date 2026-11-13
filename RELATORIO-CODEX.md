# Relatório de implementação — Codex

## Entrega

Foi criado nesta pasta um projeto Vite + React + TypeScript, com `base: './'`, navegação por HashRouter, dependências instaladas e build de produção em `dist/`.

Foram consultados `PLANO.md`, o HTML original, todos os arquivos de referência da Gestação e os 12 JSON de conteúdo. Os dados efetivamente fornecidos contêm **41 seções**, não 34 como indicado no resumo do plano. Todas foram mantidas, assim como as 7 unidades, 173 questões, 64 resolvidas e 8 trilhas. As pastas `referencia/` e `src/data/` foram preservadas.

## O que foi feito

- Shell React com navegação, tema escuro/claro persistente, busca global (`/`), traduções IT/PT e layout responsivo.
- Porte das telas originais de início, trilhas, conteúdo, laboratório, resolvidas, quiz, simulado, flashcards, erros, cronograma, unidades, aula e referências. Acrescentadas as páginas 3D e Meu progresso.
- Guia na ordem t1, t3, t4, t8, t2, t6, t5, t7, expansão das trilhas pela regra original e retomada do próximo passo pendente. A prática da trilha é concluída após terminar o quiz.
- Desempenho por unidade calculado a partir das respostas do quiz, simulado e “Verifique”; conceitos A–D e certificação com todos os textos estudados e pelo menos 70% de acertos.
- Conteúdo completo com formatação, memorização, pegadinhas, modelos associados, questões autocorrigidas, resolvidas e links para 3D.
- Os **35 modelos** foram portados para `src/models/legacy.js`, mantendo seus motores, textos e dados. Os seletores são relativos ao hospedeiro; timers e frames são rastreados e encerrados ao sair/desmontar. A interface apresenta um modelo por vez.
- Simulado de 31 questões, ponderação por CFU, 50 minutos, confirmação de entrega, correção e histórico. A regra exata do original foi mantida: **+1 por acerto; −0,25 por erro de múltipla escolha; zero para completar incorreto ou resposta em branco**.
- Três cenas procedurais em React Three Fiber: célula eucariótica, compactação do DNA e membrana plasmática. Incluem seleção de estruturas, explicações extraídas dos JSON, links, rótulos, OrbitControls, controles de progresso, qualidade baixa inicial e fallback sem WebGL.
- Persistência local protegida por try/catch, exportação JSON, validação/importação e opção de zerar com confirmação. O estado permanece utilizável na sessão se o armazenamento estiver bloqueado.
- PWA com atualização automática, manifest pt-BR, cache dos scripts, estilos, modelos, ícones e fontes. Os PNG 192/512/maskable e o SVG foram gerados pelo script.
- Fontes Bricolage Grotesque, Source Sans 3 e IBM Plex Mono incorporadas localmente, com avisos/licença em `public/FONT-LICENSES.txt`.
- README com execução, publicação em GitHub Pages/Netlify, organização e limites.

## Decisões e limitações

O shell, a navegação, a busca, o progresso e o 3D foram implementados com React/TypeScript. Para preservar o comportamento do original, as telas de estudo e os modelos mantêm seus motores imperativos em módulos JavaScript isolados. O TypeScript usa `allowJs`; os módulos legados não são submetidos a `checkJs`. Não foi realizada uma reescrita integral desses motores em JSX.

As cenas são esquemáticas e sem escala. O controle de compactação do DNA seleciona cinco estágios didáticos; não é uma simulação física contínua.

Não foi possível realizar inspeção visual automatizada, interação real com GPU ou uma sessão real offline: o host de automação de navegador estava indisponível e a tentativa de iniciar o Firefox headless terminou com código 139. Os testes são de renderização estática, dados e lógica; não constituem aprovação visual em celular ou teste ponta a ponta em navegador. Essa validação visual ficou de fora.

Não foram adicionados backend, sincronização em nuvem ou hospedagem/publicação: o projeto funciona localmente e o README explica a publicação. Referências externas precisam de internet.

## Instalação

A tentativa inicial de `npm install` não completou: o ambiente não resolvia o DNS do registro npm e o cache padrão estava fora das áreas graváveis. Foi usado o cache de pacotes já existente, copiado para `/tmp/bio-npm-cache`.

O instalador do esbuild encontrou `EPERM` ao executar sua verificação síncrona de binário. A instalação foi concluída com:

```sh
npm install --offline --ignore-scripts --cache /tmp/bio-npm-cache --no-audit --no-fund
```

Resultado: **código 0, 422 pacotes adicionados**. O esbuild foi verificado depois por compilação efetiva no teste e no build. As versões principais são exatamente as da referência Gestação. Foi adicionado esbuild 0.24.2 como dependência explícita de desenvolvimento para o teste.

As fontes exigidas também foram recuperadas do cache local e incorporadas ao projeto. O funcionamento final não depende desse cache nem de serviços de fontes externos.

## Resultados finais dos comandos

| Comando | Resultado |
| --- | --- |
| `npm run format` | Código 0; fontes de código formatadas, sem reformatar os JSON de conteúdo |
| `npm run icons` | Código 0; ícones gerados |
| `npm run typecheck` | **Código 0; sem erros** |
| `npm test` | **Código 0; aprovado** |
| `npm run build` | **Código 0; aprovado**, 655 módulos transformados |

Saída final do teste:

```text
129 telas/detalhes renderizados; 35 registros de modelos completos; 41 seções com questões e modelos; 15 renderizações 3D; correção, notas, conceitos, trilhas, importação e armazenamento bloqueado aprovados.
```

Os testes usam esbuild, `renderToStaticMarkup` para React/3D e um adaptador DOM estático para os motores imperativos. Além das páginas, verificam as 41 leituras e 64 resolvidas; inicializam os 35 modelos; validam dados de animações/classificação; conferem expansão sem duplicação das trilhas; renderizam cada cena nos níveis 0, 0,25, 0,5, 0,75 e 1; exercitam respostas de quiz, erros, sorteio ponderado, entrega do simulado em branco e certificação.

O build gerou `manifest.webmanifest`, `sw.js`, `workbox-9c191d2f.js` e **18 entradas de precache (1595,84 KiB)**, incluindo as fontes locais. O Vite apresentou somente o aviso de chunks maiores que 500 kB: aproximadamente 592 kB para o app/conteúdo e 840 kB para o visualizador 3D, antes de gzip. O 3D permanece carregado sob demanda. Não houve erro de compilação ou de geração do service worker.
