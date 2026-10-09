# Nabees Alight Motion Generator

Cloudflare Workers + Workers Assets frontend for the Alight Motion Generator. The website is now protected by **Nabees ID** using OpenID Connect Authorization Code + PKCE (S256). The existing Alight Motion email-link API connection remains separate and is only available after a Nabees ID session is established.

## SSO setup

### 1. Deploy Nabees ID first

Deploy the `Nabaikabaia/auth` repository with its OIDC migration and signing key configured. Attach `auth.nabees.online` and set the issuer to the exact HTTPS origin. Follow that repository's README.

### 2. Configure this Worker

Set a high-entropy session signing secret. Generate one locally, then paste it when Wrangler prompts:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npx wrangler secret put SESSION_SECRET
```

Keep the value private and do not commit it. Configure the existing Alight Motion API key separately:

```bash
npx wrangler secret put AUTH_API_KEY
npx wrangler deploy
```

`AUTH_ISSUER` and `AUTH_CLIENT_ID` are set in `wrangler.toml`. The OAuth callback is the deployed app origin plus `/auth/callback`. Because redirect URLs are exact allowlisted values, the callback must be registered in the **Nabees ID D1 database** before SSO will succeed.

### 3. Register this app in the Nabees ID D1 database

First deploy this Worker and copy its exact public HTTPS URL from Cloudflare. If it is `https://YOUR-APP-HOST`, execute the following SQL against the D1 database bound to the `auth` Worker. Replace the hostname with the actual deployed host; do not leave the placeholder:

```sql
INSERT INTO oauth_clients
  (client_id, name, redirect_uris, allowed_scopes, active, created_at)
VALUES
  ('alight-motion-generator',
   'Nabees Alight Motion Generator',
   '["https://YOUR-APP-HOST/auth/callback"]',
   'openid profile email',
   1,
   unixepoch());
```

If a row with that client ID already exists, update it instead:

```sql
UPDATE oauth_clients
SET redirect_uris='["https://YOUR-APP-HOST/auth/callback"]',
    active=1
WHERE client_id='alight-motion-generator';
```

The registered callback must exactly match the app origin and path. No wildcard redirect URIs are accepted.

### 4. Verify the flow

- Open the app origin. Unauthenticated visitors are redirected to `auth.nabees.online` to sign in or create an account.
- After sign-in, the identity provider redirects to `/auth/callback`; the Worker verifies state, nonce, PKCE, the RS256 ID-token signature and claims, and UserInfo before creating a signed HttpOnly app session.
- The local app session expires after eight hours. Signing out clears it and hands off to Nabees ID's account logout flow.
- `/api/auth/link`, `/api/auth/verify` and the remaining tool API routes return 401 unless a valid Nabees ID app session exists.

## Secrets and settings

- `AUTH_API_KEY` — secret for the existing Alight Motion/Firebase API.
- `SESSION_SECRET` — secret used to sign the app's eight-hour HttpOnly session cookie.
- `AUTH_ISSUER` — `https://auth.nabees.online`.
- `AUTH_CLIENT_ID` — `alight-motion-generator`.

Do not store private OIDC keys, API keys, session secrets, refresh tokens, or user credentials in GitHub.

## Existing endpoints

- `GET /api/status` — non-sensitive service status.
- `GET /api/session` — current Nabees ID session profile.
- `POST /api/auth/link` — request the original Alight Motion magic link (requires Nabees ID).
- `POST /api/auth/verify` — verify the original Alight Motion magic link (requires Nabees ID).
- `POST /api/auth/refresh` — refresh the Alight Motion session.
- `POST /api/auth/logout` — clear the Alight Motion session.
- `GET /logout` — clear the Nabees app session and open central account sign-out.

## Security notes

This integration uses OIDC Authorization Code + PKCE and validates the ID-token signature against the provider JWKS. It has not undergone an independent security audit. Keep the app and auth origins HTTPS-only, use a unique random `SESSION_SECRET`, test callback allowlisting and replay rejection, and add edge rate limiting/Turnstile before a public launch. The eight-hour app session is a separate signed cookie; it expires independently of the central account session.
