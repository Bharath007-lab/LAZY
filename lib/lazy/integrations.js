import { getDb } from './mongo.js'
import { encrypt, decrypt } from './crypto.js'

const SECRET_FIELDS = ['key', 'secret']

// ---------------------------------------------------------------------------
// BYOK INTEGRATIONS REGISTRY
// Founder adds provider keys in Settings (UI) -> Connect validates the key with
// a real provider call -> the system activates it. Keys are stored server-side
// in the config doc and NEVER returned to the browser (masked only).
// ---------------------------------------------------------------------------

export const PROVIDERS = {
  openrouter: { type: 'llm', label: 'OpenRouter', base: 'https://openrouter.ai/api/v1', default_model: 'openai/gpt-4o-mini', fields: ['key', 'model'], help: 'openrouter.ai \u2192 Settings \u2192 Keys' },
  merge: { type: 'llm', label: 'Merge Gateway', base: 'https://api-gateway.merge.dev/v1/openai', default_model: 'gpt-4o-mini', fields: ['key', 'model'], help: 'gateway.merge.dev \u2192 API Keys' },
  resend: { type: 'email', label: 'Resend (email / OTP)', fields: ['key', 'from'], help: 'resend.com \u2192 API Keys' },
  openhands: { type: 'engineering', label: 'OpenHands (AI engineer)', fields: ['endpoint', 'key'], help: 'Your OpenHands runtime URL + token' },
  google: { type: 'connector', label: 'Google (Gmail/Calendar/Drive)', fields: ['key', 'secret'], help: 'Google Cloud Console \u2192 OAuth client' },
  slack: { type: 'connector', label: 'Slack', fields: ['key', 'secret'], help: 'api.slack.com \u2192 Your Apps' },
  github: { type: 'connector', label: 'GitHub', fields: ['key', 'secret'], help: 'github.com \u2192 Developer settings \u2192 OAuth Apps' },
}

export function mask(v) {
  if (!v) return ''
  const s = String(v)
  return s.length <= 8 ? '\u2022\u2022\u2022\u2022' : s.slice(0, 3) + '\u2022\u2022\u2022\u2022' + s.slice(-4)
}

async function cfgDoc(db) {
  return (await db.collection('config').findOne({ id: 'system' })) || {}
}

export async function listIntegrations() {
  const db = await getDb()
  const cfg = await cfgDoc(db)
  const ints = cfg.integrations || {}
  return Object.entries(PROVIDERS).map(([id, meta]) => {
    const it = ints[id] || {}
    const rawKey = decrypt(it.key) || decrypt(it.secret) || it.endpoint
    return {
      id, label: meta.label, type: meta.type, fields: meta.fields, help: meta.help,
      default_model: meta.default_model || null,
      status: it.status || 'disconnected',
      primary: !!it.primary,
      masked_key: mask(rawKey),
      model: it.model || meta.default_model || '',
      from: it.from || '',
      endpoint: it.endpoint || '',
      connected_at: it.connected_at || null,
    }
  })
}

export async function saveIntegration(provider, data) {
  if (!PROVIDERS[provider]) throw new Error('Unknown provider')
  const db = await getDb()
  const set = {}
  for (const f of PROVIDERS[provider].fields) {
    if (data[f] !== undefined && data[f] !== '') {
      set[`integrations.${provider}.${f}`] = SECRET_FIELDS.includes(f) ? encrypt(data[f]) : data[f]
    }
  }
  set[`integrations.${provider}.status`] = 'saved'
  await db.collection('config').updateOne({ id: 'system' }, { $set: set }, { upsert: true })
  return true
}

async function validate(provider, itRaw) {
  const it = { ...itRaw, key: decrypt(itRaw.key), secret: decrypt(itRaw.secret) }
  try {
    if (provider === 'openrouter') {
      const r = await fetch(PROVIDERS.openrouter.base + '/models', { headers: { Authorization: 'Bearer ' + it.key } })
      return r.ok
    }
    if (provider === 'merge') {
      const r = await fetch('https://api-gateway.merge.dev/v1/models', { headers: { Authorization: 'Bearer ' + it.key } })
      return r.ok
    }
    if (provider === 'resend') {
      const r = await fetch('https://api.resend.com/domains', { headers: { Authorization: 'Bearer ' + it.key } })
      return r.ok
    }
    if (provider === 'openhands') {
      if (!it.endpoint) return false
      try { const r = await fetch(it.endpoint.replace(/\/$/, '') + '/health'); return r.ok } catch { return true }
    }
    // connector OAuth apps: presence of client id + secret is enough to activate the flow
    return !!(it.key && it.secret)
  } catch { return false }
}

export async function connectIntegration(provider) {
  if (!PROVIDERS[provider]) throw new Error('Unknown provider')
  const db = await getDb()
  const cfg = await cfgDoc(db)
  const it = (cfg.integrations || {})[provider] || {}
  const ok = await validate(provider, it)
  const set = { [`integrations.${provider}.status`]: ok ? 'connected' : 'error', [`integrations.${provider}.connected_at`]: ok ? new Date() : null }
  // an LLM gateway becomes the primary router target; demote the other
  if (ok && PROVIDERS[provider].type === 'llm') {
    set[`integrations.${provider}.primary`] = true
    const other = provider === 'openrouter' ? 'merge' : 'openrouter'
    set[`integrations.${other}.primary`] = false
  }
  await db.collection('config').updateOne({ id: 'system' }, { $set: set })
  return { status: ok ? 'connected' : 'error', ok }
}

export async function disconnectIntegration(provider) {
  const db = await getDb()
  await db.collection('config').updateOne({ id: 'system' }, { $set: { [`integrations.${provider}.status`]: 'disconnected', [`integrations.${provider}.primary`]: false } })
  return true
}

// Used by the Model Router: returns the active BYOK LLM gateway, if any.
export async function getActiveGateway() {
  try {
    const db = await getDb()
    const cfg = await cfgDoc(db)
    const ints = cfg.integrations || {}
    for (const p of ['openrouter', 'merge']) {
      const it = ints[p]
      if (it && it.status === 'connected' && it.primary && it.key) {
        return { provider: p, apiKey: decrypt(it.key), baseURL: PROVIDERS[p].base, model: it.model || PROVIDERS[p].default_model }
      }
    }
  } catch { /* ignore */ }
  return null
}

// Email provider (for OTP / transactional email). Returns decrypted creds.
export async function getEmailProvider() {
  const db = await getDb()
  const cfg = await cfgDoc(db)
  const it = cfg.integrations?.resend
  if (it && it.status === 'connected' && it.key) return { provider: 'resend', key: decrypt(it.key), from: it.from }
  return null
}

// Sends a verification code. If no email provider is connected, returns
// {delivered:false, dev:true} so the caller can fall back to DEV delivery.
export async function sendOtpEmail(to, code) {
  const p = await getEmailProvider()
  if (!p) return { delivered: false, dev: true }
  const from = p.from || 'LAZY <onboarding@resend.dev>'
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + p.key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from, to: [to], subject: 'Your LAZY verification code',
        html: `<div style="font-family:sans-serif"><p>Your LAZY verification code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:4px">${code}</p><p style="color:#666">It expires in 10 minutes.</p></div>`,
      }),
    })
    return { delivered: r.ok, dev: false }
  } catch { return { delivered: false, dev: true } }
}

export async function isOpenHandsConnected() {
  const db = await getDb()
  const cfg = await cfgDoc(db)
  return (cfg.integrations?.openhands?.status) === 'connected'
}

// ---- Google OAuth (BYOK client id/secret) ----
export const GOOGLE = {
  auth: 'https://accounts.google.com/o/oauth2/v2/auth',
  token: 'https://oauth2.googleapis.com/token',
  scopes: ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/calendar.readonly'],
}
export async function getGoogleCreds() {
  const db = await getDb()
  const cfg = await cfgDoc(db)
  const it = cfg.integrations?.google
  if (!it || !it.key || !it.secret) return null
  return { clientId: decrypt(it.key), clientSecret: decrypt(it.secret), status: it.status }
}

// ---- OpenHands (self-hosted Agent Server, BYOK endpoint + token) ----
export async function getOpenHands() {
  const db = await getDb()
  const cfg = await cfgDoc(db)
  const it = cfg.integrations?.openhands
  if (!it || it.status !== 'connected' || !it.endpoint) return null
  return { baseUrl: it.endpoint.replace(/\/$/, ''), token: decrypt(it.key) }
}
export async function dispatchOpenHands(prompt) {
  const oh = await getOpenHands()
  if (!oh) return { ok: false, reason: 'not_connected' }
  try {
    const r = await fetch(`${oh.baseUrl}/api/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Session-API-Key': oh.token || '' },
      body: JSON.stringify({ initial_message: { role: 'user', content: [{ type: 'text', text: prompt }] }, run: true }),
      signal: AbortSignal.timeout(30000),
    })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) return { ok: false, reason: `http_${r.status}` }
    return { ok: true, conversation_id: d.id || d.conversation_id, status: d.execution_status || 'running' }
  } catch (e) { return { ok: false, reason: String(e?.message || e).slice(0, 200) } }
}
export async function pollOpenHands(conversationId) {
  const oh = await getOpenHands()
  if (!oh) return { ok: false, reason: 'not_connected' }
  try {
    const r = await fetch(`${oh.baseUrl}/api/conversations/${conversationId}`, {
      headers: { 'X-Session-API-Key': oh.token || '' }, signal: AbortSignal.timeout(20000),
    })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) return { ok: false, reason: `http_${r.status}` }
    return { ok: true, status: d.execution_status || 'unknown' }
  } catch (e) { return { ok: false, reason: String(e?.message || e).slice(0, 200) } }
}
