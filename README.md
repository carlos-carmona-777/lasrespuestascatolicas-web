# lasrespuestascatolicas-web — app.lasrespuestascatolicas.com

Sitio mínimo para **GitHub Pages** en `app.lasrespuestascatolicas.com`: hace
funcionar los Universal Links de Las Respuestas Católicas y da una página con
título, respuesta breve y pintura a quien abre una liga sin tener la app.
Hermano de `lamisaexplicada-web` (mismo contrato: `/art/{id}`, `/grupo/{id}`,
`/sm/{id}`).

- `node gen-og.mjs` regenera `art/`, `grupo/`, `sm/`, `index.html` y `404.html`
  desde `../LaMisaExplicada/LasRespuestasCatolicas/Resources/content_bundle.json`.
  Correrlo y subir al cambiar contenido.
- Al tener ficha en el App Store: poner el id en `APP_STORE_ID` de `gen-og.mjs`
  (hoy las páginas dicen «Muy pronto en el App Store»).
- Falta `.well-known/assetlinks.json` (Android), cuando exista la app Android.

## Para ponerlo a andar (una sola vez)

1. Repo público en GitHub + Pages con dominio `app.lasrespuestascatolicas.com`.
2. En GoDaddy (DNS de `lasrespuestascatolicas.com`): registro **CNAME**, host
   `app`, valor `carlos-carmona-777.github.io`.
3. Verificar: `curl -sI https://app.lasrespuestascatolicas.com/.well-known/apple-app-site-association` → 200.
