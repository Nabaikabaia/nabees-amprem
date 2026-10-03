// ============================================
//  Obfuscated by Nabees Tech
//  Domain: git.nabees.online
//  WhatsApp: https://whatsapp.com/channel/0029VawtjOXJpe8X3j3NCZ3j
//  Protected - Do not redistribute
// ============================================
const assert = require('assert')
const auth = require('./lib/auth')
const cases = [
 ['https://x.test/?oobCode=ABCDEFGHIJK', 'ABCDEFGHIJK'],
 ['oobCode=ABCDEFGHIJK', 'ABCDEFGHIJK'],
 ['ABCDEFGHIJK', 'ABCDEFGHIJK'],
 ['https://x.test/?link=https%3A%2F%2Fx.test%2F%3FoobCode%3DABCDEFGHIJK', 'ABCDEFGHIJK']
]
for (const [input, expected] of cases) assert.strictEqual(auth.extractCode(input), expected)
assert.strictEqual(typeof auth.link, 'function'); assert.strictEqual(typeof auth.verify, 'function'); assert.strictEqual(typeof auth.refresh, 'function')
console.log('local checks passed')
