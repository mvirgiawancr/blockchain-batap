# TestSprite AI Testing Report (MCP) — Frontend

---

## 1️⃣ Document Metadata
- **Project Name:** frontend (LAM-TEK 2025 React UI)
- **Scope:** Entire codebase (frontend, Vite dev server on port 3000, proxying `/api` to backend :8000)
- **Date:** 2026-06-11
- **Prepared by:** TestSprite AI Team + Claude Code
- **Outcome:** Test plan **generated (29 cases)**; automated **execution blocked** by an environment networking limitation (see section 4). No test results were produced.

---

## 2️⃣ Requirement Validation Summary

The frontend test plan was successfully generated with **29 test cases** across 8 requirement groups. Execution could not run because TestSprite's browser-automation tunnel could not establish on this machine (details in section 4). The planned coverage was:

| Requirement Group                 | Planned Cases | Example Scenarios |
|-----------------------------------|---------------|-------------------|
| User Login                        | 4             | Login reaches correct role dashboard; inline error on invalid credentials |
| Role-Based Protected Navigation   | 5             | Unauthenticated user redirected to sign-in; stay on sign-in after bad login |
| Public Traceability Search/Lookup | 6             | Search published certificate; open blockchain history; empty-state for no matches |
| User Registration                 | 4             | Register with valid details; block/validate when required fields missing |
| Submissions Management            | 4             | View submissions list; open a submission; empty state |
| Notifications Center              | 4             | View notifications; mark one/all read; empty state |
| Assessor Workflow                 | 3             | Reach assignments page; open assignment detail and start assessment; view history |
| Certificate Release               | 1             | Open certificate release and publish a submission |

- **Status:** Not executed (environment-blocked). All 29 cases remain available in `testsprite_frontend_test_plan.json` for a future run.

---

## 3️⃣ Coverage & Matching Metrics

- **Test plan generation:** OK — 29 cases (vs. backend's 1 — the frontend planner was far more productive on the Free plan).
- **Execution:** 0 of 29 run (blocked before browser launch).
- **App reachability (verified manually):** the Vite app responds **HTTP 200** on `http://127.0.0.1:3000` from both WSL and the Windows host. Seed login (`admin` / `password123`) returns a valid JWT. So the application itself is up and functional — the blocker is purely TestSprite's tunnel transport.

---

## 4️⃣ Key Gaps / Risks

1. **Execution blocker — broken IPv6 egress + TestSprite tunnel (environment, high).** TestSprite runs the browser in its cloud and reaches the local app through a local **tunnel client** (Node). On this machine, every outbound target the tunnel needs (`cf.browser-use.com`, `fonts.googleapis.com`, `accounts.google.com`) times out after 10 s, while plain IPv4 `curl` to the same hosts succeeds in <0.2 s. Diagnosis: the host has **no working IPv6 egress** (`curl -6` fails instantly; `curl -4` works), and the tunnel/Node stack prefers IPv6. The tunnel therefore never establishes, so the cloud-side `checkPortListening` for `localhost:3000` also fails. Attempted mitigations that did **not** resolve it: rebinding Vite to IPv6 (`--host ::`), forcing `NODE_OPTIONS=--dns-result-order=ipv4first`, and pinning `localEndpoint` to `127.0.0.1`. The tunnel library appears to bypass Node's resolver. **This is not an application defect.**
   - **Remediation options (environment-level, user decision):**
     - Restore working **IPv6 egress** on the host/router, or disable IPv6 system-wide and prefer IPv4 (Windows `prefixpolicies`), then re-run.
     - Switch **WSL2 to mirrored networking** (`.wslconfig` -> `[wsl2] networkingMode=mirrored`, then `wsl --shutdown`) so the app and tunnel share a clean localhost (note: this restarts WSL and will stop the running backend/Vite).
     - Run the app **natively on Windows** (or run the TestSprite MCP from inside the same Linux/WSL where the app runs) so the tunnel's localhost path avoids the WSL2/Windows IPv6 boundary.
2. **Register page hardcodes a dev-only URL (medium, real code issue found during analysis).** `src/pages/Register.jsx` posts to `http://localhost:3000/api/v1/auth/register` and relies on the Vite dev proxy. In a production build served without that proxy (e.g. nginx), registration will hit the wrong origin and fail. Use the same `import.meta.env.VITE_API_URL` base the other pages use.
3. **Backend register contract mismatch (medium).** The register form must send `{username, password, role, name, mspOrg}`; the backend returns `400` otherwise. Ensure the form collects and submits `role` and `mspOrg`, or registration silently fails for users.

---

### Recommended next steps
- Choose one remediation in section 4.1 and re-run: the plan is already generated, so only `testsprite_generate_code_and_execute` needs to re-run (no new credits for planning).
- Fix the hardcoded Register URL (section 4.2) — low effort, prevents a production registration outage.
