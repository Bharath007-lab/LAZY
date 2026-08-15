// ---------------------------------------------------------------------------
// SUBSCRIPTION / ENTITLEMENT CONFIGURATION (config-driven, never hardcoded in
// business logic). Changing a number here changes the whole product.
// ---------------------------------------------------------------------------

// Internal abstraction: customers never see tokens, only AI Task Units.
export const TASK_UNIT_WEIGHTS = {
  classification: 0.1,
  summary: 0.2,
  draft: 0.5,
  document_analysis: 1,
  voice: 0.5,
  multi_step: 2,
  desktop: 3,
  research: 5,
}

// Internal estimated AI/API cost per task unit (used for margin/FinOps).
export const AI_COST_PER_UNIT = 0.06

export const BASE_CAPACITY = 100

export const PLANS = {
  normal: {
    id: 'normal',
    name: 'Normal',
    price: 20,
    multiplier: 1,
    task_units: BASE_CAPACITY * 1,
    limits: {
      automations: 3,
      concurrency: 1,
      voice_minutes: 30,
      desktop_tasks: 0,
      connectors: 3,
    },
    features: ['gmail', 'calendar', 'commitments', 'attention', 'memory', 'automations'],
    priority_routing: false,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 40,
    multiplier: 2,
    task_units: BASE_CAPACITY * 2,
    limits: {
      automations: 15,
      concurrency: 3,
      voice_minutes: 120,
      desktop_tasks: 25,
      connectors: 8,
    },
    features: ['gmail', 'calendar', 'drive', 'slack', 'notion', 'github', 'commitments', 'attention', 'memory', 'automations', 'voice', 'desktop'],
    priority_routing: false,
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: 80,
    multiplier: 4,
    task_units: BASE_CAPACITY * 4,
    limits: {
      automations: 50,
      concurrency: 8,
      voice_minutes: 400,
      desktop_tasks: 200,
      connectors: 99,
    },
    features: ['gmail', 'calendar', 'drive', 'slack', 'notion', 'github', 'commitments', 'attention', 'memory', 'automations', 'voice', 'desktop', 'meeting_intelligence', 'analytics'],
    priority_routing: true,
  },
}

export const PLAN_ORDER = ['normal', 'pro', 'premium']
