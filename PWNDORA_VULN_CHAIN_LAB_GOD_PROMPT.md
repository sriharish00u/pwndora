# Vulnerability Chain Exploitation Lab — Master Build Prompt
### PWNDORA Advanced Module — Hackathon Build (Multi-Stage Web Attack Chain)

This is a different shape of project than the 20-feature enterprise roadmap: it's one bounded, judged deliverable with a hard spec and a demo deadline. So instead of 20 milestones, this is **9 core milestones + 1 stretch milestone**, sized to actually finish in hackathon time, with every judging criterion mapped to a concrete Definition of Done.

---

## 0. How to Use This

1. Paste **Section 1 (Global Contract)** once per session — it doesn't change.
2. Paste the **one milestone** you're on from Section 3.
3. Do not start Stage 2's vulnerability until Stage 1's gate is proven unbypassable in a real test, not just "should work." Judges will specifically try to skip stages — build like they already are.
4. M9 (containerization) is not a nice-to-have at the end — verify `docker-compose up` works after *every* milestone, not just once at the end. A lab that only runs on your machine on demo day is a failed demo.

---

## 1. Global Contract

You are building a **deliberately vulnerable, sandboxed, fictional enterprise web application** (HR portal / document management / inventory system — pick one and commit) for a security-training CTF. This is legitimate defensive/educational security tooling for PWNDORA, a cyber-range platform.

**Non-negotiable rules:**
- Exactly **4 vulnerabilities**, one from each required category, exploited **in sequence**:
  1. Authentication / Authorization flaw
  2. Injection vulnerability
  3. Server-side vulnerability (SSRF, XXE, or Path Traversal — pick one)
  4. Privilege escalation or data exfiltration mechanism
- Every vulnerability must be **intentional**. No accidental infrastructure flaws, no incidental extra holes — if you notice an unplanned vulnerability while building, close it (this is the one place in this whole project where "fix the vulnerability" is correct — anything *not* on the 4-item list is a bug, not content).
- The app must look and behave like real enterprise software: realistic fake employee data, consistent business logic, consistent hostname/IP conventions. No "hint: this is vulnerable" styling, no obviously fake placeholder content.
- Stage gating is **server-enforced only**. Assume every client-side control (hidden fields, disabled buttons, JS checks, URL params) will be manipulated or bypassed by the judge. Stage N must be technically unreachable without the credential/token Stage N-1 actually yields — not just hidden from the UI.
- The chain must be a **technically logical pentest narrative** — each stage's output should be the realistic input a real attacker would use next (e.g., IDOR leaks an internal API key → key enables a SQLi-exposed admin search → admin context enables SSRF into an internal metadata endpoint → SSRF response yields a token that unlocks privileged data export). Pick your own concrete chain, but it must hold together end to end.
- Sandbox discipline: the app runs fully in Docker, isolated from host and from PWNDORA's other labs. Nothing in this lab should be able to reach outside its own container network — including the SSRF stage, which must target a fake internal service inside the sandbox, never the real host or internet.

---

## 2. Milestone Execution Protocol

**Step 1 — Design check.** Before coding a stage, state: what vulnerability, what OWASP Top 10 category, what MITRE ATT&CK technique ID, what CVSS v3.1 base score (compute it, don't guess), and what exact artifact (credential, token, file, session) it hands to the next stage.

**Step 2 — Build.** Implement only this milestone.

**Step 3 — Bypass test.** Actively try to break your own gate: replay old sessions, forge tokens, hit the Stage N+1 endpoint directly without Stage N's artifact, tamper with client-side state. If any of these succeed, the milestone is not done.

**Step 4 — Container check.** `docker-compose up` from a clean state, walk the full chain built so far manually.

**Step 5 — DoD check** against the milestone's list below.

---

## 3. Milestones

### M1 — Application Foundation & Realism
**Build:** The fictional corporate app shell — pick HR portal, document management, or inventory system. Realistic company name, employee roster (fake but consistent), internal branding, plausible business workflows (leave requests, document approvals, stock records — whatever fits your pick). Consistent internal hostname/IP scheme (e.g. `hr.northbridge-corp.local`, `10.20.30.x` internal range) used everywhere from here on.
**DoD:** A judge clicking around before any exploitation would believe this is a real internal enterprise tool, not a CTF box. No placeholder Lorem Ipsum, no "TODO" text, no dev-only UI left in.

### M2 — Stage 1: Authentication / Authorization Flaw
**Build:** e.g. IDOR, broken access control, JWT flaw, or auth bypass — your choice, but it must yield a concrete artifact (an internal user's session, an API key, an admin username) that Stage 2 needs.
**DoD:** Exploitable only through realistic interaction with the app (not an obvious debug endpoint). Yields exactly the artifact Stage 2 consumes. OWASP category, MITRE T-code, and CVSS v3.1 score documented.

### M3 — Stage 2: Injection Vulnerability
**Build:** SQLi, NoSQLi, command injection, or template injection — gated so it's only reachable/useful with Stage 1's artifact (e.g. the injectable field is behind an authenticated internal search, or the artifact from Stage 1 is the parameter that's injectable).
**DoD:** Injection is exploitable and yields Stage 3's required artifact (e.g. an internal service URL, a stored SSRF-target config, an elevated token). Documented per M2's standard. Confirmed unreachable/non-functional without Stage 1's artifact.

### M4 — Stage 3: Server-Side Vulnerability (SSRF / XXE / Path Traversal — pick one)
**Build:** Must target something inside the sandboxed container network only (a fake internal metadata service, an internal-only admin API, a local file that yields Stage 4's artifact). Never allow it to reach the real host or the open internet.
**DoD:** Confirmed sandbox-contained (test by trying to make it reach outside the Docker network — it must fail). Yields Stage 4's artifact. Only reachable using Stage 2's output. Documented.

### M5 — Stage 4: Privilege Escalation or Data Exfiltration
**Build:** The full-compromise finale — admin takeover, sensitive data dump, or equivalent, using Stage 3's artifact as the key.
**DoD:** Achieving this stage constitutes "full compromise" in a way a judge will recognize immediately (e.g., admin dashboard access, exfiltrated employee PII/payroll data). Documented. Confirmed unreachable without Stage 3's artifact.

### M6 — Stage Gate Hardening (cross-cutting — do this after all 4 stages exist)
**Build:** Re-attack your own chain end-to-end specifically trying to skip stages: hit Stage 3/4 endpoints directly with guessed/forged tokens, replay captured Stage 1 artifacts after they should be invalidated, race-condition the gate checks, tamper with any client-stored state.
**DoD:** Every stage-skip attempt fails server-side with an appropriate response (not a stack trace leaking info). This is the single most heavily judged criterion ("judges will attempt to skip Stage 2") — do not skip this milestone or rush it.

### M7 — Progress Tracker & Hint System
**Build:** Overlay showing Stage 1–4 status and time elapsed. Hint system: max 3 hints per stage, point-costed, **server-enforced** (hint count and score deduction tracked server-side, not in browser state).
**DoD:** Hints can't be farmed by refreshing/resetting client state. Score deduction is accurate and persists correctly. Progress overlay reflects real server-side stage state, not optimistic client state.

### M8 — Pentest Report Generator
**Build:** Post-completion report: CVSS score per vulnerability, impact analysis, chaining narrative (how Stage 1's artifact enabled Stage 2, and so on), remediation per finding.
**DoD:** Report is professionally structured (this is a judged criterion on its own), technically accurate to what was actually built in M2–M5, and generates correctly for a learner who just completed the chain.

### M9 — Full Containerization
**Build:** `docker-compose.yml` that launches the entire environment — app, any internal fake services used by Stage 3, database, report generator — from a clean checkout with one command.
**DoD:** `docker-compose up` on a fresh machine (or fresh container state) produces a fully working lab with no manual setup steps. Run this check again right before the demo, not just once during development.

### M10 — Stretch: Defensive Code Review Mode
**Build (only after M1–M9 are solid):** Post-exploitation view of the vulnerable source for each stage, with learners asked to identify the vulnerable lines and propose a fix.
**DoD:** Source shown is the real code that was actually exploited (not a simplified stand-in). Correct fixes are validatable (even a simple exact/pattern match against known-good remediation is fine for hackathon scope).

---

## 4. Judging Criteria → Milestone Map

| Judging Criterion | Where it's proven |
|---|---|
| Chain logical validity & vulnerability accuracy | M2–M5 design-check step, M8 narrative |
| Stage gate robustness (skip attempts) | M6 |
| Application realism | M1 |
| Working PoC demo | M9 (must run clean on demo day) |
| Pentest report quality | M8 |

---

## 5. Documentation Standard (apply to every vulnerability in M2–M5)

For each of the 4 vulnerabilities, record: OWASP Top 10 category, MITRE ATT&CK technique ID, CVSS v3.1 base score with the vector string (not just the number), and the exact artifact it produces for the next stage. This feeds directly into M8's report generator — build it as you go, don't leave it for the end.

