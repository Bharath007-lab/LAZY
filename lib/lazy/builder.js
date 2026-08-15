import { route } from './modelRouter.js'

// ---------------------------------------------------------------------------
// BUILDER OS \u2013 natural-language product changes.
// The founder types a request; this converts it into a ChangeSet. Configuration
// changes are applied live; anything requiring new code becomes a ChangeSet
// dispatched to OpenHands (an isolated engineering agent) for a preview.
// ---------------------------------------------------------------------------

export async function builderChat({ message, snapshot }) {
  const system = `You are the LAZY Builder OS \u2013 the founder's product engineer. Convert the founder's natural-language request into a ChangeSet.

You can APPLY these configuration actions live (prefer these whenever the request maps to existing features / plans / flags / limits / models):
- {"type":"set_feature_plan","feature":<featureId>,"plans":[subset of "normal","pro","premium"]}   // which plans get a feature
- {"type":"set_plan_limit","plan":<planId>,"key":"automations"|"concurrency"|"voice_minutes"|"desktop_tasks"|"connectors","value":<int>}
- {"type":"set_plan_price","plan":<planId>,"value":<int>}
- {"type":"set_plan_task_units","plan":<planId>,"value":<int>}
- {"type":"set_feature_flag","feature":<featureId>,"flag":"enabled"|"disabled"|"beta"|"internal"|"10_percent"}
- {"type":"toggle_kill_switch","key":"global_safe_mode"|"automations_paused"|"desktop_disabled","value":true|false}
- {"type":"toggle_model","model":<modelId>,"enabled":true|false}

If the request needs NEW code, UI, logic or a brand-new feature module that does not exist yet, set requires_code=true, return an empty actions array, and describe the engineering work (files/modules likely affected) so it can be handed to OpenHands.

Return ONLY JSON:
{"summary":string,"message":string (friendly, addressed to the founder),"risk":"low"|"medium"|"high","requires_code":boolean,"code_plan":string (only if requires_code),"actions":[...]}

Valid feature ids: ${snapshot.features}.
Valid model ids: ${snapshot.models}.
Plan ids: normal, pro, premium.`
  const user = `CURRENT CONFIG:\n${JSON.stringify(snapshot.current)}\n\nFOUNDER REQUEST: ${message}`
  const { json, provider, model } = await route({ capability: 'reasoning', system, user, json: true, taskUnits: 0.5, meta: { agent: 'builder' } })
  return { ...json, planner_model: `${provider}/${model}` }
}
