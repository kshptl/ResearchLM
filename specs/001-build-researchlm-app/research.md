# Phase 0 Research: Researchlm Exploration App

## Decision 1: Canvas rendering architecture

- **Decision**: Use a hybrid React-node + SVG-edge rendering model with `@xyflow/react` in a client-only canvas island.
- **Rationale**: Supports advanced interactions (lasso, minimap, inline editing, edge operations) while keeping rich node UIs maintainable.
- **Alternatives considered**:
  - Pure Canvas/WebGL renderer (rejected: accessibility and inline editing complexity).
  - Pure custom SVG engine (rejected: higher implementation cost for interaction primitives).
  - Fully custom renderer (rejected: unnecessary risk for v1 scope).

## Decision 2: Interaction mode model

- **Decision**: Implement explicit interaction modes (`select`, `pan`, `connect`, `lasso`) with deterministic pointer and keyboard mappings.
- **Rationale**: Eliminates gesture ambiguity and improves testability of advanced front-end behavior.
- **Alternatives considered**:
  - Implicit gesture inference only (rejected: inconsistent behavior under dense interactions).
  - Pointer-first fallback keyboard support (rejected: weak keyboard parity).

## Decision 3: Front-end state boundaries

- **Decision**: Partition state into persisted graph state, ephemeral interaction state, and inspector draft state.
- **Rationale**: Prevents rerender storms and avoids persisting transient interactions.
- **Alternatives considered**:
  - Monolithic global state (rejected: coupling and high update churn).
  - Component-local only state (rejected: weak cross-pane synchronization).

## Decision 4: Three-pane workspace architecture

- **Decision**: Enforce desktop-first three-pane layout with collapsible hierarchy and inspector panes synchronized to canvas selection context.
- **Rationale**: Maximizes simultaneous context and aligns with clarified UI expectations.
- **Alternatives considered**:
  - Single-pane overlays (rejected: lower information density).
  - Two-pane tabbed inspector (rejected: increased context switching).

## Decision 5: Node type and visual contract

- **Decision**: Support six mandatory node types with measurable differentiation (distinct icon, color token, and visible type label/header) and enforce WCAG 2.1 AA contrast for node labels/text and key state indicators.
- **Rationale**: Satisfies clarity and measurability requirements for dense-canvas interpretation.
- **Alternatives considered**:
  - Icon-only differentiation (rejected: insufficient distinction under scale).
  - User-defined dynamic node types in v1 (rejected: scope inflation).

## Decision 6: Generated subtopic expansion policy

- **Decision**: Present generated subtopic candidates first and only create child canvases/hierarchy links/portal nodes for explicitly user-selected candidates.
- **Rationale**: Prevents uncontrolled hierarchy explosion and keeps generated structure intentionally curated.
- **Alternatives considered**:
  - Auto-create all generated subtopics (rejected: noisy hierarchy growth).
  - Keep generated subtopics as text-only suggestions (rejected: weak integration with hierarchy workflow).

## Decision 7: History model and panel behavior

- **Decision**: Use command-based undo/redo with inverse payloads, transaction batching, coalescing, and visible history panel support; guarantee depth >=100 actions.
- **Rationale**: Provides deterministic, debuggable history semantics and aligns with explicit UX scope.
- **Alternatives considered**:
  - Full snapshot-per-action history (rejected: memory/storage overhead).
  - Patch-only history without semantic commands (rejected: poor user-facing history clarity).

## Decision 8: Selection and extraction behavior

- **Decision**: Treat text-to-node extraction as explicit command operations preserving source node provenance and target canvas context.
- **Rationale**: Ensures extraction is reversible, testable, and compatible with history/redo semantics.
- **Alternatives considered**:
  - Implicit extraction side effects outside command history (rejected: weaker recoverability).
  - Detached extraction workflow in inspector-only mode (rejected: breaks canvas-centric flow).

## Decision 9: Retry UX and editing continuity

- **Decision**: Require manual retry; preserve unsaved canvas edits, inspector drafts, and current selection while retrying; keep editing non-blocking.
- **Rationale**: Minimizes data-loss risk and maintains work continuity during provider instability.
- **Alternatives considered**:
  - Automatic retry with backoff (rejected: cost/control ambiguity).
  - Blocking retry modal flow (rejected: violates non-blocking editing requirement).

## Decision 10: Accessibility interaction strategy

- **Decision**: Use pane landmarks, deterministic focus order, mode-aware keyboard controls, and explicit focus restoration after transient UI states.
- **Rationale**: Required for keyboard parity in a complex graph editor.
- **Alternatives considered**:
  - Global shortcuts without mode context (rejected: collision and discoverability risks).
  - Tab-through-all-elements strategy only (rejected: impractical at scale).

## Decision 11: IndexedDB persistence shape

- **Decision**: Use normalized entity stores plus command history, snapshots, backup manifests, and conflict-event metadata.
- **Rationale**: Supports local-first durability, faster incremental writes, and structured recovery.
- **Alternatives considered**:
  - Single workspace blob persistence (rejected: heavy writes and fragile restore behavior).
  - Event-log-only model (rejected: slow hydration for long sessions).

## Decision 12: Snapshot and backup policy

- **Decision**: Use adaptive auto-snapshots (operation threshold + elapsed time + lifecycle triggers) and user-facing versioned export/import bundles.
- **Rationale**: Balances resilience with storage overhead and supports explicit recovery requirements.
- **Alternatives considered**:
  - Snapshot-only policy (rejected: no portable recovery artifact).
  - Manual backup-only policy (rejected: weak resilience to abrupt failures).

## Decision 13: Cross-tab conflict handling

- **Decision**: Apply deterministic last-write-wins ordering and emit visible conflict notifications for superseded local edits.
- **Rationale**: Matches clarified single-user multi-tab expectations with manageable complexity.
- **Alternatives considered**:
  - Tab locking/leader election (rejected: brittle UX and failure cases).
  - Manual merge UI in v1 (rejected: out of scope complexity).

## Decision 14: BYOK credential posture

- **Decision**: Persist BYOK credentials encrypted at rest locally, with explicit revocation/replacement lifecycle and policy enforcement.
- **Rationale**: Preserves session continuity while respecting credential safety constraints.
- **Alternatives considered**:
  - Session-only credential memory (rejected: conflicts with accepted requirement).
  - Shared server keys (rejected: violates BYOK intent).

## Decision 15: SSE normalization and error envelope

- **Decision**: Standardize SSE events (`start`, `delta`, `tool_delta`, `usage`, `error`, `done`) with monotonic sequence ordering and canonical error envelope taxonomy.
- **Rationale**: Stabilizes frontend stream consumption across provider differences and simplifies contract tests.
- **Alternatives considered**:
  - Provider pass-through streams (rejected: frontend coupling).
  - Non-streaming response mode for v1 (rejected: poor interaction latency).

## Decision 16: Observability for v1

- **Decision**: Emit local structured logs for generation, persistence, and conflict events only; no in-app diagnostics panel in v1.
- **Rationale**: Meets clarified scope and operational debugging needs without expanding product surface.
- **Alternatives considered**:
  - No logging instrumentation (rejected: low supportability).
  - Full diagnostics panel (rejected: explicitly out of scope).

## Decision 17: Quality-gate enforcement

- **Decision**: Require explicit CI gates for lint, formatting check, static analysis, type checks, unit/integration/contract tests, build, e2e, and performance evidence capture.
- **Rationale**: Aligns with constitution mandates and closes quality-gate ambiguity.
- **Alternatives considered**:
  - Lint/test/build only (rejected: incomplete constitution compliance).
  - Non-blocking formatting/static checks (rejected: inconsistent enforcement).

## Decision 18: Constitution compliance representation

- **Decision**: Keep explicit constitution compliance checks in spec, plan, and tasks with reviewer blocking criteria.
- **Rationale**: Enforces governance requirements and prevents ambiguity about approval gates.
- **Alternatives considered**:
  - Plan-only compliance statement (rejected: incomplete governance traceability).
  - Implicit compliance without explicit sectioning (rejected: hard to verify in review).

## Decision 19: Performance validation harness

- **Decision**: Use seeded browser-based benchmark scenarios (300-node/500-edge baseline) with p95 tracking for node interactions and hierarchy switches plus profiling artifacts for regressions.
- **Rationale**: Provides objective, repeatable evidence tied to explicit requirement baselines.
- **Alternatives considered**:
  - Ad-hoc manual testing only (rejected: low repeatability).
  - Unit microbenchmarks only (rejected: misses browser rendering pipeline costs).

## Resolution Status

All technical-context unknowns are resolved for planning.
