// Connector contracts. The AI core NEVER depends on Gmail/Slack directly \u2013 it
// talks to this abstraction. First release ships clearly-marked MOCK adapters.

export const CONNECTORS = [
  {
    id: 'gmail', name: 'Gmail', category: 'email', status: 'available', implementation: 'mock',
    auth_method: 'oauth2', scopes: ['gmail.readonly', 'gmail.send'],
    read: true, write: true, webhook: true, polling: true,
    rate_limit: '250 units/user/sec',
    actions: ['fetch_messages', 'draft_reply', 'send_email', 'archive'],
    disconnect_behavior: 'revoke tokens, stop polling, retain nothing',
  },
  {
    id: 'calendar', name: 'Google Calendar', category: 'calendar', status: 'available', implementation: 'mock',
    auth_method: 'oauth2', scopes: ['calendar.events'],
    read: true, write: true, webhook: true, polling: true,
    rate_limit: '600 queries/min',
    actions: ['fetch_events', 'create_event', 'propose_time'],
    disconnect_behavior: 'revoke tokens, stop sync',
  },
  {
    id: 'drive', name: 'Google Drive', category: 'storage', status: 'available', implementation: 'mock',
    auth_method: 'oauth2', scopes: ['drive.readonly'],
    read: true, write: false, webhook: true, polling: true,
    rate_limit: '1000 queries/100s',
    actions: ['fetch_files', 'read_document', 'summarize'],
    disconnect_behavior: 'revoke tokens',
  },
  {
    id: 'slack', name: 'Slack', category: 'messaging', status: 'available', implementation: 'mock',
    auth_method: 'oauth2', scopes: ['channels:history', 'chat:write'],
    read: true, write: true, webhook: true, polling: false,
    rate_limit: 'tier 3 (~50/min)',
    actions: ['fetch_messages', 'draft_reply', 'send_message'],
    disconnect_behavior: 'revoke app token',
  },
  {
    id: 'notion', name: 'Notion', category: 'docs', status: 'available', implementation: 'mock',
    auth_method: 'oauth2', scopes: ['read_content', 'update_content'],
    read: true, write: true, webhook: false, polling: true,
    rate_limit: '~3 req/sec',
    actions: ['fetch_pages', 'update_page'],
    disconnect_behavior: 'revoke integration token',
  },
  {
    id: 'github', name: 'GitHub', category: 'code', status: 'beta', implementation: 'mock',
    auth_method: 'oauth2', scopes: ['repo', 'read:org'],
    read: true, write: true, webhook: true, polling: true,
    rate_limit: '5000/hr',
    actions: ['fetch_issues', 'comment', 'open_pr'],
    disconnect_behavior: 'revoke oauth grant',
  },
  {
    id: 'outlook', name: 'Microsoft / Outlook', category: 'email', status: 'coming_soon', implementation: 'planned',
    auth_method: 'oauth2', scopes: ['Mail.ReadWrite'], read: true, write: true, webhook: true, polling: true,
    rate_limit: 'graph throttling', actions: ['fetch_messages', 'send_email'], disconnect_behavior: 'revoke tokens',
  },
  {
    id: 'whatsapp', name: 'WhatsApp', category: 'messaging', status: 'coming_soon', implementation: 'planned',
    auth_method: 'oauth2', scopes: ['messages'], read: true, write: true, webhook: true, polling: false,
    rate_limit: 'business tier', actions: ['fetch_messages', 'send_message'], disconnect_behavior: 'revoke access',
  },
]

export function getConnector(id) {
  return CONNECTORS.find((c) => c.id === id)
}
