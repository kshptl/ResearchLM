# Implementation Plan: Sensecape Exploration App

**Branch**: `001-build-sensecape-app` | **Date**: 2026-03-02 | **Spec**: `/home/kush/researchlm/specs/001-build-sensecape-app/spec.md`
**Input**: Feature specification from `/home/kush/researchlm/specs/001-build-sensecape-app/spec.md`

## Summary

Build a desktop-first Sensecape exploration workspace that combines a three-pane shell, advanced canvas interactions, multilevel hierarchy navigation, local-first durability, and BYOK multi-provider generation in one integrated environment. The implementation approach uses a frontend-first Next.js architecture with `@xyflow/react` interaction primitives, Zustand state slices, normalized IndexedDB persistence, explicit SSE contracts, and constitution-enforced quality/testing/performance gates.

## Technical Context

**Language/Version**: TypeScript 5.6 (strict) on Next.js 15 App Router with React 18  
**Primary Dependencies**: Next.js, React, TailwindCSS, shadcn/ui, `@xyflow/react`, Zustand, Zod, Web Crypto API, Vitest, Playwright  
**Storage**: Browser IndexedDB (normalized workspace/canvas/node/nodeGroup/edge/history/snapshot/backup/conflict/log entities) plus encrypted-at-rest local BYOK credential records  
**Testing**: Vitest (unit/integration/contract), Playwright (e2e and interaction/performance timing scenarios), TypeScript static analysis (`tsc --noEmit`)  
**Target Platform**: Desktop browsers only (v1 editing scope); tablet/mobile editing out of scope  
**Project Type**: Web application (frontend-heavy Next.js app with local API route for streaming)  
**Performance Goals**: p95 node create/edit/move <=200 ms and p95 hierarchy/canvas view switch <=1 s under one active canvas (<=300 nodes, <=500 edges, no import/export); p95 first visible generation content <=5 s when provider responses remain healthy; measurements recorded on declared desktop browser profile with run metadata  
**Constraints**: Manual retry only; retry must preserve unsaved canvas edits/inspector draft/current selection and surface non-blocking failure notices with category/next-action/retry-state fields; auth/permission failures must be surfaced as distinct non-auto-retry categories with direct credential-action affordance; expansion actions must enforce intent-specific output forms and reject empty/repetitive/off-topic/malformed outputs via non-blocking quality notices; generated subtopic candidates must support presented/selected/dismissed/pending lifecycle states with persistence across reload until cleared or expanded; cross-tab last-write-wins must apply deterministic per-entity tie-break ordering and preserve referential integrity, with visible conflict notification that identifies superseded scope and persists until dismissed or replaced; three-pane layout state must persist per workspace with width clamping and center-canvas minimum width guarantees; unsupported viewport sizes must disable editing and show desktop-guidance messaging; backup restore must support partial-restore summaries and recovery-required fallback when active state/snapshots are unreadable; six mandatory node types with distinct icon/color/type-label; WCAG 2.1 AA contrast for node text and key state indicators; deterministic focus order/restoration is required; local structured logs only (no diagnostics panel) with explicit sensitive-field redaction taxonomy; FR-033 uniqueness policy defaults are controlled in `measurement-protocol.md` with no runtime user override in v1, and threshold changes require maintainer-approved spec updates  
**Scale/Scope**: Single-user local-first workspace with multi-session resume and multi-tab concurrency handling; one active dense canvas baseline at 300 nodes/500 edges

### Research Scope and Clarification Resolution

- No unresolved `NEEDS CLARIFICATION` items remain after Phase 0 research.
- Research covered canvas interaction architecture, persistence/conflict strategy, BYOK credential posture, SSE normalization, accessibility/UX consistency, and performance validation.
- Consolidated decisions are captured in `/home/kush/researchlm/specs/001-build-sensecape-app/research.md`.

## Constitution Check (Pre-Phase 0)

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Code Quality**: PASS - Plan enforces lint + formatting check + static analysis + maintainability boundaries (canvas interactions, hierarchy, persistence, generation orchestration separated by module responsibility).
- **Testing Standards**: PASS - Plan requires unit, integration, contract, and e2e coverage for user-critical flows; regression tests required for any fixes.
- **UX Consistency**: PASS - Plan requires three-pane consistency, terminology consistency, keyboard/pointer parity, visible focus, WCAG 2.1 AA contrast, and non-blocking actionable error/retry messaging.
- **Performance Requirements**: PASS - Explicit measurable p95 budgets are defined from spec baseline and tied to automated + manual validation.
- **Evidence Plan**: PASS - Required evidence includes quality gate outputs, test suite outputs, e2e acceptance evidence, p95 timing artifacts (node interactions, hierarchy/canvas switches, first-visible generation), run metadata for reproducible reruns, and requirement-to-task traceability evidence.

**Pre-Phase 0 Gate Result**: PASS

## Phase 0: Outline and Research

### Research Tasks Executed

- Researched advanced graph-canvas architecture for `@xyflow/react` interactions and command-based undo/redo history behavior.
- Researched local-first IndexedDB patterns for normalized graph entities, adaptive snapshots, export/import bundles, and cross-tab LWW conflict handling.
- Researched BYOK security posture for encrypted-at-rest local persistence, revocation/replacement lifecycle, and secret-safe logging.
- Researched normalized SSE contract design across providers with monotonic sequencing and canonical error envelopes.
- Researched accessibility and UX consistency patterns for complex graph editors.
- Researched repeatable browser-based performance validation strategy for dense canvas workloads.

### Research Output

- `/home/kush/researchlm/specs/001-build-sensecape-app/research.md`
- Status: Complete (all technical-context unknowns resolved)

## Phase 1: Design and Contracts

### Data Model Design

- Extracted entities and state transitions from spec into `/home/kush/researchlm/specs/001-build-sensecape-app/data-model.md`.
- Includes validation rules for node types, semantic modes, hierarchy links, command history depth, snapshots/backups, conflict events, generation lifecycle, and credential safety constraints.

### Interface Contracts

- `/home/kush/researchlm/specs/001-build-sensecape-app/contracts/llm-stream.openapi.yaml` defines normalized request/response envelope for streaming generation.
- `/home/kush/researchlm/specs/001-build-sensecape-app/contracts/sse-events.md` defines event taxonomy, ordering rules, and error semantics.
- `/home/kush/researchlm/specs/001-build-sensecape-app/contracts/workspace-ui-contract.md` defines required workspace interaction, layout, accessibility, recovery, and performance contracts.

### Quickstart and Verification Guidance

- `/home/kush/researchlm/specs/001-build-sensecape-app/quickstart.md` provides frontend-first implementation sequence and required verification checklist.

### Agent Context Update

- Ran: `.specify/scripts/bash/update-agent-context.sh opencode`
- Updated: `/home/kush/researchlm/AGENTS.md`

## Constitution Check (Post-Phase 1 Re-evaluation)

- **Code Quality**: PASS - Architecture boundaries, maintainability constraints, and quality gates are explicit in plan/spec/research artifacts.
- **Testing Standards**: PASS - Required test layers are explicitly represented in quickstart/contracts and traceable to user stories.
- **UX Consistency**: PASS - Three-pane behavior, node rendering contract, terminology, keyboard/accessibility requirements, and retry/conflict UX rules are all explicitly defined.
- **Performance Requirements**: PASS - Measurable thresholds and validation strategy are defined with baseline workload assumptions and evidence expectations.
- **Evidence Plan**: PASS - Command and artifact expectations are explicit and review-blocking when missing, including required p95 artifact bundles, measurement metadata, and requirement-to-task traceability mapping.

**Post-Phase 1 Gate Result**: PASS

## Project Structure

### Documentation (this feature)

```text
/home/kush/researchlm/specs/001-build-sensecape-app/
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
|-- feature-notes.md
|-- measurement-protocol.md
|-- traceability.md
|-- contracts/
|   |-- llm-stream.openapi.yaml
|   |-- sse-events.md
|   `-- workspace-ui-contract.md
|-- checklists/
|   |-- requirements-writing.md
|   `-- requirements.md
`-- tasks.md
```

### Source Code (repository root)

```text
/home/kush/researchlm/
|-- app/
|   |-- (workspace)/
|   |   |-- layout.tsx
|   |   `-- page.tsx
|   |-- api/llm/stream/route.ts
|   |-- globals.css
|   `-- layout.tsx
|-- components/
|   `-- workspace/
|       |-- layout/
|       |-- canvas/
|       |-- hierarchy/
|       |-- inspector/
|       |-- persistence/
|       |-- provider-settings/
|       `-- semantic/
|-- features/
|   |-- generation/
|   |-- graph-model/
|   |-- hierarchy-model/
|   |-- persistence/
|   `-- semantic-levels/
|-- lib/
|   |-- auth/
|   |-- idb/
|   |-- logging/
|   |-- providers/
|   `-- sse/
|-- .github/
|   `-- workflows/
`-- tests/
    |-- contract/
    |-- e2e/
    |-- integration/
    |-- unit/
    `-- setup.ts
```

**Structure Decision**: Use a single Next.js web application with modular feature slices and explicit contracts, prioritizing frontend interaction correctness while keeping API streaming and persistence logic isolated.

## Phase 2 Planning Status

- Planning artifacts required for `/speckit.tasks` are present (`plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`).
- Existing task plan file is located at `/home/kush/researchlm/specs/001-build-sensecape-app/tasks.md`.

## Complexity Tracking

No constitution violations require exception handling.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
