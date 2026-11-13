# Plano — slide interativo da Aula 1 (Biologia Semestre Filtro)

Produza UM arquivo: `aulas/aula-01.html`, autocontido (HTML + CSS + JS inline, sem bibliotecas JS externas, sem imagens; diagramas em SVG inline). Só pode carregar as fontes do Google Fonts (mesmo link da apresentação existente). Não altere nada fora de `aulas/`. Português do Brasil, com os termos da prova em italiano em destaque (rótulo "IT").

## Contexto
Aula particular online, ao vivo, de 90 minutos, para um aluno de Medicina na Itália que estuda com o app deste projeto (Biologia Semestre Filtro). Formato fixo das aulas: **15′ revisão · 40′ conteúdo novo com os modelos do app · 25′ questões no formato da prova · 10′ tarefa**. Esta é a **primeira aula** (semana 11–13/11): **U5 — membranas, transporte e potencial de ação**, seguindo a **trilha t1 "Da membrana ao impulso nervoso"** (`src/data/trilhas.json`). Como é a primeira, os 15′ de revisão viram "conhecer o app + diagnóstico".

**Conteúdo científico: use SOMENTE o que está em `src/data/conteudo.json` (seções `c5_1`, `c5_2` e `c5_9`), `src/data/resolvidas.json` (`r5a`, `r5b`) e `src/data/aulas.json` (chave "5").** Não invente números nem fatos. O modelo de voltagem do slide 8 é qualitativo e deve dizer "esquema qualitativo".

## Visual (igual à apresentação `~/Documentos/Apresentação aulas Biologia/Apresentação aulas Biologia.html` e ao app)
- Palco 1920×1080 escalado para caber na janela (transform scale, centralizado), como na apresentação existente; funciona no celular sem rolagem horizontal.
- Tema escuro "lâmina H&E": fundo `#0E1618`, superfície `#162125`, afundado `#1D2A2E`, texto `#E2EBE9`, suave `#97A8AA`, linha `#2B3B3F`, eosina `#EE7FA3` (destaques de biologia), hematoxilina `#ADA0F2`, ok `#6FCF9C`, erro `#F2918A`, aviso `#E5B95C`. Cores em variáveis no `:root`.
- Fontes: Bricolage Grotesque (títulos, grandes, uma palavra em eosina), Source Sans 3 (texto), IBM Plex Mono para rótulos (fallback monospace). Cards com borda sutil e raio 14 px. Ícones SVG próprios, sem emoji.
- Pouco texto: no máximo ~40 palavras visíveis antes da interação. Cada slide de conteúdo começa com UMA pergunta.
- Animações suaves; respeitar `prefers-reduced-motion`.

## Mecânica
- Setas ←/→, espaço, PageUp/PageDown, Home/End, botões na tela, swipe no celular. Hash `#3` guarda o slide.
- **Linha do roteiro** fixa no rodapé: os 14 slides como pontos agrupados nos 4 blocos da aula (15′/40′/25′/10′, com largura proporcional ao tempo); os slides "NO APP" têm ícone de celular e cor hematoxilina, para ver de relance quando a aula vai ao app. Clicar num ponto vai ao slide.
- Tecla `O`: visão geral em grade com miniaturas/títulos, slides do app destacados.
- Tecla `N`: notas do professor (o que dizer e tempo), num painel lateral.
- Cronômetro geral da aula (90:00, iniciar/pausar) no canto, discreto.
- Engrenagem: endereço do app, padrão `http://localhost:5173/`, salvo em localStorage (try/catch). Links do app = `BASE + "#/rota"`, abrem em nova aba.

## Layout dos slides "NO APP"
Faixa e selo "NO APP" em hematoxilina, e: botão grande "Abrir no app" (+ botão secundário quando houver); "O que fazer" em 2–4 passos; "Pergunta-guia"; cronômetro do momento com a duração (aviso visual ao acabar); botão "Voltei — revelar resposta".

## Roteiro (14 slides)

**Bloco 1 — 15′ Conhecer o app + diagnóstico**
1. **Capa** — "Aula 1 · A membrana *decide* quem passa". Sub: U5 Estruturas celulares · 1,75 CFU (~30% da prova) · Trilha t1. Mostra o mapa da aula (os 4 blocos e os 4 momentos no app) em linha horizontal clicável.
2. **A pergunta da aula** — meta da trilha t1: "Por que o neurônio é negativo por dentro?". O aluno escolhe um palpite entre 3 (a bomba Na⁺/K⁺ empurra cargas / o K⁺ vaza para fora por canais / o Na⁺ fica preso dentro). Não revela; guarda a escolha (variável) e diz "voltamos a isso no fim".
3. **NO APP 1 — Conhecer o app** (8′) — botão `#/inicio`, secundário `#/trilhas/t1`. Passos: ver o guia de estudo e a contagem para 10/12; ligar/desligar a tradução IT/PT; abrir a trilha t1 e ler a meta; fazer o "Verifique" de `#/conteudo/c5_1` sem estudar antes (diagnóstico). Pergunta-guia: "Quantos você acertou no diagnóstico? Os erros já estão no caderno de erros?" Resposta: "Os erros do Verifique vão sozinhos para o Caderno de erros — é por eles que a próxima aula começa."

**Bloco 2 — 40′ Conteúdo novo**
4. **Quem atravessa sozinho?** — 6 fichas (O₂, CO₂, molécula pequena apolar, Na⁺, glicose, aminoácido). O aluno clica para mandar cada uma para "atravessa a bicamada" ou "precisa de proteína"; correção na hora. Depois mostra o modelo do mosaico fluido em SVG simples com partes clicáveis (fosfolipídio anfipático, colesterol — regula a fluidez, proteína integral, periférica, glicocálice). Vocabulário IT: membrana, trasporto passivo e attivo, canali.
5. **Mapa do transporte** — árvore de decisão clicável: "a favor do gradiente?" → Passivo (difusão simples; canal — rápido, não satura, aquaporinas; carreador — satura, GLUT) / Contra → Ativo primário (bombas P: Na⁺/K⁺-ATPase, SERCA, PMCA; V: H⁺ em lisossomos; F: ATP sintase; ABC: MDR, CFTR = canal de Cl⁻) / Ativo secundário (SGLT simporte Na⁺-glicose; NCX antiporte Na⁺/Ca²⁺). Mini-gráfico com botão "canal × carreador": velocidade vs concentração (reta × curva que satura, Vmax). Card "Pegadinha" de c5_1.
6. **A bomba que paga a conta** — animação SVG da Na⁺/K⁺-ATPase: botão "1 ciclo" mostra 3 Na⁺ saindo, 2 K⁺ entrando, 1 ATP; contador de carga líquida (−1 por ciclo dentro → eletrogênica). Pergunta de aulas.json: "Por que a Na⁺/K⁺-ATPase deixa o interior mais negativo?" com revelar resposta.
7. **NO APP 2 — Laboratório: a bomba** (7′) — botão `#/laboratorio/bomba`, secundário `#/3d/membrana`. Passos (ponte da trilha): ver a bomba funcionando; aplicar ouabaína e observar o SGLT1; no 3D, tocar na Na⁺/K⁺-ATPase e no canal. Pergunta-guia: "Se a bomba para, o que acontece com a glicose que entra pelo SGLT1?" Resposta: entra menos — o SGLT1 é ativo secundário e depende do gradiente de Na⁺ que a bomba mantém.
8. **Do gradiente à voltagem** — mostrador (gauge/escala de −100 a +60 mV) com marcas E_K ≈ −90 mV e E_Na ≈ +60 mV. Controle "a membrana é mais permeável a…" (K⁺ ↔ Na⁺): o ponteiro se aproxima do íon mais permeável; em repouso fica perto de −70 mV, perto do K⁺. Botão "mais K⁺ fora (hipercalemia)": E_K e o repouso ficam menos negativos (despolariza). Rótulo "esquema qualitativo". Card: a bomba mantém os gradientes, mas contribui pouco direto para a voltagem.
9. **O potencial de ação em 4 tempos** — curva SVG do PA; clicar em cada fase acende o trecho e mostra quais canais estão abertos: limiar (~−55 mV); despolarização (Na⁺ voltagem-dependente abre, Na⁺ entra, ~+30 mV); repolarização (Na⁺ inativa, K⁺ abre, K⁺ sai); hiperpolarização (K⁺ demora a fechar). Faixa "refratário absoluto = Na⁺ inativado → impulso num só sentido". Tudo ou nada; condução saltatória (nós de Ranvier). Pegadinha de c5_2. Vocabulário IT: potenziale di riposo, potenziale d'azione, canali voltaggio-dipendenti, periodo refrattario.
10. **NO APP 3 — Laboratório: o potencial de ação** (8′) — botão `#/laboratorio/pot`. Passos (ponte da trilha): disparar abaixo e acima do limiar; dar dois estímulos seguidos (refratário); aplicar TTX; aumentar o K⁺ externo. Pergunta-guia: "Por que a TTX impede o potencial de ação e o K⁺ externo alto despolariza o repouso?" Resposta: TTX bloqueia os canais de Na⁺ voltagem-dependentes (sem subida); mais K⁺ fora reduz a saída de K⁺ e o repouso fica menos negativo.
11. **No fim do axônio** — ponte para c5_9 (só o que está em c5_2): despolarização abre canais de Ca²⁺ voltagem-dependentes → Ca²⁺ entra → exocitose do neurotransmissor pelas SNARE. Sequência clicável de 3 passos; "detalhes na próxima etapa da trilha".

**Bloco 3 — 25′ Questões no formato da prova**
12. **NO APP 4 — Resolvidas e Verifique** (20′) — botão `#/resolvidas/r5a`, secundário `#/resolvidas/r5b`, terciário `#/conteudo/c5_2` (Verifique). Passos: ler em italiano primeiro, responder, só depois abrir a tradução; ver os passos e "por que as outras estão erradas"; fazer o Verifique de c5_2. No slide, um bloco "Ler em italiano": palavras-chave clicáveis com tradução (aumenta/diminuisce, riposo, pompa, gradiente, si accumula, inibisce, meno negativo). Pergunta-guia: "Qual a armadilha da r5a?" Resposta: o SGLT1 não usa ATP direto, mas depende da bomba que usa.

**Bloco 4 — 10′ Tarefa**
13. **Respondendo à pergunta da aula** — mostra o palpite do slide 2 e corrige: o K⁺ vaza por canais de vazamento e deixa cargas negativas; a bomba mantém os gradientes. Atividade: 7 cartões embaralhados para pôr em ordem clicando (bomba cria os gradientes → K⁺ vaza pelos canais de vazamento → interior a ~−70 mV → estímulo leva ao limiar → Na⁺ entra → Na⁺ inativa e K⁺ sai → Ca²⁺ no terminal dispara a exocitose); botões "Conferir" e "Mostrar ordem".
14. **Até a próxima** — tarefa: terminar a trilha t1 no app (passo c5_9 e questões da unidade 5), mandar dúvidas até 12 h antes da aula, revisar o caderno de erros (`#/erros`). Links do app. Próxima aula (cronograma): núcleo, nucléolo, condensados. Resumo: os 4 momentos no app e o tempo de cada (8 + 7 + 8 + 20 = 43 de 90 min).

## Como conferir
- Abrir no navegador: nenhum erro no console; 14 slides navegáveis por teclado, clique e hash; os 4 slides NO APP destacados na linha do roteiro e na visão geral; cada interação funciona; links montam `http://localhost:5173/#/...`.
- No fim, escreva em 5 linhas o que foi feito e qualquer limitação.
