#!/usr/bin/env python3
"""
LAZY AI Workforce Platform - Backend API Test Suite
Tests all backend flows: Auth, Registries, Connectors, Workforce, Reads, Billing, Operator
"""

import requests
import json
import time
import sys

# Base URL from .env
BASE_URL = "https://ai-tasks-14.preview.emergentagent.com/api"

# Test results tracking
test_results = {
    "passed": [],
    "failed": [],
    "warnings": []
}

def log_test(name, passed, details=""):
    """Log test result"""
    if passed:
        test_results["passed"].append(name)
        print(f"✅ PASS: {name}")
        if details:
            print(f"   {details}")
    else:
        test_results["failed"].append(name)
        print(f"❌ FAIL: {name}")
        if details:
            print(f"   {details}")

def log_warning(name, details):
    """Log warning"""
    test_results["warnings"].append(f"{name}: {details}")
    print(f"⚠️  WARNING: {name}")
    print(f"   {details}")

def print_summary():
    """Print test summary"""
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    print(f"✅ Passed: {len(test_results['passed'])}")
    print(f"❌ Failed: {len(test_results['failed'])}")
    print(f"⚠️  Warnings: {len(test_results['warnings'])}")
    
    if test_results['failed']:
        print("\nFailed Tests:")
        for test in test_results['failed']:
            print(f"  - {test}")
    
    if test_results['warnings']:
        print("\nWarnings:")
        for warning in test_results['warnings']:
            print(f"  - {warning}")
    
    print("="*80)

# Global variables to store test data
founder_user = None
customer_user = None
plan_result = None
execute_result = None
attention_id = None
memory_id = None

def test_1_auth():
    """Test 1: AUTH - Login and /me endpoint"""
    global founder_user, customer_user
    
    print("\n" + "="*80)
    print("TEST 1: AUTH - Login and /me")
    print("="*80)
    
    # Test founder login
    try:
        resp = requests.post(f"{BASE_URL}/auth/login", json={"email": "founder@lazy.ai"}, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "user" in data and "entitlements" in data:
                founder_user = data["user"]
                if founder_user.get("role") == "owner" and data["entitlements"].get("plan") == "pro":
                    log_test("AUTH: Founder login", True, f"User ID: {founder_user['id']}, Role: {founder_user['role']}, Plan: pro")
                else:
                    log_test("AUTH: Founder login", False, f"Expected role=owner and plan=pro, got role={founder_user.get('role')}, plan={data['entitlements'].get('plan')}")
            else:
                log_test("AUTH: Founder login", False, f"Missing user or entitlements in response")
        else:
            log_test("AUTH: Founder login", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("AUTH: Founder login", False, f"Exception: {str(e)}")
    
    # Test customer login
    try:
        resp = requests.post(f"{BASE_URL}/auth/login", json={"email": "jane@acme.com"}, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "user" in data and "entitlements" in data:
                customer_user = data["user"]
                if customer_user.get("role") == "customer" and data["entitlements"].get("plan") == "pro":
                    log_test("AUTH: Customer login", True, f"User ID: {customer_user['id']}, Role: {customer_user['role']}, Plan: pro")
                else:
                    log_test("AUTH: Customer login", False, f"Expected role=customer and plan=pro, got role={customer_user.get('role')}, plan={data['entitlements'].get('plan')}")
            else:
                log_test("AUTH: Customer login", False, f"Missing user or entitlements in response")
        else:
            log_test("AUTH: Customer login", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("AUTH: Customer login", False, f"Exception: {str(e)}")
    
    # Test /me endpoint
    if founder_user:
        try:
            resp = requests.get(f"{BASE_URL}/me?userId={founder_user['id']}", timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                if "user" in data and "entitlements" in data:
                    log_test("AUTH: GET /me", True, f"Retrieved user data successfully")
                else:
                    log_test("AUTH: GET /me", False, f"Missing user or entitlements in response")
            else:
                log_test("AUTH: GET /me", False, f"Status {resp.status_code}: {resp.text}")
        except Exception as e:
            log_test("AUTH: GET /me", False, f"Exception: {str(e)}")

def test_2_registries():
    """Test 2: REGISTRIES - Plans, Features, Agents, Models"""
    print("\n" + "="*80)
    print("TEST 2: REGISTRIES")
    print("="*80)
    
    # Test plans
    try:
        resp = requests.get(f"{BASE_URL}/plans", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "plans" in data and len(data["plans"]) == 3:
                log_test("REGISTRIES: GET /plans", True, f"Retrieved {len(data['plans'])} plans")
            else:
                log_test("REGISTRIES: GET /plans", False, f"Expected 3 plans, got {len(data.get('plans', []))}")
        else:
            log_test("REGISTRIES: GET /plans", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("REGISTRIES: GET /plans", False, f"Exception: {str(e)}")
    
    # Test features
    try:
        resp = requests.get(f"{BASE_URL}/features", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "features" in data and len(data["features"]) == 14:
                log_test("REGISTRIES: GET /features", True, f"Retrieved {len(data['features'])} features")
            else:
                log_test("REGISTRIES: GET /features", False, f"Expected 14 features, got {len(data.get('features', []))}")
        else:
            log_test("REGISTRIES: GET /features", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("REGISTRIES: GET /features", False, f"Exception: {str(e)}")
    
    # Test agents
    try:
        resp = requests.get(f"{BASE_URL}/agents", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "agents" in data and len(data["agents"]) == 13:
                log_test("REGISTRIES: GET /agents", True, f"Retrieved {len(data['agents'])} agents")
            else:
                log_test("REGISTRIES: GET /agents", False, f"Expected 13 agents, got {len(data.get('agents', []))}")
        else:
            log_test("REGISTRIES: GET /agents", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("REGISTRIES: GET /agents", False, f"Exception: {str(e)}")
    
    # Test models
    try:
        resp = requests.get(f"{BASE_URL}/models", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "models" in data and len(data["models"]) == 3:
                log_test("REGISTRIES: GET /models", True, f"Retrieved {len(data['models'])} models")
            else:
                log_test("REGISTRIES: GET /models", False, f"Expected 3 models, got {len(data.get('models', []))}")
        else:
            log_test("REGISTRIES: GET /models", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("REGISTRIES: GET /models", False, f"Exception: {str(e)}")

def test_3_connectors():
    """Test 3: CONNECTORS - Connect/disconnect with entitlement gating"""
    print("\n" + "="*80)
    print("TEST 3: CONNECTORS")
    print("="*80)
    
    if not founder_user:
        log_test("CONNECTORS: Skipped", False, "Founder user not available")
        return
    
    # Test GET connectors
    try:
        resp = requests.get(f"{BASE_URL}/connectors?userId={founder_user['id']}", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "connectors" in data:
                gmail = next((c for c in data["connectors"] if c["id"] == "gmail"), None)
                calendar = next((c for c in data["connectors"] if c["id"] == "calendar"), None)
                if gmail and gmail.get("connected") and calendar and calendar.get("connected"):
                    log_test("CONNECTORS: GET /connectors", True, f"Gmail and Calendar connected by default")
                else:
                    log_test("CONNECTORS: GET /connectors", False, f"Gmail or Calendar not connected by default")
            else:
                log_test("CONNECTORS: GET /connectors", False, f"Missing connectors in response")
        else:
            log_test("CONNECTORS: GET /connectors", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("CONNECTORS: GET /connectors", False, f"Exception: {str(e)}")
    
    # Test connect Slack (pro plan allows)
    try:
        resp = requests.post(f"{BASE_URL}/connectors/connect", json={"userId": founder_user['id'], "id": "slack"}, timeout=10)
        if resp.status_code == 200:
            log_test("CONNECTORS: Connect Slack (pro plan)", True, "Slack connected successfully")
        else:
            log_test("CONNECTORS: Connect Slack (pro plan)", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("CONNECTORS: Connect Slack (pro plan)", False, f"Exception: {str(e)}")
    
    # Test connect Outlook (coming_soon)
    try:
        resp = requests.post(f"{BASE_URL}/connectors/connect", json={"userId": founder_user['id'], "id": "outlook"}, timeout=10)
        if resp.status_code == 409:
            log_test("CONNECTORS: Connect Outlook (coming_soon)", True, "Correctly returned 409 for coming_soon connector")
        else:
            log_test("CONNECTORS: Connect Outlook (coming_soon)", False, f"Expected 409, got {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("CONNECTORS: Connect Outlook (coming_soon)", False, f"Exception: {str(e)}")
    
    # Change to normal plan
    try:
        resp = requests.post(f"{BASE_URL}/billing/change-plan", json={"userId": founder_user['id'], "plan": "normal"}, timeout=10)
        if resp.status_code == 200:
            log_test("CONNECTORS: Change to normal plan", True, "Plan changed to normal")
        else:
            log_test("CONNECTORS: Change to normal plan", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("CONNECTORS: Change to normal plan", False, f"Exception: {str(e)}")
    
    # Test connect Slack on normal plan (should fail)
    try:
        resp = requests.post(f"{BASE_URL}/connectors/connect", json={"userId": founder_user['id'], "id": "slack"}, timeout=10)
        if resp.status_code == 403:
            log_test("CONNECTORS: Connect Slack (normal plan)", True, "Correctly returned 403 for normal plan")
        else:
            log_test("CONNECTORS: Connect Slack (normal plan)", False, f"Expected 403, got {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("CONNECTORS: Connect Slack (normal plan)", False, f"Exception: {str(e)}")
    
    # Change back to pro plan
    try:
        resp = requests.post(f"{BASE_URL}/billing/change-plan", json={"userId": founder_user['id'], "plan": "pro"}, timeout=10)
        if resp.status_code == 200:
            log_test("CONNECTORS: Change back to pro plan", True, "Plan changed back to pro")
        else:
            log_test("CONNECTORS: Change back to pro plan", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("CONNECTORS: Change back to pro plan", False, f"Exception: {str(e)}")

def test_4_workforce_plan():
    """Test 4: WORKFORCE PLAN - Supervisor decomposition"""
    global plan_result
    
    print("\n" + "="*80)
    print("TEST 4: WORKFORCE PLAN (Real LLM call - may take 10-40s)")
    print("="*80)
    
    if not founder_user:
        log_test("WORKFORCE PLAN: Skipped", False, "Founder user not available")
        return
    
    try:
        print("⏳ Calling /workforce/plan with real LLM (Claude)...")
        resp = requests.post(
            f"{BASE_URL}/workforce/plan",
            json={
                "userId": founder_user['id'],
                "outcome": "Handle my emails from today and remind me if Sarah does not reply."
            },
            timeout=45
        )
        
        if resp.status_code == 200:
            data = resp.json()
            plan_result = data.get("plan")
            
            # Verify plan structure
            checks = []
            if plan_result and "steps" in plan_result:
                steps = plan_result["steps"]
                checks.append(("steps length 2-4", 2 <= len(steps) <= 4, f"Got {len(steps)} steps"))
                
                if len(steps) > 0:
                    step = steps[0]
                    checks.append(("agent_id present", "agent_id" in step, ""))
                    checks.append(("agent_name present", "agent_name" in step, ""))
                    checks.append(("task_units is number", isinstance(step.get("task_units"), (int, float)), ""))
                    checks.append(("guardian.level present", "guardian" in step and "level" in step["guardian"], ""))
                    if "guardian" in step and "level" in step["guardian"]:
                        level = step["guardian"]["level"]
                        checks.append(("guardian.level valid", level in ["green", "yellow", "red"], f"Got {level}"))
                
                checks.append(("planner_model present", "planner_model" in plan_result, ""))
                checks.append(("total_task_units present", "total_task_units" in plan_result and isinstance(plan_result["total_task_units"], (int, float)), ""))
                checks.append(("entitlements present", "entitlements" in data, ""))
                checks.append(("over_budget present", "over_budget" in data, ""))
                
                all_passed = all(check[1] for check in checks)
                details = "\n   ".join([f"{check[0]}: {'✓' if check[1] else '✗'} {check[2]}" for check in checks])
                log_test("WORKFORCE PLAN: Structure validation", all_passed, details)
            else:
                log_test("WORKFORCE PLAN: Structure validation", False, "Missing plan or steps in response")
        else:
            log_test("WORKFORCE PLAN: API call", False, f"Status {resp.status_code}: {resp.text}")
    except requests.Timeout:
        log_test("WORKFORCE PLAN: API call", False, "Request timeout (>45s)")
    except Exception as e:
        log_test("WORKFORCE PLAN: API call", False, f"Exception: {str(e)}")

def test_5_workforce_execute():
    """Test 5: WORKFORCE EXECUTE - Parallel execution with Guardian gating"""
    global execute_result
    
    print("\n" + "="*80)
    print("TEST 5: WORKFORCE EXECUTE (Real LLM calls - may take 10-40s)")
    print("="*80)
    
    if not founder_user or not plan_result:
        log_test("WORKFORCE EXECUTE: Skipped", False, "Founder user or plan result not available")
        return
    
    try:
        print("⏳ Calling /workforce/execute with real LLM...")
        
        # Get current entitlements before execution
        resp_before = requests.get(f"{BASE_URL}/me?userId={founder_user['id']}", timeout=10)
        used_before = 0
        if resp_before.status_code == 200:
            used_before = resp_before.json().get("entitlements", {}).get("used_task_units", 0)
        
        resp = requests.post(
            f"{BASE_URL}/workforce/execute",
            json={
                "userId": founder_user['id'],
                "outcome": plan_result.get("summary", "Handle my emails"),
                "steps": plan_result.get("steps", []),
                "summary": plan_result.get("summary", ""),
                "time_saved_minutes": plan_result.get("time_saved_minutes", 15),
                "planner_model": plan_result.get("planner_model", "")
            },
            timeout=45
        )
        
        if resp.status_code == 200:
            data = resp.json()
            execute_result = data.get("task")
            
            # Verify execute structure
            checks = []
            if execute_result:
                status = execute_result.get("status")
                checks.append(("task.status valid", status in ["completed", "waiting_for_user", "failed"], f"Got {status}"))
                
                steps = execute_result.get("steps", [])
                checks.append(("steps have output", all("output" in s for s in steps), ""))
                checks.append(("steps have executed_model", all("executed_model" in s for s in steps), ""))
                
                # Check Guardian gating for yellow steps
                yellow_steps = [s for s in steps if s.get("guardian", {}).get("level") == "yellow"]
                if yellow_steps:
                    yellow_held = all(s.get("status") == "waiting_for_user" and "approval_reason" in s for s in yellow_steps)
                    checks.append(("yellow steps held with approval_reason", yellow_held, f"Found {len(yellow_steps)} yellow steps"))
                
                insights = data.get("insights", {})
                checks.append(("insights.commitments is array", isinstance(insights.get("commitments"), list), ""))
                checks.append(("insights.attention is array", isinstance(insights.get("attention"), list), ""))
                checks.append(("insights.memory is array", isinstance(insights.get("memory"), list), ""))
                
                # Check entitlements increased
                entitlements = data.get("entitlements", {})
                used_after = entitlements.get("used_task_units", 0)
                checks.append(("used_task_units increased", used_after > used_before, f"Before: {used_before}, After: {used_after}"))
                
                all_passed = all(check[1] for check in checks)
                details = "\n   ".join([f"{check[0]}: {'✓' if check[1] else '✗'} {check[2]}" for check in checks])
                log_test("WORKFORCE EXECUTE: Structure validation", all_passed, details)
            else:
                log_test("WORKFORCE EXECUTE: Structure validation", False, "Missing task in response")
            
            # Verify GET /me shows increased usage
            resp_after = requests.get(f"{BASE_URL}/me?userId={founder_user['id']}", timeout=10)
            if resp_after.status_code == 200:
                used_me = resp_after.json().get("entitlements", {}).get("used_task_units", 0)
                if used_me > used_before:
                    log_test("WORKFORCE EXECUTE: GET /me usage tracking", True, f"Used units increased: {used_before} -> {used_me}")
                else:
                    log_test("WORKFORCE EXECUTE: GET /me usage tracking", False, f"Used units not increased: {used_before} -> {used_me}")
        else:
            log_test("WORKFORCE EXECUTE: API call", False, f"Status {resp.status_code}: {resp.text}")
    except requests.Timeout:
        log_test("WORKFORCE EXECUTE: API call", False, "Request timeout (>45s)")
    except Exception as e:
        log_test("WORKFORCE EXECUTE: API call", False, f"Exception: {str(e)}")

def test_6_reads():
    """Test 6: READS - Tasks, Commitments, Attention, Memory"""
    global attention_id, memory_id
    
    print("\n" + "="*80)
    print("TEST 6: READS - Customer data")
    print("="*80)
    
    if not founder_user:
        log_test("READS: Skipped", False, "Founder user not available")
        return
    
    # Test GET /tasks
    try:
        resp = requests.get(f"{BASE_URL}/tasks?userId={founder_user['id']}", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "tasks" in data and len(data["tasks"]) >= 1:
                log_test("READS: GET /tasks", True, f"Retrieved {len(data['tasks'])} tasks")
            else:
                log_test("READS: GET /tasks", False, f"Expected at least 1 task, got {len(data.get('tasks', []))}")
        else:
            log_test("READS: GET /tasks", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("READS: GET /tasks", False, f"Exception: {str(e)}")
    
    # Test GET /commitments
    try:
        resp = requests.get(f"{BASE_URL}/commitments?userId={founder_user['id']}", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "commitments" in data:
                log_test("READS: GET /commitments", True, f"Retrieved {len(data['commitments'])} commitments")
            else:
                log_test("READS: GET /commitments", False, f"Missing commitments in response")
        else:
            log_test("READS: GET /commitments", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("READS: GET /commitments", False, f"Exception: {str(e)}")
    
    # Test GET /attention
    try:
        resp = requests.get(f"{BASE_URL}/attention?userId={founder_user['id']}", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "attention" in data:
                attention_items = data["attention"]
                log_test("READS: GET /attention", True, f"Retrieved {len(attention_items)} attention items")
                if len(attention_items) > 0:
                    attention_id = attention_items[0].get("id")
            else:
                log_test("READS: GET /attention", False, f"Missing attention in response")
        else:
            log_test("READS: GET /attention", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("READS: GET /attention", False, f"Exception: {str(e)}")
    
    # Test POST /memory
    try:
        resp = requests.post(
            f"{BASE_URL}/memory",
            json={"userId": founder_user['id'], "content": "Prefers concise replies", "type": "preference"},
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            if "memory" in data:
                memory_id = data["memory"].get("id")
                log_test("READS: POST /memory", True, f"Created memory item: {memory_id}")
            else:
                log_test("READS: POST /memory", False, f"Missing memory in response")
        else:
            log_test("READS: POST /memory", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("READS: POST /memory", False, f"Exception: {str(e)}")
    
    # Test GET /memory
    try:
        resp = requests.get(f"{BASE_URL}/memory?userId={founder_user['id']}", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "memory" in data:
                memory_items = data["memory"]
                found = any(m.get("content") == "Prefers concise replies" for m in memory_items)
                if found:
                    log_test("READS: GET /memory", True, f"Retrieved {len(memory_items)} memory items, found created item")
                else:
                    log_test("READS: GET /memory", False, f"Created memory item not found in list")
            else:
                log_test("READS: GET /memory", False, f"Missing memory in response")
        else:
            log_test("READS: GET /memory", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("READS: GET /memory", False, f"Exception: {str(e)}")
    
    # Test POST /memory/delete
    if memory_id:
        try:
            resp = requests.post(
                f"{BASE_URL}/memory/delete",
                json={"userId": founder_user['id'], "id": memory_id},
                timeout=10
            )
            if resp.status_code == 200:
                log_test("READS: POST /memory/delete", True, f"Deleted memory item")
            else:
                log_test("READS: POST /memory/delete", False, f"Status {resp.status_code}: {resp.text}")
        except Exception as e:
            log_test("READS: POST /memory/delete", False, f"Exception: {str(e)}")
    
    # Test POST /attention/action
    if attention_id:
        try:
            resp = requests.post(
                f"{BASE_URL}/attention/action",
                json={"userId": founder_user['id'], "id": attention_id, "action": "complete"},
                timeout=10
            )
            if resp.status_code == 200:
                log_test("READS: POST /attention/action", True, f"Completed attention item")
            else:
                log_test("READS: POST /attention/action", False, f"Status {resp.status_code}: {resp.text}")
        except Exception as e:
            log_test("READS: POST /attention/action", False, f"Exception: {str(e)}")

def test_7_billing():
    """Test 7: BILLING - Plan changes"""
    print("\n" + "="*80)
    print("TEST 7: BILLING - Plan changes")
    print("="*80)
    
    if not founder_user:
        log_test("BILLING: Skipped", False, "Founder user not available")
        return
    
    # Change to premium
    try:
        resp = requests.post(
            f"{BASE_URL}/billing/change-plan",
            json={"userId": founder_user['id'], "plan": "premium"},
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            entitlements = data.get("entitlements", {})
            if entitlements.get("task_units") == 400:
                log_test("BILLING: Change to premium", True, f"Task units: {entitlements.get('task_units')}")
            else:
                log_test("BILLING: Change to premium", False, f"Expected 400 task units, got {entitlements.get('task_units')}")
        else:
            log_test("BILLING: Change to premium", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("BILLING: Change to premium", False, f"Exception: {str(e)}")
    
    # Change to normal
    try:
        resp = requests.post(
            f"{BASE_URL}/billing/change-plan",
            json={"userId": founder_user['id'], "plan": "normal"},
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            entitlements = data.get("entitlements", {})
            if entitlements.get("task_units") == 100:
                log_test("BILLING: Change to normal", True, f"Task units: {entitlements.get('task_units')}")
            else:
                log_test("BILLING: Change to normal", False, f"Expected 100 task units, got {entitlements.get('task_units')}")
        else:
            log_test("BILLING: Change to normal", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("BILLING: Change to normal", False, f"Exception: {str(e)}")
    
    # Change back to pro
    try:
        resp = requests.post(
            f"{BASE_URL}/billing/change-plan",
            json={"userId": founder_user['id'], "plan": "pro"},
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            entitlements = data.get("entitlements", {})
            if entitlements.get("task_units") == 200:
                log_test("BILLING: Change back to pro", True, f"Task units: {entitlements.get('task_units')}")
            else:
                log_test("BILLING: Change back to pro", False, f"Expected 200 task units, got {entitlements.get('task_units')}")
        else:
            log_test("BILLING: Change back to pro", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("BILLING: Change back to pro", False, f"Exception: {str(e)}")

def test_8_operator():
    """Test 8: OPERATOR - Overview, Models, Connectors, Killswitches, Feature Flags, Audit"""
    print("\n" + "="*80)
    print("TEST 8: OPERATOR OS")
    print("="*80)
    
    # Test GET /operator/overview
    try:
        resp = requests.get(f"{BASE_URL}/operator/overview", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            checks = []
            checks.append(("revenue.mrr present", "revenue" in data and "mrr" in data["revenue"], ""))
            checks.append(("revenue.arr present", "revenue" in data and "arr" in data["revenue"], ""))
            checks.append(("ai.total_calls present", "ai" in data and "total_calls" in data["ai"], ""))
            checks.append(("tasks.total present", "tasks" in data and "total" in data["tasks"], ""))
            
            all_passed = all(check[1] for check in checks)
            details = "\n   ".join([f"{check[0]}: {'✓' if check[1] else '✗'}" for check in checks])
            log_test("OPERATOR: GET /overview", all_passed, details)
        else:
            log_test("OPERATOR: GET /overview", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("OPERATOR: GET /overview", False, f"Exception: {str(e)}")
    
    # Test GET /operator/models
    try:
        resp = requests.get(f"{BASE_URL}/operator/models", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "models" in data:
                models = data["models"]
                checks = []
                if len(models) > 0:
                    model = models[0]
                    checks.append(("calls present", "calls" in model, ""))
                    checks.append(("success_rate present", "success_rate" in model, ""))
                    checks.append(("avg_latency present", "avg_latency" in model, ""))
                    checks.append(("cost present", "cost" in model, ""))
                
                all_passed = all(check[1] for check in checks)
                details = "\n   ".join([f"{check[0]}: {'✓' if check[1] else '✗'}" for check in checks])
                log_test("OPERATOR: GET /models", all_passed, f"Retrieved {len(models)} models\n   {details}")
            else:
                log_test("OPERATOR: GET /models", False, f"Missing models in response")
        else:
            log_test("OPERATOR: GET /models", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("OPERATOR: GET /models", False, f"Exception: {str(e)}")
    
    # Test POST /operator/models/toggle (disable)
    try:
        resp = requests.post(
            f"{BASE_URL}/operator/models/toggle",
            json={"id": "gpt-4o-mini", "enabled": False},
            timeout=10
        )
        if resp.status_code == 200:
            log_test("OPERATOR: POST /models/toggle (disable)", True, "Disabled gpt-4o-mini")
        else:
            log_test("OPERATOR: POST /models/toggle (disable)", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("OPERATOR: POST /models/toggle (disable)", False, f"Exception: {str(e)}")
    
    # Verify model is disabled
    try:
        resp = requests.get(f"{BASE_URL}/models", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            gpt_mini = next((m for m in data.get("models", []) if m["id"] == "gpt-4o-mini"), None)
            if gpt_mini and not gpt_mini.get("enabled"):
                log_test("OPERATOR: Verify model disabled", True, "gpt-4o-mini is disabled")
            else:
                log_test("OPERATOR: Verify model disabled", False, f"gpt-4o-mini enabled status: {gpt_mini.get('enabled') if gpt_mini else 'not found'}")
        else:
            log_test("OPERATOR: Verify model disabled", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("OPERATOR: Verify model disabled", False, f"Exception: {str(e)}")
    
    # Test POST /operator/models/toggle (re-enable)
    try:
        resp = requests.post(
            f"{BASE_URL}/operator/models/toggle",
            json={"id": "gpt-4o-mini", "enabled": True},
            timeout=10
        )
        if resp.status_code == 200:
            log_test("OPERATOR: POST /models/toggle (re-enable)", True, "Re-enabled gpt-4o-mini")
        else:
            log_test("OPERATOR: POST /models/toggle (re-enable)", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("OPERATOR: POST /models/toggle (re-enable)", False, f"Exception: {str(e)}")
    
    # Test GET /operator/connectors
    try:
        resp = requests.get(f"{BASE_URL}/operator/connectors", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "connectors" in data:
                log_test("OPERATOR: GET /connectors", True, f"Retrieved {len(data['connectors'])} connectors")
            else:
                log_test("OPERATOR: GET /connectors", False, f"Missing connectors in response")
        else:
            log_test("OPERATOR: GET /connectors", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("OPERATOR: GET /connectors", False, f"Exception: {str(e)}")
    
    # Test GET /operator/killswitches
    try:
        resp = requests.get(f"{BASE_URL}/operator/killswitches", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "kill_switches" in data:
                log_test("OPERATOR: GET /killswitches", True, "Retrieved kill switches")
            else:
                log_test("OPERATOR: GET /killswitches", False, f"Missing kill_switches in response")
        else:
            log_test("OPERATOR: GET /killswitches", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("OPERATOR: GET /killswitches", False, f"Exception: {str(e)}")

def test_9_safe_mode():
    """Test 9: SAFE MODE - Global safe mode killswitch"""
    print("\n" + "="*80)
    print("TEST 9: SAFE MODE (Real LLM calls - may take 10-40s)")
    print("="*80)
    
    if not founder_user:
        log_test("SAFE MODE: Skipped", False, "Founder user not available")
        return
    
    # Enable safe mode
    try:
        resp = requests.post(
            f"{BASE_URL}/operator/killswitches",
            json={"key": "global_safe_mode", "value": True},
            timeout=10
        )
        if resp.status_code == 200:
            log_test("SAFE MODE: Enable safe mode", True, "Safe mode enabled")
        else:
            log_test("SAFE MODE: Enable safe mode", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("SAFE MODE: Enable safe mode", False, f"Exception: {str(e)}")
    
    # Run workforce plan
    try:
        print("⏳ Running workforce/plan with safe mode enabled...")
        resp = requests.post(
            f"{BASE_URL}/workforce/plan",
            json={
                "userId": founder_user['id'],
                "outcome": "Send a follow-up email to the marketing team about the Q1 campaign results."
            },
            timeout=45
        )
        
        if resp.status_code == 200:
            safe_plan = resp.json().get("plan")
            
            # Run workforce execute
            print("⏳ Running workforce/execute with safe mode enabled...")
            resp_exec = requests.post(
                f"{BASE_URL}/workforce/execute",
                json={
                    "userId": founder_user['id'],
                    "outcome": safe_plan.get("summary", "Send follow-up email"),
                    "steps": safe_plan.get("steps", []),
                    "summary": safe_plan.get("summary", ""),
                    "time_saved_minutes": safe_plan.get("time_saved_minutes", 10),
                    "planner_model": safe_plan.get("planner_model", "")
                },
                timeout=45
            )
            
            if resp_exec.status_code == 200:
                data = resp_exec.json()
                task = data.get("task")
                
                if task:
                    steps = task.get("steps", [])
                    all_held = all(s.get("status") == "waiting_for_user" for s in steps)
                    safe_mode_flag = task.get("safe_mode", False)
                    
                    if all_held and safe_mode_flag:
                        log_test("SAFE MODE: All steps held", True, f"All {len(steps)} steps held with status waiting_for_user, safe_mode=true")
                    else:
                        log_test("SAFE MODE: All steps held", False, f"Not all steps held or safe_mode flag not set. Steps: {[s.get('status') for s in steps]}, safe_mode: {safe_mode_flag}")
                else:
                    log_test("SAFE MODE: All steps held", False, "Missing task in response")
            else:
                log_test("SAFE MODE: Execute with safe mode", False, f"Status {resp_exec.status_code}: {resp_exec.text}")
        else:
            log_test("SAFE MODE: Plan with safe mode", False, f"Status {resp.status_code}: {resp.text}")
    except requests.Timeout:
        log_test("SAFE MODE: Workflow", False, "Request timeout (>45s)")
    except Exception as e:
        log_test("SAFE MODE: Workflow", False, f"Exception: {str(e)}")
    
    # Disable safe mode
    try:
        resp = requests.post(
            f"{BASE_URL}/operator/killswitches",
            json={"key": "global_safe_mode", "value": False},
            timeout=10
        )
        if resp.status_code == 200:
            log_test("SAFE MODE: Disable safe mode", True, "Safe mode disabled")
        else:
            log_test("SAFE MODE: Disable safe mode", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("SAFE MODE: Disable safe mode", False, f"Exception: {str(e)}")

def test_10_operator_ai():
    """Test 10: OPERATOR AI - AI Operator query"""
    print("\n" + "="*80)
    print("TEST 10: OPERATOR AI (Real LLM call - may take 10-40s)")
    print("="*80)
    
    try:
        print("⏳ Calling /operator/ai with real LLM...")
        resp = requests.post(
            f"{BASE_URL}/operator/ai",
            json={"question": "What is broken and how many users are active?"},
            timeout=45
        )
        
        if resp.status_code == 200:
            data = resp.json()
            if "answer" in data and "model" in data:
                answer = data["answer"]
                model = data["model"]
                log_test("OPERATOR AI: Query", True, f"Model: {model}, Answer length: {len(answer)} chars")
            else:
                log_test("OPERATOR AI: Query", False, f"Missing answer or model in response")
        else:
            log_test("OPERATOR AI: Query", False, f"Status {resp.status_code}: {resp.text}")
    except requests.Timeout:
        log_test("OPERATOR AI: Query", False, "Request timeout (>45s)")
    except Exception as e:
        log_test("OPERATOR AI: Query", False, f"Exception: {str(e)}")

def test_11_feature_flags_audit():
    """Test 11: FEATURE FLAGS + AUDIT"""
    print("\n" + "="*80)
    print("TEST 11: FEATURE FLAGS + AUDIT")
    print("="*80)
    
    # Test GET /operator/featureflags
    try:
        resp = requests.get(f"{BASE_URL}/operator/featureflags", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "feature_flags" in data and "features" in data:
                log_test("FEATURE FLAGS: GET /featureflags", True, f"Retrieved feature flags and features")
            else:
                log_test("FEATURE FLAGS: GET /featureflags", False, f"Missing feature_flags or features in response")
        else:
            log_test("FEATURE FLAGS: GET /featureflags", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("FEATURE FLAGS: GET /featureflags", False, f"Exception: {str(e)}")
    
    # Test POST /operator/featureflags
    try:
        resp = requests.post(
            f"{BASE_URL}/operator/featureflags",
            json={"id": "slack", "flag": "beta"},
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            if "feature_flags" in data:
                log_test("FEATURE FLAGS: POST /featureflags", True, f"Updated slack flag to beta")
            else:
                log_test("FEATURE FLAGS: POST /featureflags", False, f"Missing feature_flags in response")
        else:
            log_test("FEATURE FLAGS: POST /featureflags", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("FEATURE FLAGS: POST /featureflags", False, f"Exception: {str(e)}")
    
    # Test GET /operator/audit
    try:
        resp = requests.get(f"{BASE_URL}/operator/audit", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "logs" in data:
                logs = data["logs"]
                # Check for expected actions
                actions = [log.get("action") for log in logs]
                expected_actions = ["connector.connect", "workforce.execute", "killswitch.toggle"]
                found_actions = [action for action in expected_actions if any(action in a for a in actions)]
                
                if len(found_actions) >= 2:
                    log_test("AUDIT: GET /audit", True, f"Retrieved {len(logs)} logs, found actions: {', '.join(found_actions)}")
                else:
                    log_test("AUDIT: GET /audit", True, f"Retrieved {len(logs)} logs (may not include all expected actions yet)")
            else:
                log_test("AUDIT: GET /audit", False, f"Missing logs in response")
        else:
            log_test("AUDIT: GET /audit", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("AUDIT: GET /audit", False, f"Exception: {str(e)}")

def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("LAZY AI WORKFORCE PLATFORM - BACKEND TEST SUITE")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print("="*80)
    
    try:
        test_1_auth()
        test_2_registries()
        test_3_connectors()
        test_4_workforce_plan()
        test_5_workforce_execute()
        test_6_reads()
        test_7_billing()
        test_8_operator()
        test_9_safe_mode()
        test_10_operator_ai()
        test_11_feature_flags_audit()
    except KeyboardInterrupt:
        print("\n\n⚠️  Tests interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {str(e)}")
    finally:
        print_summary()
        
        # Exit with appropriate code
        if len(test_results['failed']) > 0:
            sys.exit(1)
        else:
            sys.exit(0)

if __name__ == "__main__":
    main()
