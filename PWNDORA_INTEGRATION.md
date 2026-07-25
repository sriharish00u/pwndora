# PWNDORA_INTEGRATION.md — Meridian HR Portal

**PS:** BSCDS26-SODE-02 | **Track:** T-05 SODE

## Purpose

This document describes how Meridian HR Portal integrates into PWNDORA as a commercial, roadmap-ready lab module.

## 1. API Surface

Exposed to the PWNDORA parent platform:

| Endpoint | Method | Consumed By | Purpose |
|---|---|---|---|
| `/api/session/create` | POST | PWNDORA orchestrator | Spins up an isolated learner container instance |
| `/api/progress` | GET | PWNDORA progress-tracker UI | Polled for stage/time/score state |
| `/api/report/generate` | GET | PWNDORA scoring service | Returns final CVSS/report JSON for grade-book ingestion |
| `/api/stage/{n}/hint` | GET | PWNDORA hint widget | Point-costed hints, deducted via shared scoring service |
| `/api/session/destroy` | POST | PWNDORA orchestrator | Tears down the container at session end/timeout |

All endpoints are namespaced per session ID issued by PWNDORA at container creation, preventing cross-learner data leakage.

## 2. UI Embedding

- Meridian HR Portal frontend is designed to render inside PWNDORA's existing lab iframe container, matching the visual chrome used by current PWNDORA web-exploitation labs.
- The stage-progress overlay (Stage 1–4, elapsed time, hints used) is built as a slim top-bar component so it can either run standalone or be replaced by PWNDORA's native progress-tracker component if preferred.
- No external navigation is required — the full 4-stage chain resolves within the iframe.

## 3. Data Storage Requirements

- **Per-session ephemeral store:** stage progress, hint usage, timestamps — held in the lab container's own DB, destroyed on session teardown.
- **Persisted to PWNDORA core (via `/api/report/generate` payload):** final score, per-stage completion time, CVSS-weighted outcome — written to the learner's PWNDORA profile/lab-history table.
- No PII, no real organisational data — all HR records in the lab are synthetic fixtures shipped with the container image.

## 4. Security Considerations

- Each learner session = isolated Docker container/network namespace; no shared state between concurrent learners.
- Stage-gate tokens are signed server-side (JWT) and scoped to the session ID; cannot be replayed across sessions.
- The four vulnerabilities are contained entirely within the sandboxed app — no capability exists for the container to reach real external networks (egress restricted).
- Session containers auto-expire after a configurable timeout to prevent resource exhaustion.

## 5. Commercial / Roadmap Fit

- Slots directly into PWNDORA's existing **web exploitation lab category**, extending it from single-vulnerability challenges to an **advanced multi-stage chaining tier** — positioned for learners preparing for OSCP/PNPT-level engagements.
- Reuses the same container-orchestration and scoring-service contracts as existing PWNDORA labs, meaning no new platform infrastructure is required to integrate — only a new lab image and manifest entry.

