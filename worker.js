const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", ...extra } });
const b64u = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - s.length % 4) % 4)), c => c.charCodeAt(0));
const enc = new TextEncoder();
const random = (n = 32) => { const b = crypto.getRandomValues(new Uint8Array(n)); return Array.from(b, x => x.toString(16).padStart(2, "0")).join(""); };
const sha = async (s) => new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s)));
const sessionCookie = (value, maxAge = 28800) => `nabees_session=${value}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax`;
const clearSessionCookie = () => "nabees_session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax";
const clearOauthCookie = (name) => `${name}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`;
const cookieValue = (request, name) => {
  for (const part of (request.headers.get("cookie") || "").split(";")) {
    const i = part.indexOf("=");
    if (i > -1 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return "";
};
const issuer = (env) => String(env.AUTH_ISSUER || "https://auth.nabees.online").replace(/\/+$/, "");
const clientId = (env) => env.AUTH_CLIENT_ID || "alight-motion-generator";
async function signSession(claims, secret) {
  const payload = b64u(enc.encode(JSON.stringify(claims)));
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return payload + "." + b64u(sig);
}
async function readSession(request, env) {
  if (!env.SESSION_SECRET) return null;
  const token = cookieValue(request, "nabees_session"), parts = token.split(".");
  if (parts.length !== 2) return null;
  try {
    const key = await crypto.subtle.importKey("raw", enc.encode(env.SESSION_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    if (!await crypto.subtle.verify("HMAC", key, unb64u(parts[1]), enc.encode(parts[0]))) return null;
    const data = JSON.parse(new TextDecoder().decode(unb64u(parts[0])));
    if (!data.sub || !data.exp || data.exp <= Math.floor(Date.now()/1000) || !data.email) return null;
    return data;
  } catch { return null; }
}
function decodeJwt(token) {
  const p = String(token || "").split(".");
  if (p.length !== 3) throw new Error("Invalid identity token.");
  return { header: JSON.parse(new TextDecoder().decode(unb64u(p[0]))), claims: JSON.parse(new TextDecoder().decode(unb64u(p[1]))), signature: unb64u(p[2]), signingInput: p[0] + "." + p[1] };
}
async function validateIdToken(token, env, expectedNonce) {
  const { header, claims, signature, signingInput } = decodeJwt(token);
  const base = issuer(env), jwksRes = await fetch(base + "/oauth/jwks", { headers: { accept: "application/json" } });
  if (!jwksRes.ok) throw new Error("Could not load identity signing keys.");
  const jwks = await jwksRes.json(), jwk = (jwks.keys || []).find(k => k.kid === header.kid && k.alg === "RS256");
  if (!jwk || header.alg !== "RS256") throw new Error("Unrecognized identity signing key.");
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  if (!await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature, enc.encode(signingInput))) throw new Error("Identity token signature failed.");
  const now = Math.floor(Date.now()/1000), aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (claims.iss !== base || !aud.includes(clientId(env)) || claims.nonce !== expectedNonce || !claims.sub || claims.exp <= now || claims.iat > now + 60 || claims.email_verified !== true) throw new Error("Identity token claims are invalid.");
  return claims;
}
function responseRedirect(url, cookies = []) {
  const headers = new Headers({ location: url, "cache-control": "no-store" });
  for (const c of cookies) headers.append("set-cookie", c);
  return new Response(null, { status: 302, headers });
}
function upstreamUrl(base, key) { return base + (base.includes("?") ? "&" : "?") + "key=" + encodeURIComponent(key); }
async function upstream(url, body, env) {
  if (!env.AUTH_API_KEY) throw new Error("AUTH_API_KEY is not configured");
  const r = await fetch(upstreamUrl(url, env.AUTH_API_KEY), {
    method: "POST",
    headers: { "content-type": "application/json", "x-android-package": "com.alightcreative.motion", "x-android-cert": "ECA6BF91B8715A6F810ED0BBFC65B6CD578F52A8", "user-agent": "dalvik/2.1.0 (linux; u; android 15; 23127pn0cc build/bp1a.250505.005)" },
    body: JSON.stringify(body)
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error("upstream"), { status: r.status, data });
  return data;
}
function extractCode(raw = "") {
  try {
    const u = new URL(raw);
    const direct = u.searchParams.get("oobCode") || u.searchParams.get("code");
    if (direct) return direct;
    const nested = u.searchParams.get("link") || u.searchParams.get("q") || u.searchParams.get("url");
    if (nested) { try { return new URL(nested).searchParams.get("oobCode") || raw; } catch {} }
  } catch {}
  const m = String(raw).match(/oobCode=([a-zA-Z0-9_-]+)/i);
  return m ? m[1] : String(raw).trim();
}
async function beginLogin(request, env) {
  if (!env.SESSION_SECRET) return json({ ok:false, error:"SESSION_SECRET is not configured." }, 503);
  const base = issuer(env), url = new URL(request.url), redirectUri = new URL("/auth/callback", url.origin).toString();
  const state = random(24), nonce = random(24), verifier = b64u(crypto.getRandomValues(new Uint8Array(48)));
  const challenge = b64u(await sha(verifier));
  const params = new URLSearchParams({ response_type:"code", client_id:clientId(env), redirect_uri:redirectUri, scope:"openid profile email", state, nonce, code_challenge:challenge, code_challenge_method:"S256" });
  const cookies = [
    `oidc_state=${state}; Max-Age=600; Path=/auth/callback; HttpOnly; Secure; SameSite=Lax`,
    `oidc_nonce=${nonce}; Max-Age=600; Path=/auth/callback; HttpOnly; Secure; SameSite=Lax`,
    `oidc_verifier=${verifier}; Max-Age=600; Path=/auth/callback; HttpOnly; Secure; SameSite=Lax`
  ];
  return responseRedirect(base + "/authorize?" + params.toString(), cookies);
}
async function completeLogin(request, env) {
  const url = new URL(request.url), code = url.searchParams.get("code") || "", state = url.searchParams.get("state") || "";
  const savedState = cookieValue(request, "oidc_state"), nonce = cookieValue(request, "oidc_nonce"), verifier = cookieValue(request, "oidc_verifier");
  const clear = [clearOauthCookie("oidc_state"), clearOauthCookie("oidc_nonce"), clearOauthCookie("oidc_verifier")];
  if (!code || !state || !savedState || state !== savedState || !nonce || !verifier) return responseRedirect("/?auth_error=state", clear);
  try {
    const base = issuer(env), redirectUri = new URL("/auth/callback", url.origin).toString();
    const form = new URLSearchParams({ grant_type:"authorization_code", client_id:clientId(env), code, redirect_uri:redirectUri, code_verifier:verifier });
    const tokenResponse = await fetch(base + "/oauth/token", { method:"POST", headers:{ "content-type":"application/x-www-form-urlencoded", accept:"application/json" }, body:form.toString() });
    const tokens = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok || !tokens.id_token || !tokens.access_token) throw new Error("The identity provider rejected the authorization code.");
    const claims = await validateIdToken(tokens.id_token, env, nonce);
    const infoResponse = await fetch(base + "/userinfo", { headers:{ authorization:"Bearer " + tokens.access_token, accept:"application/json" } });
    const profile = await infoResponse.json().catch(() => ({}));
    if (!infoResponse.ok || profile.sub !== claims.sub || profile.email !== claims.email) throw new Error("Could not verify the account profile.");
    const now = Math.floor(Date.now()/1000);
    const session = await signSession({ sub:claims.sub, email:profile.email, name:profile.name || claims.name || "", iss:base, iat:now, exp:now + 28800 }, env.SESSION_SECRET);
    return responseRedirect("/", [...clear, sessionCookie(session)]);
  } catch (e) {
    console.error("Nabees SSO callback failed:", e?.message || "unknown");
    return responseRedirect("/?auth_error=callback", clear);
  }
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url), path = url.pathname;
    if (path === "/auth/login" && request.method === "GET") return beginLogin(request, env);
    if (path === "/auth/callback" && request.method === "GET") return completeLogin(request, env);
    if (path === "/logout" && request.method === "GET") {
      const to = issuer(env) + "/?logout=1";
      return responseRedirect(to, [clearSessionCookie(), clearOauthCookie("oidc_state"), clearOauthCookie("oidc_nonce"), clearOauthCookie("oidc_verifier")]);
    }
    if (path === "/api/status" && request.method === "GET") return json({ ok:true, service:"Nabees Alight Motion Generator", ssoConfigured:Boolean(env.AUTH_ISSUER && env.AUTH_CLIENT_ID && env.SESSION_SECRET), auth:Boolean(env.AUTH_API_KEY) });
    const user = await readSession(request, env);
    if (!user) {
      if (path.startsWith("/api/")) return json({ ok:false, error:"Sign in with your Nabees ID to continue.", login_url:"/auth/login" }, 401);
      return responseRedirect("/auth/login");
    }
    if (path === "/api/session" && request.method === "GET") return json({ ok:true, user:{ id:user.sub, email:user.email, name:user.name } });
    if (request.method === "OPTIONS") return new Response(null, { status:204 });
    try {
      const IDT = env.IDENTITY_TOOLKIT_BASE || "https://www.googleapis.com/identitytoolkit/v3/relyingparty";
      const STK = env.SECURETOKEN_BASE || "https://securetoken.googleapis.com/v1/token";
      if (path === "/api/auth/link" && request.method === "POST") {
        const { email } = await request.json();
        if (!email || typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok:false, error:"A valid email address is required." }, 400);
        await upstream(IDT + "/getOobConfirmationCode", { requestType:6, email, androidInstallApp:true, canHandleCodeInApp:true, continueUrl:"https://alightcreative.com?ui_sid=0366624874&ui_sd=0", iosBundleId:"com.alightcreative.motion", androidPackageName:"com.alightcreative.motion", androidMinimumVersion:"585", clientType:"CLIENT_TYPE_ANDROID" }, env);
        return json({ ok:true, message:"Magic link requested." });
      }
      if (path === "/api/auth/verify" && request.method === "POST") {
        const { email, raw } = await request.json();
        if (typeof email !== "string" || !email || typeof raw !== "string" || !raw) return json({ ok:false, error:"Email and verification link/code are required." }, 400);
        const data = await upstream(IDT + "/emailLinkSignin", { email, oobCode:extractCode(raw), clientType:"CLIENT_TYPE_ANDROID" }, env);
        return json({ ok:true, uid:data.localId || data.userId || null }, 200, { "Set-Cookie":alightCookie(data.refreshToken) });
      }
      if (path === "/api/auth/refresh" && request.method === "POST") {
        const m = (request.headers.get("Cookie") || "").match(/(?:^|;\s*)alight_session=([^;]+)/);
        if (!m) return json({ ok:false, error:"No active Alight Motion session." }, 401);
        const data = await upstream(STK, { grant_type:"refresh_token", refresh_token:decodeURIComponent(m[1]) }, env);
        return json({ ok:true }, 200, { "Set-Cookie":alightCookie(data.refresh_token || decodeURIComponent(m[1])) });
      }
      if (path === "/api/auth/logout" && request.method === "POST") return json({ ok:true }, 200, { "Set-Cookie":"alight_session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict" });
      const response = await env.ASSETS.fetch(request);
      const headers = new Headers(response.headers);
      headers.set("X-Content-Type-Options", "nosniff");
      headers.set("X-Frame-Options", "SAMEORIGIN");
      headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
      headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
      headers.set("Cache-Control", "no-store");
      return new Response(response.body, { status:response.status, statusText:response.statusText, headers });
    } catch (e) {
      return json({ ok:false, error:e.message === "AUTH_API_KEY is not configured" ? "Server authentication is not configured." : "Authentication request failed." }, e.status || 500);
    }
  }
};
function alightCookie(value, maxAge = 2592000) {
  return `alight_session=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Strict`;
}
