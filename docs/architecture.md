# LAZY — Architecture (v1 foundation)

LAZY is an AI workforce platform. Customers give an **outcome**; the system runs
**Observe → Understand → Plan → Delegate → Execute → Verify → Remember**.

## Three planes
- **Customer OS** (`app/page.js` → `CustomerOS`): outcome command center, tasks, workforce, attention, commitments, connections, memory, usage, billing.
- **Operator OS** (`OperatorOS`): overview, AI Operator, models, connectors, kill switches, feature flags, audit log.
- **Builder OS**: feature registry + feature flags are already config-driven (foundation for drag-and-drop plan assignment).

## Modular backend (`lib/lazy/`)
- `config/plans.js` — plans, task-unit weights, limits (config-driven entitlements).
- `config/features.js` — Feature Module Manifests (nav + Builder generated from here).
- `config/agents.js` — Agent contracts (declare model *capability*, never a provider).
- `config/models.js` — Model registry + capability→policy fallback order.
- `config/connectors.js` — Connector contracts (auth, scopes, actions) — v1 = MOCK adapters.
- `modelRouter.js` — capability → model resolution, cross-provider fallback chain, `llm_requests` logging (health/cost). Uses Emergent universal key (`emergentintegrations`) → OpenAI + Anthropic.
- `guardian.js` — GREEN/YELLOW/RED action safety (secure by default; YELLOW/RED held for approval).
- `entitlements.js` — single backend authority for access + remaining task units.
- `runtime.js` — Supervisor decomposition, parallel step execution, commitment/attention/memory extraction, AI Operator answers.

## Data (MongoDB, UUID keys — portable to Supabase/Postgres)
`users, tasks, commitments, attention_items, memory, connectors_state, llm_requests, audit_logs, config` (single doc: kill switches, feature flags, disabled models).

## Key principles honored
- LLM-provider independent (router + adapters; add/remove models via config).
- Config-driven plans/limits (no hardcoded "Pro = 200").
- Guardian + kill switches (Global Safe Mode holds all autonomous external actions).
- Audit logging on every significant action.
- Frontend never authoritative for entitlement — backend enforces.

## Portability / next steps
Swap `lib/lazy/mongo.js` + reads for Supabase (Auth, Postgres, RLS, Storage, Realtime),
add real OAuth per connector, Stripe checkout+webhooks (scaffolded), LiveKit voice,
desktop worker protocol, OpenHands ChangeSet pipeline. Nothing in agents/UI depends on the current DB or a specific model.
