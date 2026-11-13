import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { baixarImagens, acceptedLicense, plain } from "./baixar-imagens.mjs";
for (const name of ["Public domain", "CC0 1.0", "CC BY 4.0", "CC BY-SA 3.0"])
  assert.ok(
    acceptedLicense({
      extmetadata: {
        LicenseShortName: { value: name },
        LicenseUrl: { value: "https://example.org/license" },
      },
    }),
  );
for (const name of [
  "CC BY-NC 4.0",
  "CC BY-ND 3.0",
  "Fair use",
  "Copyrighted",
  "CC BY-SA 4.0, GFDL",
])
  assert.equal(
    acceptedLicense({ extmetadata: { LicenseShortName: { value: name } } }),
    null,
  );
assert.equal(
  plain("<a>Nome &amp; sobrenome</a> &#169;"),
  "Nome & sobrenome ©",
);
const directory = await mkdtemp(path.join(tmpdir(), "bio-imagens-"));
await mkdir(path.join(directory, "src/data/ampliacao"), { recursive: true });
const order = (title) => ({
  titulo: title,
  busca: "cell diagram",
  legenda: "Legenda PT",
  legenda_it: "Didascalia IT",
  alt: "Célula",
});
await writeFile(
  path.join(directory, "src/data/ampliacao/t1.json"),
  JSON.stringify({
    secoes: {
      c1: {
        img_pedidos: [
          order("File:Direct.svg"),
          order("File:Missing.svg"),
          order("File:Nonfree.jpg"),
        ],
      },
    },
  }),
);
let calls = 0;
const fakeFetch = async (url) => {
  calls++;
  if (url.startsWith("https://images.example/"))
    return new Response(new Uint8Array([137, 80, 78, 71]), {
      headers: { "content-type": "image/png" },
    });
  const params = new URL(url).searchParams;
  assert.equal(params.get("action"), "query");
  if (params.get("list") === "search") {
    assert.equal(params.get("srnamespace"), "6");
    return Response.json({
      query: {
        search: [
          { title: "File:Nonfree.jpg" },
          { title: "File:Alternative.svg" },
        ],
      },
    });
  }
  assert.equal(params.get("iiurlwidth"), "900");
  const title = params.get("titles");
  if (title === "File:Missing.svg")
    return Response.json({ query: { pages: { "-1": { missing: "" } } } });
  return Response.json({
    query: {
      pages: {
        1: {
          title,
          imageinfo: [
            {
              mime: "image/svg+xml",
              thumburl: "https://images.example/test.png",
              extmetadata: {
                LicenseShortName: {
                  value: title.includes("Nonfree")
                    ? "CC BY-NC 4.0"
                    : "CC BY-SA 4.0",
                },
                LicenseUrl: {
                  value: "https://creativecommons.org/licenses/by-sa/4.0/",
                },
                Artist: { value: "<a>Autora &amp; equipe</a>" },
              },
            },
          ],
        },
      },
    },
  });
};
const options = {
  directory,
  fetchImpl: fakeFetch,
  pause: async () => {},
  report: () => {},
};
const first = await baixarImagens(options);
assert.equal(first.downloaded, 3);
assert.equal(first.replaced, 2);
assert.deepEqual(first.missing, []);
const manifestPath = path.join(directory, "src/data/imagens.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
assert.equal(manifest.c1[0].autor, "Autora & equipe");
assert.equal(manifest.c1[1].titulo_commons, "File:Alternative.svg");
assert.equal(manifest.c1[1].trocada, true);
for (const img of manifest.c1)
  assert.equal(
    (await readFile(path.join(directory, "public", img.arquivo))).length,
    4,
  );
const oldCalls = calls;
const second = await baixarImagens(options);
assert.equal(second.downloaded, 0);
assert.equal(second.reused, 3);
assert.equal(calls, oldCalls, "Não deve consultar nem baixar novamente");
assert.deepEqual(JSON.parse(await readFile(manifestPath, "utf8")), manifest);
await unlink(path.join(directory, "public", manifest.c1[0].arquivo));
assert.equal(
  (await baixarImagens(options)).downloaded,
  1,
  "Recuperar arquivo ausente",
);
// Falha de rede preserva os arquivos já disponíveis e relata todos os demais pedidos.
await unlink(path.join(directory, "public", manifest.c1[0].arquivo));
const offline = await baixarImagens({
  ...options,
  fetchImpl: async () => {
    throw new Error("offline");
  },
});
assert.equal(offline.reused, 2);
assert.equal(offline.missing.length, 1);
// Uma busca sem resultados também deixa um pedido pendente.
const empty = await baixarImagens({
  ...options,
  fetchImpl: async () => Response.json({ query: {} }),
});
assert.equal(empty.missing.length, 1);
console.log(
  "Imagens: licença, busca alternativa, download, créditos, idempotência, recuperação e falha de rede aprovados.",
);
