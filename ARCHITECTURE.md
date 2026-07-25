# ARCHITECTURE.md — Meridian HR Portal

**PS:** BSCDS26-SODE-02 | **Track:** T-05 SODE

## 1. System Design Diagram

```
┌─────────────────────┐        ┌──────────────────────────┐
│   Learner Browser    │──────▶│   Meridian HR Frontend     │
│  (PWNDORA embedded   │◀──────│   (React, port <XXXX>)     │
│   iframe/tab)         │        └────────────┬──────────────┘
└─────────────────────┘                     │ REST/JSON
                                              ▼
                              ┌──────────────────────────────┐
                              │     API Layer (Express/…)     │
                              │  - Auth routes                │
                              │  - Stage routes               │
                              │  - Report generator            │
                              └───────┬───────────┬──────────┘
                                      │             │
                        ┌─────────────▼───┐   ┌────▼─────────────┐
                        │ Stage-Gate Engine │   │  Database          │
                        │ (server-side only)│   │ (fake HR records,  │
                        │ validates tokens/  │   │  users, docs)       │
                        │ credentials per    │   └────────────────────┘
                        │ stage transition)  │
                        └────────────────────┘
```

## 2. Component Interaction Map

| Component | Responsibility | Talks To |
|---|---|---|
| Frontend (React) | Renders HR portal UI, progress overlay, hint UI | API Layer |
| API Layer | Handles auth, injection-vulnerable search/query endpoints, SSRF-vulnerable integration endpoint, privilege-escalation endpoint | Stage-Gate Engine, DB |
| Stage-Gate Engine | Issues/validates stage tokens; rejects any attempt to reach Stage N without proof of Stage N-1 completion | API Layer, DB |
| Database | Stores fake employee records, credentials, documents, session/progress state | API Layer |
| Report Generator | Compiles CVSS scores, chaining narrative, remediation into final report | API Layer, DB |

## 3. Data Flow — Per Stage

1. **Stage 1 (Auth/Authz flaw):** Learner exploits the flaw at `/api/auth/...` → receives a credential/token artifact.
2. **Stage 2 (Injection):** Learner submits the Stage 1 artifact to unlock the injection-vulnerable endpoint → extracts a second artifact (e.g. internal doc ID or hash).
3. **Stage 3 (SSRF/XXE/Path Traversal):** The Stage 2 artifact is required to reach the internal-facing endpoint → learner pivots to an internal resource, retrieving a privileged token.
4. **Stage 4 (Privilege Escalation/Exfiltration):** The privileged token from Stage 3 grants access to the admin/exfil endpoint → full compromise confirmed.

Every transition is checked against server-stored state (`stage_progress` table/collection), never against anything the client claims.

## 4. PWNDORA Integration Points

- **Embedding:** Meridian HR Portal runs as an isolated Docker container per learner session, reverse-proxied into the PWNDORA lab iframe, consistent with existing PWNDORA web-exploitation labs (Command Injection, IDOR, Session Fixation, Auth Bypass).
- **Progress sync:** `/api/progress` is polled by the PWNDORA parent shell to drive the existing PWNDORA progress-tracker UI.
- **Scoring sync:** Final report JSON (`/api/report/generate`) is designed to map directly onto PWNDORA's existing lab-completion and scoring schema.
- **Hint system:** Point deductions call back into PWNDORA's shared scoring service via the same interface used by other PWNDORA labs (see `PWNDORA_INTEGRATION.md`).

## 5. Security-by-Design Notes

- All stage-gate logic is server-side; the four intentional vulnerabilities are the *only* vulnerabilities — everything else (session handling, container isolation, rate limiting) is hardened.
- Each learner session runs in an isolated container/network namespace to prevent cross-learner interference.
- Synthetic data only — no real employee or organisational data is used anywhere in the lab.
