// Model Router registry. Providers/models are CONFIGURATION, not business
// logic. Adding/removing/rerouting a model must not require touching agents.

export const MODELS = [
  {
    id: 'gpt-4o-mini',
    provider: 'openai',
    model_id: 'gpt-4o-mini',
    label: 'GPT-4o mini',
    capabilities: ['classification', 'summary', 'structured', 'draft'],
    context_window: 128000,
    vision: true,
    structured_output: true,
    tool_calling: true,
    latency_class: 'fast',
    cost_class: 'low',
    reliability: 0.99,
    enabled: true,
    fallback_priority: 1,
  },
  {
    id: 'claude-sonnet-4-6',
    provider: 'anthropic',
    model_id: 'claude-sonnet-4-6',
    label: 'Claude Sonnet 4.6',
    capabilities: ['reasoning', 'structured', 'draft', 'summary', 'research'],
    context_window: 200000,
    vision: true,
    structured_output: true,
    tool_calling: true,
    latency_class: 'medium',
    cost_class: 'medium',
    reliability: 0.99,
    enabled: true,
    fallback_priority: 1,
  },
  {
    id: 'gpt-4o',
    provider: 'openai',
    model_id: 'gpt-4o',
    label: 'GPT-4o',
    capabilities: ['reasoning', 'structured', 'draft', 'summary', 'research', 'realtime'],
    context_window: 128000,
    vision: true,
    structured_output: true,
    tool_calling: true,
    latency_class: 'medium',
    cost_class: 'high',
    reliability: 0.98,
    enabled: true,
    fallback_priority: 2,
  },
]

// Capability -> preference policy. The router picks the highest-priority
// enabled+healthy model that supports the requested capability.
export const CAPABILITY_POLICY = {
  classification: ['gpt-4o-mini', 'claude-sonnet-4-6', 'gpt-4o'],
  summary: ['gpt-4o-mini', 'claude-sonnet-4-6', 'gpt-4o'],
  structured: ['gpt-4o-mini', 'claude-sonnet-4-6', 'gpt-4o'],
  draft: ['claude-sonnet-4-6', 'gpt-4o-mini', 'gpt-4o'],
  reasoning: ['claude-sonnet-4-6', 'gpt-4o', 'gpt-4o-mini'],
  research: ['claude-sonnet-4-6', 'gpt-4o'],
  realtime: ['gpt-4o'],
}

export function getModel(id) {
  return MODELS.find((m) => m.id === id)
}
