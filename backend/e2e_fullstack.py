"""
E2E Full Stack Test — Starts backend, runs all API tests, verifies proxy if frontend available.
"""
import subprocess
import time
import requests
import sys
import os
from datetime import datetime, timedelta, timezone

PROJECT = r"C:\Users\shara\OneDrive\Dokumente\Default Project"
BACKEND = os.path.join(PROJECT, "backend")
FRONTEND = os.path.join(PROJECT, "frontend")

PASS = 0
FAIL = 0
SERVERS = []

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

TIMEOUT = 30

def start_server(cwd, cmd, label, port, env=None):
    proc = subprocess.Popen(
        cmd, cwd=cwd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, shell=True,
        env=env or {**os.environ}
    )
    SERVERS.append(proc)
    print(f"  Starting {label} on port {port}...")
    for _ in range(20):
        time.sleep(1)
        try:
            requests.get(f"http://127.0.0.1:{port}/", timeout=2)
            print(f"  {label} ready.")
            return proc
        except Exception:
            pass
    # For backend, try a POST (some endpoints don't respond to GET)
    for _ in range(10):
        time.sleep(1)
        try:
            requests.post(f"http://127.0.0.1:{port}/api/auth/token/",
                          json={"x": "x"}, timeout=2)
            print(f"  {label} ready (via POST).")
            return proc
        except Exception:
            pass
    print(f"  WARNING: {label} not responding. Tests will use direct backend only.")
    return proc

# ── Start backend ────────────────────────────────────────────────

print("\n=== STARTING SERVERS ===")
# Ensure clean DB
db_path = os.path.join(BACKEND, "db.sqlite3")
if os.path.exists(db_path):
    os.remove(db_path)
    subprocess.run("python manage.py migrate --run-syncdb", cwd=BACKEND, shell=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
start_server(BACKEND, "python manage.py runserver --noreload 0.0.0.0:8000", "Backend", 8000)
time.sleep(2)

BASE = "http://127.0.0.1:8000/api"
VITE = "http://127.0.0.1:5173"
FRONTEND_AVAILABLE = False

try:
    r = requests.post(f"{BASE}/api/auth/token/", json={"x": "x"}, timeout=2)
    print("  Backend confirmed working.")
except Exception:
    pass

# ── Try frontend (non-blocking) ──────────────────────────────────

print("\n=== 1. FRONTEND ===")

def test_frontend_via_proxy():
    global FRONTEND_AVAILABLE
    try:
        r = requests.get(VITE, timeout=5)
        if r.status_code == 200 and "root" in r.text.lower():
            FRONTEND_AVAILABLE = True
            return
    except Exception:
        pass
    # Try proxy endpoint
    try:
        r = requests.post(f"{VITE}/api/auth/token/",
                          json={"username": "x", "password": "x"}, timeout=5)
        if r.status_code == 401:
            FRONTEND_AVAILABLE = True
            return
    except Exception:
        pass
    raise AssertionError("Frontend not reachable on port 5173")

test("Frontend reachable + proxy works", test_frontend_via_proxy)

if not FRONTEND_AVAILABLE:
    print("  Note: Frontend dev server not running. Running backend-only E2E tests.")
    print("  Start frontend with: cd frontend && npm run dev")

# ── Auth ──────────────────────────────────────────────────────────

print("\n=== 2. AUTH ===")

tokens = {}
other_tokens = {}

def test_register():
    global tokens
    r = requests.post(f"{BASE}/auth/register/", json={
        "username": "e2e_main", "email": "main@test.com", "password": "securepass123"
    }, timeout=TIMEOUT)
    assert r.status_code == 201, f"Expected 201, got {r.status_code}: {r.text}"
    tokens = r.json()["tokens"]

def test_register_other_user():
    global other_tokens
    r = requests.post(f"{BASE}/auth/register/", json={
        "username": "e2e_other", "email": "other@test.com", "password": "securepass123"
    }, timeout=TIMEOUT)
    assert r.status_code == 201
    other_tokens = r.json()["tokens"]

def test_login():
    global tokens
    r = requests.post(f"{BASE}/auth/token/", json={
        "username": "e2e_main", "password": "securepass123"
    }, timeout=TIMEOUT)
    assert r.status_code == 200
    tokens = r.json()

def test_login_wrong():
    r = requests.post(f"{BASE}/auth/token/", json={
        "username": "e2e_main", "password": "wrong"
    }, timeout=TIMEOUT)
    assert r.status_code == 401

def test_profile():
    r = requests.get(f"{BASE}/auth/profile/",
                     headers={"Authorization": f"Bearer {tokens['access']}"}, timeout=TIMEOUT)
    assert r.status_code == 200
    assert r.json()["username"] == "e2e_main"

def test_profile_unauth():
    r = requests.get(f"{BASE}/auth/profile/", timeout=TIMEOUT)
    assert r.status_code == 401

def test_token_refresh():
    r = requests.post(f"{BASE}/auth/token/refresh/",
                      json={"refresh": tokens["refresh"]}, timeout=TIMEOUT)
    assert r.status_code == 200
    tokens["access"] = r.json()["access"]

def test_token_blacklist():
    # Get fresh token
    r = requests.post(f"{BASE}/auth/token/", json={
        "username": "e2e_main", "password": "securepass123"
    }, timeout=TIMEOUT)
    refresh = r.json()["refresh"]
    # Blacklist it
    r2 = requests.post(f"{BASE}/auth/token/blacklist/", json={"refresh": refresh}, timeout=TIMEOUT)
    assert r2.status_code == 200
    # Try to refresh with blacklisted token
    r3 = requests.post(f"{BASE}/auth/token/refresh/", json={"refresh": refresh}, timeout=TIMEOUT)
    assert r3.status_code == 401

AUTH = lambda: {"Authorization": f"Bearer {tokens['access']}"}
OTHER_AUTH = lambda: {"Authorization": f"Bearer {other_tokens['access']}"}

test("Register user 1", test_register)
test("Register user 2", test_register_other_user)
test("Login user 1", test_login)
test("Reject wrong password", test_login_wrong)
test("Get profile", test_profile)
test("Reject unauthenticated profile", test_profile_unauth)
test("Refresh token", test_token_refresh)
test("Blacklist refresh token", test_token_blacklist)

# ── Workspaces ────────────────────────────────────────────────────

print("\n=== 3. WORKSPACES ===")

ws1 = ws2 = None

def test_create_ws1():
    global ws1
    r = requests.post(f"{BASE}/workspaces/", json={
        "name": "Work", "color": "#6366f1", "icon": "briefcase"
    }, headers=AUTH(), timeout=TIMEOUT)
    assert r.status_code == 201
    ws1 = r.json()
    assert ws1["name"] == "Work"

def test_create_ws2():
    global ws2
    r = requests.post(f"{BASE}/workspaces/", json={
        "name": "Personal", "color": "#10b981", "icon": "home"
    }, headers=AUTH(), timeout=TIMEOUT)
    assert r.status_code == 201
    ws2 = r.json()

def test_list_ws():
    r = requests.get(f"{BASE}/workspaces/", headers=AUTH(), timeout=TIMEOUT)
    assert r.status_code == 200
    assert len(r.json()["results"]) == 2

def test_update_ws():
    r = requests.patch(f"{BASE}/workspaces/{ws1['id']}/",
                       json={"name": "Work Updated"}, headers=AUTH(), timeout=TIMEOUT)
    assert r.status_code == 200
    assert r.json()["name"] == "Work Updated"

def test_ws_counts_zero():
    r = requests.get(f"{BASE}/workspaces/{ws1['id']}/", headers=AUTH(), timeout=TIMEOUT)
    d = r.json()
    assert d["todo_count"] == 0 and d["note_count"] == 0 and d["reminder_count"] == 0

def test_ws_owner_only():
    r = requests.get(f"{BASE}/workspaces/{ws1['id']}/", headers=OTHER_AUTH(), timeout=TIMEOUT)
    assert r.status_code == 404

def test_delete_ws():
    r = requests.delete(f"{BASE}/workspaces/{ws2['id']}/", headers=AUTH(), timeout=TIMEOUT)
    assert r.status_code == 204

test("Create workspace 1", test_create_ws1)
test("Create workspace 2", test_create_ws2)
test("List workspaces (2)", test_list_ws)
test("Update workspace", test_update_ws)
test("Initial counts are zero", test_ws_counts_zero)
test("Owner isolation (404 for other user)", test_ws_owner_only)
test("Delete workspace 2", test_delete_ws)

# ── Todos ─────────────────────────────────────────────────────────

print("\n=== 4. TODOS ===")

todo1 = todo2 = None

def test_create_todo1():
    global todo1
    r = requests.post(f"{BASE}/todos/", json={
        "workspace": ws1["id"], "title": "Buy groceries"
    }, headers=AUTH(), timeout=TIMEOUT)
    assert r.status_code == 201
    todo1 = r.json()

def test_create_todo2():
    global todo2
    r = requests.post(f"{BASE}/todos/", json={
        "workspace": ws1["id"], "title": "Write report", "description": "Q3"
    }, headers=AUTH(), timeout=TIMEOUT)
    assert r.status_code == 201
    todo2 = r.json()

def test_list_todos():
    r = requests.get(f"{BASE}/todos/?workspace_id={ws1['id']}", headers=AUTH(), timeout=TIMEOUT)
    assert r.status_code == 200
    assert len(r.json()["results"]) == 2

def test_toggle_on():
    global todo1
    r = requests.post(f"{BASE}/todos/{todo1['id']}/toggle/", headers=AUTH(), timeout=TIMEOUT)
    assert r.status_code == 200
    todo1 = r.json()
    assert todo1["completed"] is True

def test_toggle_off():
    global todo1
    r = requests.post(f"{BASE}/todos/{todo1['id']}/toggle/", headers=AUTH(), timeout=TIMEOUT)
    todo1 = r.json()
    assert todo1["completed"] is False

def test_add_checklist():
    r1 = requests.post(f"{BASE}/todos/{todo1['id']}/checklist/",
                       json={"text": "Milk"}, headers=AUTH(), timeout=TIMEOUT)
    r2 = requests.post(f"{BASE}/todos/{todo1['id']}/checklist/",
                       json={"text": "Eggs"}, headers=AUTH(), timeout=TIMEOUT)
    assert r1.status_code == 201 and r2.status_code == 201

def test_list_checklist():
    r = requests.get(f"{BASE}/todos/{todo1['id']}/checklist/", headers=AUTH(), timeout=TIMEOUT)
    items = r.json()["results"] if "results" in r.json() else r.json()
    assert len(items) == 2

def test_toggle_checklist():
    r = requests.get(f"{BASE}/todos/{todo1['id']}/checklist/", headers=AUTH(), timeout=TIMEOUT)
    items = r.json()["results"] if "results" in r.json() else r.json()
    r2 = requests.patch(f"{BASE}/todos/{todo1['id']}/checklist/{items[0]['id']}/",
                        json={"checked": True}, headers=AUTH(), timeout=TIMEOUT)
    assert r2.json()["checked"] is True

def test_todo_progress():
    r = requests.get(f"{BASE}/todos/{todo1['id']}/", headers=AUTH(), timeout=TIMEOUT)
    assert r.json()["progress"] == 50

def test_delete_todo():
    requests.delete(f"{BASE}/todos/{todo2['id']}/", headers=AUTH(), timeout=TIMEOUT)
    r = requests.get(f"{BASE}/todos/?workspace_id={ws1['id']}", headers=AUTH(), timeout=TIMEOUT)
    assert len(r.json()["results"]) == 1

def test_todo_owner_isolation():
    r = requests.get(f"{BASE}/todos/?workspace_id={ws1['id']}", headers=OTHER_AUTH(), timeout=TIMEOUT)
    assert len(r.json()["results"]) == 0

test("Create todo 1", test_create_todo1)
test("Create todo 2", test_create_todo2)
test("List todos (2)", test_list_todos)
test("Toggle on", test_toggle_on)
test("Toggle off", test_toggle_off)
test("Add 2 checklist items", test_add_checklist)
test("List checklist (2)", test_list_checklist)
test("Toggle checklist item", test_toggle_checklist)
test("Progress = 50%", test_todo_progress)
test("Delete todo", test_delete_todo)
test("Todo owner isolation", test_todo_owner_isolation)

# ── Notes ─────────────────────────────────────────────────────────

print("\n=== 5. NOTES ===")

note1 = note2 = None

def test_create_note1():
    global note1
    r = requests.post(f"{BASE}/notes/", json={
        "workspace": ws1["id"], "title": "Meeting Notes", "content": "Roadmap",
        "tags": ["meetings", "planning"]
    }, headers=AUTH(), timeout=TIMEOUT)
    assert r.status_code == 201
    note1 = r.json()
    assert note1["tags"] == ["meetings", "planning"]

def test_create_note2():
    global note2
    r = requests.post(f"{BASE}/notes/", json={
        "workspace": ws1["id"], "title": "React Tips", "content": "Use hooks",
        "tags": ["react", "javascript"]
    }, headers=AUTH(), timeout=TIMEOUT)
    assert r.status_code == 201
    note2 = r.json()

def test_list_notes():
    r = requests.get(f"{BASE}/notes/?workspace_id={ws1['id']}", headers=AUTH(), timeout=TIMEOUT)
    assert len(r.json()["results"]) == 2

def test_pin_note():
    global note1
    r = requests.patch(f"{BASE}/notes/{note1['id']}/",
                       json={"pinned": True}, headers=AUTH(), timeout=TIMEOUT)
    note1 = r.json()
    assert note1["pinned"] is True

def test_unpin_note():
    global note1
    r = requests.patch(f"{BASE}/notes/{note1['id']}/",
                       json={"pinned": False}, headers=AUTH(), timeout=TIMEOUT)
    note1 = r.json()
    assert note1["pinned"] is False

def test_search_notes():
    r = requests.get(f"{BASE}/notes/?search=React", headers=AUTH(), timeout=TIMEOUT)
    assert len(r.json()["results"]) == 1
    assert r.json()["results"][0]["title"] == "React Tips"

def test_note_owner_isolation():
    r = requests.get(f"{BASE}/notes/?workspace_id={ws1['id']}", headers=OTHER_AUTH(), timeout=TIMEOUT)
    assert len(r.json()["results"]) == 0

def test_delete_note():
    requests.delete(f"{BASE}/notes/{note2['id']}/", headers=AUTH(), timeout=TIMEOUT)
    r = requests.get(f"{BASE}/notes/?workspace_id={ws1['id']}", headers=AUTH(), timeout=TIMEOUT)
    assert len(r.json()["results"]) == 1

test("Create note 1 with tags", test_create_note1)
test("Create note 2 with tags", test_create_note2)
test("List notes (2)", test_list_notes)
test("Pin note", test_pin_note)
test("Unpin note", test_unpin_note)
test("Search by title", test_search_notes)
test("Note owner isolation", test_note_owner_isolation)
test("Delete note", test_delete_note)

# ── Reminders ─────────────────────────────────────────────────────

print("\n=== 6. REMINDERS ===")

rem1 = rem2 = None

def test_create_rem1():
    global rem1
    future = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    r = requests.post(f"{BASE}/reminders/", json={
        "workspace": ws1["id"], "title": "Standup",
        "reminder_time": future, "repeat": "daily"
    }, headers=AUTH(), timeout=TIMEOUT)
    assert r.status_code == 201
    rem1 = r.json()
    assert rem1["repeat"] == "daily"

def test_create_rem2():
    global rem2
    future = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    r = requests.post(f"{BASE}/reminders/", json={
        "workspace": ws1["id"], "title": "Dentist",
        "reminder_time": future, "repeat": "none"
    }, headers=AUTH(), timeout=TIMEOUT)
    assert r.status_code == 201
    rem2 = r.json()

def test_past_rejected():
    past = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    r = requests.post(f"{BASE}/reminders/", json={
        "workspace": ws1["id"], "title": "Past",
        "reminder_time": past
    }, headers=AUTH(), timeout=TIMEOUT)
    assert r.status_code == 400

def test_list_reminders():
    r = requests.get(f"{BASE}/reminders/?workspace_id={ws1['id']}", headers=AUTH(), timeout=TIMEOUT)
    assert len(r.json()["results"]) == 2

def test_complete_reminder():
    global rem1
    r = requests.patch(f"{BASE}/reminders/{rem1['id']}/",
                       json={"completed": True}, headers=AUTH(), timeout=TIMEOUT)
    rem1 = r.json()
    assert rem1["completed"] is True

def test_filter_uncompleted():
    r = requests.get(f"{BASE}/reminders/?completed=false", headers=AUTH(), timeout=TIMEOUT)
    assert len(r.json()["results"]) == 1

def test_delete_reminder():
    requests.delete(f"{BASE}/reminders/{rem2['id']}/", headers=AUTH(), timeout=TIMEOUT)
    r = requests.get(f"{BASE}/reminders/?workspace_id={ws1['id']}", headers=AUTH(), timeout=TIMEOUT)
    assert len(r.json()["results"]) == 1

def test_reminder_owner_isolation():
    r = requests.get(f"{BASE}/reminders/?workspace_id={ws1['id']}", headers=OTHER_AUTH(), timeout=TIMEOUT)
    assert len(r.json()["results"]) == 0

test("Create reminder 1 (daily)", test_create_rem1)
test("Create reminder 2 (none)", test_create_rem2)
test("Reject past reminder", test_past_rejected)
test("List reminders (2)", test_list_reminders)
test("Complete reminder", test_complete_reminder)
test("Filter uncompleted (1)", test_filter_uncompleted)
test("Delete reminder", test_delete_reminder)
test("Reminder owner isolation", test_reminder_owner_isolation)

# ── Dashboard stats ───────────────────────────────────────────────

print("\n=== 7. DASHBOARD STATS ===")

def test_workspace_stats():
    r = requests.get(f"{BASE}/workspaces/{ws1['id']}/", headers=AUTH(), timeout=TIMEOUT)
    d = r.json()
    assert d["todo_count"] >= 1
    assert d["note_count"] >= 1
    assert d["reminder_count"] >= 0

test("Workspace counts reflect data", test_workspace_stats)

# ── Cascade delete ────────────────────────────────────────────────

print("\n=== 8. CASCADE DELETE ===")

def test_cascade():
    # Refresh token first
    r = requests.post(f"{BASE}/auth/token/refresh/", json={"refresh": tokens["refresh"]}, timeout=TIMEOUT)
    if r.status_code == 200:
        tokens["access"] = r.json()["access"]

    # Create a temp workspace with data
    r = requests.post(f"{BASE}/workspaces/", json={"name": "Temp"}, headers=AUTH(), timeout=TIMEOUT)
    assert r.status_code == 201, f"Create temp ws failed: {r.status_code} {r.text}"
    tmp = r.json()
    r = requests.post(f"{BASE}/todos/", json={"workspace": tmp["id"], "title": "Tmp Todo"}, headers=AUTH(), timeout=TIMEOUT)
    assert r.status_code == 201, f"Create todo failed: {r.status_code} {r.text}"
    r = requests.post(f"{BASE}/notes/", json={"workspace": tmp["id"], "title": "Tmp Note"}, headers=AUTH(), timeout=TIMEOUT)
    assert r.status_code == 201, f"Create note failed: {r.status_code} {r.text}"
    future = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    r = requests.post(f"{BASE}/reminders/", json={
        "workspace": tmp["id"], "title": "Tmp Rem", "reminder_time": future
    }, headers=AUTH(), timeout=TIMEOUT)
    assert r.status_code == 201, f"Create reminder failed: {r.status_code} {r.text}"

    # Verify data exists
    todo_count = len(requests.get(f"{BASE}/todos/?workspace_id={tmp['id']}", headers=AUTH(), timeout=TIMEOUT).json()["results"])
    note_count = len(requests.get(f"{BASE}/notes/?workspace_id={tmp['id']}", headers=AUTH(), timeout=TIMEOUT).json()["results"])
    rem_count = len(requests.get(f"{BASE}/reminders/?workspace_id={tmp['id']}", headers=AUTH(), timeout=TIMEOUT).json()["results"])
    assert todo_count == 1, f"Expected 1 todo, got {todo_count}"
    assert note_count == 1, f"Expected 1 note, got {note_count}"
    assert rem_count == 1, f"Expected 1 reminder, got {rem_count}"

    # Delete workspace
    r = requests.delete(f"{BASE}/workspaces/{tmp['id']}/", headers=AUTH(), timeout=TIMEOUT)
    assert r.status_code == 204

    # Verify all gone
    todo_count2 = len(requests.get(f"{BASE}/todos/?workspace_id={tmp['id']}", headers=AUTH(), timeout=TIMEOUT).json()["results"])
    note_count2 = len(requests.get(f"{BASE}/notes/?workspace_id={tmp['id']}", headers=AUTH(), timeout=TIMEOUT).json()["results"])
    rem_count2 = len(requests.get(f"{BASE}/reminders/?workspace_id={tmp['id']}", headers=AUTH(), timeout=TIMEOUT).json()["results"])
    ws_status = requests.get(f"{BASE}/workspaces/{tmp['id']}/", headers=AUTH(), timeout=TIMEOUT).status_code
    assert todo_count2 == 0, f"Expected 0 todos after delete, got {todo_count2}"
    assert note_count2 == 0, f"Expected 0 notes after delete, got {note_count2}"
    assert rem_count2 == 0, f"Expected 0 reminders after delete, got {rem_count2}"
    assert ws_status == 404, f"Expected workspace 404, got {ws_status}"

test("Delete workspace cascades all data", test_cascade)

# ── Cleanup ───────────────────────────────────────────────────────

print("\n=== 9. CLEANUP ===")

def test_cleanup():
    r = requests.get(f"{BASE}/workspaces/", headers=AUTH(), timeout=TIMEOUT)
    for ws in r.json()["results"]:
        requests.delete(f"{BASE}/workspaces/{ws['id']}/", headers=AUTH(), timeout=TIMEOUT)
    r2 = requests.get(f"{BASE}/workspaces/", headers=AUTH(), timeout=TIMEOUT)
    assert len(r2.json()["results"]) == 0

test("Delete all workspaces", test_cleanup)

# ── Summary ───────────────────────────────────────────────────────

print(f"\n{'='*50}")
print(f"  E2E RESULTS: {PASS} passed, {FAIL} failed out of {PASS+FAIL}")
print(f"{'='*50}\n")

# Cleanup
for p in SERVERS:
    try: p.terminate()
    except: pass

sys.exit(1 if FAIL > 0 else 0)
