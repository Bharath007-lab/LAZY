// Centralized Entitlement Engine. The backend is the ONLY authority for
// entitlement \u2013 the frontend never decides access.
import { PLANS } from './config/plans.js'
import { getFeature } from './config/features.js'

export function getPlan(planId) {
  return PLANS[planId] || PLANS.normal
}

export function canUseFeature(planId, featureId) {
  const feature = getFeature(featureId)
  if (!feature) return false
  if (feature.flag === 'internal') return false
  return feature.plans.includes(planId)
}

export function getRemainingTaskUnits(planId, used = 0) {
  const plan = getPlan(planId)
  return Math.max(0, plan.task_units - used)
}

export function getAutomationLimit(planId) {
  return getPlan(planId).limits.automations
}

export function getConcurrencyLimit(planId) {
  return getPlan(planId).limits.concurrency
}

export function canUseConnector(planId, connectorId) {
  return canUseFeature(planId, connectorId)
}

export function entitlementSnapshot(planId, used = 0) {
  const plan = getPlan(planId)
  return {
    plan: plan.id,
    plan_name: plan.name,
    task_units: plan.task_units,
    used_task_units: Number(used.toFixed(2)),
    remaining_task_units: Number(getRemainingTaskUnits(planId, used).toFixed(2)),
    limits: plan.limits,
    features: plan.features,
    priority_routing: plan.priority_routing,
  }
}
