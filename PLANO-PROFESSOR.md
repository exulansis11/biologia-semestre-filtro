# Divisão Professor × Aluno — plano para o Codex

Contexto: um professor (dá aulas ao vivo de 90 min, online, em português) e um aluno (estuda sozinho para a prova de Biologia do semestre filtro de Medicina na Itália). App sem backend; cada um usa no próprio aparelho. Leia também `PLANO-AMPLIACAO.md` e `PLANO-FASE2.md` (formato de `src/data/ampliacao/tN.json`, mesclagem, regras).

## Parte 1 — Conteúdo do professor (um processo por trilha, só no `src/data/ampliacao/tN.json`)

Em CADA seção da sua trilha, acrescente ao objeto da seção o campo `"prof"` (não altere mais nada):

```json
"prof": {
  "ideia": "a ideia central da seção em 1–2 frases (o que o aluno deve sair sabendo)",
  "explicar": ["4–7 passos de como explicar em aula, em ordem: analogia, sequência lógica, o que desenhar, onde usar o modelo/imagem do app"],
  "perguntas": [["pergunta para fazer ao aluno durante a explicação", "resposta esperada curta"], "… 4–6 pares"],
  "erros": ["3–5 erros/confusões típicos do aluno nesta seção e como corrigir"],
  "ponte": "frase de transição para a próxima seção da trilha (ou fechamento, se for a última)",
  "tempo": "sugestão de minutos para explicar (ex.: '12–15 min')"
}
```
Português do Brasil, tom de colega professor, conciso, cientificamente correto e coerente com o `txt`, `num`, `detalhes` já existentes na seção (não invente números novos). Valide com `node scripts/mesclar-ampliacao.mjs --so-validar --trilha tN`. Não toque em nenhum outro arquivo e não rode mesclar/test/build.

## Parte 2 — Interface (UM processo separado)

1. **Perfil**: na primeira abertura, tela "Quem vai usar este aparelho?" com dois cartões grandes: **Sou aluno** / **Sou professor**. Guardar em localStorage (`bio_sf_perfil`, try/catch). Chip no topo mostrando o perfil, com troca. Ao escolher Professor pela 1ª vez: criar PIN de 4–6 dígitos (guardar só hash SHA-256 via `crypto.subtle`); depois, pedir o PIN ao entrar no modo professor. Texto claro: "O PIN evita entrar por engano; não é proteção forte". Opção "Esqueci o PIN" → apaga só o PIN após confirmação (o professor cria outro). Sair do modo professor volta a Aluno sem PIN.
2. **Modo Aluno**: tudo como hoje. Em "Meu progresso", botão destacado **"Enviar progresso ao professor"**: gera o mesmo JSON da exportação e usa `navigator.share` com arquivo quando disponível; senão baixa o arquivo, com instrução "mande este arquivo ao professor (WhatsApp, e-mail)". Esconder do aluno a rota/aba "Professor" e os blocos "Para o professor".
3. **Modo Professor**: nova aba/rota **`#/professor`** com:
   - **Painel do aluno**: botão "Importar progresso do aluno" (arquivo JSON exportado pelo aluno). Validar com as mesmas regras da importação existente, mas guardar SEPARADO em `bio_sf_aluno` (nunca sobrescrever `bio_sf_local`). Mostrar: nome do arquivo e data de importação; desempenho e conceito A–D por unidade (reaproveitar o cálculo existente aplicado ao estado importado); seções estudadas por unidade; progresso de cada trilha; histórico/gráfico de notas de simulado; **erros mais frequentes** (top 15 do caderno de erros, com enunciado e link para a questão/seção); sugestão automática "Começar a próxima aula por: <3 seções com mais erros>". Botão para remover os dados importados.
   - **Aulas**: lista das semanas de `cronograma.json`; a Aula 1 com botão "Abrir slide" para `aulas/aula-01.html` (copiar o arquivo `aulas/aula-01.html` da raiz do projeto para `public/aulas/aula-01.html`; ele roda sozinho). Para cada semana, links para as seções/trilhas correspondentes.
   - **Gabarito**: alternância "Mostrar gabarito" (padrão ligado no modo professor): nas listas de questões (Verifique, Quiz, Resolvidas, Caderno de erros) marcar a alternativa correta e mostrar `ex`/`exp` sem precisar responder. No **Simulado**, o gabarito só aparece depois da entrega (não mudar o simulado).
   - Em cada página de **Conteúdo**, no modo professor, um card **"Para o professor"** no topo (recolhível, lembrar estado): tempo, ideia central, passos de explicação (lista numerada), perguntas para o aluno (pergunta + resposta revelável), erros comuns e ponte. Renderizar com `inl()`.
4. `scripts/mesclar-ampliacao.mjs`: passar `prof` para `conteudo.json`; validar formato (ideia string; explicar 4–7; perguntas 4–6 pares; erros 3–5; ponte e tempo strings) quando presente.
5. `scripts/verificar-interface.mjs`: testar escolha de perfil, PIN (hash, erro, esqueci), ocultação no modo aluno, painel com um progresso importado de exemplo (válido e inválido; sem tocar `bio_sf_local`), gabarito visível e simulado intacto, card do professor.
6. Acessibilidade e celular a 360 px como no resto do app. README: seção "Professor e aluno".
7. Terminar com `npm run mesclar && npm run typecheck && npm test && npm run build`.
