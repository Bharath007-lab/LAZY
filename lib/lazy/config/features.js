// Feature Module Manifests. The customer navigation + Builder OS are generated
// from this registry rather than hardcoded. Each module is independently
// enableable / versionable and declares dependencies + plan availability.

export const FEATURES = [
  { id: 'gmail', name: 'Gmail', version: '1.0.0', category: 'connector', description: 'Read, triage and draft email.', depends_on: [], plans: ['normal', 'pro', 'premium'], flag: 'enabled' },
  { id: 'calendar', name: 'Google Calendar', version: '1.0.0', category: 'connector', description: 'Scheduling and availability.', depends_on: [], plans: ['normal', 'pro', 'premium'], flag: 'enabled' },
  { id: 'drive', name: 'Google Drive', version: '1.0.0', category: 'connector', description: 'Read and analyze documents.', depends_on: [], plans: ['pro', 'premium'], flag: 'enabled' },
  { id: 'slack', name: 'Slack', version: '1.0.0', category: 'connector', description: 'Read channels, draft replies.', depends_on: [], plans: ['pro', 'premium'], flag: 'enabled' },
  { id: 'notion', name: 'Notion', version: '1.0.0', category: 'connector', description: 'Read and update workspace.', depends_on: [], plans: ['pro', 'premium'], flag: 'enabled' },
  { id: 'github', name: 'GitHub', version: '1.0.0', category: 'connector', description: 'Issues, PRs and repo context.', depends_on: [], plans: ['pro', 'premium'], flag: 'beta' },
  { id: 'commitments', name: 'Commitment Intelligence', version: '1.0.0', category: 'core', description: 'Track what you owe and what others owe you.', depends_on: [], plans: ['normal', 'pro', 'premium'], flag: 'enabled' },
  { id: 'attention', name: 'Attention Engine', version: '1.0.0', category: 'core', description: 'Surfaces only what truly matters.', depends_on: [], plans: ['normal', 'pro', 'premium'], flag: 'enabled' },
  { id: 'memory', name: 'Memory System', version: '1.0.0', category: 'core', description: 'Ephemeral, working and long-term memory.', depends_on: [], plans: ['normal', 'pro', 'premium'], flag: 'enabled' },
  { id: 'automations', name: 'Automations', version: '1.0.0', category: 'core', description: 'Scheduled and triggered workflows.', depends_on: [], plans: ['normal', 'pro', 'premium'], flag: 'enabled' },
  { id: 'voice', name: 'Voice', version: '1.0.0', category: 'capability', description: 'Realtime voice interaction (LiveKit).', depends_on: [], plans: ['pro', 'premium'], flag: 'beta' },
  { id: 'desktop', name: 'Desktop Worker', version: '1.0.0', category: 'capability', description: 'Act on your computer under permission.', depends_on: [], plans: ['pro', 'premium'], flag: 'beta' },
  { id: 'meeting_intelligence', name: 'Meeting Intelligence', version: '1.0.0', category: 'capability', description: 'Meeting capture and follow-ups.', depends_on: ['calendar', 'voice', 'memory'], plans: ['premium'], flag: 'internal' },
  { id: 'analytics', name: 'Analytics', version: '1.0.0', category: 'capability', description: 'Deep usage and outcome analytics.', depends_on: [], plans: ['premium'], flag: 'enabled' },
]

export function getFeature(id) {
  return FEATURES.find((f) => f.id === id)
}
