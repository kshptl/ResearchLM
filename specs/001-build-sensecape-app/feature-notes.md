# Feature Notes: Sensecape Exploration App

## Purpose

Track implementation decisions, intentional deviations from paper workflows, and approved temporary exceptions required for delivery.

## Decision Log

- 2026-03-03: Hierarchy and semantic controls ship in a frontend-first local simulation mode before full provider-backed multi-canvas state orchestration.
- 2026-03-03: Backup export/import currently targets core workspace entities (workspace/canvas/node/connection/hierarchy links) and stores last exported payload in local browser storage for quick recovery drills.
- 2026-03-03: Conflict notice UX is non-blocking and manually dismissible; detection is wired to cross-tab reconciliation events and a simulation trigger for testability.
- 2026-03-03: T047 scaffolded canvas-board with static CSS grid layout as MVP placeholder. Node positions and edges exist in data model but are not rendered spatially. Phase 9 (T170-T178) implements the @xyflow/react interactive canvas to deliver FR-001/FR-020 spatial behavior.

## Temporary Exceptions

- Multi-tab conflict simulation action remains enabled in the UI pending a dedicated diagnostics panel.
- Structured log redaction baseline is implemented in persistence service and scheduled for shared-policy extraction (`T150`).

## Follow-up Actions

- Replace local backup staging (`localStorage`) with explicit file download/upload flows.
- Consolidate redaction rules into shared logging module and migrate emitters.
- Visual regression baselines (Phase 8) will need regeneration after Phase 9 canvas rendering changes land.
