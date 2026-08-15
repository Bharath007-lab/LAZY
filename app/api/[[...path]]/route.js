import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getDb, clean } from '@/lib/lazy/mongo'
import { PLANS, PLAN_ORDER, AI_COST_PER_UNIT, TASK_UNIT_WEIGHTS } from '@/lib/lazy/config/plans'
import { FEATURES } from '@/lib/lazy/config/features'
import { AGENTS } from '@/lib/lazy/config/agents'
import { MODELS, getModel } from '@/lib/lazy/config/models'
import { CONNECTORS, getConnector } from '@/lib/lazy/config/connectors'
import { entitlementSnapshot, canUseFeature, canUseConnector, setOverrides, getEffectiveFeatures, getPlan } from '@/lib/lazy/entitlements'
import { setModelEnabled, getDisabledModels } from '@/lib/lazy/modelRouter'
import { planOutcome, executeStep, extractInsights, operatorAnswer } from '@/lib/lazy/runtime'
import { listIntegrations, saveIntegration, connectIntegration, disconnectIntegration, isOpenHandsConnected } from '@/lib/lazy/integrations'
import { builderChat } from '@/lib/lazy/builder'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function cors(res) {
  res.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*')
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return res
}
const json = (data, status = 200) => cors(NextResponse.json(data, { status }))
const err = (msg, status = 400) => json({ error: msg }, status)

export async function OPTIONS() { return cors(new NextResponse(null, { status: 200 })) }

async function getConfig(db) {
  let cfg = await db.collection('config').findOne({ id: 'system' })
  if (!cfg) {
    cfg = {
      id: 'system',
      kill_switches: { global_safe_mode: false, automations_paused: false, desktop_disabled: false, agents: {}, connectors: {} },
      feature_flags: Object.fromEntries(FEATURES.map((f) => [f.id, f.flag])),
      disabled_models: [],
      createdAt: new Date(),
    }
    await db.collection('config').insertOne(cfg)
  }
  // keep in-memory router state in sync
  ;(cfg.disabled_models || []).forEach((id) => setModelEnabled(id, false))
  return cfg
}

async function audit(db, entry) {
  await db.collection('audit_logs').insertOne({
    id: randomUUID(), createdAt: new Date(), ...entry,
  })
}

// Operator/owner allowlist. These emails always get Operator OS access.
const OPERATOR_EMAILS = ['gbsreddy007@gmail.com']

async function ensureUser(db, email) {
  let user = await db.collection('users').findOne({ email })
  if (!user) {
    const isOperator = OPERATOR_EMAILS.includes(email) || email.includes('operator') || email.includes('founder')
    user = {
      id: randomUUID(),
      email,
      name: email.split('@')[0],
      org_id: randomUUID(),
      plan: 'pro',
      used_task_units: 0,
      role: isOperator ? 'owner' : 'customer',
      createdAt: new Date(),
    }
    await db.collection('users').insertOne(user)
    // default connected sources so the workforce has context
    for (const cid of ['gmail', 'calendar']) {
      await db.collection('connectors_state').insertOne({
        id: randomUUID(), user_id: user.id, connector_id: cid, status: 'connected', connectedAt: new Date(),
      })
    }
    await audit(db, { actor: email, action: 'user.signup', target: user.id })
  } else if (OPERATOR_EMAILS.includes(email) && user.role !== 'owner') {
    await db.collection('users').updateOne({ id: user.id }, { $set: { role: 'owner' } })
    user.role = 'owner'
  }
  return user
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
async function handle(request, { params }) {
  const { path = [] } = await params
  const route = `/${path.join('/')}`
  const method = request.method
  let body = {}
  if (['POST', 'PUT', 'DELETE'].includes(method)) {
    try { body = await request.json() } catch { body = {} }
  }
  const url = new URL(request.url)
  const q = (k) => url.searchParams.get(k)

  try {
    const db = await getDb()
    const cfg = await getConfig(db)
    setOverrides(cfg) // make entitlement reads reflect live Builder OS config

    if (route === '/root' || route === '/') return json({ service: 'LAZY', status: 'ok' })

    // ---- AUTH ----
    if (route === '/auth/login' && method === 'POST') {
      if (!body.email) return err('email required')
      const user = await ensureUser(db, String(body.email).toLowerCase().trim())
      return json({ user: clean(user), entitlements: entitlementSnapshot(user.plan, user.used_task_units) })
    }

    if (route === '/me' && method === 'GET') {
      const user = await db.collection('users').findOne({ id: q('userId') })
      if (!user) return err('user not found', 404)
      return json({ user: clean(user), entitlements: entitlementSnapshot(user.plan, user.used_task_units) })
    }

    // ---- BILLING (demo plan change) ----
    if (route === '/billing/change-plan' && method === 'POST') {
      if (!PLAN_ORDER.includes(body.plan)) return err('invalid plan')
      const user = await db.collection('users').findOne({ id: body.userId })
      if (!user) return err('user not found', 404)
      await db.collection('users').updateOne({ id: user.id }, { $set: { plan: body.plan } })
      await audit(db, { actor: user.email, action: 'billing.change_plan', target: body.plan, meta: { from: user.plan } })
      const updated = await db.collection('users').findOne({ id: user.id })
      return json({ user: clean(updated), entitlements: entitlementSnapshot(updated.plan, updated.used_task_units) })
    }

    // ---- REGISTRIES (config-driven, override-aware) ----
    if (route === '/plans' && method === 'GET') return json({ plans: PLAN_ORDER.map((p) => getPlan(p)) })
    if (route === '/agents' && method === 'GET') return json({ agents: AGENTS })
    if (route === '/features' && method === 'GET') {
      return json({ features: getEffectiveFeatures() })
    }
    if (route === '/models' && method === 'GET') {
      const disabled = new Set(getDisabledModels())
      return json({ models: MODELS.map((m) => ({ ...m, enabled: m.enabled && !disabled.has(m.id) })) })
    }

    // ---- CONNECTORS ----
    if (route === '/connectors' && method === 'GET') {
      const states = await db.collection('connectors_state').find({ user_id: q('userId') }).toArray()
      const map = Object.fromEntries(states.map((s) => [s.connector_id, s.status]))
      const user = await db.collection('users').findOne({ id: q('userId') })
      return json({
        connectors: CONNECTORS.map((c) => ({
          ...c,
          connected: map[c.id] === 'connected',
          allowed: user ? canUseConnector(user.plan, c.id) : false,
        })),
      })
    }
    if (route === '/connectors/connect' && method === 'POST') {
      const user = await db.collection('users').findOne({ id: body.userId })
      const connector = getConnector(body.id)
      if (!user || !connector) return err('invalid request')
      if (connector.status === 'coming_soon') return err('Connector not yet available', 409)
      if (!canUseConnector(user.plan, connector.id)) return err('Your plan does not include this connector', 403)
      await db.collection('connectors_state').updateOne(
        { user_id: user.id, connector_id: connector.id },
        { $set: { status: 'connected', connectedAt: new Date() }, $setOnInsert: { id: randomUUID() } },
        { upsert: true }
      )
      await audit(db, { actor: user.email, action: 'connector.connect', target: connector.id })
      return json({ ok: true })
    }
    if (route === '/connectors/disconnect' && method === 'POST') {
      const user = await db.collection('users').findOne({ id: body.userId })
      if (!user) return err('user not found', 404)
      await db.collection('connectors_state').updateOne(
        { user_id: user.id, connector_id: body.id }, { $set: { status: 'disconnected' } }
      )
      await audit(db, { actor: user.email, action: 'connector.disconnect', target: body.id })
      return json({ ok: true })
    }

    // ---- WORKFORCE: PLAN (Supervisor decomposition) ----
    if (route === '/workforce/plan' && method === 'POST') {
      const user = await db.collection('users').findOne({ id: body.userId })
      if (!user) return err('user not found', 404)
      if (!body.outcome) return err('outcome required')
      const ent = entitlementSnapshot(user.plan, user.used_task_units)
      const states = await db.collection('connectors_state').find({ user_id: user.id, status: 'connected' }).toArray()
      const connectors = states.map((s) => getConnector(s.connector_id)?.name).filter(Boolean)
      const plan = await planOutcome({ outcome: body.outcome, connectors, userId: user.id, priority: getPlan(user.plan).priority_routing })
      const overBudget = plan.total_task_units > ent.remaining_task_units
      return json({ plan, entitlements: ent, over_budget: overBudget })
    }

    // ---- WORKFORCE: EXECUTE (delegate -> execute -> verify -> remember) ----
    if (route === '/workforce/execute' && method === 'POST') {
      const user = await db.collection('users').findOne({ id: body.userId })
      if (!user) return err('user not found', 404)
      const cfg = await getConfig(db)
      const safeMode = cfg.kill_switches.global_safe_mode
      const steps = body.steps || []
      const outcome = body.outcome || ''
      const ent = entitlementSnapshot(user.plan, user.used_task_units)
      const cost = steps.reduce((a, s) => a + (s.task_units || 0), 0)
      if (cost > ent.remaining_task_units) {
        return err('Not enough AI Task Units remaining on your plan for this task.', 402)
      }

      // execute delegated steps in parallel (respect agent kill switches)
      const executed = await Promise.all(steps.map((step) => {
        if (cfg.kill_switches.agents?.[step.agent_id] === false) {
          return Promise.resolve({ ...step, status: 'blocked', output: null, approval_reason: 'Agent disabled by operator kill switch.' })
        }
        return executeStep({ step, outcome, userId: user.id, priority: getPlan(user.plan).priority_routing, safeMode })
      }))

      const anyFailed = executed.some((s) => s.status === 'failed')
      const anyHeld = executed.some((s) => s.status === 'waiting_for_user' || s.status === 'blocked')
      const status = anyFailed ? 'failed' : anyHeld ? 'waiting_for_user' : 'completed'

      // extraction pass
      const insights = await extractInsights({ outcome, results: executed, userId: user.id })

      const usedUnits = Number(executed.reduce((a, s) => a + (s.task_units || 0), 0).toFixed(2))
      const now = new Date()
      const task = {
        id: randomUUID(), user_id: user.id, org_id: user.org_id,
        source: 'customer', requested_action: outcome, summary: body.summary || '',
        status, priority: getPlan(user.plan).priority_routing ? 'high' : 'normal',
        task_units: usedUnits, steps: executed,
        time_saved_minutes: body.time_saved_minutes || 0,
        planner_model: body.planner_model || null, safe_mode: safeMode,
        created_at: now, completed_at: status === 'completed' ? now : null,
      }
      await db.collection('tasks').insertOne(task)
      await db.collection('users').updateOne({ id: user.id }, { $inc: { used_task_units: usedUnits } })
      await audit(db, { actor: user.email, action: 'workforce.execute', target: task.id, meta: { status, units: usedUnits, safeMode } })

      // persist insights
      for (const c of insights.commitments) {
        await db.collection('commitments').insertOne({ id: randomUUID(), user_id: user.id, task_id: task.id, status: 'open', createdAt: now, ...c })
      }
      for (const a of insights.attention) {
        await db.collection('attention_items').insertOne({ id: randomUUID(), user_id: user.id, task_id: task.id, status: 'open', createdAt: now, expires_at: new Date(now.getTime() + 3 * 864e5), ...a })
      }
      for (const m of insights.memory) {
        await db.collection('memory').insertOne({ id: randomUUID(), user_id: user.id, layer: 'long_term', enabled: true, createdAt: now, ...m })
      }

      const updated = await db.collection('users').findOne({ id: user.id })
      return json({ task: clean(task), insights, entitlements: entitlementSnapshot(updated.plan, updated.used_task_units) })
    }

    // ---- CUSTOMER DATA READS ----
    if (route === '/tasks' && method === 'GET') {
      const tasks = await db.collection('tasks').find({ user_id: q('userId') }).sort({ created_at: -1 }).limit(50).toArray()
      return json({ tasks: clean(tasks) })
    }
    if (route === '/commitments' && method === 'GET') {
      const items = await db.collection('commitments').find({ user_id: q('userId') }).sort({ createdAt: -1 }).limit(100).toArray()
      return json({ commitments: clean(items) })
    }
    if (route === '/attention' && method === 'GET') {
      const items = await db.collection('attention_items').find({ user_id: q('userId'), status: 'open' }).sort({ score: -1 }).limit(100).toArray()
      return json({ attention: clean(items) })
    }
    if (route === '/attention/action' && method === 'POST') {
      await db.collection('attention_items').updateOne({ id: body.id, user_id: body.userId }, { $set: { status: body.action } })
      const user = await db.collection('users').findOne({ id: body.userId })
      await audit(db, { actor: user?.email, action: `attention.${body.action}`, target: body.id })
      return json({ ok: true })
    }
    if (route === '/memory' && method === 'GET') {
      const items = await db.collection('memory').find({ user_id: q('userId') }).sort({ createdAt: -1 }).limit(100).toArray()
      return json({ memory: clean(items) })
    }
    if (route === '/memory' && method === 'POST') {
      const item = { id: randomUUID(), user_id: body.userId, layer: 'long_term', type: body.type || 'fact', content: body.content, enabled: true, createdAt: new Date() }
      await db.collection('memory').insertOne(item)
      return json({ memory: clean(item) })
    }
    if (route === '/memory/delete' && method === 'POST') {
      await db.collection('memory').deleteOne({ id: body.id, user_id: body.userId })
      return json({ ok: true })
    }

    // ---- OPERATOR OS ----
    if (route.startsWith('/operator/')) {
      const cfg = await getConfig(db)

      if (route === '/operator/overview' && method === 'GET') {
        const stats = await buildStats(db)
        return json(stats)
      }
      if (route === '/operator/models' && method === 'GET') {
        const disabled = new Set(getDisabledModels())
        const agg = await db.collection('llm_requests').aggregate([
          { $group: { _id: '$model', calls: { $sum: 1 }, success: { $sum: { $cond: ['$success', 1, 0] } }, avg_latency: { $avg: '$latency_ms' }, cost: { $sum: { $ifNull: ['$cost', 0] } } } },
        ]).toArray()
        const health = Object.fromEntries(agg.map((a) => [a._id, a]))
        return json({
          models: MODELS.map((m) => {
            const h = health[m.id] || { calls: 0, success: 0, avg_latency: 0, cost: 0 }
            return {
              ...m, enabled: m.enabled && !disabled.has(m.id),
              calls: h.calls, success_rate: h.calls ? Math.round((h.success / h.calls) * 100) : 100,
              avg_latency: Math.round(h.avg_latency || 0), cost: Number((h.cost || 0).toFixed(3)),
            }
          }),
        })
      }
      if (route === '/operator/models/toggle' && method === 'POST') {
        setModelEnabled(body.id, body.enabled)
        const disabled = getDisabledModels()
        await db.collection('config').updateOne({ id: 'system' }, { $set: { disabled_models: disabled } })
        await audit(db, { actor: 'operator', action: 'model.toggle', target: body.id, meta: { enabled: body.enabled } })
        return json({ ok: true, disabled })
      }
      if (route === '/operator/connectors' && method === 'GET') {
        const counts = await db.collection('connectors_state').aggregate([
          { $match: { status: 'connected' } }, { $group: { _id: '$connector_id', users: { $sum: 1 } } },
        ]).toArray()
        const cmap = Object.fromEntries(counts.map((c) => [c._id, c.users]))
        return json({
          connectors: CONNECTORS.map((c) => ({
            id: c.id, name: c.name, status: c.status, implementation: c.implementation,
            connected_users: cmap[c.id] || 0,
            kill: cfg.kill_switches.connectors?.[c.id] === false,
            health: c.status === 'coming_soon' ? 'planned' : (cfg.kill_switches.connectors?.[c.id] === false ? 'disabled' : 'healthy'),
          })),
        })
      }
      if (route === '/operator/audit' && method === 'GET') {
        const logs = await db.collection('audit_logs').find({}).sort({ createdAt: -1 }).limit(60).toArray()
        return json({ logs: clean(logs) })
      }
      if (route === '/operator/killswitches' && method === 'GET') {
        return json({ kill_switches: cfg.kill_switches })
      }
      if (route === '/operator/killswitches' && method === 'POST') {
        const { key, value, scope, id } = body
        const update = {}
        if (scope === 'agent') update[`kill_switches.agents.${id}`] = value
        else if (scope === 'connector') update[`kill_switches.connectors.${id}`] = value
        else update[`kill_switches.${key}`] = value
        await db.collection('config').updateOne({ id: 'system' }, { $set: update })
        await audit(db, { actor: 'operator', action: 'killswitch.toggle', target: id || key, meta: { scope, value } })
        const fresh = await db.collection('config').findOne({ id: 'system' })
        return json({ kill_switches: fresh.kill_switches })
      }
      if (route === '/operator/featureflags' && method === 'GET') {
        return json({ feature_flags: cfg.feature_flags, features: FEATURES })
      }
      if (route === '/operator/featureflags' && method === 'POST') {
        await db.collection('config').updateOne({ id: 'system' }, { $set: { [`feature_flags.${body.id}`]: body.flag } })
        await audit(db, { actor: 'operator', action: 'featureflag.set', target: body.id, meta: { flag: body.flag } })
        const fresh = await db.collection('config').findOne({ id: 'system' })
        return json({ feature_flags: fresh.feature_flags })
      }
      if (route === '/operator/ai' && method === 'POST') {
        if (!body.question) return err('question required')
        const stats = await buildStats(db)
        const { answer, model } = await operatorAnswer({ question: body.question, stats })
        await audit(db, { actor: 'operator', action: 'operator.ai_query', meta: { q: body.question.slice(0, 120) } })
        return json({ answer, model })
      }
    }

    // ---- SETTINGS: BYOK INTEGRATIONS ----
    if (route === '/settings/integrations' && method === 'GET') {
      return json({ integrations: await listIntegrations() })
    }
    if (route === '/settings/integrations/save' && method === 'POST') {
      await saveIntegration(body.provider, body.data || {})
      await audit(db, { actor: 'operator', action: 'integration.save', target: body.provider })
      return json({ integrations: await listIntegrations() })
    }
    if (route === '/settings/integrations/connect' && method === 'POST') {
      const r = await connectIntegration(body.provider)
      await audit(db, { actor: 'operator', action: 'integration.connect', target: body.provider, meta: { status: r.status } })
      return json({ result: r, integrations: await listIntegrations() })
    }
    if (route === '/settings/integrations/disconnect' && method === 'POST') {
      await disconnectIntegration(body.provider)
      await audit(db, { actor: 'operator', action: 'integration.disconnect', target: body.provider })
      return json({ integrations: await listIntegrations() })
    }

    // ---- BUILDER OS: natural-language product changes + ChangeSets ----
    if (route === '/builder/chat' && method === 'POST') {
      if (!body.message) return err('message required')
      const snapshot = {
        features: getEffectiveFeatures().map((f) => f.id).join(', '),
        models: MODELS.map((m) => m.id).join(', '),
        current: {
          plans: PLAN_ORDER.map((p) => { const pl = getPlan(p); return { id: pl.id, price: pl.price, task_units: pl.task_units, limits: pl.limits, features: pl.features } }),
          feature_flags: cfg.feature_flags,
          kill_switches: cfg.kill_switches,
        },
      }
      const cs = await builderChat({ message: body.message, snapshot })
      const applied = []
      if (!cs.requires_code && Array.isArray(cs.actions)) {
        for (const a of cs.actions) {
          try {
            if (a.type === 'set_feature_plan') { await db.collection('config').updateOne({ id: 'system' }, { $set: { [`overrides.feature_plan.${a.feature}`]: a.plans } }); applied.push(`${a.feature} → ${a.plans.join('/')}`) }
            else if (a.type === 'set_plan_limit') { await db.collection('config').updateOne({ id: 'system' }, { $set: { [`overrides.plans.${a.plan}.limits.${a.key}`]: a.value } }); applied.push(`${a.plan} ${a.key} = ${a.value}`) }
            else if (a.type === 'set_plan_price') { await db.collection('config').updateOne({ id: 'system' }, { $set: { [`overrides.plans.${a.plan}.price`]: a.value } }); applied.push(`${a.plan} price = $${a.value}`) }
            else if (a.type === 'set_plan_task_units') { await db.collection('config').updateOne({ id: 'system' }, { $set: { [`overrides.plans.${a.plan}.task_units`]: a.value } }); applied.push(`${a.plan} task units = ${a.value}`) }
            else if (a.type === 'set_feature_flag') { await db.collection('config').updateOne({ id: 'system' }, { $set: { [`feature_flags.${a.feature}`]: a.flag } }); applied.push(`${a.feature} flag → ${a.flag}`) }
            else if (a.type === 'toggle_kill_switch') { await db.collection('config').updateOne({ id: 'system' }, { $set: { [`kill_switches.${a.key}`]: a.value } }); applied.push(`${a.key} = ${a.value}`) }
            else if (a.type === 'toggle_model') { setModelEnabled(a.model, a.enabled); const dis = getDisabledModels(); await db.collection('config').updateOne({ id: 'system' }, { $set: { disabled_models: dis } }); applied.push(`model ${a.model} ${a.enabled ? 'enabled' : 'disabled'}`) }
          } catch (e) { /* skip bad action */ }
        }
      }
      const ohConnected = await isOpenHandsConnected()
      const changeset = {
        id: randomUUID(),
        request: body.message,
        summary: cs.summary || '',
        message: cs.message || '',
        risk: cs.risk || 'low',
        requires_code: !!cs.requires_code,
        code_plan: cs.code_plan || null,
        actions: cs.actions || [],
        applied,
        status: cs.requires_code ? (ohConnected ? 'dispatched_to_openhands' : 'awaiting_openhands_connection') : (applied.length ? 'applied' : 'no_op'),
        planner_model: cs.planner_model || null,
        createdAt: new Date(),
      }
      await db.collection('changesets').insertOne(changeset)
      await audit(db, { actor: 'operator', action: 'builder.changeset', target: changeset.id, meta: { status: changeset.status, applied: applied.length } })
      return json({ changeset: clean(changeset) })
    }
    if (route === '/builder/changesets' && method === 'GET') {
      const items = await db.collection('changesets').find({}).sort({ createdAt: -1 }).limit(50).toArray()
      return json({ changesets: clean(items) })
    }

    return err(`Route ${route} not found`, 404)
  } catch (e) {
    console.error('API Error:', e)
    return err(e?.message || 'Internal server error', 500)
  }
}

// Aggregated live system metrics used by Operator overview + AI Operator.
async function buildStats(db) {
  const users = await db.collection('users').find({}).toArray()
  const planDist = {}
  let mrr = 0
  for (const u of users) { planDist[u.plan] = (planDist[u.plan] || 0) + 1; mrr += getPlan(u.plan)?.price || 0 }
  const tasks = await db.collection('tasks').find({}).toArray()
  const completed = tasks.filter((t) => t.status === 'completed').length
  const failed = tasks.filter((t) => t.status === 'failed').length
  const llm = await db.collection('llm_requests').find({}).toArray()
  const llmSuccess = llm.filter((l) => l.success).length
  const aiCost = llm.reduce((a, l) => a + (l.cost || 0), 0)
  const byProvider = {}
  for (const l of llm) {
    byProvider[l.provider] = byProvider[l.provider] || { calls: 0, fail: 0 }
    byProvider[l.provider].calls++
    if (!l.success) byProvider[l.provider].fail++
  }
  const cfg = await db.collection('config').findOne({ id: 'system' })
  const timeSaved = tasks.reduce((a, t) => a + (t.time_saved_minutes || 0), 0)
  return {
    generated_at: new Date().toISOString(),
    system: {
      safe_mode: cfg?.kill_switches?.global_safe_mode || false,
      automations_paused: cfg?.kill_switches?.automations_paused || false,
    },
    users: { total: users.length, plan_distribution: planDist },
    tasks: {
      total: tasks.length, completed, failed,
      success_rate: tasks.length ? Math.round((completed / tasks.length) * 100) : 100,
      time_saved_minutes: timeSaved,
    },
    ai: {
      total_calls: llm.length,
      success_rate: llm.length ? Math.round((llmSuccess / llm.length) * 100) : 100,
      total_cost_usd: Number(aiCost.toFixed(3)),
      by_provider: byProvider,
    },
    revenue: { mrr, arr: mrr * 12, cost_usd: Number(aiCost.toFixed(3)), gross_margin_pct: mrr ? Math.round(((mrr - aiCost) / mrr) * 100) : 0 },
  }
}

export const GET = handle
export const POST = handle
export const PUT = handle
export const DELETE = handle
export const PATCH = handle
