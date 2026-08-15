import { randomUUID } from 'crypto'
import { route } from './modelRouter.js'
import { getAgent } from './config/agents.js'
import { classifyAction } from './guardian.js'
import { TASK_UNIT_WEIGHTS } from './config/plans.js'

// ---------------------------------------------------------------------------
// AGENT RUNTIME
// Supervisor decomposes an outcome into delegated steps, each mapped to a
// specialist agent + required model capability. Steps execute (in parallel),
// pass through the Guardian, and produce concrete artifacts. Finally a
// Commitment/Attention/Memory extraction pass runs. All provider-independent.
// ---------------------------------------------------------------------------

function unitsFor(kind) {
  return TASK_UNIT_WEIGHTS[kind] ?? 0.5
}

// STEP 1 \u2013 Supervisor decomposition (returns a delegation plan)
export async function planOutcome({ outcome, connectors = [], userId, priority }) {
  const system = `You are the Supervisor Agent of LAZY, an AI workforce platform. A user gives an OUTCOME, not instructions. Decompose it into a short delegation plan (2 to 4 steps) executed by your specialist agents.

Available specialist agents (use the id): signal, commitment, context, attention, communication, document, calendar, automation, memory.
Connected data sources for this user: ${connectors.length ? connectors.join(', ') : 'none yet'}.

Each step must include:
- agent: one specialist agent id
- title: short human title (max 6 words)
- action: the concrete action verb phrase (e.g. "draft reply email", "summarize documents", "send slack message")
- kind: one of classification|summary|draft|document_analysis|multi_step|research (drives cost)
- risk: green (safe/reversible) | yellow (external side-effect e.g. sending) | red (financial/destructive)
- rationale: one sentence why this step matters
Return JSON: {"summary": string (one warm sentence to the user about what will happen), "steps": [ ... ], "time_saved_minutes": integer estimate}`
  const user = `OUTCOME: ${outcome}`
  const { json, model, provider, fallback_used } = await route({
    capability: 'reasoning', system, user, json: true, taskUnits: unitsFor('summary'),
    priority, meta: { userId, agent: 'supervisor' },
  })
  const steps = (json.steps || []).slice(0, 4).map((s) => {
    const agent = getAgent(s.agent) || getAgent('context')
    const guard = classifyAction(s.action, s.risk)
    const units = unitsFor(s.kind)
    return {
      id: randomUUID(),
      agent_id: agent.id,
      agent_name: agent.name,
      title: s.title || agent.name,
      action: s.action || 'process',
      kind: s.kind || 'summary',
      model_capability: agent.model_capability,
      task_units: units,
      guardian: guard,
      rationale: s.rationale || '',
      status: 'planned',
    }
  })
  const total = Number(steps.reduce((a, s) => a + s.task_units, 0).toFixed(2))
  return {
    summary: json.summary || 'Here is how I will handle this.',
    steps,
    total_task_units: total,
    time_saved_minutes: json.time_saved_minutes || Math.max(10, steps.length * 12),
    planner_model: `${provider}/${model}`,
    fallback_used,
  }
}

const AGENT_SYS = {
  communication: 'You are the Communication Agent. Produce a polished, ready-to-send draft. Do NOT actually send. Include subject if it is an email.',
  document: 'You are the Document Agent. Analyze and produce a crisp, structured result with the key points that matter.',
  context: 'You are the Context Agent. Synthesize the relevant context across the user\u2019s sources into a concise brief.',
  calendar: 'You are the Calendar Agent. Propose concrete scheduling options or a clear event description.',
  commitment: 'You are the Commitment Agent. Produce a concise list of the relevant commitments involved.',
  attention: 'You are the Attention Agent. Explain what deserves attention and why, briefly.',
  automation: 'You are the Automation Agent. Describe the workflow you would run and its steps.',
  signal: 'You are the Signal Agent. Classify and normalize the incoming signals concisely.',
  memory: 'You are the Memory Agent. State what is worth remembering long-term.',
}

// STEP 2 \u2013 execute a single delegated step (produces the artifact)
export async function executeStep({ step, outcome, userId, priority, safeMode }) {
  const guard = step.guardian
  // Guardian + Safe Mode: never auto-perform external side-effects.
  const held = !guard.autonomous || safeMode
  const system = `${AGENT_SYS[step.agent_id] || AGENT_SYS.context}
The user\u2019s overall outcome: "${outcome}".
Keep it realistic and specific. This is a demo environment with MOCK connected data, so invent plausible representative content where needed, clearly usable by the user. Be concise (max ~180 words).`
  const user = `Perform this step: ${step.action}. (${step.rationale})`
  let result, model, provider, fallback
  try {
    const r = await route({
      capability: step.model_capability, system, user, json: false,
      taskUnits: step.task_units, priority, meta: { userId, agent: step.agent_id },
    })
    result = r.text; model = r.model; provider = r.provider; fallback = r.fallback_used
  } catch (e) {
    return { ...step, status: 'failed', error: String(e?.message || e), output: null }
  }
  return {
    ...step,
    status: held ? 'waiting_for_user' : 'completed',
    held_for_approval: held,
    approval_reason: held ? guard.reason : null,
    output: result,
    executed_model: `${provider}/${model}`,
    fallback_used: fallback,
  }
}

// STEP 3 \u2013 extraction: commitments + attention + memory suggestions
export async function extractInsights({ outcome, results, userId }) {
  const context = results.map((r) => `# ${r.title}\n${r.output || ''}`).join('\n\n').slice(0, 6000)
  const system = `You are LAZY\u2019s extraction pass. From the outcome and the work produced, extract structured intelligence.
Return JSON:
{
  "commitments": [ {"direction": "i_owe"|"they_owe"|"waiting", "action": string, "person": string, "due": string, "source": string, "confidence": number} ],
  "attention": [ {"title": string, "why": string, "score": number (0-100), "urgency": "low"|"medium"|"high", "recommended_action": string} ],
  "memory": [ {"type": "preference"|"relationship"|"project"|"fact", "content": string} ]
}
Only include items genuinely implied. Keep each array 0-3 items.`
  const user = `OUTCOME: ${outcome}\n\nWORK PRODUCED:\n${context}`
  try {
    const { json } = await route({
      capability: 'structured', system, user, json: true,
      taskUnits: TASK_UNIT_WEIGHTS.classification, meta: { userId, agent: 'commitment' },
    })
    return {
      commitments: (json.commitments || []).slice(0, 4),
      attention: (json.attention || []).slice(0, 4),
      memory: (json.memory || []).slice(0, 4),
    }
  } catch {
    return { commitments: [], attention: [], memory: [] }
  }
}

// AI Operator answer (Operator OS) \u2013 grounded on real system stats
export async function operatorAnswer({ question, stats }) {
  const system = `You are the LAZY AI Operator \u2013 a private mission-control assistant for the founder/operator of the platform. Answer clearly and briefly in plain language, like a calm senior SRE + head of product. Use ONLY the live system metrics provided as JSON. If the data does not contain the answer, say what you would investigate. Never invent numbers not present. End with a one-line recommended action when relevant.`
  const user = `LIVE SYSTEM METRICS (JSON):\n${JSON.stringify(stats)}\n\nOPERATOR QUESTION: ${question}`
  const { text, model, provider } = await route({
    capability: 'reasoning', system, user, json: false, taskUnits: TASK_UNIT_WEIGHTS.summary,
    meta: { agent: 'operator' },
  })
  return { answer: text, model: `${provider}/${model}` }
}
