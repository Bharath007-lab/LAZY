import { LlmChat, UserMessage, validateApiKey } from 'emergentintegrations'
import { randomUUID } from 'crypto'
import { MODELS, CAPABILITY_POLICY, getModel } from './config/models.js'
import { getDb } from './mongo.js'
import { AI_COST_PER_UNIT } from './config/plans.js'

// ---------------------------------------------------------------------------
// MODEL ROUTER
// Application -> Agent Runtime -> Model Router -> Provider Adapter -> Model
// Agents request a *capability*; the router resolves provider+model, applies a
// fallback chain, logs health/cost, and never lets one provider fail the app.
// ---------------------------------------------------------------------------

let disabledModels = new Set()
export function setModelEnabled(id, enabled) {
  if (enabled) disabledModels.delete(id)
  else disabledModels.add(id)
}
export function getDisabledModels() {
  return [...disabledModels]
}

function buildChain(capability, { priority } = {}) {
  const order = CAPABILITY_POLICY[capability] || CAPABILITY_POLICY.reasoning
  let chain = order
    .map(getModel)
    .filter((m) => m && m.enabled && !disabledModels.has(m.id))
  if (priority) {
    // premium plans prefer the strongest model first
    chain = [...chain].sort((a, b) => (b.reliability - a.reliability))
  }
  if (chain.length === 0) chain = MODELS.filter((m) => m.enabled && !disabledModels.has(m.id))
  return chain
}

function parseJson(text) {
  if (!text) throw new Error('empty model output')
  try { return JSON.parse(text) } catch {}
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fence) { try { return JSON.parse(fence[1]) } catch {} }
  const first = text.indexOf('{'); const firstArr = text.indexOf('[')
  const start = firstArr !== -1 && (firstArr < first || first === -1) ? firstArr : first
  const lastObj = text.lastIndexOf('}'); const lastArr = text.lastIndexOf(']')
  const end = Math.max(lastObj, lastArr)
  if (start !== -1 && end !== -1 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)) } catch {}
  }
  throw new Error('model did not return valid JSON')
}

async function logRequest(entry) {
  try {
    const db = await getDb()
    await db.collection('llm_requests').insertOne(entry)
  } catch (e) { /* observability must never break the request path */ }
}

// Core routing call. Returns { text, json?, model, provider, fallback_used, latency_ms }
export async function route({
  capability = 'reasoning',
  system,
  user,
  json = false,
  taskUnits = 0.2,
  priority = false,
  meta = {},
}) {
  const key = validateApiKey(process.env.EMERGENT_LLM_KEY)
  const chain = buildChain(capability, { priority })
  let lastErr
  for (let i = 0; i < chain.length; i++) {
    const m = chain[i]
    const t0 = Date.now()
    try {
      const sys = json ? `${system}\n\nReturn ONLY valid minified JSON. No markdown, no commentary.` : system
      const chat = new LlmChat(key, meta.sessionId || randomUUID(), sys)
        .withModel(m.provider, m.model_id)
        .withParams({ temperature: json ? 0.1 : 0.4, max_tokens: 1500 })
      const text = await chat.sendMessage(new UserMessage({ text: user }))
      const latency = Date.now() - t0
      const out = json ? parseJson(text) : null
      await logRequest({
        id: randomUUID(), provider: m.provider, model: m.id, capability,
        success: true, latency_ms: latency, fallback_used: i > 0,
        task_units: taskUnits, cost: Number((taskUnits * AI_COST_PER_UNIT).toFixed(4)),
        agent: meta.agent || null, user_id: meta.userId || null, createdAt: new Date(),
      })
      return { text, json: out, model: m.id, provider: m.provider, fallback_used: i > 0, latency_ms: latency }
    } catch (e) {
      lastErr = e
      await logRequest({
        id: randomUUID(), provider: m.provider, model: m.id, capability,
        success: false, latency_ms: Date.now() - t0, fallback_used: i > 0,
        error: String(e?.message || e).slice(0, 300),
        agent: meta.agent || null, user_id: meta.userId || null, createdAt: new Date(),
      })
    }
  }
  throw new Error(`All models failed for capability "${capability}": ${lastErr?.message || 'unknown'}`)
}
