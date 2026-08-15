import { createCipheriv, createDecipheriv, randomBytes, scryptSync, createHmac } from 'crypto'

// AES-256-GCM encryption for secrets at rest. Key is derived from a server-side
// env secret (never exposed to the browser). Legacy plaintext values are
// tolerated on read so existing rows keep working.
const SECRET = process.env.APP_ENCRYPTION_KEY || 'dev-insecure-key-change-me'
const keyBuf = scryptSync(SECRET, 'lazy-salt-v1', 32)

export function encrypt(text) {
  if (text == null || text === '') return text
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', keyBuf, iv)
  const enc = Buffer.concat([c.update(String(text), 'utf8'), c.final()])
  const tag = c.getAuthTag()
  return 'enc:v1:' + Buffer.concat([iv, tag, enc]).toString('base64')
}

export function decrypt(val) {
  if (typeof val !== 'string' || !val.startsWith('enc:v1:')) return val // plaintext / legacy
  try {
    const raw = Buffer.from(val.slice(7), 'base64')
    const iv = raw.subarray(0, 12)
    const tag = raw.subarray(12, 28)
    const data = raw.subarray(28)
    const d = createDecipheriv('aes-256-gcm', keyBuf, iv)
    d.setAuthTag(tag)
    return Buffer.concat([d.update(data), d.final()]).toString('utf8')
  } catch { return '' }
}

export function hmac(text) {
  return createHmac('sha256', keyBuf).update(String(text)).digest('hex')
}
