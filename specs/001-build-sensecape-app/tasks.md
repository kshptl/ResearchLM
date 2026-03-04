# Tasks: Sensecape Exploration App

**Input**: Design documents from `/home/kush/researchlm/specs/001-build-sensecape-app/`
**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Include test tasks by default. User stories include unit, integration, and e2e coverage; contract tests are required for external or cross-boundary interfaces (streaming/API/UI contracts).

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Constitution Check (Task List)

- **Code Quality**: PASS - quality gates and maintainability tasks are explicitly present (`T001`, `T003`, `T127`, `T132`).
- **Testing Standards**: PASS - unit/integration/e2e coverage appears per story, with contract tests for cross-boundary interfaces (`T033`, `T034`, `T119`, `T120`).
- **UX Consistency**: PASS - accessibility, focus order/restoration, terminology, and messaging coverage is explicitly planned (`T124`, `T125`, `T142`, `T149`).
- **Performance Requirements**: PASS - p95 budget checks and evidence capture tasks are explicitly present (`T121`, `T122`, `T123`, `T128`, `T143`).
- **Visual Quality**: PASS - deterministic visual-regression coverage, baseline governance, and rubric-evidence tasks are explicitly planned (`T152`-`T169`).
- **Evidence Plan**: PASS - traceability, verification artifact, and visual rubric-evidence tasks are explicitly present (`T131`, `T138`, `T144`, `T145`, `T169`).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Task can run in parallel (different files, no unfinished dependency)
- **[Story]**: User story label (`[US1]`, `[US2]`, `[US3]`, `[US4]`)
- Every task includes an exact absolute file path

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize project tooling, quality gates, and desktop workspace shell scaffolding.

- [X] T001 Update dependency and script gates (`format:check`, `typecheck`) in `/home/kush/researchlm/package.json`
- [X] T002 Configure strict TypeScript compiler and module resolution defaults in `/home/kush/researchlm/tsconfig.json`
- [X] T003 Configure lint rules for app/features/lib/tests boundaries in `/home/kush/researchlm/.eslintrc.json`
- [X] T004 [P] Configure Playwright desktop projects and tracing defaults in `/home/kush/researchlm/playwright.config.ts`
- [X] T005 [P] Configure Vitest environment, setup hooks, and include patterns in `/home/kush/researchlm/vitest.config.ts`
- [X] T006 [P] Define workspace/node visual design tokens with AA-safe contrasts in `/home/kush/researchlm/app/globals.css`
- [X] T007 [P] Scaffold workspace shell container component in `/home/kush/researchlm/components/workspace/layout/workspace-shell.tsx`
- [X] T008 [P] Add desktop-only guard, editing disablement, and persistent desktop-guidance messaging in `/home/kush/researchlm/app/(workspace)/layout.tsx`
- [X] T009 [P] Add seeded workspace graph fixtures for repeatable tests in `/home/kush/researchlm/tests/helpers/workspace-fixtures.ts`
- [X] T010 [P] Add interaction timing helper utilities for performance assertions in `/home/kush/researchlm/tests/helpers/performance-metrics.ts`
- [X] T011 Add constitution quality gate checklist items to verification guidance in `/home/kush/researchlm/specs/001-build-sensecape-app/quickstart.md`
- [X] T012 Create feature divergence notes baseline in `/home/kush/researchlm/specs/001-build-sensecape-app/feature-notes.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement shared domain/state/persistence/streaming foundations required by all user stories.

**CRITICAL**: Complete this phase before any user story implementation.

- [X] T013 Define normalized Workspace/Canvas/Node/Edge/NodeGroup schemas in `/home/kush/researchlm/features/graph-model/types.ts`
- [X] T014 [P] Define generation request/attempt domain types in `/home/kush/researchlm/features/generation/types.ts`
- [X] T015 [P] Implement workspace store slices (persisted, ephemeral, inspector draft) with pane-layout persistence and width clamping in `/home/kush/researchlm/features/graph-model/workspace-store.ts`
- [X] T016 [P] Implement interaction mode state machine (`select`,`pan`,`connect`,`lasso`) in `/home/kush/researchlm/features/graph-model/interaction-mode.ts`
- [X] T017 [P] Implement multi-select and lasso selection state utilities in `/home/kush/researchlm/features/graph-model/selection-state.ts`
- [X] T018 [P] Implement command history engine with >=100 action depth guarantees in `/home/kush/researchlm/features/graph-model/history-engine.ts`
- [X] T019 [P] Implement keyboard shortcut command mapping for core actions in `/home/kush/researchlm/features/graph-model/keyboard-shortcuts.ts`
- [X] T020 [P] Implement node/edge/group mutation helpers with invariants in `/home/kush/researchlm/features/graph-model/mutations.ts`
- [X] T021 [P] Implement IndexedDB schema versioning and store registration in `/home/kush/researchlm/lib/idb/database.ts`
- [X] T022 [P] Implement IndexedDB transactional helpers for normalized entities in `/home/kush/researchlm/lib/idb/transactions.ts`
- [X] T023 Implement persistence repository API for workspace graph entities in `/home/kush/researchlm/features/persistence/repository.ts`
- [X] T024 Implement workspace hydration/save orchestration hooks in `/home/kush/researchlm/features/persistence/workspace-persistence-service.ts`
- [X] T025 [P] Implement backup manifest serialization primitives in `/home/kush/researchlm/features/persistence/workspace-backup.ts`
- [X] T026 [P] Implement encrypted credential persistence and lifecycle model in `/home/kush/researchlm/lib/auth/credential-store.ts`
- [X] T027 Implement BYOK policy preflight and consumer-token rejection checks in `/home/kush/researchlm/lib/auth/byok-policy.ts`
- [X] T028 [P] Implement SSE event codecs with monotonic sequence assertions in `/home/kush/researchlm/lib/sse/events.ts`
- [X] T029 [P] Implement canonical streaming error envelope mapping in `/home/kush/researchlm/lib/sse/error-envelope.ts`
- [X] T030 Implement provider adapter registry and capability routing in `/home/kush/researchlm/lib/providers/registry.ts`
- [X] T031 Implement stream route request validation and adapter invocation baseline in `/home/kush/researchlm/app/api/llm/stream/route.ts`
- [X] T032 Add foundational state/persistence invariant tests (including pane-layout clamp invariants) in `/home/kush/researchlm/tests/unit/graph-model/foundation-invariants.test.ts`

**Checkpoint**: Foundation complete. User stories can start.

---

## Phase 3: User Story 1 - Explore Topics on a Canvas (Priority: P1)

**Goal**: Deliver advanced canvas exploration, generation expansion, extraction, retry continuity, node visuals, and history panel behavior.

**Independent Test**: From a blank workspace, create and edit nodes, link by edges, use lasso/multi-select/minimap/history panel, run expansion actions, retry manually without losing unsaved context, and extract highlighted text into new nodes.

### Tests for User Story 1

- [X] T033 [P] [US1] Add contract test for stream request/response schema in `/home/kush/researchlm/tests/contract/llm-stream.contract.test.ts`
- [X] T034 [P] [US1] Add contract test for SSE event ordering and terminal semantics in `/home/kush/researchlm/tests/contract/sse-events.contract.test.ts`
- [X] T035 [P] [US1] Add unit tests for node/edge/group operations in `/home/kush/researchlm/tests/unit/graph-model/canvas-operations.test.ts`
- [X] T036 [P] [US1] Add unit tests for interaction mode transition guards in `/home/kush/researchlm/tests/unit/graph-model/interaction-mode.test.ts`
- [X] T037 [P] [US1] Add unit tests for lasso and multi-select state behavior in `/home/kush/researchlm/tests/unit/graph-model/selection-state.test.ts`
- [X] T038 [P] [US1] Add unit tests for undo/redo depth and cursor stepping in `/home/kush/researchlm/tests/unit/graph-model/history-engine.test.ts`
- [X] T039 [P] [US1] Add unit tests for text extraction provenance and span-bound constraints in `/home/kush/researchlm/tests/unit/graph-model/text-extraction.test.ts`
- [X] T040 [P] [US1] Add unit tests for why/what/when/where/how question balancing in `/home/kush/researchlm/tests/unit/generation/question-balance.test.ts`
- [X] T041 [P] [US1] Add integration test for generation expansion flow on canvas, including FR-033 quality-notice actions (retry, change-action, dismiss), in `/home/kush/researchlm/tests/integration/workspace/generation-flow.test.tsx`
- [X] T042 [P] [US1] Add integration test for manual retry preserving unsaved context in `/home/kush/researchlm/tests/integration/workspace/retry-preserves-context.test.tsx`
- [X] T043 [P] [US1] Add integration test for lasso/minimap/history-panel interactions in `/home/kush/researchlm/tests/integration/workspace/canvas-advanced-interactions.test.tsx`
- [X] T044 [US1] Add e2e acceptance for advanced canvas exploration journey in `/home/kush/researchlm/tests/e2e/us1-canvas-exploration.spec.ts`
- [X] T045 [US1] Add e2e keyboard-only core action flow in `/home/kush/researchlm/tests/e2e/us1-keyboard-canvas-flow.spec.ts`

### Implementation for User Story 1

- [X] T046 [P] [US1] Compose three-pane workspace route entry in `/home/kush/researchlm/app/(workspace)/page.tsx`
- [X] T047 [P] [US1] Implement pan/zoom/multi-select/lasso/minimap behavior in `/home/kush/researchlm/components/workspace/canvas/canvas-board.tsx`
- [X] T048 [P] [US1] Implement six-node-type visual contract rendering in `/home/kush/researchlm/components/workspace/canvas/node-card.tsx`
- [X] T049 [P] [US1] Implement expansion actions UI (prompt/explain/questions/subtopics) with intent-specific output affordances in `/home/kush/researchlm/components/workspace/canvas/expand-actions.tsx`
- [X] T050 [P] [US1] Implement history panel component for undo/redo timeline in `/home/kush/researchlm/components/workspace/canvas/history-panel.tsx`
- [X] T051 [P] [US1] Implement inspector panel with editable draft state in `/home/kush/researchlm/components/workspace/inspector/inspector-panel.tsx`
- [X] T052 [US1] Implement command transaction batching for graph mutations in `/home/kush/researchlm/features/graph-model/mutations.ts`
- [X] T053 [US1] Implement highlight-to-node extraction command flow with explicit short/long span rejection messaging in `/home/kush/researchlm/features/graph-model/text-extraction.ts`
- [X] T054 [US1] Implement interaction controller bridging pointer/keyboard to commands in `/home/kush/researchlm/features/graph-model/interaction-controller.ts`
- [X] T055 [US1] Implement node visual token and contrast validation helpers in `/home/kush/researchlm/features/graph-model/node-visual-contract.ts`
- [X] T056 [US1] Implement generation orchestration for all expansion intents with inline output-shape validators aligned to FR-003/FR-033 in `/home/kush/researchlm/features/generation/use-generation.ts`
- [X] T057 [US1] Implement generation stream consumer for incremental node updates with empty/repetitive/off-topic/malformed quality handling and retry/change-action/dismiss notices in `/home/kush/researchlm/features/generation/stream-consumer.ts`
- [X] T058 [US1] Implement manual retry context preservation snapshots in `/home/kush/researchlm/features/generation/retry-context.ts`
- [X] T059 [US1] Implement balanced-question post-processing validator in `/home/kush/researchlm/features/generation/question-balance.ts`
- [X] T060 [US1] Implement normalized SSE event emission in `/home/kush/researchlm/app/api/llm/stream/route.ts`
- [X] T061 [P] [US1] Implement OpenAI streaming adapter mapper in `/home/kush/researchlm/lib/providers/openai/adapter.ts`
- [X] T062 [P] [US1] Implement Anthropic streaming adapter mapper in `/home/kush/researchlm/lib/providers/anthropic/adapter.ts`
- [X] T063 [P] [US1] Implement Gemini streaming adapter mapper in `/home/kush/researchlm/lib/providers/gemini/adapter.ts`
- [X] T064 [P] [US1] Implement OpenRouter streaming adapter mapper in `/home/kush/researchlm/lib/providers/openrouter/adapter.ts`
- [X] T065 [P] [US1] Implement GitHub Models streaming adapter mapper in `/home/kush/researchlm/lib/providers/github-models/adapter.ts`
- [X] T066 [US1] Persist generation request/attempt entities and local generation logs in `/home/kush/researchlm/features/persistence/repository.ts`

**Checkpoint**: US1 is independently functional and demoable as MVP.

---

## Phase 4: User Story 2 - Build Multilevel Hierarchies (Priority: P2)

**Goal**: Deliver hierarchy authoring/navigation, semantic dive expansion, and candidate-based child canvas creation.

**Independent Test**: Create broad/sibling/subtopic canvases, run semantic dive from a node, select generated subtopic candidates for expansion, and navigate across hierarchy/canvas while preserving context.

### Tests for User Story 2

- [X] T067 [P] [US2] Add unit tests for hierarchy invariants and cycle prevention in `/home/kush/researchlm/tests/unit/hierarchy-model/hierarchy-rules.test.ts`
- [X] T068 [P] [US2] Add unit tests for semantic dive child-canvas creation and repeated-dive reuse behavior in `/home/kush/researchlm/tests/unit/hierarchy-model/semantic-dive.test.ts`
- [X] T069 [P] [US2] Add unit tests for branch delete safety with active descendants in `/home/kush/researchlm/tests/unit/hierarchy-model/branch-delete.test.ts`
- [X] T070 [P] [US2] Add integration test for hierarchy/canvas navigation synchronization in `/home/kush/researchlm/tests/integration/workspace/hierarchy-navigation.test.tsx`
- [X] T071 [P] [US2] Add integration test for generated subtopic candidate selection and dismiss/persist lifecycle flow in `/home/kush/researchlm/tests/integration/workspace/generated-subtopic-selection.test.tsx`
- [X] T072 [P] [US2] Add integration test for portal-node navigation behavior in `/home/kush/researchlm/tests/integration/workspace/portal-navigation.test.tsx`
- [X] T073 [US2] Add e2e acceptance for multilevel hierarchy workflow in `/home/kush/researchlm/tests/e2e/us2-hierarchy-navigation.spec.ts`

### Implementation for User Story 2

- [X] T074 [P] [US2] Implement hierarchy view rendering with depth and active state in `/home/kush/researchlm/components/workspace/hierarchy/hierarchy-view.tsx`
- [X] T075 [P] [US2] Implement hierarchy controls for broad/sibling/subtopic creation in `/home/kush/researchlm/components/workspace/hierarchy/hierarchy-controls.tsx`
- [X] T076 [P] [US2] Implement generated subtopic candidate picker UI with presented/selected/dismissed/pending lifecycle states in `/home/kush/researchlm/components/workspace/hierarchy/subtopic-candidate-picker.tsx`
- [X] T077 [US2] Implement hierarchy reducers/selectors for links and canvas tree in `/home/kush/researchlm/features/hierarchy-model/state.ts`
- [X] T078 [US2] Implement semantic dive command and child canvas materialization with default reuse and duplicate-link prevention in `/home/kush/researchlm/features/hierarchy-model/semantic-dive.ts`
- [X] T079 [US2] Implement hierarchy and canvas navigation synchronization in `/home/kush/researchlm/features/hierarchy-model/navigation.ts`
- [X] T080 [US2] Implement safe branch deletion and reroute behavior in `/home/kush/researchlm/features/hierarchy-model/branch-delete.ts`
- [X] T081 [US2] Implement portal-node creation coupled to hierarchy links in `/home/kush/researchlm/features/graph-model/portal-node.ts`
- [X] T082 [US2] Persist hierarchy links and generated subtopic candidates including lifecycle state across reload in `/home/kush/researchlm/features/persistence/repository.ts`
- [X] T083 [US2] Add hierarchy transition timing instrumentation in `/home/kush/researchlm/features/hierarchy-model/perf-metrics.ts`

**Checkpoint**: US2 is independently functional and testable.

---

## Phase 5: User Story 3 - Manage Information Overload (Priority: P3)

**Goal**: Deliver semantic detail modes with zoom-aware automatic transitions and manual override persistence.

**Independent Test**: On a dense canvas, zoom-driven semantic abstraction changes content detail automatically, manual semantic selection overrides auto mode, and settings persist per canvas.

### Tests for User Story 3

- [X] T084 [P] [US3] Add unit tests for semantic representation derivation logic in `/home/kush/researchlm/tests/unit/semantic-levels/semantic-logic.test.ts`
- [X] T085 [P] [US3] Add unit tests for semantic breakpoint and override precedence in `/home/kush/researchlm/tests/unit/semantic-levels/breakpoints.test.ts`
- [X] T086 [P] [US3] Add integration test for auto semantic transitions on zoom in `/home/kush/researchlm/tests/integration/workspace/semantic-zoom-auto.test.tsx`
- [X] T087 [P] [US3] Add integration test for manual semantic selection persistence in `/home/kush/researchlm/tests/integration/workspace/semantic-manual-persistence.test.tsx`
- [X] T088 [P] [US3] Add integration test for semantic view restoration after reload in `/home/kush/researchlm/tests/integration/persistence/semantic-view-resume.test.tsx`
- [X] T089 [US3] Add e2e acceptance for semantic-level workflow in `/home/kush/researchlm/tests/e2e/us3-semantic-levels.spec.ts`

### Implementation for User Story 3

- [X] T090 [P] [US3] Implement semantic transforms (full/lines/summary/keywords) in `/home/kush/researchlm/features/semantic-levels/representation.ts`
- [X] T091 [P] [US3] Implement semantic mode state (auto/manual + breakpoints) in `/home/kush/researchlm/features/semantic-levels/state.ts`
- [X] T092 [P] [US3] Implement semantic level selector interactions in `/home/kush/researchlm/components/workspace/semantic/semantic-level-selector.tsx`
- [X] T093 [US3] Integrate semantic projection rendering into node UI in `/home/kush/researchlm/components/workspace/canvas/node-card.tsx`
- [X] T094 [US3] Persist per-canvas semantic settings in `/home/kush/researchlm/features/persistence/semantic-view-repository.ts`
- [X] T095 [US3] Synchronize semantic controls with inspector selection context in `/home/kush/researchlm/components/workspace/inspector/inspector-panel.tsx`
- [X] T096 [US3] Add semantic zoom legend and mode badge in `/home/kush/researchlm/components/workspace/canvas/semantic-legend.tsx`
- [X] T097 [US3] Emit semantic-state lifecycle logs in `/home/kush/researchlm/features/persistence/workspace-persistence-service.ts`

**Checkpoint**: US3 is independently functional and testable.

---

## Phase 6: User Story 4 - Preserve and Resume Sensemaking (Priority: P3)

**Goal**: Deliver durable local persistence, backup recovery, cross-tab conflict handling, and BYOK credential continuity.

**Independent Test**: Reopen a saved workspace with structure intact, recover via export/import, observe visible conflict notification on cross-tab supersession, and continue generation using encrypted-at-rest provider credentials.

### Tests for User Story 4

- [X] T098 [P] [US4] Add unit tests for hydration and schema migration behavior in `/home/kush/researchlm/tests/unit/persistence/workspace-hydration.test.ts`
- [X] T099 [P] [US4] Add unit tests for adaptive snapshot trigger policy in `/home/kush/researchlm/tests/unit/persistence/snapshot-policy.test.ts`
- [X] T100 [P] [US4] Add unit tests for backup manifest checksum validation in `/home/kush/researchlm/tests/unit/persistence/backup-validation.test.ts`
- [X] T101 [P] [US4] Add unit tests for cross-tab LWW conflict ordering with deterministic per-entity tie-break behavior in `/home/kush/researchlm/tests/unit/persistence/conflict-ordering.test.ts`
- [X] T102 [P] [US4] Add unit tests for encrypted credential lifecycle transitions and request-gating outcomes in `/home/kush/researchlm/tests/unit/persistence/credential-lifecycle.test.ts`
- [X] T103 [P] [US4] Add integration test for autosave and resume flow in `/home/kush/researchlm/tests/integration/persistence/workspace-resume.test.tsx`
- [X] T104 [P] [US4] Add integration test for export/import recovery fidelity in `/home/kush/researchlm/tests/integration/persistence/workspace-backup-restore.test.tsx`
- [X] T105 [P] [US4] Add integration test for visible conflict notification rendering in `/home/kush/researchlm/tests/integration/persistence/cross-tab-conflict-notice.test.tsx`
- [X] T106 [US4] Add e2e acceptance for resume/backup/conflict journey in `/home/kush/researchlm/tests/e2e/us4-session-resume.spec.ts`

### Implementation for User Story 4

- [X] T107 [P] [US4] Implement adaptive snapshot scheduling and snapshot persistence in `/home/kush/researchlm/features/persistence/workspace-persistence-service.ts`
- [X] T108 [P] [US4] Implement backup export bundle creation with checksums in `/home/kush/researchlm/features/persistence/workspace-backup.ts`
- [X] T109 [P] [US4] Implement backup import validation and transactional restore in `/home/kush/researchlm/features/persistence/workspace-backup.ts`
- [X] T110 [P] [US4] Implement cross-tab channel and LWW reconciliation flow with per-entity deterministic tie-break and referential-integrity preservation in `/home/kush/researchlm/features/persistence/cross-tab-sync.ts`
- [X] T111 [P] [US4] Implement conflict event persistence and deduplication in `/home/kush/researchlm/features/persistence/conflict-events.ts`
- [X] T112 [US4] Implement workspace conflict notice component in `/home/kush/researchlm/components/workspace/persistence/conflict-notice.tsx`
- [X] T113 [US4] Implement recovery actions UI (snapshot/export/import) in `/home/kush/researchlm/components/workspace/provider-settings/persistence-status.tsx`
- [X] T114 [US4] Implement credential save/replace/revoke UX flows in `/home/kush/researchlm/components/workspace/provider-settings/provider-credentials-form.tsx`
- [X] T115 [US4] Enforce credential preflight before adapter dispatch with explicit `auth`/`permission` categorization and no auto-retry in `/home/kush/researchlm/app/api/llm/stream/route.ts`
- [X] T116 [US4] Persist retry attempt context (selection + inspector draft refs) in `/home/kush/researchlm/features/persistence/repository.ts`
- [X] T117 [US4] Emit structured local logs for generation/persistence/conflict domains using FR-019 prohibited-field redaction baseline in `/home/kush/researchlm/features/persistence/workspace-persistence-service.ts`
- [X] T118 [US4] Validate actionable non-blocking conflict/retry copy in `/home/kush/researchlm/components/workspace/persistence/conflict-notice.tsx`

**Checkpoint**: US4 is independently functional and testable.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final compliance hardening for contracts, accessibility, performance budgets, and release evidence.

- [X] T119 [P] Add workspace UI contract regression tests in `/home/kush/researchlm/tests/contract/workspace-ui.contract.test.tsx`
- [X] T120 [P] Add retry context and error-taxonomy contract tests in `/home/kush/researchlm/tests/contract/llm-stream-retry.contract.test.ts`
- [X] T121 [P] Add p95 node interaction budget integration test in `/home/kush/researchlm/tests/integration/performance/node-interaction-budget.test.ts`
- [X] T122 [P] Add p95 hierarchy/canvas switch budget integration test in `/home/kush/researchlm/tests/integration/performance/view-switch-budget.test.ts`
- [X] T123 [P] Add generation first-visible-content budget integration test in `/home/kush/researchlm/tests/integration/performance/generation-latency-budget.test.ts`
- [X] T124 [P] Add e2e accessibility test for deterministic pane focus order in `/home/kush/researchlm/tests/e2e/a11y-pane-focus-order.spec.ts`
- [X] T125 Add integration test for WCAG AA node label/state contrast checks in `/home/kush/researchlm/tests/integration/workspace/node-contrast-aa.test.tsx`
- [X] T126 Add integration regression for non-blocking editability during retry in `/home/kush/researchlm/tests/integration/workspace/retry-nonblocking-editing.test.tsx`
- [X] T127 Add CI workflow for lint/format/typecheck/test/build/e2e gates in `/home/kush/researchlm/.github/workflows/quality-gates.yml`
- [X] T128 Add CI workflow for performance gate execution and artifact upload in `/home/kush/researchlm/.github/workflows/performance-gates.yml`
- [X] T129 Update quickstart with final verification commands and evidence checklist in `/home/kush/researchlm/specs/001-build-sensecape-app/quickstart.md`
- [X] T130 Update feature notes with documented interaction-model divergences in `/home/kush/researchlm/specs/001-build-sensecape-app/feature-notes.md`
- [X] T131 Record full verification run outputs in `/home/kush/researchlm/specs/001-build-sensecape-app/checklists/requirements.md`
- [X] T132 Add constitution compliance sign-off checklist for review in `/home/kush/researchlm/specs/001-build-sensecape-app/checklists/requirements.md`
- [X] T133 [P] Define generation failure notice contract fields in `/home/kush/researchlm/features/generation/failure-notice-contract.ts`
- [X] T134 [P] Define conflict-notice lifecycle policy (persist/dismiss/replace) in `/home/kush/researchlm/features/persistence/conflict-notice-policy.ts`
- [X] T135 [P] Add integration test for non-blocking generation failure notice fields in `/home/kush/researchlm/tests/integration/workspace/generation-failure-notice.test.tsx`
- [X] T136 [P] Add integration test for partial backup restore summary semantics in `/home/kush/researchlm/tests/integration/persistence/partial-restore-summary.test.tsx`
- [X] T137 Add e2e recovery-required fallback flow for unreadable workspace state in `/home/kush/researchlm/tests/e2e/us4-recovery-required.spec.ts`
- [X] T138 Add SC-004/SC-005 evaluation protocol (participant sampling, baseline method, and analysis steps) in `/home/kush/researchlm/specs/001-build-sensecape-app/measurement-protocol.md`
- [X] T139 [P] Add unit tests for pane-layout persistence and width bounds in `/home/kush/researchlm/tests/unit/graph-model/pane-layout-state.test.ts`
- [X] T140 [P] Add integration test for credential revocation/replacement effects on new, in-flight, and retry requests in `/home/kush/researchlm/tests/integration/workspace/credential-lifecycle-generation.test.tsx`
- [X] T141 [P] Add integration test for auth/permission-specific failure notices and credential-action routing in `/home/kush/researchlm/tests/integration/workspace/auth-failure-routing.test.tsx`
- [X] T142 [P] Add integration accessibility test for focus restoration after modal/popover/panel closure in `/home/kush/researchlm/tests/integration/workspace/focus-restoration.test.tsx`
- [X] T143 Update measurement protocol with performance run metadata schema, FR-033 item-based uniqueness ratio formulas/defaults, and policy ownership/change-control rules in `/home/kush/researchlm/specs/001-build-sensecape-app/measurement-protocol.md`
- [X] T144 [P] Add requirement-to-task traceability matrix mapping FR/NFR IDs to task IDs in `/home/kush/researchlm/specs/001-build-sensecape-app/traceability.md`
- [X] T145 Add traceability completeness check (all FR/NFR mapped) to review checklist in `/home/kush/researchlm/specs/001-build-sensecape-app/checklists/requirements.md`
- [X] T146 [P] Consolidate existing expansion output validators into a shared output-form and quality-validation contract module in `/home/kush/researchlm/features/generation/output-contract.ts`
- [X] T147 Add unit tests for shared expansion output quality guards (empty/repetitive/off-topic/malformed) and notice action handling (retry/change-action/dismiss) in `/home/kush/researchlm/tests/unit/generation/output-quality-guard.test.ts`
- [X] T148 [P] Add integration test for generated-subtopic candidate lifecycle persistence across reload in `/home/kush/researchlm/tests/integration/workspace/subtopic-candidate-lifecycle.test.tsx`
- [X] T149 [P] Add integration test for unsupported viewport editing-disable and guidance messaging in `/home/kush/researchlm/tests/integration/workspace/unsupported-viewport-guidance.test.tsx`
- [X] T150 Extract a shared structured-log redaction taxonomy policy and migrate log emitters to it in `/home/kush/researchlm/lib/logging/redaction-policy.ts`
- [X] T151 Add unit tests for shared structured-log redaction prohibited-field handling in `/home/kush/researchlm/tests/unit/persistence/log-redaction-policy.test.ts`

---

## Phase 8: Visual Quality & Aesthetic Validation

**Purpose**: Enforce deterministic visual regression and design-quality sign-off across all FR and User Story UI states.

- [X] T152 [P] Define visual regression contract (viewports, required states, masking, thresholds, baseline governance) in `/home/kush/researchlm/specs/001-build-sensecape-app/contracts/visual-regression-contract.md`
- [X] T153 [P] Define visual design-review rubric and approval template in `/home/kush/researchlm/specs/001-build-sensecape-app/checklists/visual-review.md`
- [X] T154 [P] Add deterministic visual test helpers in `/home/kush/researchlm/tests/e2e/visual/visual-test-helpers.ts`
- [X] T155 Configure Playwright visual snapshot conventions in `/home/kush/researchlm/playwright.config.ts`
- [X] T156 Add visual scripts (`test:visual`, `test:visual:update`) in `/home/kush/researchlm/package.json`
- [X] T157 [US1] Add US1 visual regression coverage in `/home/kush/researchlm/tests/e2e/visual/us1-visual.spec.ts`
- [X] T158 [US2] Add US2 visual regression coverage in `/home/kush/researchlm/tests/e2e/visual/us2-visual.spec.ts`
- [X] T159 [US3] Add US3 visual regression coverage in `/home/kush/researchlm/tests/e2e/visual/us3-visual.spec.ts`
- [X] T160 [US4] Add US4 visual regression coverage in `/home/kush/researchlm/tests/e2e/visual/us4-visual.spec.ts`
- [X] T161 Add FR/US visual coverage matrix with test IDs and baseline references in `/home/kush/researchlm/specs/001-build-sensecape-app/visual-coverage-matrix.md`
- [X] T162 Update requirement traceability with visual mappings in `/home/kush/researchlm/specs/001-build-sensecape-app/traceability.md`
- [X] T163 Add merge-blocking visual CI workflow with diff artifact upload in `/home/kush/researchlm/.github/workflows/visual-gates.yml`
- [X] T164 Update quickstart with visual runbook/baseline update protocol in `/home/kush/researchlm/specs/001-build-sensecape-app/quickstart.md`
- [X] T165 Add visual gate and sign-off checklist items in `/home/kush/researchlm/specs/001-build-sensecape-app/checklists/requirements.md`
- [X] T166 [P] Implement visual coverage completeness validator for FR/US -> VS mappings and artifact references in `/home/kush/researchlm/scripts/validate-visual-coverage.mjs`
- [X] T167 Add visual coverage validation step to merge-blocking visual CI workflow in `/home/kush/researchlm/.github/workflows/visual-gates.yml`
- [X] T168 Add release checklist gate requiring successful visual coverage validation and approved baseline-change metadata in `/home/kush/researchlm/specs/001-build-sensecape-app/checklists/requirements.md`
- [X] T169 Add release-candidate visual rubric scoring evidence capture and artifact recording in `/home/kush/researchlm/specs/001-build-sensecape-app/checklists/visual-review.md`

**Checkpoint**: Visual quality is measurable, traceable, and merge-blocking across all FR and User Stories.

---

## Phase 9: Canvas Rendering (Spatial Canvas Implementation)

**Purpose**: Replace static CSS grid canvas with interactive @xyflow/react spatial canvas, delivering the pan/zoom/drag/edge-rendering behavior specified in FR-001, FR-020, and the workspace-ui-contract.

**Context**: T047 scaffolded the canvas-board component with mode buttons, semantic controls, and node rendering, but used a static `md:grid-cols-2` grid layout. Node positions (`GraphNode.position`) and edges (`Edge`) are stored in the data model but not rendered spatially. This phase completes the interactive canvas layer.

- [ ] T170 [P] [US1] Install `@xyflow/react` dependency and import base stylesheet in `/home/patekus4/researchlm/package.json` and `/home/patekus4/researchlm/app/globals.css`
- [ ] T171 [P] [US1] Create domain-to-React-Flow adapter layer (GraphNode↔RF Node, Edge↔RF Edge) in `/home/patekus4/researchlm/features/graph-model/react-flow-adapters.ts`
- [ ] T172 [P] [US1] Create custom React Flow node component with handles, semantic projections, and content editing in `/home/patekus4/researchlm/components/workspace/canvas/flow-nodes/sensecape-node.tsx`
- [ ] T173 [P] [US1] Create stable nodeTypes registry in `/home/patekus4/researchlm/components/workspace/canvas/flow-nodes/index.ts`
- [ ] T174 [US1] Rewrite canvas-board.tsx to use ReactFlow with interaction mode mapping, viewport-driven semantic zoom, MiniMap, edge rendering, and node drag in `/home/patekus4/researchlm/components/workspace/canvas/canvas-board.tsx`
- [ ] T175 [US1] Update workspace-shell center pane for full-height React Flow container in `/home/patekus4/researchlm/components/workspace/layout/workspace-shell.tsx`
- [ ] T176 [P] [US1] Create shared React Flow mock for JSDOM tests in `/home/patekus4/researchlm/tests/helpers/mock-react-flow.ts`
- [ ] T177 [US1] Update semantic-zoom-auto test for React Flow zoom model in `/home/patekus4/researchlm/tests/integration/workspace/semantic-zoom-auto.test.tsx`
- [ ] T178 [P] [US1] Add React Flow mock to semantic-manual-persistence and semantic-view-resume tests in `/home/patekus4/researchlm/tests/integration/workspace/semantic-manual-persistence.test.tsx` and `/home/patekus4/researchlm/tests/integration/persistence/semantic-view-resume.test.tsx`

**Checkpoint**: Interactive spatial canvas replaces static grid. All existing features preserved.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies.
- **Phase 2 (Foundational)**: Depends on Phase 1. Blocks all user stories.
- **Phase 3 (US1)**: Depends on Phase 2.
- **Phase 4 (US2)**: Depends on Phase 2. Can run after US1 baseline UI shell is merged.
- **Phase 5 (US3)**: Depends on Phase 2. Can run after US1 node rendering baseline is merged.
- **Phase 6 (US4)**: Depends on Phase 2. Integrates best after US1 persistence interactions exist.
- **Phase 7 (Polish)**: Depends on completion of all targeted user stories.
- **Phase 8 (Visual Quality)**: Depends on Phase 7 and stabilized user-story UI states.
- **Phase 9 (Canvas Rendering)**: Depends on Phase 3 (US1). Completes the interactive canvas layer that T047 scaffolded.
- **Merge Gate Rule**: For user-facing changes, merge/release-candidate approval is BLOCKED until Phase 8 tasks are complete and visual CI gates pass.

### User Story Dependency Graph

- **US1 (P1)** -> Core canvas exploration MVP
- **US2 (P2)** -> Hierarchy workflows extending canvas baseline
- **US3 (P3)** -> Semantic abstraction controls on top of node rendering
- **US4 (P3)** -> Durability/recovery/conflict/credential continuity across workspace flows

Recommended completion order: **US1 -> US2 -> US3 -> US4**

### Within Each User Story

- Write tests first and confirm failing expectations.
- Implement state/domain changes before UI integration.
- Implement route/adapter behavior after contract tests exist.
- Validate independent story acceptance before proceeding.

### Parallel Opportunities

- Setup: T004, T005, T006, T007, T008, T009, T010 can run in parallel after T001-T003.
- Foundational: T014-T022 and T025-T029 can run in parallel after T013.
- US1: T033-T043 in parallel for tests; T061-T065 in parallel for provider adapters.
- US2: T067-T072 in parallel for tests; T074-T076 in parallel for UI work.
- US3: T084-T088 in parallel for tests; T090-T092 in parallel for semantic modules.
- US4: T098-T105 in parallel for tests; T107-T111 in parallel for persistence services.
- Polish: T119-T124, T133-T136, T139-T142, T144, T146, T148, and T149 can run in parallel.
- Visual phase: T152-T154 and T166 can run in parallel; T157-T160 can run in parallel after T154-T156; T167-T169 can run after T161-T166.

---

## Parallel Example: User Story 1

```bash
# Parallel test authoring for US1
Task: "T033 [US1] /home/kush/researchlm/tests/contract/llm-stream.contract.test.ts"
Task: "T036 [US1] /home/kush/researchlm/tests/unit/graph-model/interaction-mode.test.ts"
Task: "T042 [US1] /home/kush/researchlm/tests/integration/workspace/retry-preserves-context.test.tsx"

# Parallel provider adapter implementation for US1
Task: "T061 [US1] /home/kush/researchlm/lib/providers/openai/adapter.ts"
Task: "T062 [US1] /home/kush/researchlm/lib/providers/anthropic/adapter.ts"
Task: "T063 [US1] /home/kush/researchlm/lib/providers/gemini/adapter.ts"
Task: "T064 [US1] /home/kush/researchlm/lib/providers/openrouter/adapter.ts"
Task: "T065 [US1] /home/kush/researchlm/lib/providers/github-models/adapter.ts"
```

## Parallel Example: User Story 2

```bash
# Parallel hierarchy implementation for US2
Task: "T074 [US2] /home/kush/researchlm/components/workspace/hierarchy/hierarchy-view.tsx"
Task: "T075 [US2] /home/kush/researchlm/components/workspace/hierarchy/hierarchy-controls.tsx"
Task: "T076 [US2] /home/kush/researchlm/components/workspace/hierarchy/subtopic-candidate-picker.tsx"
```

## Parallel Example: User Story 3

```bash
# Parallel semantic implementation for US3
Task: "T090 [US3] /home/kush/researchlm/features/semantic-levels/representation.ts"
Task: "T091 [US3] /home/kush/researchlm/features/semantic-levels/state.ts"
Task: "T092 [US3] /home/kush/researchlm/components/workspace/semantic/semantic-level-selector.tsx"
```

## Parallel Example: User Story 4

```bash
# Parallel persistence/recovery implementation for US4
Task: "T107 [US4] /home/kush/researchlm/features/persistence/workspace-persistence-service.ts"
Task: "T108 [US4] /home/kush/researchlm/features/persistence/workspace-backup.ts"
Task: "T110 [US4] /home/kush/researchlm/features/persistence/cross-tab-sync.ts"
Task: "T111 [US4] /home/kush/researchlm/features/persistence/conflict-events.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 (US1).
3. Validate US1 independently through contract, unit, integration, and e2e tests.
4. Demo/deploy MVP before expanding scope.

### Incremental Delivery

1. Setup + Foundational complete -> stable base.
2. Deliver US1 -> validate -> story candidate.
3. Deliver US2 -> validate -> story candidate.
4. Deliver US3 -> validate -> story candidate.
5. Deliver US4 -> validate -> story candidate.
6. Run Phase 7 polish and quality/performance evidence.
7. Block release-candidate/merge until visual gates pass (`T152`-`T169`, including coverage validation, metadata gates, and rubric evidence artifacts).

### Parallel Team Strategy

1. Team completes Phases 1-2 together.
2. Split by story after foundation stabilization:
   - Engineer A: US1
   - Engineer B: US2
   - Engineer C: US3
   - Engineer D: US4
3. Reconcile in Phase 7 with full gate evidence.
4. Run Phase 8 visual baseline generation/review and CI gate stabilization.

---

## Notes

- [P] tasks indicate no file-level dependency on unfinished tasks.
- User story labels ensure traceability back to spec acceptance scenarios.
- Each story phase is scoped to be independently testable and demonstrable.
- Constitution quality, testing, UX, and performance obligations are enforced as explicit tasks.
