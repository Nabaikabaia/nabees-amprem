# Nabees Alight Motion Generator

Cloudflare Workers + Workers Assets frontend for Nabees.

## Deploy
```bash
npm install
npx wrangler secret put AUTH_API_KEY
npx wrangler deploy
```

The authentication API key is intentionally not stored in GitHub. The Worker reads it from the `AUTH_API_KEY` secret.

## Routes
- POST /api/auth/link
- POST /api/auth/verify
- POST /api/auth/refresh
- POST /api/auth/logout
- GET /api/status
