# Meridian HR Portal — Vulnerability Chain Exploitation Lab

**Track:** T-05 SODE — SOC & Offensive Detection Engineering
**Problem Statement:** BSCDS26-SODE-02 — Vulnerability Chain Exploitation Lab — Multi-Stage Web Attack Module for PWNDORA
**Team:** <TEAM NAME>
**Members:** <NAME 1>, <NAME 2>, <NAME 3>, <NAME 4>

---

## 1. Overview

Meridian HR Portal is a deliberately vulnerable, fully containerised, fictional enterprise HR web application built as a PWNDORA training lab. Learners must chain **exactly 4 vulnerabilities in sequence** to achieve full compromise, with every stage gated and validated server-side.

| Stage | Vulnerability Class | Category |
|---|---|---|
| 1 | <e.g. Broken Authentication / IDOR> | Authentication / Authorization |
| 2 | <e.g. SQL Injection> | Injection |
| 3 | <e.g. SSRF / XXE / Path Traversal> | Server-Side Vulnerability |
| 4 | <e.g. Privilege Escalation via token reuse> | Privilege Escalation / Data Exfiltration |

Full technical detail, CVSS scores, and ATT&CK mappings: see `VULNERABILITY_CHAIN.md`.

## 2. Tech Stack

- **Frontend:** <React / etc.>
- **Backend:** <Node.js/Express / Python / PHP>
- **Database:** <MongoDB / PostgreSQL / MySQL>
- **Containerisation:** Docker, docker-compose
- **Auth:** <JWT / session-based>

## 3. Architecture Overview

See `ARCHITECTURE.md` for the full system diagram and data flow. In short:

```
Learner Browser → Reverse Proxy → Meridian HR App (frontend + API) → DB
                                        ↓
                              Stage-Gate Validation Service
```

Stage gates are enforced entirely server-side; no stage token or unlock state is trusted from the client.

## 4. Setup Instructions

### Prerequisites
- Docker & Docker Compose installed
- Ports `<XXXX>` (frontend) and `<YYYY>` (API) free

### Launch

```bash
git clone <repo-url>
cd meridian-hr-portal
docker-compose up --build
```

The app will be available at `http://localhost:<PORT>`.

### Environment Variables

Copy `.env.example` to `.env` before launch:

```bash
cp .env.example .env
```

| Variable | Description | Default |
|---|---|---|
| `JWT_SECRET` | Signing secret for stage-gate tokens | auto-generated |
| `DB_URI` | Database connection string | provided in compose |
| `HINT_COST` | Points deducted per hint | 10 |

## 5. API Documentation

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/auth/login` | POST | Stage 1 entry point |
| `/api/stage/{n}/validate` | POST | Server-side stage-gate check |
| `/api/stage/{n}/hint` | GET | Point-costed hint (max 3/stage) |
| `/api/progress` | GET | Returns current stage, elapsed time, score |
| `/api/report/generate` | GET | Generates the post-completion pentest report |

Full request/response schemas: see `API.md` (if included) or inline OpenAPI comments in `/server/routes`.

## 6. Known Limitations

- <e.g. Single-session only, no multi-tenant isolation between learners yet>
- <e.g. Hint system does not yet support partial hints>
- <e.g. Report export is JSON only, no PDF in this build>

## 7. Judge Test Instructions

1. Run `docker-compose up --build` — full stack must launch with this single command.
2. Navigate to `http://localhost:<PORT>`.
3. Attempt Stage 1 as described in `VULNERABILITY_CHAIN.md`.
4. **Stage-gate bypass test:** attempt to directly call `/api/stage/2/validate` without completing Stage 1 — this must be rejected (`403`).
5. Complete all 4 stages in sequence.
6. Call `/api/report/generate` and confirm the pentest report renders with CVSS scores, chaining narrative, and remediation per finding.

## 8. Repository Structure

```
/client          → React frontend
/server          → API + stage-gate engine
/server/routes    → endpoint definitions
/data            → synthetic fake employee/HR data
docker-compose.yml
README.md
ARCHITECTURE.md
PWNDORA_INTEGRATION.md
VULNERABILITY_CHAIN.md
```
