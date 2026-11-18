#!/usr/bin/env node
// Genera las páginas estáticas /art/<id>/ /grupo/<id>/ /sm/<id>/ de
// app.lasrespuestascatolicas.com, con metadatos Open Graph por destino, para
// que WhatsApp/iMessage/Telegram muestren el TÍTULO y la pintura de la
// pregunta al compartir una liga desde la app. También escribe index.html y
// 404.html (la misma portada). Hermano chico del gen-og.mjs de
// lamisaexplicada-web: mismo contrato de URLs, sin /santo ni /pregunta.
//
//   node gen-og.mjs [ruta/al/content_bundle.json]
//
// Correr después de cambiar contenido y subir el resultado. Filtra
// `pruebas: true` y Secciones Master `oculta: true`, igual que la app.
// Requiere macOS (`sips` para las imágenes).

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SITE = "https://app.lasrespuestascatolicas.com";
const APP = "Las Respuestas Católicas";
const DEFAULT_DESC = "Respuestas claras a las preguntas de la fe católica.";
// Vacío mientras la app no tenga ficha: la página dice «muy pronto» en lugar
// de mostrar botones de tienda. Al publicar, poner aquí el id numérico.
const APP_STORE_ID = "";

const root = dirname(fileURLToPath(import.meta.url));
const bundlePath =
  process.argv[2] ??
  join(root, "../LaMisaExplicada/LasRespuestasCatolicas/Resources/content_bundle.json");
const imagesDir = join(dirname(bundlePath), "Images");
const bundle = JSON.parse(readFileSync(bundlePath, "utf8"));

const esc = (s) =>
  String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
// Texto del editor -> texto plano: sin _cursivas_, **negritas** ni {{ligas|destino}}.
const plain = (s) =>
  String(s ?? "")
    .replace(/\{\{([^|}]*)\|[^}]*\}\}/g, "$1")
    .replaceAll("**", "")
    .replace(/(?<![\p{L}\p{N}])_([^_]+)_(?![\p{L}\p{N}])/gu, "$1")
    .trim();
const recorta = (t, n) => (t.length <= n ? t : t.slice(0, t.lastIndexOf(" ", n)) + "…");

const pages = new Map();
const add = (kind, id, title, desc, image) => {
  if (!id || !title) return;
  pages.set(`${kind}/${id}`, { kind, id, title, desc: desc || DEFAULT_DESC, image: image || null });
};
const walk = (nodes) => {
  for (const node of nodes ?? []) {
    if (node.pruebas === true) continue;
    if (node.type === "article") {
      // La descripción es el «En breve» de la pregunta (su respuesta corta).
      const brief = (node.content ?? []).find((b) => b.type === "brief")?.value;
      add("art", node.id, node.title, node.subtitle || (brief ? recorta(plain(brief), 180) : ""), node.image || node.cardImage);
    }
    if (node.type === "section") {
      add("grupo", node.id, node.title, node.subtitle, node.image || node.cardImage);
      walk(node.subsections);
    }
  }
};
walk(bundle.sections);
for (const sm of bundle.masterSections ?? []) {
  if (sm.pruebas === true || sm.oculta === true) continue;
  add("sm", sm.id, sm.name, sm.intro || sm.homeCard?.subtitle, sm.homeCard?.image);
  walk(sm.sections);
}

const makeOgImage = (entry, dir) => {
  if (!entry.image) return false;
  const src = join(imagesDir, entry.image);
  if (!existsSync(src)) {
    console.warn(`  aviso: ${entry.kind}/${entry.id} usa una imagen que no está: "${entry.image}"`);
    return false;
  }
  const width = parseInt(
    spawnSync("sips", ["-g", "pixelWidth", src], { encoding: "utf8" }).stdout?.match(/pixelWidth: (\d+)/)?.[1] ?? "0",
    10,
  );
  const args = width > 1200 ? ["--resampleWidth", "1200"] : [];
  const result = spawnSync(
    "sips",
    [...args, "-s", "format", "jpeg", "-s", "formatOptions", "78", src, "--out", join(dir, "og.jpg")],
    { encoding: "utf8" },
  );
  return result.status === 0;
};

const STYLE = `
    :root { --bg: #F7F5F0; --ink: #1A1A18; --muted: #6B6860; --gold: #B5922A; --accent: #8B1A1A; }
    @media (prefers-color-scheme: dark) {
      :root { --bg: #17160F; --ink: #EDEAE2; --muted: #A6A296; --gold: #D8B25A; --accent: #D0645C; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: var(--bg); color: var(--ink);
      font-family: Georgia, "Times New Roman", serif;
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      padding: 24px; text-align: center;
    }
    .card { max-width: 440px; }
    .hero { width: 100%; aspect-ratio: 1.6 / 1; object-fit: cover; object-position: 50% 30%; border-radius: 14px; margin-bottom: 22px; display: block; }
    .eyebrow { font-family: -apple-system, system-ui, sans-serif; font-size: 11px; letter-spacing: .18em; color: var(--gold); text-transform: uppercase; margin-bottom: 14px; }
    h1 { font-size: 30px; font-weight: 500; line-height: 1.2; text-wrap: balance; }
    .tess { display: flex; gap: 3px; justify-content: center; margin: 18px 0; }
    .tess i { width: 6px; height: 6px; background: var(--gold); }
    .tess i:nth-child(2) { background: var(--accent); }
    .brief { font-size: 17px; line-height: 1.55; font-style: italic; margin-bottom: 16px; }
    p { font-family: -apple-system, system-ui, sans-serif; font-size: 15px; line-height: 1.6; color: var(--muted); }
    p.brief { font-family: Georgia, "Times New Roman", serif; color: var(--ink); }
    .cta { display: inline-block; margin-top: 22px; padding: 13px 26px; font-family: -apple-system, system-ui, sans-serif; font-size: 15px; font-weight: 600; color: #fff; background: var(--accent); border-radius: 12px; text-decoration: none; }
    .soon { margin-top: 22px; font-size: 12px; letter-spacing: .14em; text-transform: uppercase; color: var(--gold); }`;

const store = APP_STORE_ID
  ? `<a class="cta" href="https://apps.apple.com/app/id${APP_STORE_ID}">Descargar en el App&nbsp;Store</a>`
  : `<p class="soon">Muy pronto en el App Store</p>`;
const smartBanner = (url) =>
  APP_STORE_ID ? `\n  <meta name="apple-itunes-app" content="app-id=${APP_STORE_ID}, app-argument=${url}">` : "";

const page = ({ kind, id, title, desc }, hasOwnImage) => {
  const url = `${SITE}/${kind}/${encodeURIComponent(id)}`;
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">${smartBanner(url)}
  <title>${esc(title)} — ${APP}</title>
  <meta property="og:site_name" content="${APP}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${hasOwnImage ? `${url}/og.jpg` : `${SITE}/og-cover.png`}">
  <meta name="twitter:card" content="${hasOwnImage ? "summary_large_image" : "summary"}">
  <meta name="description" content="${esc(desc)}">
  <style>${STYLE}
  </style>
</head>
<body>
  <div class="card">
${hasOwnImage ? `    <img class="hero" src="og.jpg" alt="">\n` : ""}    <div class="eyebrow">${APP}</div>
    <h1>${esc(title)}</h1>
    <div class="tess"><i></i><i></i><i></i></div>
${kind === "art" && desc !== DEFAULT_DESC ? `    <p class="brief">${esc(desc)}</p>\n` : ""}    <p>La respuesta completa, paso a paso y con sus fuentes, está en la app <strong>${APP}</strong>. Si ya la tienes instalada, este enlace se abre directo en ella.</p>
    ${store}
  </div>
</body>
</html>
`;
};

const home = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">${smartBanner(SITE)}
  <title>${APP}</title>
  <meta property="og:site_name" content="${APP}">
  <meta property="og:title" content="${APP}">
  <meta property="og:description" content="${DEFAULT_DESC}">
  <meta property="og:image" content="${SITE}/og-cover.png">
  <meta name="twitter:card" content="summary">
  <meta name="description" content="${DEFAULT_DESC}">
  <style>${STYLE}
  </style>
</head>
<body>
  <div class="card">
    <div class="eyebrow">${APP}</div>
    <h1>Este contenido vive en la app</h1>
    <div class="tess"><i></i><i></i><i></i></div>
    <p>${DEFAULT_DESC} Si ya tienes <strong>${APP}</strong> instalada, el enlace se abre directo en la app.</p>
    ${store}
  </div>
</body>
</html>
`;

for (const kind of ["art", "grupo", "sm"]) rmSync(join(root, kind), { recursive: true, force: true });
let withImage = 0;
for (const entry of pages.values()) {
  const dir = join(root, entry.kind, entry.id);
  mkdirSync(dir, { recursive: true });
  const has = makeOgImage(entry, dir);
  if (has) withImage += 1;
  writeFileSync(join(dir, "index.html"), page(entry, has));
}
writeFileSync(join(root, "index.html"), home);
writeFileSync(join(root, "404.html"), home);
console.log(`Generadas ${pages.size} páginas (${withImage} con imagen) desde ${bundlePath}`);
