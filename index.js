// ============================================
//  Obfuscated by Nabees Tech
//  Domain: git.nabees.online
//  WhatsApp: https://whatsapp.com/channel/0029VawtjOXJpe8X3j3NCZ3j
//  Protected - Do not redistribute
// ============================================
#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const readline = require('readline')
const auth = require('./lib/auth')
const store = path.join(__dirname, 'sessions.json')
const load = () => { try { return JSON.parse(fs.readFileSync(store, 'utf8')) } catch { return {} } }
const save = d => fs.writeFileSync(store, JSON.stringify(d, null, 2), { mode: 0o600 })
const norm = e => String(e || '').trim().toLowerCase()
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const lines = []
let waiter = null
rl.on('line', l => { if (waiter) { waiter(l); waiter = null } else lines.push(l) })
rl.on('close', () => { if (waiter) { waiter('0'); waiter = null } })
const ask = q => new Promise(r => { process.stdout.write(q); if (lines.length) return r(lines.shift().trim()); waiter = l => r(l.trim()) })
const tryPremium = async idToken => typeof auth.premium === 'function' ? auth.premium(idToken) : { ok:false, why:'premium not available in this build' }
const menu = () => console.log(`\nRynAm\n[0] exit\n[1] send magic link\n[2] verify link + premium\n[3] premium from session\n[4] list sessions\n[5] check sessions\n`)
async function sendLink(){ const email=norm(await ask('email: ')); const r=await auth.link(email); console.log(r.ok?'link sent, check inbox/spam':`failed: ${r.why}`) }
async function verify(){ const email=norm(await ask('email: ')); const raw=await ask('link: '); const v=await auth.verify(email,raw); if(!v.ok)return console.log(`failed: ${v.why}`); console.log(`login ok: ${v.email} | new: ${v.isNewUser}`); const p=await tryPremium(v.idToken); console.log(p.ok?`premium active: ${p.order}`:`premium failed: ${p.why}`); const sessions=load(); sessions[norm(email)]={uid:v.uid,refreshToken:v.refreshToken,pro:p.ok,at:new Date().toISOString()}; save(sessions); console.log('session saved') }
async function fromSession(){ const email=norm(await ask('email: ')); const s=load()[email]; if(!s)return console.log('session not found'); const r=await auth.refresh(s.refreshToken); if(!r.ok)return console.log(`failed: ${r.why}`); const p=await tryPremium(r.idToken); console.log(p.ok?`premium active: ${p.order}`:`premium failed: ${p.why}`) }
function list(){ const s=load(),keys=Object.keys(s); if(!keys.length)return console.log('empty'); for(const e of keys)console.log(`${e} | uid=${s[e].uid} | pro=${s[e].pro} | ${s[e].at}`) }
async function check(){ const sessions=load(),keys=Object.keys(sessions); if(!keys.length)return console.log('empty — no saved sessions'); console.log(`checking ${keys.length} sessions...`); let okCount=0; for(const email of keys){ const s=sessions[email],r=await auth.refresh(s.refreshToken); if(r.ok){okCount++;sessions[email]={...s,refreshToken:r.refreshToken,at:new Date().toISOString()};console.log(`${email} | valid`)}else console.log(`${email} | ${r.why}`)} save(sessions); console.log(`result: ${okCount}/${keys.length} sessions valid`) }
async function main(){ while(true){menu();const p=await ask(': ');if(p==='0')return console.log('bye');try{if(p==='1')await sendLink();else if(p==='2')await verify();else if(p==='3')await fromSession();else if(p==='4')list();else if(p==='5')await check();else console.log('invalid choice')}catch(e){console.error(`error: ${e.message}`)}} }
main().catch(e=>console.error(e.message))
