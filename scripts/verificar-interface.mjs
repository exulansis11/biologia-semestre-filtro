import { build } from "esbuild";
import Module from "node:module";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
process.env.NODE_ENV = "production";
const source = `
import React from 'react';
import {renderToStaticMarkup as render} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import {createStudy} from './src/study';
import {createModels} from './src/models/legacy';
import {scenes} from './src/three/Scenes';
import {sceneData} from './src/three/data';
import {SceneContent} from './src/three/ScenePage';
import Viewer3D from './src/three/Viewer3D';
import solved from './src/data/resolvidas.json';
import * as progress from './src/progress';
import content from './src/data/conteudo.json';
import qs from './src/data/questoes.json';
import qsec from './src/data/questoes-por-assunto.json';
import trails from './src/data/trilhas.json';
export {createStudy,createModels,progress,content,qs,qsec,trails,sceneData,solved};
export function galleryCheck(){return render(<MemoryRouter><SceneContent/></MemoryRouter>)}
export function fallbackCheck(){return render(<MemoryRouter><Viewer3D id="celula"/></MemoryRouter>)}
export function sceneCheck(){
 let count=0;
 for(const [id,Scene] of Object.entries(scenes))for(const progresso of [0,.25,.5,.75,1]){
  const markup=render(<Scene progresso={progresso} rotulos={false} onSelect={()=>{}}/>);
  if(!markup.includes('mesh'))throw new Error('Cena vazia: '+id+' '+progresso);
  count++;
 }
 return count;
}
`;
const { outputFiles } = await build({
  stdin: { contents: source, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true,
  write: false,
  platform: "node",
  format: "cjs",
  packages: "external",
  logLevel: "silent",
});
const mod = new Module(process.cwd() + "/interface-check.cjs");
mod.filename = process.cwd() + "/interface-check.cjs";
mod.paths = Module._nodeModulePaths(process.cwd());
mod._compile(outputFiles[0].text, mod.filename);
const {
  createStudy,
  createModels,
  progress,
  content,
  qs,
  qsec,
  trails,
  sceneData,
  sceneCheck,
  galleryCheck,
  fallbackCheck,
  solved,
} = mod.exports;
// Adaptador DOM estático: captura o HTML produzido pelas telas imperativas.
// Não substitui uma verificação visual em um navegador com WebGL.
function staticNode() {
  const children = [];
  const selectors = new Map();
  return {
    innerHTML: "",
    textContent: "",
    hidden: false,
    dataset: {},
    style: {},
    children,
    classList: { add() {}, remove() {}, toggle() {} },
    setAttribute() {},
    addEventListener() {},
    appendChild(n) {
      children.push(n);
    },
    querySelector(s) {
      if (!selectors.has(s)) selectors.set(s, staticNode());
      return selectors.get(s);
    },
    querySelectorAll() {
      return [];
    },
    focus() {},
    remove() {},
  };
}
global.cancelAnimationFrame = () => {};
global.requestAnimationFrame = () => 0;
const root = staticNode();
global.document = {
  createElement: staticNode,
  createElementNS: staticNode,
  activeElement: { tagName: "BODY" },
};
global.window = { scrollTo() {} };
let storage = new Map();
global.localStorage = {
  getItem: (k) => storage.get(k) || null,
  setItem: (k, v) => storage.set(k, v),
  removeItem: (k) => storage.delete(k),
};
// Integridade dos dados, incluindo as opções dos arquivos originais.
const translations = JSON.parse(
  readFileSync("src/data/traducao-pt.json", "utf8"),
);
const allIds = [...content, ...qs, ...solved, ...trails].map((x) => x.id);
assert.equal(new Set(allIds).size, allIds.length, "Ids duplicados");
for (const q of [...qs, ...solved]) {
  for (const text of [q.q, ...(q.opts || q.o || [])])
    assert.ok(
      Object.hasOwn(translations, text) && translations[text].trim(),
      "Tradução ausente: " + q.id + ": " + text,
    );
}
const expansionFiles = readdirSync("src/data/ampliacao").filter((f) =>
  /^t\d+\.json$/.test(f),
);
const expandedSections = [];
for (const file of expansionFiles) {
  const expansion = JSON.parse(
    readFileSync("src/data/ampliacao/" + file, "utf8"),
  );
  for (const [id, patch] of Object.entries(expansion.secoes)) {
    const section = content.find((c) => c.id === id);
    assert.ok(section, "Seção ampliada inexistente: " + id);
    expandedSections.push(section);
    const words = patch.txt.join(" ").split(/\s+/u).length;
    assert.ok(
      words >= 450 && words <= 800,
      id + ": texto fora de 450–800 palavras",
    );
    assert.ok(patch.chave.length >= 5 && patch.chave.length <= 8);
    for (const [key, min, columns] of [
      ["num", 6, 3],
      ["voc", 8, 2],
    ]) {
      assert.deepEqual(
        section[key],
        patch[key],
        id + ": mesclagem desatualizada",
      );
      assert.ok(
        section[key].length >= min && section[key].length <= 15,
        id + ": " + key,
      );
      for (const row of section[key]) assert.equal(row.length, columns);
    }
    assert.deepEqual(section.detalhes, patch.detalhes);
    assert.ok(section.detalhes.length >= 10 && section.detalhes.length <= 15);
    assert.ok(!Object.hasOwn(section, "img_pedidos"));
    const exercises = expansion.questoes.filter((q) => q.ct === id);
    assert.ok(exercises.filter((q) => q.tipo === "mc").length >= 6);
    assert.ok(exercises.filter((q) => q.tipo === "cp").length >= 2);
    for (const q of exercises) {
      assert.equal(q.u, section.u);
      assert.ok(q.exp.length >= 3 && q.exp.length <= 6);
      if (q.tipo === "mc") assert.equal(q.opts.length, 5);
    }
    const resolved = expansion.resolvidas.filter((q) => q.ct === id);
    assert.ok(resolved.length >= 2);
    const index = expansion.passos.findIndex(
      (s) => s[0] === "c" && s[1] === id,
    );
    assert.deepEqual(
      expansion.passos
        .slice(
          index + 1,
          (() => {
            const next = expansion.passos.findIndex(
              (s, i) => i > index && s[0] === "c",
            );
            return next < 0 ? expansion.passos.length : next;
          })(),
        )
        .filter((s) => s[0] === "r" && resolved.some((q) => q.id === s[1]))
        .map((s) => s.slice(0, 2)),
      resolved.map((q) => ["r", q.id]),
    );
  }
}

const study = createStudy(root, () => {});
let rendered = 0;
for (const view of [
  "inicio",
  "trilhas",
  "conteudo",
  "laboratorio",
  "resolvidas",
  "quiz",
  "simulado",
  "flashcards",
  "erros",
  "cronograma",
  "unidades",
  "referencias",
  "aula",
  "progresso",
]) {
  root.querySelector("#app").innerHTML = "";
  study.show(view);
  assert.ok(
    root.querySelector("#app").innerHTML.length > 50,
    "Rota vazia: " + view,
  );
  rendered++;
}
for (const c of content) {
  study.show("conteudo", c.id);
  assert.ok(
    root.querySelector("#app").innerHTML.includes(c.t),
    "Leitura: " + c.id,
  );
  rendered++;
}
for (const t of trails) {
  study.show("trilhas", t.id);
  assert.ok(root.querySelector("#app").innerHTML.includes(t.nome));
  const expanded = study.trails.find((x) => x.id === t.id);
  const ids = expanded.p.filter((s) => s[0] === "m").map((s) => s[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const step of expanded.p.filter((s) => s[0] === "c"))
    for (const m of study.models.filter((m) => m.ct.includes(step[1])))
      assert.ok(ids.includes(m.id));
  rendered++;
}
for (const r of solved) {
  study.show("resolvidas", r.id);
  assert.ok(
    root
      .querySelector("#app")
      .innerHTML.includes(
        r.q
          .replaceAll("&", "&amp;")
          .replaceAll('"', "&quot;")
          .replaceAll("'", "&#39;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;"),
      ),
    "Resolvida: " + r.id,
  );
  rendered++;
}
// Exercita os comentários nos quatro caminhos, inclusive respostas de completar.
for (const section of expandedSections) {
  study.show("conteudo", section.id);
  const markup = root.querySelector("#app").innerHTML;
  assert.ok(markup.includes("Detalhes que a prova cobra"));
  assert.ok(markup.includes("<b>"));
  assert.ok(
    markup.indexOf("Detalhes que a prova cobra") >
      markup.indexOf("Pegadinha de prova"),
  );
  assert.ok(markup.includes("Números e medidas que caem"));
  assert.ok(markup.includes("Vocabulário da prova (IT → PT)"));
  assert.ok(markup.includes('class="expansion-scroll"'));
  for (const row of [...section.num, ...section.voc])
    assert.ok(markup.includes(row[0].replaceAll("'", "&#39;")));
}
const images = JSON.parse(readFileSync("src/data/imagens.json", "utf8"));
for (const [id, list] of Object.entries(images)) {
  const section = content.find((c) => c.id === id);
  assert.ok(section);
  assert.deepEqual(section.img, list);
  study.show("conteudo", id);
  const markup = root.querySelector("#app").innerHTML;
  for (const image of list) {
    assert.match(
      image.arquivo,
      /^imagens\/[a-z0-9_-]+\.(png|jpg|gif|webp|svg|tif)$/,
    );
    assert.ok(
      existsSync("public/" + image.arquivo),
      "Imagem ausente: " + image.arquivo,
    );
    assert.ok(
      image.alt.trim() && image.legenda.trim() && image.legenda_it.trim(),
    );
    assert.ok(image.autor && !/<[^>]*>/.test(image.autor));
    assert.ok(markup.includes('loading="lazy"'));
    assert.ok(markup.includes("Wikimedia Commons"));
  }
}
// A rede pode estar indisponível: uma figura sintética exercita toda a UI mesmo sem downloads.
const figureSection = content[0],
  savedImages = figureSection.img;
const figureImage = {
  arquivo: "imagens/teste.png",
  legenda: "Observe a membrana.",
  legenda_it: "Osserva la membrana.",
  alt: "Membrana & núcleo",
  autor: "Autora de teste",
  licenca: "CC BY 4.0",
  licenca_url: "https://creativecommons.org/licenses/by/4.0/",
  pagina: "https://commons.wikimedia.org/wiki/File:Test.png",
  titulo_commons: "File:Test.png",
  trocada: false,
};
try {
  figureSection.img = [figureImage];
  study.show("conteudo", figureSection.id);
  const markup = root.querySelector("#app").innerHTML;
  assert.ok(markup.includes("<figure"));
  assert.ok(markup.includes('alt="Membrana &amp; núcleo"'));
  assert.ok(markup.includes('loading="lazy"'));
  assert.ok(markup.includes('lang="it"><i>Osserva la membrana.</i>'));
  assert.ok(
    markup.includes('Autora de teste · <a href="' + figureImage.licenca_url),
  );
  assert.ok(markup.includes('href="' + figureImage.pagina + '"'));
  assert.ok(markup.indexOf("<figure") > markup.indexOf('class="card prose"'));
  study.show("referencias");
  assert.ok(
    root.querySelector("#app").innerHTML.includes("Créditos das imagens"),
  );
  assert.ok(
    root.querySelector("#app").innerHTML.includes(figureImage.titulo_commons),
  );
  localStorage.setItem("show_pt", "false");
  const untranslatedRoot = staticNode(),
    untranslated = createStudy(untranslatedRoot, () => {});
  untranslated.show("conteudo", figureSection.id);
  assert.ok(
    !untranslatedRoot
      .querySelector("#app")
      .innerHTML.includes(figureImage.legenda_it),
  );
  untranslated.dispose();
} finally {
  if (savedImages === undefined) delete figureSection.img;
  else figureSection.img = savedImages;
  localStorage.removeItem("show_pt");
}
const pwaConfig = readFileSync("vite.config.ts", "utf8");
assert.ok(pwaConfig.includes('globIgnores: ["**/imagens/**"]'));
assert.ok(pwaConfig.includes('handler: "CacheFirst"'));
assert.ok(
  readFileSync("src/style.css", "utf8").includes(".content-figure img"),
);
await import("./verificar-imagens.mjs");
const expandedCP = qs.find((q) => q.tipo === "cp" && q.exp?.length);
assert.ok(
  expandedCP,
  "Falta questão de completar com exp para testar os comentários",
);
const feedbackRoot = staticNode();
const feedbackStudy = createStudy(feedbackRoot, () => {});
feedbackStudy.show("quiz", expandedCP.id);
feedbackRoot.querySelector("#cp-in").value = "resposta incorreta";
feedbackRoot.querySelector("#cp-f").onsubmit({ preventDefault() {} });
const quizFeedback = feedbackRoot.querySelector("#fb").innerHTML;
assert.ok(quizFeedback.includes("Explicação detalhada"));
assert.ok(quizFeedback.includes("<ol"));
assert.ok(
  quizFeedback.includes("<b>3 − 2 = 1</b>"),
  "exp deve usar inl para negrito",
);
feedbackStudy.show("erros");
assert.ok(
  feedbackRoot.querySelector("#app").innerHTML.includes("Explicação detalhada"),
);
feedbackStudy.show("conteudo", expandedCP.ct);
const checkList = feedbackRoot
  .querySelector("#ct-check")
  .querySelector(".ck-list");
const position = qsec[expandedCP.ct].indexOf(expandedCP.id);
const questionNode = checkList.children[position];
questionNode.querySelector("input").value = expandedCP.acc[0];
questionNode
  .querySelector("form")
  .onsubmit({ preventDefault() {}, target: staticNode() });
assert.ok(
  questionNode
    .querySelector(".ck-fb")
    .innerHTML.includes("Explicação detalhada"),
);
// Garante exp em qualquer sorteio, sem depender de uma amostra aleatória de 31.
const previousExp = qs.map((q) => q.exp);
try {
  qs.forEach((q) => {
    q.exp = ["**Etapa de teste**"];
  });
  feedbackStudy.show("simulado");
  feedbackRoot.querySelector("#sim-go").onclick();
  feedbackRoot.querySelector("#sim-end").onclick();
  feedbackRoot.querySelector("#sim-end").onclick();
  const markup = feedbackRoot.querySelector("#app").innerHTML;
  assert.equal((markup.match(/Explicação detalhada/g) || []).length, 31);
  assert.ok(markup.includes("<b>Etapa de teste</b>"));
} finally {
  qs.forEach((q, i) => {
    if (previousExp[i] === undefined) delete q.exp;
    else q.exp = previousExp[i];
  });
  feedbackStudy.dispose();
}
const css = readFileSync("src/style.css", "utf8");
assert.match(
  css,
  /\.expansion-card\s*\{[^}]*min-width: 0;[^}]*max-width: 100%;/,
);
assert.match(
  css,
  /\.expansion-scroll\s*\{[^}]*max-width: 100%;[^}]*overflow-x: auto;/,
);

assert.ok(galleryCheck().includes("três dimensões"));
assert.ok(fallbackCheck().includes("não oferece WebGL"));
rendered += 2;
assert.equal(study.models.length, 35);
for (const m of study.models) {
  assert.ok(m.id && m.nome && m.d && m.ct.length && typeof m.f === "function");
  for (const id of m.ct) assert.ok(content.some((c) => c.id === id));
}
for (const c of content) {
  assert.ok(qsec[c.id]?.length, "Seção sem questão: " + c.id);
  for (const id of qsec[c.id])
    assert.ok(
      qs.some((q) => q.id === id),
      "Questão ausente: " + id,
    );
  assert.ok(
    study.models.some((m) => m.ct.includes(c.id)) ||
      Object.values(sceneData).some((s) => s.sections.includes(c.id)),
    "Seção sem modelo: " + c.id,
  );
}
const models = createModels(root, {
  esc: (s) => String(s),
  shuffle: (a) => a.slice(),
  bi: (s) => s,
  inl: (s) => s,
});
for (const data of Object.values(models.ANIMS)) {
  assert.ok(
    data.steps.length && Object.keys(data.a).length && data.quiz.length,
  );
  for (const step of data.steps) assert.ok(step.cap);
}
for (const data of Object.values(models.SORTS)) {
  assert.ok(data.intro && data.cats.length && data.items.length);
  for (const [text, index, ex] of data.items)
    assert.ok(text && ex && data.cats[index]);
}
for (const m of models.MODELS) {
  const host = staticNode();
  assert.doesNotThrow(() => m.f(host), "Inicialização: " + m.id);
  assert.ok(host.innerHTML.length > 20);
  models.labStop();
}
assert.ok(progress.checkCompletion("  ÁPÓPTÓSÓMÁ! ", ["apoptosoma"]));
assert.ok(!progress.checkCompletion("", [""]));
assert.ok(!progress.checkCompletion("errado", ["certo"]));
assert.deepEqual([0.85, 0.7, 0.5, 0.49].map(progress.concept), [
  "A",
  "B",
  "C",
  "D",
]);
assert.equal(progress.scoreAnswer("mc", true), 1);
assert.equal(progress.scoreAnswer("mc", false), -0.25);
assert.equal(progress.scoreAnswer("cp", false), 0);
assert.equal(progress.scoreAnswer("mc", false, true), 0);
assert.equal(
  20 * progress.scoreAnswer("mc", true) + 5 * progress.scoreAnswer("mc", false),
  18.75,
);
const state = progress.emptyProgress();
progress.recordAnswer(state, 5, true);
progress.recordAnswer(state, 5, false);
assert.equal(progress.unitStats(state, 5).concept, "C");
assert.deepEqual(progress.validateProgress(state), {
  ...state,
  currentTrail: undefined,
});
assert.throws(() =>
  progress.validateProgress({ flags: {}, sims: "invalid", erros: {} }),
);
const cp = qs.find((q) => q.tipo === "cp");
study.show("quiz", cp.id);
root.querySelector("#cp-in").value = cp.acc[0].toUpperCase();
root.querySelector("#cp-f").onsubmit({ preventDefault() {} });
assert.equal(study.state.answers[cp.u].correct, 1);
study.show("quiz", cp.id);
root.querySelector("#cp-in").value = "resposta errada";
root.querySelector("#cp-f").onsubmit({ preventDefault() {} });
assert.equal(study.state.answers[cp.u].total, 2);
assert.ok(study.state.erros[cp.id]);
assert.ok(study.logic.checkCP({ acc: ["apoptosoma"] }, "ÁPÓPTÓSÓMÁ"));
for (const [type, n] of [
  ["mc", 21],
  ["cp", 10],
]) {
  const picked = study.logic.pickWeighted(
    qs.filter((q) => q.tipo === type),
    n,
  );
  assert.equal(picked.length, n);
  assert.equal(new Set(picked.map((q) => q.id)).size, n);
}
study.show("simulado");
root.querySelector("#sim-go").onclick();
root.querySelector("#sim-end").onclick();
root.querySelector("#sim-end").onclick();
assert.equal(study.state.sims.at(-1).nota, 0);
assert.equal(study.state.sims.at(-1).branco, 31);
for (const c of content.filter((c) => c.u === 5))
  study.state.flags["ct_" + c.id] = true;
study.state.answers[5] = { correct: 7, total: 10 };
study.show("inicio");
assert.ok(
  root.querySelector("#app").innerHTML.includes("Unidade certificada ✓"),
);
study.dispose();
models.labStop();
localStorage.setItem("bio_sf_local", "JSON inválido");
assert.deepEqual(progress.readProgress(), progress.emptyProgress());
global.localStorage = {
  getItem() {
    throw new Error("Bloqueado");
  },
  setItem() {
    throw new Error("Bloqueado");
  },
};
assert.deepEqual(progress.readProgress(), progress.emptyProgress());
const blocked = createStudy(staticNode(), () => {});
blocked.show("inicio");
blocked.dispose();
// React 3D usa renderToStaticMarkup como no projeto de referência.
const oldError = console.error;
console.error = () => {};
let scenes;
try {
  scenes = sceneCheck();
} finally {
  console.error = oldError;
}
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const reference = JSON.parse(
  readFileSync("referencia/gestacao/package.json", "utf8"),
);
for (const [name, version] of Object.entries(reference.dependencies))
  assert.equal(pkg.dependencies[name], version);
console.log(
  rendered +
    " telas/detalhes renderizados; 35 registros de modelos completos; " +
    content.length +
    " seções com questões e modelos; " +
    scenes +
    " renderizações 3D; correção, notas, conceitos, trilhas, importação e armazenamento bloqueado aprovados.",
);

// Mesclagem repetível e erros de entrada em uma cópia temporária isolada.
// Nenhum caso de falha grava sobre os JSON reais do aplicativo.
const { mesclar } = await import("./mesclar-ampliacao.mjs");
const { mkdtemp, mkdir, copyFile, writeFile, readFile } = await import(
  "node:fs/promises"
);
const { tmpdir } = await import("node:os");
const path = await import("node:path");
const fixture = await mkdtemp(path.join(tmpdir(), "bio-mesclagem-"));
for (const dir of [
  "referencia/dados-originais",
  "src/data/ampliacao",
  "src/models",
])
  await mkdir(path.join(fixture, dir), { recursive: true });
const mergedNames = [
  "conteudo",
  "questoes",
  "resolvidas",
  "trilhas",
  "questoes-por-assunto",
  "traducao-pt",
];
for (const name of mergedNames)
  await copyFile(
    `referencia/dados-originais/${name}.json`,
    path.join(fixture, `referencia/dados-originais/${name}.json`),
  );
for (const file of [
  "src/data/units.json",
  "src/data/imagens.json",
  "src/models/legacy.js",
])
  await copyFile(file, path.join(fixture, file));
for (const file of expansionFiles)
  await copyFile(
    `src/data/ampliacao/${file}`,
    path.join(fixture, "src/data/ampliacao", file),
  );
const mergeFixture = () => mesclar({ directory: fixture, report() {} });
const snapshots = () =>
  Promise.all(
    mergedNames.map((name) =>
      readFile(path.join(fixture, `src/data/${name}.json`), "utf8"),
    ),
  );
await mergeFixture();
const once = await snapshots();
await mergeFixture();
assert.deepEqual(await snapshots(), once, "Mesclagem precisa ser idempotente");
for (const [i, name] of mergedNames.entries())
  assert.equal(
    once[i],
    readFileSync(`src/data/${name}.json`, "utf8"),
    "Execute npm run mesclar: " + name,
  );
const fixtureFile = path.join(fixture, "src/data/ampliacao/t1.json");
const valid = JSON.parse(await readFile(fixtureFile, "utf8"));
// Modelos registrados dinamicamente também são destinos válidos.
const withDynamicModel = structuredClone(valid);
withDynamicModel.passos.push([
  "m",
  "so_org",
  "Explore o modelo registrado por tabela.",
]);
await writeFile(fixtureFile, JSON.stringify(withDynamicModel));
await mergeFixture();
await writeFile(fixtureFile, JSON.stringify(valid));
await mergeFixture();
assert.deepEqual(await snapshots(), once);
const invalidCases = [
  [
    "detalhes",
    (a) => {
      a.secoes.c5_1.detalhes.pop();
      a.secoes.c5_1.detalhes = [];
    },
  ],
  [
    "detalhes",
    (a) => {
      a.secoes.c5_1.detalhes[0] = " ";
    },
  ],
  [
    "detalhes",
    (a) => {
      a.secoes.c5_1.detalhes = Array(16).fill("Detalhe");
    },
  ],
  [
    "id duplicado",
    (a) => {
      a.questoes[0].id = a.questoes[1].id;
    },
  ],
  [
    "seção inexistente",
    (a) => {
      a.secoes.inexistente = a.secoes.c5_1;
    },
  ],
  [
    "seção inexistente",
    (a) => {
      a.questoes[0].ct = "inexistente";
    },
  ],
  [
    "tradução ausente",
    (a) => {
      a.questoes[0].q = "Domanda senza traduzione";
    },
  ],
  [
    "tradução ausente",
    (a) => {
      a.questoes[0].opts[1] = "Opzione senza traduzione";
    },
  ],
  [
    "tradução ausente",
    (a) => {
      a.resolvidas[0].q = "Risolta senza traduzione";
    },
  ],
  [
    "tradução ausente",
    (a) => {
      a.resolvidas[0].o[1] = "Alternativa senza traduzione";
    },
  ],
  [
    "exatamente 5 opções",
    (a) => {
      a.questoes[0].opts.pop();
    },
  ],
  [
    "exatamente 5 opções",
    (a) => {
      a.resolvidas[0].o.pop();
    },
  ],
  [
    "c fora do intervalo",
    (a) => {
      a.resolvidas[0].c = 5;
    },
  ],
  [
    "id inexistente",
    (a) => {
      a.passos.push(["r", "inexistente", "Ponte"]);
    },
  ],
  [
    "perdeu ou reordenou",
    (a) => {
      a.passos = a.passos.filter((s) => s[0] !== "m");
    },
  ],
  [
    "perdeu ou reordenou",
    (a) => {
      const original = JSON.parse(
        readFileSync("referencia/dados-originais/trilhas.json", "utf8"),
      ).find((t) => t.id === a.trilha).p;
      const first = a.passos.findIndex(
        (s) => JSON.stringify(s) === JSON.stringify(original[0]),
      );
      const second = a.passos.findIndex(
        (s) => JSON.stringify(s) === JSON.stringify(original[1]),
      );
      [a.passos[first], a.passos[second]] = [a.passos[second], a.passos[first]];
    },
  ],
];
for (const [message, change] of invalidCases) {
  const broken = structuredClone(valid);
  change(broken);
  await writeFile(fixtureFile, JSON.stringify(broken));
  await assert.rejects(
    mergeFixture,
    (e) => e.message.includes(message),
    message,
  );
  assert.deepEqual(
    await snapshots(),
    once,
    "Falha de validação não deve gravar arquivos",
  );
}
console.log(
  `Ampliação: traduções completas, num/voc, exp nos quatro caminhos, idempotência e ${invalidCases.length} entradas inválidas aprovados.`,
);
