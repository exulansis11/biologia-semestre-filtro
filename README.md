# Biologia Semestre Filtro

Aplicativo de estudo para o semestre filtro de Medicina na Itália. Interface em português do Brasil, questões em italiano com tradução opcional, sem backend.

## O que tem

- 7 unidades, **41 seções** de conteúdo, 706 questões e 187 resolvidas: os dados originais mais as ampliações de t1–t8.
- 8 trilhas expandidas com os modelos de cada assunto, guia de estudo e retomada do próximo passo.
- 35 modelos interativos 2D portados do original e 3 cenas procedurais: célula eucariótica, DNA ao cromossomo e membrana plasmática.
- Quiz, “Verifique”, caderno de erros e simulado com 21 questões de múltipla escolha e 10 de completar, ponderadas por CFU, em 50 minutos.
- Conceitos A–D, certificação por unidade, histórico e gráfico de notas.
- Flashcards, cronograma, modo aula, referências e busca global com `/`.
- Tema escuro/claro, fontes locais, exportação/importação de progresso e PWA offline.

## Rodar

Use Node.js 20 ou superior e npm.

```sh
npm i
npm run dev
```

Abra o endereço exibido pelo Vite. Para verificar e gerar a versão de produção:

```sh
npm run mesclar
npm run typecheck
npm test
npm run build
npm run preview
```

O build fica em `dist/`. Os ícones estão incluídos; para regenerar:

```sh
npm run icons
```

## Ampliar o conteúdo

Edite os arquivos `src/data/ampliacao/tN.json` seguindo `PLANO-AMPLIACAO.md`. Não edite os seis JSON principais manualmente: `npm run mesclar` os regenera sempre de `referencia/dados-originais/` mais todas as ampliações `t*.json`, sem acumular duplicatas. A pasta `referencia/` permanece preservada. Depois rode `npm run typecheck && npm test && npm run build`.

A mesclagem valida ids, seções, unidades, traduções de perguntas e alternativas, cinco opções nas múltiplas escolhas, índice correto das resolvidas e destinos dos passos. Todos os passos originais de cada trilha devem continuar presentes na mesma ordem relativa. As resolvidas novas de cada seção aparecem após o conteúdo correspondente, preservando a ordem dos passos originais. As traduções da ampliação também completam lacunas legadas, incluindo siglas e valores iguais em italiano e português.

As 41 seções têm tabelas de medidas e vocabulário italiano/português e 462 detalhes de prova; os exercícios novos têm explicação detalhada em português. Valores fisiológicos são aproximados e dependem do tipo celular. Para conferir os valores e mecanismos foram consultados, entre outros, [o capítulo sobre potenciais de ação do OpenStax](https://openstax.org/books/anatomy-and-physiology/pages/12-4-the-action-potential), [a descrição experimental de vesículas sinápticas](https://pubmed.ncbi.nlm.nih.gov/18228457/) e [o estudo de vesículas revestidas por clatrina](https://pmc.ncbi.nlm.nih.gov/articles/PMC10016384/).

## Imagens

As figuras vêm do Wikimedia Commons, com domínio público, CC0, CC BY ou CC BY-SA (qualquer versão). Cada figura exibe autor, licença com link e página original; “Referências” reúne todos os créditos. As legendas são em português e, com a tradução ligada, também em italiano. As imagens entram no cache offline somente depois de vistas; ficam fora do precache da PWA.

Há **44 pedidos em 41 seções**. Nesta execução, **0 imagens baixadas e 0 substituídas pela busca**: o ambiente não teve acesso à rede. Todos os pedidos continuam pendentes, listados com título e motivo em `src/data/imagens-relatorio.json`. O manifesto `src/data/imagens.json` não inclui arquivos ausentes.

Em um ambiente com internet, execute:

```sh
npm run imagens
npm run mesclar && npm run typecheck && npm test && npm run build
```

O downloader consulta a API com User-Agent do app e intervalo de 300 ms, tenta o título pedido e depois os dez primeiros resultados da busca, aceitando a primeira imagem com licença livre suportada. Salva thumbnails de até 900 px em `public/imagens/` e créditos em `src/data/imagens.json`. A execução é idempotente: reaproveita arquivos já presentes e recupera os ausentes. Retorna erro quando houver pedidos pendentes e registra todos no relatório. Para rebaixar uma figura, remova apenas seu arquivo local e execute os comandos novamente; para reavaliar sua seleção no Commons, retire também a entrada correspondente do manifesto. Não edite os pedidos nos arquivos de ampliação para fazer o download.

Os testes usam respostas simuladas da API para verificar licença, busca alternativa, download, créditos sem HTML, idempotência, recuperação de arquivo ausente e falha de rede. Também verificam figuras e créditos na interface, alternância da legenda italiana, detalhes de prova e existência de todos os arquivos do manifesto.

## Publicar

**GitHub Pages:** execute `npm ci` e `npm run build` no pipeline e publique o conteúdo de `dist/` com o fluxo oficial de Pages. A configuração `base: './'` e o `HashRouter` permitem publicar em subpastas, sem regras de reescrita. Exemplo de rota: `#/conteudo/c5_1`.

**Netlify:** comando de build `npm run build`, diretório publicado `dist`. As rotas usam hash e não precisam de redirects.

Sirva o build por HTTP ou HTTPS; abrir `index.html` via `file://` não oferece o suporte necessário a módulos e service workers. A instalação da PWA exige HTTPS ou localhost.

## Offline e progresso

Após a primeira visita à versão publicada e a conclusão do cache, o aplicativo funciona offline, incluindo os modelos e as fontes. O modo de desenvolvimento não instala o service worker. Referências externas continuam dependendo da internet. Há um aviso de atualização quando uma nova versão estiver pronta.

O progresso fica na chave `bio_sf_local` do `localStorage`. “Meu progresso” exporta um JSON e permite importar uma cópia validada, substituindo o estado atual após confirmação. A opção de zerar também pede confirmação. Se o armazenamento estiver bloqueado, o estudo continua na sessão, sem garantia de persistência após recarregar. Tema e tradução são preferências locais independentes.

## Organização

- `src/App.tsx`: shell React, HashRouter, tema e busca.
- `src/study.js`: adaptador das telas e regras do original, com eventos limitados ao elemento hospedeiro e descarte no desmonte.
- `src/models/legacy.js`: os 35 motores e seus dados; seletores locais, timers e animações descartáveis.
- `src/three/`: cenas React Three Fiber, seleção de estruturas, rótulos, qualidade e fallback sem WebGL.
- `src/progress.ts`: validação, desempenho, normalização e pontuação.
- `src/data/`: dados gerados a partir dos originais e das ampliações.
- `src/data/ampliacao/t1.json` … `t8.json`: ampliações das oito trilhas, com detalhes e 44 pedidos de imagens.
- `scripts/mesclar-ampliacao.mjs`: mesclagem determinística com validação antes da gravação.
- `scripts/verificar-interface.mjs`: esbuild, adaptador DOM estático e `renderToStaticMarkup`.
- `referencia/`: arquivos originais preservados para consulta.

O projeto usa as versões de React, Router, Three, Fiber, Drei, Vite, TypeScript e PWA do projeto Gestação. O porte conserva código imperativo das telas e dos modelos para preservar a lógica e os textos; o shell, a navegação e o 3D são React/TypeScript. O compilador aceita os módulos JavaScript legados com `allowJs`, sem aplicar `checkJs` a eles.

## Verificações e limites

`npm test` verifica todas as telas/detalhes em renderização estática, inicializa os 35 modelos com um adaptador DOM, valida seus registros/dados, a cobertura das 41 seções, a expansão das trilhas e 15 renderizações das cenas nos níveis 0, 0,25, 0,5, 0,75 e 1. Também testa correção de completar, notas, conceitos, certificação, respostas de quiz, entrega de simulado, importação inválida e armazenamento bloqueado. A ampliação acrescenta validação de ids únicos, traduções de perguntas/opções, extensão dos textos e tabelas, mínimos de exercícios/resolvidas por seção e renderização de `num`/`voc` e `exp` nos quatro caminhos de correção. Uma cópia temporária testa a idempotência da mesclagem e 16 entradas inválidas, verificando que nenhuma falha de validação grava resultados.

Esses testes não substituem uma inspeção visual em navegador real, dispositivos móveis ou GPU. O navegador automatizado ficou indisponível no ambiente de implementação; não foi realizada uma validação visual ou uma sessão offline real. O fallback textual mantém as explicações acessíveis quando WebGL não está disponível. Os modelos são esquemáticos e sem escala; o DNA usa cinco estágios didáticos de compactação.

A regra de nota foi preservada do original: +1 por acerto, −0,25 por erro de múltipla escolha, zero para completar incorreto ou resposta em branco. Datas e regra de avaliação são as fornecidas neste projeto; consulte as referências oficiais antes da prova.

As fontes Bricolage Grotesque, Source Sans 3 e IBM Plex Mono estão incorporadas. Os avisos de direitos autorais e a licença SIL OFL estão em `public/FONT-LICENSES.txt`.

## Professor e aluno

Na primeira abertura, escolha **Sou aluno** ou **Sou professor**. O chip no topo permite trocar o perfil; sair de Professor volta diretamente a Aluno. O professor cria um PIN de 4–6 dígitos, armazenado somente como hash SHA-256, e informa esse PIN ao entrar novamente. O PIN evita entrar por engano; não é proteção forte. **Esqueci o PIN** apaga somente o PIN após confirmação para criar outro. O PIN requer HTTPS ou localhost.

Em **Meu progresso**, o aluno pode **Enviar progresso ao professor** pelo compartilhamento de arquivo do aparelho; quando indisponível, o app baixa o mesmo JSON da exportação para enviar por WhatsApp ou e-mail. Na aba **Professor**, importe esse arquivo no **Painel do aluno**: ele fica separado em `bio_sf_aluno`, preservando `bio_sf_local`. O painel mostra desempenho, conceitos A–D, seções estudadas, trilhas, histórico de simulados, os 15 erros mais frequentes e até três seções para iniciar a próxima aula. Os dados importados podem ser removidos separadamente.

A aba também reúne as semanas do cronograma, links de estudo e o slide independente da Aula 1 (`public/aulas/aula-01.html`). **Mostrar gabarito** começa ligado a cada entrada no perfil Professor e revela respostas e explicações em Verifique, Quiz, Resolvidas e Caderno de erros. No Simulado, a correção continua disponível somente após a entrega. Nas páginas de conteúdo com o campo opcional `prof`, o card recolhível **Para o professor** traz roteiro, perguntas com respostas reveláveis, erros comuns e transição; sua abertura é lembrada. Seções sem `prof` simplesmente não exibem o card. O aluno não vê esse card nem a aba Professor.
