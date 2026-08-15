// Centralized Entitlement Engine. The backend is the ONLY authority for
// entitlement \u2013 the frontend never decides access.
import { PLANS, PLAN_ORDER } from './config/plans.js'
import { FEATURES, getFeature } from './config/features.js'

// Builder OS can override plan pricing/limits/task-units and feature->plan
// assignment at runtime. route.js calls setOverrides(cfg) at the start of each
// request so entitlement reads reflect live product configuration.
let _overrides = { plans: {}, feature_plan: {} }
let _flags = {}
export function setOverrides(cfg) {
  _overrides = { plans: cfg?.overrides?.plans || {}, feature_plan: cfg?.overrides?.feature_plan || {} }
  _flags = cfg?.feature_flags || {}
}

function featurePlansFor(featureId, base) {
  return _overrides.feature_plan[featureId] || base
}

export function getPlan(planId) {
  const base = PLANS[planId] || PLANS.normal
  const o = _overrides.plans[base.id] || {}
  const features = FEATURES
    .filter((f) => featurePlansFor(f.id, f.plans).includes(base.id))
    .map((f) => f.id)
  return {
    ...base,
    price: o.price ?? base.price,
    task_units: o.task_units ?? base.task_units,
    limits: { ...base.limits, ...(o.limits || {}) },
    features,
  }
}

export function getEffectiveFeatures() {
  return FEATURES.map((f) => ({ ...f, plans: featurePlansFor(f.id, f.plans), flag: _flags[f.id] || f.flag }))
}

export function canUseFeature(planId, featureId) {
  const feature = getFeature(featureId)
  if (!feature) return false
  const flag = _flags[feature.id] || feature.flag
  if (flag === 'internal' || flag === 'disabled') return false
  return featurePlansFor(feature.id, feature.plans).includes(planId)
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
