// ============================================
//  Obfuscated by Nabees Tech
//  Domain: git.nabees.online
//  WhatsApp: https://whatsapp.com/channel/0029VawtjOXJpe8X3j3NCZ3j
//  Protected - Do not redistribute
// ============================================
// RynAmPrem — logika inti autentikasi Alight Motion (magic link).
const axios = require('axios')
const KEY = 'AIzaSyDtG1AU22ErnQD60AzBAcaknySiz9_CEq0'
const IDT = 'https://www.googleapis.com/identitytoolkit/v3/relyingparty'
const STK = 'https://securetoken.googleapis.com/v1/token'
const headers = {'content-type':'application/json','x-android-package':'com.alightcreative.motion','x-android-cert':'ECA6BF91B8715A6F810ED0BBFC65B6CD578F52A8','user-agent':'dalvik/2.1.0 (linux; u; android 15; 23127pn0cc build/bp1a.250505.005)'}
const post=(url,body,extra={})=>axios.post(url,body,{headers:{...headers,...extra},timeout:30000}).then(r=>r.data).catch(e=>{const d=e.response?.data;throw new Error(d?JSON.stringify(d):e.message)})
const friendly=e=>{const raw=e.message;if(raw.includes('OUT_OF_BAND_CODE')||raw.includes('INVALID_OOB_CODE'))return 'kode sudah dipakai / kedaluwarsa — kirim link baru lewat menu 1';if(raw.includes('EMAIL_NOT_FOUND'))return 'email tidak terdaftar di server';if(raw.includes('TOO_MANY_ATTEMPTS'))return 'terlalu banyak percobaan — tunggu sebentar lalu coba lagi';if(raw.includes('INVALID_EMAIL'))return 'format email tidak valid';if(raw.includes('MISSING_EMAIL'))return 'email tidak boleh kosong';if(raw.includes('USER_DISABLED'))return 'akun ini dinonaktifkan';if(raw.includes('OPERATION_NOT_ALLOWED'))return 'operasi tidak diizinkan untuk email ini';if(raw.includes('TOKEN_EXPIRED'))return 'token kedaluwarsa — login ulang lewat menu 1 & 2';if(raw.includes('INVALID_REFRESH_TOKEN'))return 'refresh token tidak valid — hapus sesi, lalu login ulang';if(raw.includes('USER_NOT_FOUND'))return 'akun tidak ditemukan di server';return raw}
function extractCode(raw){if(!raw)return null;let s=String(raw).replace(/&amp;/g,'&');try{s=decodeURIComponent(s)}catch{}try{const u=new URL(s),direct=u.searchParams.get('oobCode');if(direct)return direct.replace(/[^a-zA-Z0-9_-]/g,'');const nested=u.searchParams.get('link')||u.searchParams.get('q')||u.searchParams.get('url');if(nested){try{return new URL(nested).searchParams.get('oobCode')}catch{}}}catch{}const m=s.match(/oobCode=([a-zA-Z0-9_-]+)/i);if(m)return m[1];const t=raw.trim();return /^[a-zA-Z0-9_-]{10,}$/.test(t)&&!t.includes('://')?t:null}
async function link(email){try{await post(`${IDT}/getOobConfirmationCode?key=${KEY}`,{requestType:6,email,androidInstallApp:true,canHandleCodeInApp:true,continueUrl:'https://alightcreative.com?ui_sid=0366624874&ui_sd=0',iosBundleId:'com.alightcreative.motion',androidPackageName:'com.alightcreative.motion',androidMinimumVersion:'585',clientType:'CLIENT_TYPE_ANDROID'});return{ok:true}}catch(e){return{ok:false,why:friendly(e)}}}
async function verify(email,raw){const code=extractCode(raw);if(!code)return{ok:false,why:'kode tidak ditemukan di link'};try{const a=await post(`${IDT}/emailLinkSignin?key=${KEY}`,{email,oobCode:code,clientType:'CLIENT_TYPE_ANDROID'});return{ok:true,email,uid:a.localId,idToken:a.idToken,refreshToken:a.refreshToken,isNewUser:!!a.isNewUser}}catch(e){return{ok:false,why:friendly(e)}}}
async function refresh(refreshToken){try{const r=await post(`${STK}?key=${KEY}`,{grant_type:'refresh_token',refresh_token:refreshToken});return{ok:true,idToken:r.id_token,refreshToken:r.refresh_token}}catch(e){return{ok:false,why:friendly(e)}}}
async function premium(){return{ok:false,why:'premium belum diimplementasikan'}}
module.exports={link,verify,refresh,premium,extractCode}
