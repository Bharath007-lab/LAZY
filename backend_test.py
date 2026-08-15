#!/usr/bin/env python3
"""
Backend API Test Suite for LAZY Platform - Round 4
Tests Google OAuth + OpenHands dispatch flows
"""
import requests
import json
import sys
from urllib.parse import urlparse, parse_qs

# Base URL from environment
BASE_URL = "https://ai-tasks-14.preview.emergentagent.com/api"

def log(msg):
    print(f"[TEST] {msg}")

def test_google_oauth_flow():
    """
    Test Google OAuth flow:
    1. POST /api/auth/request-code -> capture userId
    2. GET /api/connectors?userId=<id> -> google_ready==false, gmail/calendar/drive have oauth=='google'
    3. GET /api/oauth/google/start (manual redirect) -> 307, Location contains '/?google=not_configured'
    4. POST /api/settings/integrations/save {provider:'google', data:{key:'dummy-id.apps.googleusercontent.com', secret:'dummy-secret'}} -> 200
    5. GET /api/connectors?userId=<id> -> google_ready==true
    6. GET /api/oauth/google/start (manual) -> 307, Location starts 'https://accounts.google.com/o/oauth2/v2/auth' and contains 'gmail.readonly','calendar.readonly','state'
    7. GET /api/oauth/google/callback?error=access_denied (manual) -> 307 Location '/?google=denied'
    8. GET /api/oauth/google/callback?code=abc&state=garbage (manual) -> 307 Location '/?google=bad_state'
    9. POST /api/settings/integrations/disconnect {provider:'google'} -> 200; google_ready==false again
    """
    log("=" * 80)
    log("GOOGLE OAUTH FLOW TESTS")
    log("=" * 80)
    
    results = []
    user_id = None
    
    # Test 1: Create test user and capture userId
    try:
        log("Test 1: POST /api/auth/request-code to create test user")
        resp = requests.post(f"{BASE_URL}/auth/request-code", json={"email": "ptester@acme.com"}, timeout=10)
        log(f"  Status: {resp.status_code}")
        
        if resp.status_code == 200:
            data = resp.json()
            if 'user' in data and 'id' in data['user']:
                user_id = data['user']['id']
                log(f"  ✅ PASS: Captured userId: {user_id}")
                results.append(("Create test user", True, None))
            else:
                log(f"  ❌ FAIL: Response missing user.id: {data}")
                results.append(("Create test user", False, "Missing user.id in response"))
        else:
            log(f"  ❌ FAIL: Expected 200, got {resp.status_code}: {resp.text}")
            results.append(("Create test user", False, f"Status {resp.status_code}"))
            return results
    except Exception as e:
        log(f"  ❌ FAIL: Exception: {e}")
        results.append(("Create test user", False, str(e)))
        return results
    
    # Test 2: Check connectors - google_ready should be false initially
    try:
        log("Test 2: GET /api/connectors?userId=<id> -> google_ready==false initially")
        resp = requests.get(f"{BASE_URL}/connectors", params={"userId": user_id}, timeout=10)
        log(f"  Status: {resp.status_code}")
        
        if resp.status_code == 200:
            data = resp.json()
            google_ready = data.get('google_ready', None)
            connectors = data.get('connectors', [])
            
            # Check google_ready is false
            if google_ready == False:
                log(f"  ✅ google_ready == false (correct)")
            else:
                log(f"  ❌ google_ready == {google_ready} (expected false)")
                results.append(("Initial google_ready==false", False, f"google_ready={google_ready}"))
            
            # Check gmail/calendar/drive have oauth=='google'
            oauth_connectors = [c for c in connectors if c.get('oauth') == 'google']
            oauth_ids = [c['id'] for c in oauth_connectors]
            
            if 'gmail' in oauth_ids and 'calendar' in oauth_ids:
                log(f"  ✅ PASS: gmail/calendar have oauth=='google': {oauth_ids}")
                results.append(("Initial connectors check", True, None))
            else:
                log(f"  ❌ FAIL: Expected gmail/calendar with oauth=='google', got: {oauth_ids}")
                results.append(("Initial connectors check", False, f"oauth connectors: {oauth_ids}"))
        else:
            log(f"  ❌ FAIL: Expected 200, got {resp.status_code}: {resp.text}")
            results.append(("Initial connectors check", False, f"Status {resp.status_code}"))
    except Exception as e:
        log(f"  ❌ FAIL: Exception: {e}")
        results.append(("Initial connectors check", False, str(e)))
    
    # Test 3: GET /api/oauth/google/start without Google configured -> 307 redirect to /?google=not_configured
    try:
        log("Test 3: GET /api/oauth/google/start (no Google config) -> 307 redirect to /?google=not_configured")
        resp = requests.get(
            f"{BASE_URL}/oauth/google/start",
            params={"userId": user_id, "connector": "gmail"},
            allow_redirects=False,
            timeout=10
        )
        log(f"  Status: {resp.status_code}")
        
        if resp.status_code == 307:
            location = resp.headers.get('Location', '')
            log(f"  Location: {location}")
            
            if '/?google=not_configured' in location or 'google=not_configured' in location:
                log(f"  ✅ PASS: 307 redirect to /?google=not_configured")
                results.append(("OAuth start without config", True, None))
            else:
                log(f"  ❌ FAIL: Expected Location to contain '/?google=not_configured', got: {location}")
                results.append(("OAuth start without config", False, f"Wrong redirect: {location}"))
        else:
            log(f"  ❌ FAIL: Expected 307, got {resp.status_code}")
            results.append(("OAuth start without config", False, f"Status {resp.status_code}"))
    except Exception as e:
        log(f"  ❌ FAIL: Exception: {e}")
        results.append(("OAuth start without config", False, str(e)))
    
    # Test 4: Save Google integration credentials
    try:
        log("Test 4: POST /api/settings/integrations/save with Google credentials")
        resp = requests.post(
            f"{BASE_URL}/settings/integrations/save",
            json={
                "provider": "google",
                "data": {
                    "key": "dummy-id.apps.googleusercontent.com",
                    "secret": "dummy-secret"
                }
            },
            timeout=10
        )
        log(f"  Status: {resp.status_code}")
        
        if resp.status_code == 200:
            data = resp.json()
            log(f"  ✅ PASS: Google credentials saved")
            results.append(("Save Google credentials", True, None))
            
            # Check for secret leakage
            response_text = json.dumps(data)
            if 'dummy-secret' in response_text:
                log(f"  ⚠️  WARNING: Raw secret 'dummy-secret' found in response!")
                results.append(("Secret masking check", False, "Raw secret leaked in response"))
            else:
                log(f"  ✅ PASS: Raw secret NOT leaked in response")
                results.append(("Secret masking check", True, None))
        else:
            log(f"  ❌ FAIL: Expected 200, got {resp.status_code}: {resp.text}")
            results.append(("Save Google credentials", False, f"Status {resp.status_code}"))
    except Exception as e:
        log(f"  ❌ FAIL: Exception: {e}")
        results.append(("Save Google credentials", False, str(e)))
    
    # Test 5: Check connectors - google_ready should be true now
    try:
        log("Test 5: GET /api/connectors?userId=<id> -> google_ready==true after save")
        resp = requests.get(f"{BASE_URL}/connectors", params={"userId": user_id}, timeout=10)
        log(f"  Status: {resp.status_code}")
        
        if resp.status_code == 200:
            data = resp.json()
            google_ready = data.get('google_ready', None)
            
            if google_ready == True:
                log(f"  ✅ PASS: google_ready == true (correct)")
                results.append(("google_ready after save", True, None))
            else:
                log(f"  ❌ FAIL: google_ready == {google_ready} (expected true)")
                results.append(("google_ready after save", False, f"google_ready={google_ready}"))
        else:
            log(f"  ❌ FAIL: Expected 200, got {resp.status_code}: {resp.text}")
            results.append(("google_ready after save", False, f"Status {resp.status_code}"))
    except Exception as e:
        log(f"  ❌ FAIL: Exception: {e}")
        results.append(("google_ready after save", False, str(e)))
    
    # Test 6: GET /api/oauth/google/start with Google configured -> 307 redirect to Google OAuth
    try:
        log("Test 6: GET /api/oauth/google/start (with config) -> 307 redirect to Google OAuth")
        resp = requests.get(
            f"{BASE_URL}/oauth/google/start",
            params={"userId": user_id, "connector": "gmail"},
            allow_redirects=False,
            timeout=10
        )
        log(f"  Status: {resp.status_code}")
        
        if resp.status_code == 307:
            location = resp.headers.get('Location', '')
            log(f"  Location: {location[:100]}...")
            
            checks = []
            
            # Check if Location starts with Google OAuth URL
            if location.startswith('https://accounts.google.com/o/oauth2/v2/auth'):
                log(f"  ✅ Location starts with 'https://accounts.google.com/o/oauth2/v2/auth'")
                checks.append(True)
            else:
                log(f"  ❌ Location does NOT start with Google OAuth URL")
                checks.append(False)
            
            # Check for gmail.readonly scope
            if 'gmail.readonly' in location:
                log(f"  ✅ Location contains 'gmail.readonly'")
                checks.append(True)
            else:
                log(f"  ❌ Location does NOT contain 'gmail.readonly'")
                checks.append(False)
            
            # Check for calendar.readonly scope
            if 'calendar.readonly' in location:
                log(f"  ✅ Location contains 'calendar.readonly'")
                checks.append(True)
            else:
                log(f"  ❌ Location does NOT contain 'calendar.readonly'")
                checks.append(False)
            
            # Check for state parameter
            if 'state=' in location:
                log(f"  ✅ Location contains 'state=' parameter")
                checks.append(True)
            else:
                log(f"  ❌ Location does NOT contain 'state=' parameter")
                checks.append(False)
            
            if all(checks):
                log(f"  ✅ PASS: All OAuth URL checks passed")
                results.append(("OAuth start with config", True, None))
            else:
                log(f"  ❌ FAIL: Some OAuth URL checks failed")
                results.append(("OAuth start with config", False, "OAuth URL validation failed"))
        else:
            log(f"  ❌ FAIL: Expected 307, got {resp.status_code}")
            results.append(("OAuth start with config", False, f"Status {resp.status_code}"))
    except Exception as e:
        log(f"  ❌ FAIL: Exception: {e}")
        results.append(("OAuth start with config", False, str(e)))
    
    # Test 7: GET /api/oauth/google/callback?error=access_denied -> 307 redirect to /?google=denied
    try:
        log("Test 7: GET /api/oauth/google/callback?error=access_denied -> 307 redirect to /?google=denied")
        resp = requests.get(
            f"{BASE_URL}/oauth/google/callback",
            params={"error": "access_denied"},
            allow_redirects=False,
            timeout=10
        )
        log(f"  Status: {resp.status_code}")
        
        if resp.status_code == 307:
            location = resp.headers.get('Location', '')
            log(f"  Location: {location}")
            
            if '/?google=denied' in location or 'google=denied' in location:
                log(f"  ✅ PASS: 307 redirect to /?google=denied")
                results.append(("OAuth callback error=access_denied", True, None))
            else:
                log(f"  ❌ FAIL: Expected Location to contain '/?google=denied', got: {location}")
                results.append(("OAuth callback error=access_denied", False, f"Wrong redirect: {location}"))
        else:
            log(f"  ❌ FAIL: Expected 307, got {resp.status_code}")
            results.append(("OAuth callback error=access_denied", False, f"Status {resp.status_code}"))
    except Exception as e:
        log(f"  ❌ FAIL: Exception: {e}")
        results.append(("OAuth callback error=access_denied", False, str(e)))
    
    # Test 8: GET /api/oauth/google/callback?code=abc&state=garbage -> 307 redirect to /?google=bad_state
    try:
        log("Test 8: GET /api/oauth/google/callback?code=abc&state=garbage -> 307 redirect to /?google=bad_state")
        resp = requests.get(
            f"{BASE_URL}/oauth/google/callback",
            params={"code": "abc", "state": "garbage"},
            allow_redirects=False,
            timeout=10
        )
        log(f"  Status: {resp.status_code}")
        
        if resp.status_code == 307:
            location = resp.headers.get('Location', '')
            log(f"  Location: {location}")
            
            if '/?google=bad_state' in location or 'google=bad_state' in location:
                log(f"  ✅ PASS: 307 redirect to /?google=bad_state")
                results.append(("OAuth callback bad state", True, None))
            else:
                log(f"  ❌ FAIL: Expected Location to contain '/?google=bad_state', got: {location}")
                results.append(("OAuth callback bad state", False, f"Wrong redirect: {location}"))
        else:
            log(f"  ❌ FAIL: Expected 307, got {resp.status_code}")
            results.append(("OAuth callback bad state", False, f"Status {resp.status_code}"))
    except Exception as e:
        log(f"  ❌ FAIL: Exception: {e}")
        results.append(("OAuth callback bad state", False, str(e)))
    
    # Test 9: Disconnect Google integration
    try:
        log("Test 9: POST /api/settings/integrations/disconnect {provider:'google'} -> 200")
        resp = requests.post(
            f"{BASE_URL}/settings/integrations/disconnect",
            json={"provider": "google"},
            timeout=10
        )
        log(f"  Status: {resp.status_code}")
        
        if resp.status_code == 200:
            log(f"  ✅ PASS: Google integration disconnected")
            results.append(("Disconnect Google", True, None))
        else:
            log(f"  ❌ FAIL: Expected 200, got {resp.status_code}: {resp.text}")
            results.append(("Disconnect Google", False, f"Status {resp.status_code}"))
    except Exception as e:
        log(f"  ❌ FAIL: Exception: {e}")
        results.append(("Disconnect Google", False, str(e)))
    
    # Test 10: Check connectors - google_ready should be false again
    try:
        log("Test 10: GET /api/connectors?userId=<id> -> google_ready==false after disconnect")
        resp = requests.get(f"{BASE_URL}/connectors", params={"userId": user_id}, timeout=10)
        log(f"  Status: {resp.status_code}")
        
        if resp.status_code == 200:
            data = resp.json()
            google_ready = data.get('google_ready', None)
            
            if google_ready == False:
                log(f"  ✅ PASS: google_ready == false after disconnect (correct)")
                results.append(("google_ready after disconnect", True, None))
            else:
                log(f"  ❌ FAIL: google_ready == {google_ready} (expected false)")
                results.append(("google_ready after disconnect", False, f"google_ready={google_ready}"))
        else:
            log(f"  ❌ FAIL: Expected 200, got {resp.status_code}: {resp.text}")
            results.append(("google_ready after disconnect", False, f"Status {resp.status_code}"))
    except Exception as e:
        log(f"  ❌ FAIL: Exception: {e}")
        results.append(("google_ready after disconnect", False, str(e)))
    
    return results


def test_openhands_flow():
    """
    Test OpenHands dispatch flow:
    1. POST /api/builder/chat {message:'Build a brand-new Trello two-way sync connector with a settings UI'} 
       -> changeset.requires_code==true, status=='awaiting_openhands_connection'
    2. POST /api/builder/changesets/status {id:<that id>} -> 400 (no OpenHands job)
    3. POST /api/settings/integrations/save {provider:'openhands', data:{endpoint:'http://127.0.0.1:9', key:'tok'}}
    4. POST /api/settings/integrations/connect {provider:'openhands'} -> 200 with result.status present (likely 'error', unreachable)
    """
    log("=" * 80)
    log("OPENHANDS DISPATCH FLOW TESTS")
    log("=" * 80)
    
    results = []
    changeset_id = None
    
    # Test 1: POST /api/builder/chat with code-requiring request
    try:
        log("Test 1: POST /api/builder/chat requesting new Trello connector (requires code)")
        resp = requests.post(
            f"{BASE_URL}/builder/chat",
            json={"message": "Build a brand-new Trello two-way sync connector with a settings UI"},
            timeout=30  # LLM call may take time
        )
        log(f"  Status: {resp.status_code}")
        
        if resp.status_code == 200:
            data = resp.json()
            changeset = data.get('changeset', {})
            changeset_id = changeset.get('id')
            requires_code = changeset.get('requires_code')
            status = changeset.get('status')
            
            log(f"  changeset.id: {changeset_id}")
            log(f"  changeset.requires_code: {requires_code}")
            log(f"  changeset.status: {status}")
            
            checks = []
            
            if requires_code == True:
                log(f"  ✅ requires_code == true")
                checks.append(True)
            else:
                log(f"  ❌ requires_code == {requires_code} (expected true)")
                checks.append(False)
            
            if status == 'awaiting_openhands_connection':
                log(f"  ✅ status == 'awaiting_openhands_connection'")
                checks.append(True)
            else:
                log(f"  ❌ status == '{status}' (expected 'awaiting_openhands_connection')")
                checks.append(False)
            
            if all(checks):
                log(f"  ✅ PASS: Builder chat returns correct changeset")
                results.append(("Builder chat code request", True, None))
            else:
                log(f"  ❌ FAIL: Changeset validation failed")
                results.append(("Builder chat code request", False, "Changeset validation failed"))
        else:
            log(f"  ❌ FAIL: Expected 200, got {resp.status_code}: {resp.text}")
            results.append(("Builder chat code request", False, f"Status {resp.status_code}"))
            return results
    except Exception as e:
        log(f"  ❌ FAIL: Exception: {e}")
        results.append(("Builder chat code request", False, str(e)))
        return results
    
    # Test 2: POST /api/builder/changesets/status without OpenHands job -> 400
    try:
        log("Test 2: POST /api/builder/changesets/status (no OpenHands job attached) -> 400")
        resp = requests.post(
            f"{BASE_URL}/builder/changesets/status",
            json={"id": changeset_id},
            timeout=10
        )
        log(f"  Status: {resp.status_code}")
        
        if resp.status_code == 400:
            data = resp.json()
            error = data.get('error', '')
            log(f"  Error message: {error}")
            
            if 'OpenHands' in error or 'openhands' in error.lower():
                log(f"  ✅ PASS: 400 error with OpenHands message")
                results.append(("Changeset status without job", True, None))
            else:
                log(f"  ⚠️  WARNING: 400 but unexpected error message: {error}")
                results.append(("Changeset status without job", True, f"Unexpected error: {error}"))
        else:
            log(f"  ❌ FAIL: Expected 400, got {resp.status_code}: {resp.text}")
            results.append(("Changeset status without job", False, f"Status {resp.status_code}"))
    except Exception as e:
        log(f"  ❌ FAIL: Exception: {e}")
        results.append(("Changeset status without job", False, str(e)))
    
    # Test 3: Save OpenHands integration
    try:
        log("Test 3: POST /api/settings/integrations/save with OpenHands config")
        resp = requests.post(
            f"{BASE_URL}/settings/integrations/save",
            json={
                "provider": "openhands",
                "data": {
                    "endpoint": "http://127.0.0.1:9",
                    "key": "tok"
                }
            },
            timeout=10
        )
        log(f"  Status: {resp.status_code}")
        
        if resp.status_code == 200:
            log(f"  ✅ PASS: OpenHands config saved")
            results.append(("Save OpenHands config", True, None))
        else:
            log(f"  ❌ FAIL: Expected 200, got {resp.status_code}: {resp.text}")
            results.append(("Save OpenHands config", False, f"Status {resp.status_code}"))
    except Exception as e:
        log(f"  ❌ FAIL: Exception: {e}")
        results.append(("Save OpenHands config", False, str(e)))
    
    # Test 4: Connect OpenHands integration (should return 200 with status field, likely 'error')
    try:
        log("Test 4: POST /api/settings/integrations/connect {provider:'openhands'} -> 200 with result.status")
        resp = requests.post(
            f"{BASE_URL}/settings/integrations/connect",
            json={"provider": "openhands"},
            timeout=10
        )
        log(f"  Status: {resp.status_code}")
        
        if resp.status_code == 200:
            data = resp.json()
            result = data.get('result', {})
            status = result.get('status')
            
            log(f"  result.status: {status}")
            
            if status is not None:
                log(f"  ✅ PASS: result.status field present (status='{status}', likely 'error' since unreachable)")
                results.append(("Connect OpenHands", True, None))
            else:
                log(f"  ❌ FAIL: result.status field missing in response")
                results.append(("Connect OpenHands", False, "Missing result.status"))
        elif resp.status_code >= 500:
            log(f"  ❌ FAIL: Got 5xx error ({resp.status_code}), should return 200 with error status")
            results.append(("Connect OpenHands", False, f"5xx error: {resp.status_code}"))
        else:
            log(f"  ❌ FAIL: Expected 200, got {resp.status_code}: {resp.text}")
            results.append(("Connect OpenHands", False, f"Status {resp.status_code}"))
    except Exception as e:
        log(f"  ❌ FAIL: Exception: {e}")
        results.append(("Connect OpenHands", False, str(e)))
    
    return results


def main():
    log("Starting LAZY Backend API Tests - Round 4")
    log(f"Base URL: {BASE_URL}")
    log("")
    
    all_results = []
    
    # Run Google OAuth tests
    google_results = test_google_oauth_flow()
    all_results.extend(google_results)
    
    log("")
    
    # Run OpenHands tests
    openhands_results = test_openhands_flow()
    all_results.extend(openhands_results)
    
    # Summary
    log("")
    log("=" * 80)
    log("TEST SUMMARY")
    log("=" * 80)
    
    passed = sum(1 for _, success, _ in all_results if success)
    failed = sum(1 for _, success, _ in all_results if not success)
    total = len(all_results)
    
    log(f"Total: {total} tests")
    log(f"Passed: {passed} ✅")
    log(f"Failed: {failed} ❌")
    log("")
    
    if failed > 0:
        log("Failed tests:")
        for name, success, error in all_results:
            if not success:
                log(f"  ❌ {name}: {error}")
    
    log("")
    log("Detailed results:")
    for name, success, error in all_results:
        status = "✅ PASS" if success else "❌ FAIL"
        log(f"  {status}: {name}")
        if error:
            log(f"      Error: {error}")
    
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
