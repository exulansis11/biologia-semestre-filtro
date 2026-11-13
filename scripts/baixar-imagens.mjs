import { readFile, readdir, mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const API = "https://commons.wikimedia.org/w/api.php";
const USER_AGENT =
  "BiologiaSemestreFiltro/1.0 (educational image downloader; Wikimedia Commons attribution)";
export const plain = (html = "") =>
  String(html)
    .replace(/<[^>]*>/g, "")
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, n) =>
      String.fromCodePoint(
        n[0].toLowerCase() === "x" ? parseInt(n.slice(1), 16) : +n,
      ),
    )
    .replace(
      /&(amp|lt|gt|quot|apos|nbsp);/g,
      (_, n) =>
        ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " })[n],
    )
    .trim();
export function acceptedLicense(info) {
  const meta = info.extmetadata || {};
  const license = plain(meta.LicenseShortName?.value);
  if (
    !/^(?:public domain|dom[ií]nio p[uú]blico|cc0(?:\s|$)|cc[ -]by(?:[ -]sa)?(?:\s+\d+(?:\.\d+)?)?(?:\s+(?:unported|international))?$)/i.test(
      license,
    )
  )
    return null;
  if (meta.NonFree?.value && meta.NonFree.value !== "false") return null;
  const url =
    meta.LicenseUrl?.value ||
    (/^(public domain|dom[ií]nio)/i.test(license)
      ? "https://creativecommons.org/publicdomain/mark/1.0/"
      : "");
  if (!/^https?:\/\//i.test(url)) return null;
  return { licenca: license, licenca_url: url };
}
export async function baixarImagens({
  directory = root,
  fetchImpl = fetch,
  pause = (ms = 1500) => new Promise((r) => setTimeout(r, ms)),
  report = console.log,
} = {}) {
  const read = async (p) =>
    JSON.parse(await readFile(path.join(directory, p), "utf8"));
  let previous = {};
  try {
    previous = await read("src/data/imagens.json");
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  const manifest = {},
    missing = [];
  let downloaded = 0,
    reused = 0,
    replaced = 0,
    networkError;
  const request = async (url) => {
    await pause();
    let response;
    try {
      response = await fetchImpl(url, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(15000),
      });
    } catch (e) {
      networkError = e.message;
      throw e;
    }
    // O Commons limita a taxa: espera o Retry-After (ou 20 s) e tenta de novo.
    for (let i = 0; response.status === 429 && i < 4; i++) {
      await pause(1000 * (Number(response.headers.get("retry-after")) || 20));
      response = await fetchImpl(url, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(15000),
      });
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response;
  };
  const query = async (params) => {
    const data = await (
      await request(
        API +
          "?" +
          new URLSearchParams({ action: "query", format: "json", ...params }),
      )
    ).json();
    if (data.error) throw new Error(data.error.info || data.error.code);
    return data.query || {};
  };
  const lookup = async (title) => {
    const result = await query({
      titles: title,
      prop: "imageinfo",
      iiprop: "url|extmetadata|mime|size",
      iiurlwidth: "900",
    });
    const page = Object.values(result.pages || {})[0],
      info = page?.imageinfo?.[0];
    const license = info && acceptedLicense(info);
    if (
      !license ||
      !/^image\/(png|jpeg|gif|webp|svg\+xml|tiff)$/.test(info.mime)
    )
      return null;
    // Large originals must have a bounded thumbnail; SVG thumbnails are rasterized by Commons.
    if (!info.thumburl && (!info.width || info.width > 900)) return null;
    return { page, info, license };
  };
  await mkdir(path.join(directory, "public/imagens"), { recursive: true });
  for (const file of (await readdir(path.join(directory, "src/data/ampliacao")))
    .filter((f) => /^t\d+\.json$/.test(f))
    .sort()) {
    const data = await read("src/data/ampliacao/" + file);
    for (const [section, content] of Object.entries(data.secoes)) {
      manifest[section] = [];
      for (const [index, order] of (content.img_pedidos || []).entries()) {
        const label = `${section}-${index + 1}`;
        try {
          const cached = (previous[section] || []).find((img) =>
            new RegExp(`^imagens/${label}\\.[a-z]+$`).test(img.arquivo),
          );
          if (
            cached &&
            acceptedLicense({
              extmetadata: {
                LicenseShortName: { value: cached.licenca },
                LicenseUrl: { value: cached.licenca_url },
              },
            })
          ) {
            try {
              await access(path.join(directory, "public", cached.arquivo));
              manifest[section].push({
                ...cached,
                legenda: order.legenda,
                legenda_it: order.legenda_it,
                alt: order.alt,
              });
              reused++;
              if (cached.trocada) replaced++;
              continue;
            } catch (e) {
              if (e.code !== "ENOENT") throw e;
            }
          }
          if (networkError)
            throw new Error(`Rede indisponível: ${networkError}`);
          let selected = await lookup(order.titulo),
            swapped = false;
          if (!selected) {
            const result = await query({
              list: "search",
              srnamespace: "6",
              srsearch: order.busca,
              srlimit: "10",
            });
            for (const candidate of result.search || []) {
              selected = await lookup(candidate.title);
              if (selected) {
                swapped = true;
                break;
              }
            }
          }
          if (!selected) throw new Error("Nenhuma imagem com licença aceita");
          const { page, info, license } = selected;
          const url = info.thumburl || info.url;
          const response = await request(url);
          const mime = (
            response.headers.get("content-type") ||
            info.thumbmime ||
            info.mime
          ).split(";")[0];
          const ext = {
            "image/png": "png",
            "image/jpeg": "jpg",
            "image/gif": "gif",
            "image/webp": "webp",
            "image/svg+xml": "svg",
            "image/tiff": "tif",
          }[mime];
          if (!ext) throw new Error(`Tipo inesperado: ${mime}`);
          const bytes = new Uint8Array(await response.arrayBuffer());
          if (!bytes.length) throw new Error("Arquivo vazio");
          const arquivo = `imagens/${label}.${ext}`;
          await writeFile(path.join(directory, "public", arquivo), bytes);
          manifest[section].push({
            arquivo,
            legenda: order.legenda,
            legenda_it: order.legenda_it,
            alt: order.alt,
            titulo_commons: page.title,
            autor:
              plain(info.extmetadata.Artist?.value) || "Autor não informado",
            ...license,
            pagina:
              "https://commons.wikimedia.org/wiki/" +
              encodeURIComponent(page.title).replaceAll("%3A", ":"),
            trocada: swapped,
          });
          downloaded++;
          if (swapped) replaced++;
        } catch (e) {
          missing.push({
            pedido: label,
            titulo: order.titulo,
            motivo: e.message,
          });
        }
      }
    }
  }
  await writeFile(
    path.join(directory, "src/data/imagens.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  await writeFile(
    path.join(directory, "src/data/imagens-relatorio.json"),
    JSON.stringify({ downloaded, reused, replaced, missing }, null, 2) + "\n",
  );
  report(
    `Imagens: ${downloaded} baixadas, ${reused} reaproveitadas, ${replaced} trocadas pela busca, ${missing.length} pedidos sem imagem.`,
  );
  for (const m of missing) report(`${m.pedido}: ${m.titulo} — ${m.motivo}`);
  return { downloaded, reused, replaced, missing };
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const result = await baixarImagens();
    if (result.missing.length) process.exitCode = 1;
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
