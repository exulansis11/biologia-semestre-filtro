# Biologia Semestre Filtro — plano de implementação

App de estudo de Biologia para a prova do semestre filtro de Medicina na Itália (31 questões, 50 min, appelli em 10/12/2026 e 11/01/2027). Hoje existe como um arquivo HTML único (`referencia/app-original.html`, ~450 KB, funcional). Este projeto o transforma num app no mesmo padrão do projeto **Histologia da Gestação** (`referencia/gestacao/`): Vite + React + TypeScript, PWA offline, cenas 3D procedurais, teste de interface. Interface e conteúdo em português do Brasil; questões em italiano com tradução.

## Regras

- Não invente conteúdo científico. Todo o conteúdo já está em `src/data/*.json` (extraído do app original). Use-o como está.
- Mesmas versões de dependências do `referencia/gestacao/package.json` (react 18.3.1, react-router-dom 6.28.0, three 0.170.0, @react-three/fiber 8.17.10, @react-three/drei 9.117.3, vite 6.0.3, vite-plugin-pwa 0.21.1, typescript 5.6.3). `base: './'` e HashRouter, para abrir de qualquer pasta e no GitHub Pages.
- Sem backend. Progresso salvo em `localStorage` (envolto em try/catch), com exportar/importar progresso em JSON na página Meu progresso.
- Acessível: foco visível, `aria-label` em controles só com ícone, respeitar `prefers-reduced-motion`, contraste AA.
- Celular primeiro: tudo usável a 360 px de largura, sem rolagem horizontal da página.

## Dados (`src/data/`, já prontos)

| Arquivo | Conteúdo |
|---|---|
| `units.json` | 7 unidades: id, nome (it), pt, cfu, topicos (it) |
| `conteudo.json` | 34 seções: id, u, t, it, le, txt (linhas; `- ` = item de lista; `**negrito**`, `*itálico*`), chave, pega |
| `questoes.json` | 173 questões: `mc` (opts, a 1ª é a correta; embaralhar ao exibir) e `cp` (completar; `acc` = respostas aceitas, comparar sem acento/caixa/pontuação) com `ex` (comentário) |
| `questoes-por-assunto.json` | id da seção → ids de questões |
| `resolvidas.json` | 64 questões discutidas: mc (`o`, `c` = índice correto, `passos`, `por`, `pega`, `ct`) e cp (`tipo:"cp"`, `acc`, `resp`, `passos`, `pega`, `ct`) |
| `trilhas.json` | 8 trilhas: passos `[tipo, id, ponte]`; tipo `c` conteúdo, `r` resolvida, `m` modelo, `q` prática da unidade |
| `traducao-pt.json` | texto italiano → português (mostrar abaixo do italiano; botão global liga/desliga) |
| `aulas.json`, `glossario.json`, `cronograma.json`, `referencias.json`, `provas.json` | modo aula, flashcards, cronograma, referências, datas das provas |

## Visual (tema escuro polido, como QuimiAnalítica/Fisiologia Interativa)

- Escuro por padrão, com alternância para claro (salva). Paleta "lâmina H&E": fundo `#0E1618`, superfície `#162125`, afundado `#1D2A2E`, texto `#E2EBE9`, texto suave `#97A8AA`, linha `#2B3B3F`, eosina `#EE7FA3`, hematoxilina `#ADA0F2`, ok `#6FCF9C`, erro `#F2918A`, aviso `#E5B95C`. Tema claro: as cores do `:root` do app original.
- Fontes: Bricolage Grotesque (títulos), Source Sans 3 (texto), IBM Plex Mono (rótulos). Embutir via `@fontsource` ou arquivos locais para funcionar offline.
- Títulos grandes com uma palavra de destaque em eosina (como os posts do QuimiAnalítica), cards com borda sutil e raio 14 px, ícones SVG próprios (nada de emoji).

## Páginas (rotas)

1. **Início (painel)** — contagem regressiva para os dois appelli; "Continuar de onde parei" (próximo passo não feito da trilha atual); **guia de estudo 1→8** (as trilhas na ordem recomendada: t1, t3, t4, t8, t2, t6, t5, t7) com progresso; **desempenho por unidade com conceito A–D** (A ≥ 85% de acerto, B ≥ 70%, C ≥ 50%, D abaixo; calculado sobre questões respondidas em quiz, simulado e "Verifique") e **unidade certificada ✓** quando todos os textos da unidade foram marcados como estudados e o acerto da unidade ≥ 70%; gráfico das últimas notas de simulado com linha em 18.
2. **Trilhas** — lista e detalhe. Ao carregar, expandir cada trilha: depois de cada passo `c`, inserir os modelos cujo `ct` inclui aquela seção e que ainda não estão na trilha (mesma regra do app original, função perto de "trilhas: cada assunto ganha os seus interativos"). Cada passo abre a página certa e tem "Concluir passo e voltar".
3. **Conteúdo** — lista por unidade e leitura: texto, "Para memorizar", "Pegadinha", cards dos modelos 2D/3D ligados à seção, bloco **Verifique** (questões de `questoes-por-assunto`, autocorrigidas na hora, com comentário; erros vão para o Caderno de erros), links para resolvidas da seção, "Marcar como estudada".
4. **Laboratório** — todos os modelos interativos (abaixo) com filtro por unidade.
5. **3D** — as cenas 3D novas (abaixo).
6. **Resolvidas**, **Quiz**, **Simulado** (31 questões ponderadas por CFU, 50 min, +1/−0,25/0, entrega e correção), **Flashcards**, **Caderno de erros**, **Cronograma**, **Aula** (modo apresentação), **Referências**, **Meu progresso** (exportar/importar/zerar).
7. **Busca global**: tecla `/` abre; indexa títulos e textos das seções, questões e modelos.

Copie a lógica exata de cada tela do app original (`referencia/app-original.html`): textos, regras do simulado, ponderação, correção de completar, tradução IT+PT etc.

## Modelos interativos 2D (porte do original)

O original tem 35 modelos em JS puro que recebem um elemento e o preenchem (`MODELS` e `NEWM`; funções `mPot`, `mBomba`, `mCadeia`, `mEnder`, `mLac`, `mGene`, `mPunnett`, `mHeredo`, `mMeiose`, `mCiclo`, `mSinal`, `mEnz`, `mCro`, `mMot`, os motores `mkStepper` com os dados `ANIMS` e `mkSorter` com `SORTS`, e o mini-quiz `mq`).
- Porte para `src/models/` preservando comportamento, textos e dados. Pode manter o código imperativo dentro de um componente `<LegacyModel id>` que monta num `ref` e limpa timers/animações no desmonte (substitua `$`, `LAB.timers`, `every`/`later`/`labStop` por versões locais ao modelo). Não use ids globais duplicados se dois modelos puderem coexistir.
- Visual dos modelos: painéis "instrumento de laboratório" escuros, coerentes com o tema.

## Cenas 3D novas (`src/three/`, procedurais, como na Gestação)

Mesmo esquema do `referencia/gestacao/Viewer3D.tsx` (lazy, detecção de WebGL, aviso amigável sem WebGL, OrbitControls, rótulos liga/desliga, tocar numa estrutura abre um painel com explicação e link para a seção de conteúdo, qualidade baixa por padrão no celular):
1. **Célula eucariótica** — membrana, núcleo com poros e nucléolo, RE rugoso com ribossomos, RE liso, Golgi (cis/trans), mitocôndrias com cristas, lisossomos, peroxissomos, centrossomo, microtúbulos. Cada estrutura clicável → seção correspondente (c5_3, c5_7, c5_5, c5_10, c5_6, c5_11…).
2. **Do DNA ao cromossomo** — controle de nível (0→1): dupla hélice → nucleossomos (octâmero + DNA) → fibra → alças → cromossomo metafásico com centrômero e telômeros. Links c2_2, c2_1, c3_1.
3. **Membrana plasmática** — bicamada com fosfolipídios, colesterol, canal, Na⁺/K⁺-ATPase (íons animados), transportador ABC, GPCR com proteína G, glicocálice. Links c5_1, c5_2, c6_3.
Cada cena com a mesma explicação didática em português, curta e correta, usando só fatos já presentes em `conteudo.json`.

## PWA

`vite-plugin-pwa` como na Gestação (`registerType: 'autoUpdate'`, manifest pt-BR, ícones 192/512/maskable gerados por script como `referencia/gestacao/gerar-icones.mjs`, tema `#0E1618`). Funciona offline após a primeira visita, inclusive fontes.

## Teste (`npm test`)

Script como `referencia/gestacao/verificar-interface.mjs` (esbuild + renderToStaticMarkup), verificando no mínimo:
- cada rota renderiza sem erro;
- os 35 modelos montam num elemento (use jsdom só se precisar) ou, no mínimo, seus dados existem e estão completos;
- as 3 cenas 3D renderizam com níveis 0, 0,5 e 1 (o markup contém `mesh`);
- toda seção de `conteudo.json` tem ≥1 questão e ≥1 modelo (2D ou 3D);
- correção de completar ignora acentos e caixa;
- cálculo da nota do simulado (+1/−0,25/0) e dos conceitos A–D.

`npm run build` e `npm run typecheck` precisam passar sem erros.

## Entrega

- `README.md` no estilo do README da Gestação: o que tem, como rodar (`npm i`, `npm run dev`), como gerar o build, como publicar (GitHub Pages / Netlify), avisos.
- Não apague `referencia/` nem `src/data/`.
