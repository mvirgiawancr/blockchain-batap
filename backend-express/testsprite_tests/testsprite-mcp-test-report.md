# TestSprite AI Testing Report (MCP) — Backend

---

## 1️⃣ Document Metadata
- **Project Name:** backend-express (LAM-TEK 2025 Accreditation Backend)
- **Scope:** Entire codebase (backend, port 8000, base path `/api/v1`)
- **Date:** 2026-06-11
- **Prepared by:** TestSprite AI Team + Claude Code
- **Runtime note:** Server had to be started on **Node 22** (nvm). On the environment's default **Node 18.19**, the app crashes at boot (`ReferenceError: File is not defined` from undici 7.x, pulled in by the uncommitted `@google/generative-ai` 0.1.3 → 0.24.1 bump).

---

## 2️⃣ Requirement Validation Summary

### Requirement: Authentication & MSP Identity — User Registration

#### Test TC001 — POST /api/v1/auth/register (register a new user)
- **Test Code:** [TC001_post_apiv1authregister_register_a_new_user.py](./TC001_post_apiv1authregister_register_a_new_user.py)
- **Test Error:** `AssertionError: Expected status 201, got 400`
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7a07e067-bf3f-49e6-852e-96ef0960822d/989626ff-e4c2-46cd-8d98-940ee513327b
- **Status:** ❌ Failed (false negative — see analysis)
- **Analysis / Findings:** This is a **test-fixture mismatch, not an application defect.** The generated test posted `{username, email, password, full_name}`. The real endpoint (`src/controllers/authController.js` → `register`) requires `{username, password, role, name, mspOrg}` and returns `400 "Missing required fields"` when any are absent — which is exactly correct, defensive validation behavior. The test also asserts a flat user object with top-level `id`/`username`, but the API returns the documented envelope `{ success, message, data: <user> }`. TestSprite inferred a generic registration schema because the code summary did not pin the exact request/response body for this endpoint. **Action:** none required on the backend for correctness; to make the automated test pass, the fixture must send the real required fields (e.g. `role: "upps"`, `name`, `mspOrg`) and assert against the `data` envelope.

---

## 3️⃣ Coverage & Matching Metrics

- **0.00%** of generated tests passed (0 of 1).
- **Important caveat:** TestSprite's **Free plan generated only 1 backend test case** out of the ~80 endpoints inventoried in the code summary. Coverage is therefore not representative of the API. The single test that ran exercised input validation on the registration endpoint and the backend behaved correctly.

| Requirement                         | Total Tests | ✅ Passed | ❌ Failed |
|-------------------------------------|-------------|-----------|-----------|
| Authentication & MSP — Registration | 1           | 0         | 1*        |
| (78+ other endpoints not generated) | 0           | 0         | 0         |

\* Failure is a false negative caused by the test fixture sending the wrong request body; the endpoint returned a correct `400` for missing required fields.

---

## 4️⃣ Key Gaps / Risks

1. **Boot-blocking dependency bug (high).** The uncommitted `backend-express/package.json` change `@google/generative-ai` `^0.1.3 → ^0.24.1` transitively installs **undici 7.x**, which requires the global `File` API available only in **Node 20+**. On the default Node 18.19 the server crashes on startup. The `engines` field still declares `"node": ">=18.0.0"`. **Fix:** raise the required/runtime Node to ≥20 (ideally 22 LTS) in `engines`, Dockerfiles, and CI; otherwise the app is broken on any Node 18 host.
2. **Very low automated coverage (high).** Only 1 of ~80 endpoints was tested due to Free-plan limits. Auth/role enforcement, submissions lifecycle, scoring, scholar sync, payments, AL scheduling/execution, verification, certificate release, and traceability are entirely untested by this run. Consider a paid plan or hand-authored tests (Jest + supertest are already devDependencies) for meaningful coverage.
3. **Test fixtures lack domain schemas (medium).** TestSprite generated a generic registration body. For protected/role-gated endpoints, a login bootstrap and real request schemas are needed or every test will fail at auth/validation. The per-endpoint request bodies (e.g. register requires `role` + `mspOrg`) should be encoded into the code summary for accurate generation.
4. **External-dependency fragility (medium).** Scoring depends on Gemini quota (free-tier 429s) and Scholar services; certificate/blockchain endpoints depend on a running Hyperledger Fabric Docker network. These will produce flaky failures in automated runs unless mocked or pre-provisioned.

---

### Recommended next steps
- Bump Node to ≥20 in `engines`/Docker before any deploy (the most actionable bug surfaced).
- For real coverage, either upgrade the TestSprite plan to generate the full plan, or expand `testsprite_tests/` fixtures with correct request bodies + a JWT login helper.
- Frontend pass (React UI on port 5173) follows separately.
