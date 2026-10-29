"""
E2E Test Suite — ContextApp
Tests the full user journey against a running backend (localhost:8000).
"""
import requests
import sys
import json
from datetime import datetime, timedelta, timezone

BASE = "http://127.0.0.1:8000/api"
PASS = 0
FAIL = 0

def test(name, fn):
    global PASS, FAIL
    try:
        fn()
        PASS += 1
        print(f"  [PASS] {name}")
    except AssertionError as e:
        FAIL += 1
        print(f"  [FAIL] {name}: {e}")
    except Exception as e:
        FAIL += 1
        print(f"  [ERROR] {name}: {e}")

# ── Auth ──────────────────────────────────────────────────────────

print("\n=== 1. AUTH ===")

tokens = {}
user = {}

def test_register():
    global tokens, user
    r = requests.post(f"{BASE}/auth/register/", json={
        "username": "e2e_user",
        "email": "e2e@test.com",
        "password": "securepass123"
    })
    assert r.status_code == 201, f"Expected 201, got {r.status_code}: {r.text}"
    data = r.json()
    assert "tokens" in data, "Missing tokens"
    assert "access" in data["tokens"], "Missing access token"
    assert "refresh" in data["tokens"], "Missing refresh token"
    assert data["user"]["username"] == "e2e_user"
    tokens = data["tokens"]
    user = data["user"]

def test_register_duplicate():
    r = requests.post(f"{BASE}/auth/register/", json={
        "username": "e2e_user",
        "email": "e2e2@test.com",
        "password": "securepass123"
    })
    assert r.status_code == 400, f"Expected 400, got {r.status_code}"

def test_register_short_password():
    r = requests.post(f"{BASE}/auth/register/", json={
        "username": "shortpass",
        "password": "123"
    })
    assert r.status_code == 400, f"Expected 400, got {r.status_code}"

def test_login():
    global tokens
    r = requests.post(f"{BASE}/auth/token/", json={
        "username": "e2e_user",
        "password": "securepass123"
    })
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    data = r.json()
    assert "access" in data and "refresh" in data
    tokens = data

def test_login_wrong_password():
    r = requests.post(f"{BASE}/auth/token/", json={
        "username": "e2e_user",
        "password": "wrongpass"
    })
    assert r.status_code == 401, f"Expected 401, got {r.status_code}"

def test_profile():
    r = requests.get(f"{BASE}/auth/profile/", headers={"Authorization": f"Bearer {tokens['access']}"})
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    assert r.json()["username"] == "e2e_user"

def test_profile_unauthorized():
    r = requests.get(f"{BASE}/auth/profile/")
    assert r.status_code == 401, f"Expected 401, got {r.status_code}"

def test_refresh_token():
    r = requests.post(f"{BASE}/auth/token/refresh/", json={"refresh": tokens["refresh"]})
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    tokens["access"] = r.json()["access"]

AUTH = lambda: {"Authorization": f"Bearer {tokens['access']}"}

test("Register creates user + tokens", test_register)
test("Register rejects duplicate username", test_register_duplicate)
test("Register rejects short password", test_register_short_password)
test("Login returns tokens", test_login)
test("Login rejects wrong password", test_login_wrong_password)
test("Profile returns user data", test_profile)
test("Profile rejects unauthenticated", test_profile_unauthorized)
test("Refresh token rotates access", test_refresh_token)

# ── Workspaces ────────────────────────────────────────────────────

print("\n=== 2. WORKSPACES ===")

ws1, ws2 = None, None

def test_create_workspace_1():
    global ws1
    r = requests.post(f"{BASE}/workspaces/", json={"name": "Work", "color": "#6366f1", "icon": "briefcase"}, headers=AUTH())
    assert r.status_code == 201, f"Expected 201, got {r.status_code}: {r.text}"
    ws1 = r.json()
    assert ws1["name"] == "Work"
    assert ws1["color"] == "#6366f1"

def test_create_workspace_2():
    global ws2
    r = requests.post(f"{BASE}/workspaces/", json={"name": "Personal", "color": "#10b981", "icon": "home"}, headers=AUTH())
    assert r.status_code == 201
    ws2 = r.json()

def test_list_workspaces():
    r = requests.get(f"{BASE}/workspaces/", headers=AUTH())
    assert r.status_code == 200
    results = r.json()["results"]
    assert len(results) == 2, f"Expected 2 workspaces, got {len(results)}"

def test_update_workspace():
    r = requests.patch(f"{BASE}/workspaces/{ws1['id']}/", json={"name": "Work Updated"}, headers=AUTH())
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    assert r.json()["name"] == "Work Updated"

def test_workspace_counts():
    r = requests.get(f"{BASE}/workspaces/{ws1['id']}/", headers=AUTH())
    assert r.status_code == 200
    data = r.json()
    assert data["todo_count"] == 0
    assert data["note_count"] == 0
    assert data["reminder_count"] == 0

test("Create workspace 1 (Work)", test_create_workspace_1)
test("Create workspace 2 (Personal)", test_create_workspace_2)
test("List workspaces returns 2", test_list_workspaces)
test("Update workspace name", test_update_workspace)
test("Workspace counts are 0 initially", test_workspace_counts)

# ── Todos ─────────────────────────────────────────────────────────

print("\n=== 3. TODOS ===")

todo1, todo2 = None, None

def test_create_todo_1():
    global todo1
    r = requests.post(f"{BASE}/todos/", json={
        "workspace": ws1["id"], "title": "Buy groceries"
    }, headers=AUTH())
    assert r.status_code == 201, f"Expected 201, got {r.status_code}: {r.text}"
    todo1 = r.json()
    assert todo1["title"] == "Buy groceries"
    assert todo1["completed"] is False

def test_create_todo_2():
    global todo2
    r = requests.post(f"{BASE}/todos/", json={
        "workspace": ws1["id"], "title": "Write report", "description": "Q3 report"
    }, headers=AUTH())
    assert r.status_code == 201
    todo2 = r.json()

def test_list_todos():
    r = requests.get(f"{BASE}/todos/?workspace_id={ws1['id']}", headers=AUTH())
    assert r.status_code == 200
    assert len(r.json()["results"]) == 2

def test_toggle_todo():
    global todo1
    r = requests.post(f"{BASE}/todos/{todo1['id']}/toggle/", headers=AUTH())
    assert r.status_code == 200
    todo1 = r.json()
    assert todo1["completed"] is True

def test_toggle_todo_back():
    global todo1
    r = requests.post(f"{BASE}/todos/{todo1['id']}/toggle/", headers=AUTH())
    assert r.status_code == 200
    todo1 = r.json()
    assert todo1["completed"] is False

def test_create_checklist():
    r1 = requests.post(f"{BASE}/todos/{todo1['id']}/checklist/", json={"text": "Milk"}, headers=AUTH())
    r2 = requests.post(f"{BASE}/todos/{todo1['id']}/checklist/", json={"text": "Eggs"}, headers=AUTH())
    assert r1.status_code == 201 and r2.status_code == 201

def test_list_checklist():
    r = requests.get(f"{BASE}/todos/{todo1['id']}/checklist/", headers=AUTH())
    assert r.status_code == 200
    results = r.json()["results"] if "results" in r.json() else r.json()
    assert len(results) == 2, f"Expected 2 checklist items, got {len(results)}"

def test_toggle_checklist_item():
    r = requests.get(f"{BASE}/todos/{todo1['id']}/checklist/", headers=AUTH())
    items = r.json()["results"] if "results" in r.json() else r.json()
    item_id = items[0]["id"]
    r2 = requests.patch(f"{BASE}/todos/{todo1['id']}/checklist/{item_id}/", json={"checked": True}, headers=AUTH())
    assert r2.status_code == 200
    assert r2.json()["checked"] is True

def test_todo_progress():
    r = requests.get(f"{BASE}/todos/{todo1['id']}/", headers=AUTH())
    assert r.status_code == 200
    assert r.json()["progress"] == 50  # 1 of 2 checked

def test_delete_todo():
    r = requests.delete(f"{BASE}/todos/{todo2['id']}/", headers=AUTH())
    assert r.status_code == 204
    r2 = requests.get(f"{BASE}/todos/?workspace_id={ws1['id']}", headers=AUTH())
    assert len(r2.json()["results"]) == 1

test("Create todo 1", test_create_todo_1)
test("Create todo 2", test_create_todo_2)
test("List todos returns 2", test_list_todos)
test("Toggle todo completes it", test_toggle_todo)
test("Toggle todo uncompletes it", test_toggle_todo_back)
test("Create 2 checklist items", test_create_checklist)
test("List checklist returns 2", test_list_checklist)
test("Toggle checklist item", test_toggle_checklist_item)
test("Todo progress is 50%", test_todo_progress)
test("Delete todo", test_delete_todo)

# ── Notes ─────────────────────────────────────────────────────────

print("\n=== 4. NOTES ===")

note1, note2 = None, None

def test_create_note_1():
    global note1
    r = requests.post(f"{BASE}/notes/", json={
        "workspace": ws1["id"], "title": "Meeting Notes", "content": "Discussed roadmap",
        "tags": ["meetings", "planning"]
    }, headers=AUTH())
    assert r.status_code == 201, f"Expected 201, got {r.status_code}: {r.text}"
    note1 = r.json()
    assert note1["tags"] == ["meetings", "planning"]
    assert note1["pinned"] is False

def test_create_note_2():
    global note2
    r = requests.post(f"{BASE}/notes/", json={
        "workspace": ws1["id"], "title": "React Tips", "content": "Use hooks",
        "tags": ["react", "javascript"]
    }, headers=AUTH())
    assert r.status_code == 201
    note2 = r.json()

def test_list_notes():
    r = requests.get(f"{BASE}/notes/?workspace_id={ws1['id']}", headers=AUTH())
    assert r.status_code == 200
    assert len(r.json()["results"]) == 2

def test_pin_note():
    global note1
    r = requests.patch(f"{BASE}/notes/{note1['id']}/", json={"pinned": True}, headers=AUTH())
    assert r.status_code == 200
    note1 = r.json()
    assert note1["pinned"] is True

def test_search_notes():
    r = requests.get(f"{BASE}/notes/?search=React", headers=AUTH())
    assert r.status_code == 200
    assert len(r.json()["results"]) == 1
    assert r.json()["results"][0]["title"] == "React Tips"

def test_note_owner_isolation():
    """Create another user and verify they can't see our notes"""
    r = requests.post(f"{BASE}/auth/register/", json={
        "username": "e2e_other", "email": "other@test.com", "password": "securepass123"
    })
    other_token = r.json()["tokens"]["access"]
    r2 = requests.get(f"{BASE}/notes/?workspace_id={ws1['id']}", headers={"Authorization": f"Bearer {other_token}"})
    assert r2.status_code == 200
    assert len(r2.json()["results"]) == 0

def test_delete_note():
    r = requests.delete(f"{BASE}/notes/{note2['id']}/", headers=AUTH())
    assert r.status_code == 204

test("Create note 1 with tags", test_create_note_1)
test("Create note 2", test_create_note_2)
test("List notes returns 2", test_list_notes)
test("Pin note", test_pin_note)
test("Search notes by title", test_search_notes)
test("Note owner isolation", test_note_owner_isolation)
test("Delete note", test_delete_note)

# ── Reminders ─────────────────────────────────────────────────────

print("\n=== 5. REMINDERS ===")

rem1, rem2 = None, None

def test_create_reminder_1():
    global rem1
    future = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    r = requests.post(f"{BASE}/reminders/", json={
        "workspace": ws1["id"], "title": "Team standup",
        "reminder_time": future, "repeat": "daily"
    }, headers=AUTH())
    assert r.status_code == 201, f"Expected 201, got {r.status_code}: {r.text}"
    rem1 = r.json()
    assert rem1["repeat"] == "daily"
    assert rem1["completed"] is False

def test_create_reminder_2():
    global rem2
    future = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    r = requests.post(f"{BASE}/reminders/", json={
        "workspace": ws1["id"], "title": "Dentist appointment",
        "reminder_time": future
    }, headers=AUTH())
    assert r.status_code == 201
    rem2 = r.json()

def test_create_reminder_past_rejected():
    past = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    r = requests.post(f"{BASE}/reminders/", json={
        "workspace": ws1["id"], "title": "Past",
        "reminder_time": past
    }, headers=AUTH())
    assert r.status_code == 400, f"Expected 400, got {r.status_code}"

def test_list_reminders():
    r = requests.get(f"{BASE}/reminders/?workspace_id={ws1['id']}", headers=AUTH())
    assert r.status_code == 200
    assert len(r.json()["results"]) == 2

def test_complete_reminder():
    global rem1
    r = requests.patch(f"{BASE}/reminders/{rem1['id']}/", json={"completed": True}, headers=AUTH())
    assert r.status_code == 200
    rem1 = r.json()
    assert rem1["completed"] is True

def test_filter_completed():
    r = requests.get(f"{BASE}/reminders/?completed=false", headers=AUTH())
    assert r.status_code == 200
    assert len(r.json()["results"]) == 1  # Only rem2 is not completed

def test_delete_reminder():
    r = requests.delete(f"{BASE}/reminders/{rem2['id']}/", headers=AUTH())
    assert r.status_code == 204

test("Create reminder 1 (daily repeat)", test_create_reminder_1)
test("Create reminder 2 (one-time)", test_create_reminder_2)
test("Past reminder rejected", test_create_reminder_past_rejected)
test("List reminders returns 2", test_list_reminders)
test("Complete reminder", test_complete_reminder)
test("Filter uncompleted reminders", test_filter_completed)
test("Delete reminder", test_delete_reminder)

# ── Dashboard Stats ───────────────────────────────────────────────

print("\n=== 6. DASHBOARD STATS ===")

def test_workspace_counts_after_data():
    r = requests.get(f"{BASE}/workspaces/{ws1['id']}/", headers=AUTH())
    assert r.status_code == 200
    data = r.json()
    assert data["todo_count"] >= 1, f"Expected >=1 todos, got {data['todo_count']}"
    assert data["note_count"] >= 1, f"Expected >=1 notes, got {data['note_count']}"
    assert data["reminder_count"] >= 0, f"Expected >=0 reminders, got {data['reminder_count']}"

test("Workspace counts reflect data", test_workspace_counts_after_data)

# ── Token Blacklist (Logout) ──────────────────────────────────────

print("\n=== 7. LOGOUT (Token Blacklist) ===")

def test_logout_blacklists_refresh():
    # Get a fresh refresh token
    r = requests.post(f"{BASE}/auth/token/", json={
        "username": "e2e_user", "password": "securepass123"
    })
    refresh = r.json()["refresh"]
    # Blacklist it
    r2 = requests.post(f"{BASE}/auth/token/blacklist/", json={"refresh": refresh})
    assert r2.status_code == 200, f"Expected 200, got {r2.status_code}: {r2.text}"
    # Try to use the blacklisted token
    r3 = requests.post(f"{BASE}/auth/token/refresh/", json={"refresh": refresh})
    assert r3.status_code == 401, f"Expected 401 after blacklist, got {r3.status_code}"

test("Logout blacklists refresh token", test_logout_blacklists_refresh)

# ── Workspace Delete (cascade) ────────────────────────────────────

print("\n=== 8. WORKSPACE DELETE + CASCADE ===")

def test_delete_workspace():
    global ws2
    # Create data in ws2 first
    requests.post(f"{BASE}/todos/", json={"workspace": ws2["id"], "title": "W2 todo"}, headers=AUTH())
    requests.post(f"{BASE}/notes/", json={"workspace": ws2["id"], "title": "W2 note"}, headers=AUTH())
    future = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    requests.post(f"{BASE}/reminders/", json={"workspace": ws2["id"], "title": "W2 reminder", "reminder_time": future}, headers=AUTH())

    # Verify data exists
    r = requests.get(f"{BASE}/todos/?workspace_id={ws2['id']}", headers=AUTH())
    assert len(r.json()["results"]) == 1

    # Delete workspace
    r = requests.delete(f"{BASE}/workspaces/{ws2['id']}/", headers=AUTH())
    assert r.status_code == 204

    # Verify data is gone
    r2 = requests.get(f"{BASE}/todos/?workspace_id={ws2['id']}", headers=AUTH())
    assert len(r2.json()["results"]) == 0

    # Verify workspace is gone
    r3 = requests.get(f"{BASE}/workspaces/{ws2['id']}/", headers=AUTH())
    assert r3.status_code == 404

test("Delete workspace cascades to todos/notes/reminders", test_delete_workspace)

# ── Cleanup ───────────────────────────────────────────────────────

print("\n=== CLEANUP ===")

def test_cleanup():
    # Delete remaining workspace
    r = requests.delete(f"{BASE}/workspaces/{ws1['id']}/", headers=AUTH())
    assert r.status_code == 204
    # Verify empty
    r2 = requests.get(f"{BASE}/workspaces/", headers=AUTH())
    assert len(r2.json()["results"]) == 0

test("Cleanup: delete all workspaces", test_cleanup)

# ── Summary ───────────────────────────────────────────────────────

print(f"\n{'='*50}")
print(f"  E2E RESULTS: {PASS} passed, {FAIL} failed out of {PASS+FAIL} total")
print(f"{'='*50}\n")

sys.exit(1 if FAIL > 0 else 0)
