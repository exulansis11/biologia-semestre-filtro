import { readFile, readdir, writeFile } from "node:fs/promises";
// --so-validar: valida sem gravar; --trilha tN: considera só src/data/ampliacao/tN.json.
const DRY = process.argv.includes("--so-validar");
const ONLY = process.argv.includes("--trilha")
  ? process.argv[process.argv.indexOf("--trilha") + 1]
  : null;
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createModels } from "../src/models/legacy.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const names = [
  "conteudo",
  "questoes",
  "resolvidas",
  "trilhas",
  "questoes-por-assunto",
  "traducao-pt",
];
const fail = (message) => {
  throw new Error(message);
};
const unique = (items, label, all = new Set()) => {
  for (const item of items) {
    if (!item.id || all.has(item.id))
      fail(`${label}: id duplicado ou ausente: ${item.id}`);
    all.add(item.id);
  }
  return all;
};

export async function mesclar({ directory = root, report = console.log } = {}) {
  const root = directory;
  const read = async (file) =>
    JSON.parse(await readFile(path.join(root, file), "utf8"));
  const data = Object.fromEntries(
    await Promise.all(
      names.map(async (name) => [
        name,
        await read(`referencia/dados-originais/${name}.json`),
      ]),
    ),
  );
  const originalTrails = structuredClone(data.trilhas);
  const sections = new Map(data.conteudo.map((c) => [c.id, c]));
  const trails = new Map(data.trilhas.map((t) => [t.id, t]));
  const units = new Set((await read("src/data/units.json")).map((u) => u.id));
  // A fábrica registra também os modelos criados a partir de tabelas, sem
  // inicializar suas telas, timers ou animações.
  const modelIds = new Set(
    createModels(null, {
      esc: String,
      bi: String,
      inl: String,
      shuffle: (values) => values.slice(),
    }).MODELS.map((model) => model.id),
  );
  const ids = unique(data.conteudo, "Conteúdo");
  unique(data.questoes, "Questões", ids);
  unique(data.resolvidas, "Resolvidas", ids);
  unique(data.trilhas, "Trilhas", ids);
  let files = [];
  try {
    files = (await readdir(path.join(root, "src/data/ampliacao")))
      .filter((f) => /^t\d+\.json$/.test(f))
      // t1.json também traz traduções que faltavam nas questões originais.
      .filter((f) => !ONLY || f === `${ONLY}.json` || f === "t1.json")
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  const extended = new Set(),
    usedTrails = new Set();
  for (const file of files) {
    const a = await read(`src/data/ampliacao/${file}`);
    const t = trails.get(a.trilha);
    if (!t || file !== `${a.trilha}.json` || usedTrails.has(a.trilha))
      fail(`${file}: trilha inválida ou duplicada: ${a.trilha}`);
    usedTrails.add(a.trilha);
    for (const [id, patch] of Object.entries(a.secoes)) {
      const c = sections.get(id);
      if (!c) fail(`${file}: seção inexistente: ${id}`);
      if (extended.has(id)) fail(`${file}: seção ampliada duplicada: ${id}`);
      extended.add(id);
      for (const key of ["txt", "chave", "pega", "num", "voc", "detalhes"]) {
        if (patch[key] === undefined) fail(`${file}: ${id} sem ${key}`);
        c[key] = patch[key];
      }
      if (patch.prof !== undefined) {
        const p = patch.prof;
        const text = (v) => typeof v === "string" && !!v.trim();
        const list = (v, min, max) => Array.isArray(v) && v.length >= min && v.length <= max;
        if (!p || typeof p !== "object" || !text(p.ideia) || !text(p.ponte) || !text(p.tempo) ||
            !list(p.explicar, 4, 7) || !p.explicar.every(text) ||
            !list(p.erros, 3, 5) || !p.erros.every(text) ||
            !list(p.perguntas, 4, 6) || !p.perguntas.every(pair => Array.isArray(pair) && pair.length === 2 && pair.every(text)))
          fail(`${file}: ${id}.prof inválido`);
        c.prof = p;
      }
      if (
        !Array.isArray(c.detalhes) ||
        c.detalhes.length < 10 ||
        c.detalhes.length > 15 ||
        c.detalhes.some((item) => typeof item !== "string" || !item.trim())
      )
        fail(`${file}: ${id}.detalhes inválido (esperado: 10–15 textos)`);
      for (const [key, min, columns] of [
        ["num", 6, 3],
        ["voc", 8, 2],
      ]) {
        if (
          !Array.isArray(c[key]) ||
          c[key].length < min ||
          c[key].length > 15 ||
          c[key].some(
            (row) =>
              !Array.isArray(row) ||
              row.length !== columns ||
              row.some((v) => typeof v !== "string" || !v.trim()),
          )
        )
          fail(`${file}: ${id}.${key} inválido`);
      }
    }
    unique(a.questoes, `${file}: questões`, ids);
    unique(a.resolvidas, `${file}: resolvidas`, ids);
    for (const q of [...a.questoes, ...a.resolvidas]) {
      if (!sections.has(q.ct))
        fail(`${file}: ${q.id} aponta para seção inexistente: ${q.ct}`);
      if (q.u !== sections.get(q.ct).u)
        fail(`${file}: unidade incorreta em ${q.id}`);
    }
    data.questoes.push(...a.questoes);
    data.resolvidas.push(...a.resolvidas);
    for (const q of a.questoes)
      (data["questoes-por-assunto"][q.ct] ??= []).push(q.id);
    for (const [it, pt] of Object.entries(a.traducao)) {
      if (typeof pt !== "string" || !pt.trim())
        fail(`${file}: tradução vazia: ${it}`);
      if (
        Object.hasOwn(data["traducao-pt"], it) &&
        data["traducao-pt"][it] !== pt
      )
        fail(`${file}: tradução conflitante: ${it}`);
      data["traducao-pt"][it] = pt;
    }
    t.p = a.passos;
  }
  for (const [label, list, solved] of [
    ["Questão", data.questoes, false],
    ["Resolvida", data.resolvidas, true],
  ]) {
    for (const q of list) {
      if (q.ct && !sections.has(q.ct))
        fail(`${q.id}: seção inexistente: ${q.ct}`);
      if (!units.has(q.u)) fail(`${q.id}: unidade inexistente: ${q.u}`);
      const cp = q.tipo === "cp";
      const opts = cp ? [] : solved ? q.o : q.opts;
      if (!cp && (!Array.isArray(opts) || opts.length !== 5))
        fail(`${label} ${q.id}: mc precisa de exatamente 5 opções`);
      if (
        solved &&
        !cp &&
        (!Number.isInteger(q.c) || q.c < 0 || q.c >= opts.length)
      )
        fail(`${q.id}: c fora do intervalo`);
      if (
        solved &&
        /^rt\d+_/.test(q.id) &&
        !cp &&
        (!Array.isArray(q.por) || q.por.length !== 5 || q.por[q.c] !== "")
      )
        fail(`${q.id}: por precisa de 5 posições, vazia na correta`);
      if (cp && (!Array.isArray(q.acc) || !q.acc.length))
        fail(`${q.id}: completar sem respostas aceitas`);
      for (const text of [q.q, ...opts])
        if (
          typeof text !== "string" ||
          !Object.hasOwn(data["traducao-pt"], text) ||
          !data["traducao-pt"][text]?.trim()
        )
          fail(`${label} ${q.id}: tradução ausente: ${text}`);
    }
  }
  const questions = new Set(data.questoes.map((q) => q.id)),
    solved = new Set(data.resolvidas.map((q) => q.id));
  for (const [id, list] of Object.entries(data["questoes-por-assunto"])) {
    if (!sections.has(id)) fail(`Índice: seção inexistente: ${id}`);
    if (new Set(list).size !== list.length) fail(`Índice ${id}: id duplicado`);
    for (const q of list)
      if (!questions.has(q)) fail(`Índice ${id}: questão inexistente: ${q}`);
  }
  for (const t of data.trilhas) {
    if (!Array.isArray(t.p)) fail(`${t.id}: passos ausentes`);
    for (const [kind, id] of t.p) {
      const valid =
        kind === "c"
          ? sections.has(id)
          : kind === "r"
            ? solved.has(id)
            : kind === "m"
              ? modelIds.has(id)
              : kind === "q"
                ? units.has(id)
                : false;
      if (!valid)
        fail(`${t.id}: passo aponta para id inexistente: ${kind}/${id}`);
    }
    let i = 0;
    for (const step of t.p)
      if (
        JSON.stringify(step) ===
        JSON.stringify(originalTrails.find((x) => x.id === t.id).p[i])
      )
        i++;
    if (i !== originalTrails.find((x) => x.id === t.id).p.length)
      fail(`${t.id}: perdeu ou reordenou algum passo original`);
  }
  let images = {};
  try {
    images = await read("src/data/imagens.json");
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  for (const [id, list] of Object.entries(images)) {
    if (!sections.has(id) || !Array.isArray(list))
      fail(`Imagens: seção inválida: ${id}`);
    sections.get(id).img = list;
  }
  if (DRY) {
    report(`Validação OK (nada gravado): ${files.join(", ")}`);
    return;
  }
  // Só grava depois de validar o conjunto completo.
  for (const name of names)
    await writeFile(
      path.join(root, `src/data/${name}.json`),
      JSON.stringify(data[name], null, 2) + "\n",
    );
  report(
    `Mesclagem: ${files.length} trilha(s), ${extended.size} seções ampliadas, ${data.questoes.length} questões, ${data.resolvidas.length} resolvidas.`,
  );
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    await mesclar();
  } catch (e) {
    console.error(`Falha na mesclagem: ${e.message}`);
    process.exitCode = 1;
  }
}
