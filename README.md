# Nabees Alight Motion Generator

Premium Three.js frontend for the RynAmPrem workflow, packaged for Cloudflare Workers Static Assets.

## Deploy

```bash
npm install -g wrangler
wrangler login
wrangler deploy
```

The Worker serves `public/` through the Assets binding defined in `wrangler.toml`.

## Important architecture note

The web interface is intentionally a frontend layer. The original Node CLI authentication connection remains in `index.js` and `lib/auth.js`; refresh tokens and the existing Android identity headers are not moved into browser JavaScript.

The premium function remains the original stub because the source repository does not contain a premium activation endpoint.

## Local CLI

```bash
npm install
npm start
```

## Project

- `worker.js` — Cloudflare Worker entry point
- `wrangler.toml` — Worker + Static Assets configuration
- `public/` — 3D web experience, SEO, OG image and favicon
- `index.js` — original CLI entry point
- `lib/auth.js` — original authentication module
