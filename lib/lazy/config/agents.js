// Agent Runtime contracts. Agents NEVER pick an LLM provider directly; they
// declare a required model capability and the Model Router resolves it.

export const AGENTS = [
  { id: 'supervisor', name: 'Supervisor Agent', version: '1.0.0', description: 'Receives intent, decomposes work, delegates and verifies.', model_capability: 'reasoning', max_task_units: 5, allowed: ['plan', 'delegate', 'verify'], prohibited: ['send_external'], risk: 'green' },
  { id: 'signal', name: 'Signal Agent', version: '1.0.0', description: 'Analyzes incoming events into universal signals.', model_capability: 'classification', max_task_units: 1, allowed: ['classify'], prohibited: ['send_external'], risk: 'green' },
  { id: 'commitment', name: 'Commitment Agent', version: '1.0.0', description: 'Extracts I-owe / they-owe / waiting commitments.', model_capability: 'structured', max_task_units: 1, allowed: ['extract'], prohibited: ['send_external'], risk: 'green' },
  { id: 'context', name: 'Context Agent', version: '1.0.0', description: 'Combines relevant information across sources.', model_capability: 'reasoning', max_task_units: 2, allowed: ['read', 'summarize'], prohibited: ['send_external'], risk: 'green' },
  { id: 'attention', name: 'Attention Agent', version: '1.0.0', description: 'Scores what needs the user\u2019s attention.', model_capability: 'classification', max_task_units: 1, allowed: ['score'], prohibited: ['send_external'], risk: 'green' },
  { id: 'communication', name: 'Communication Agent', version: '1.0.0', description: 'Drafts and (on approval) performs communication.', model_capability: 'reasoning', max_task_units: 2, allowed: ['draft', 'send_email', 'send_message'], prohibited: ['delete_account'], risk: 'yellow' },
  { id: 'document', name: 'Document Agent', version: '1.0.0', description: 'Reads, analyzes and produces documents.', model_capability: 'reasoning', max_task_units: 2, allowed: ['analyze', 'summarize', 'write'], prohibited: ['send_external'], risk: 'green' },
  { id: 'calendar', name: 'Calendar Agent', version: '1.0.0', description: 'Handles scheduling operations.', model_capability: 'structured', max_task_units: 1, allowed: ['propose_time', 'create_event'], prohibited: ['delete_calendar'], risk: 'yellow' },
  { id: 'automation', name: 'Automation Agent', version: '1.0.0', description: 'Executes scheduled / triggered workflows.', model_capability: 'reasoning', max_task_units: 3, allowed: ['run_workflow'], prohibited: ['financial'], risk: 'yellow' },
  { id: 'voice', name: 'Voice Agent', version: '1.0.0', description: 'Handles realtime voice interactions.', model_capability: 'realtime', max_task_units: 1, allowed: ['converse'], prohibited: ['send_external'], risk: 'green' },
  { id: 'desktop', name: 'Desktop Agent', version: '1.0.0', description: 'Executes approved tasks on the user machine.', model_capability: 'reasoning', max_task_units: 3, allowed: ['read_files', 'run_app'], prohibited: ['shell_root'], risk: 'red' },
  { id: 'memory', name: 'Memory Agent', version: '1.0.0', description: 'Decides what becomes persistent memory.', model_capability: 'structured', max_task_units: 1, allowed: ['store', 'forget'], prohibited: ['send_external'], risk: 'green' },
  { id: 'guardian', name: 'Guardian Agent', version: '1.0.0', description: 'Checks every consequential external action.', model_capability: 'reasoning', max_task_units: 1, allowed: ['approve', 'block'], prohibited: [], risk: 'green' },
]

export function getAgent(id) {
  return AGENTS.find((a) => a.id === id)
}
