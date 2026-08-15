// Guardian / Action Safety. Every potentially consequential external action is
// classified. Policy is configurable but secure by default.

const RED = ['financial', 'payment', 'delete_account', 'delete_database', 'change_credentials', 'transfer', 'wire', 'legal', 'ownership']
const YELLOW = ['send_email', 'send_message', 'send_slack', 'create_event', 'modify_document', 'update_page', 'comment', 'open_pr', 'reply']

export function classifyAction(action = '', declaredRisk) {
  const a = String(action).toLowerCase()
  if (RED.some((k) => a.includes(k)) || declaredRisk === 'red') {
    return { level: 'red', autonomous: false, reason: 'Never autonomous by default \u2013 requires explicit founder/user authorization.' }
  }
  if (YELLOW.some((k) => a.includes(k)) || declaredRisk === 'yellow') {
    return { level: 'yellow', autonomous: false, reason: 'External side-effect \u2013 drafted and held for your approval.' }
  }
  return { level: 'green', autonomous: true, reason: 'Safe / reversible \u2013 executed automatically.' }
}
