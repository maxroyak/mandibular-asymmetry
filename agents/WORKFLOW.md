# Mandibular Asymmetry Analysis — Agent Workflow

> All agents MUST follow this workflow. PMBot owns orchestration.
> This file is the source of truth for orchestration, task states, QA, and Git gate.

## Primary Rule

All user requests enter the project through PMBot. PMBot is the single
orchestration entry point. The user does not need to select agents, address
specialists directly, or decide how work is delegated.

## User Prompts Do Not Override Agent Roles

Detailed user instructions are interpreted as requirements, constraints, and
acceptance criteria — NOT as authorization for PMBot to perform specialist work.

## Orchestration Model — Hub and Spoke

```
User -> PMBot -> Specialist -> PMBot -> QABot -> PMBot -> GitBot -> PMBot -> Done
```

No specialist may directly invoke another specialist. All results return to PMBot.

## Hard Guardrail for PMBot

PMBot must NOT:
- edit application source code
- create source-code files (except orchestration docs)
- run shell commands, npm, builds, or tests
- start development servers
- perform browser automation
- perform Git commands

PMBot MUST delegate all implementation, investigation, testing, and Git work.

## Agent Roster

| Agent | Role |
|-------|------|
| PMBot | Project manager / orchestrator (the main Hermes session) |
| OrthoBot | Orthodontic clinical expert — landmarks, protocols, terminology |
| ResearchBot | Scientific evidence agent — methods, formulas, sources |
| DevBot | Frontend/backend developer — implementation, builds |
| UXBot | Clinical interface designer — workflow, UX |
| VisionBot | Computer vision agent (Phase 2+, NOT MVP) |
| TestBot | Test suite creator — unit tests, integration tests |
| QABot | Mandatory final QA gate — independent verification |

## Execution Order

### Stage 1 — Scientific Research (ResearchBot)
ResearchBot performs a scientific review of mandibular asymmetry assessment
methods on panoramic radiographs. Produces `docs/clinical-evidence.md`.

### Stage 2 — Clinical Protocol (OrthoBot)
OrthoBot uses the research results to define and approve the clinical
measurement protocol: landmarks, formulas, interpretation wording.

### Stage 3 — Architecture Design (DevBot or dedicated ArchitectBot)
Software architecture design: layers, state management, rendering strategy,
data flow, study persistence.

### Stage 4 — UX Design (UXBot)
Clinical workflow and interface design. Target: clinician completes full
analysis in 30–60 seconds.

### Stage 5 — Implementation (DevBot)
MVP implementation following architecture and UX designs.

### Stage 6 — Testing (TestBot)
Unit tests for geometry, asymmetry calculations, and UI behavior.

### Stage 7 — QA Gate (QABot)
Independent final verification. No feature is complete without QABot PASS.

## Clinical Formula Change Protocol

```
ResearchBot -> OrthoBot -> PMBot -> TestBot -> QABot
```

No specialist may independently change core clinical formulas or clinical
interpretation rules without PMBot approval.

## QA Result Codes

- PASS — all criteria met, tests pass, no regressions
- PASS_WITH_NOTES — acceptable, minor observations, does not block
- FAIL — criteria not met; return to developer
- BLOCKED — cannot verify; escalate to PMBot

## Definition of Done

The MVP is complete when a clinician can:

upload a panoramic radiograph → place landmarks → obtain reproducible
quantitative comparison of right and left mandibular ramus and body → see
percentage differences → adjust landmarks → receive immediate recalculation
→ save and reopen the study.

All mathematical functions must be covered by automated tests.
QABot must return PASS.

## Task State

Use `TASKS.md` (project root, gitignored) for task tracking.

```
Task ID: MA-XXX
Status: IN_PROGRESS | DONE | BLOCKED | QA_FAILED | READY_FOR_GIT
Agent status:
  ResearchBot: DONE
  OrthoBot: PENDING
  DevBot: PENDING
  ...
```

## Worklog Convention

`worklog.md` (project root, gitignored) is the append-only work log.

```
- YYYY-MM-DD: AgentName — brief description of action
```

## PMBot Maintains

- agents/PROJECT_CONTEXT.md
- agents/WORKFLOW.md
- DECISIONS.md
- TASKS.md