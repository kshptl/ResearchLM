# Quickstart: Sensecape Exploration App (Frontend-First)

## Goal

Implement a desktop-first Sensecape experience with:

- Three-pane workspace (hierarchy, canvas, inspector) with collapsible side panes
- Advanced canvas interactions (pan/zoom, multi-select, lasso, minimap, grouping, edge operations)
- Six node types with measurable visual differentiation
- Undo/redo history panel with at least 100 reversible actions
- Manual retry generation UX that preserves in-progress work context
- Local-first durability (adaptive snapshots + export/import backup)
- BYOK multi-provider streaming through normalized SSE contracts

## Prerequisites

- Node.js LTS
- Package manager configured in `/home/kush/researchlm`
- Desktop browser runtime for editing workflows

## Frontend Implementation Sequence

1. **Workspace shell and pane synchronization**
   - Build three-pane layout and collapse/resize behavior.
   - Synchronize active selection context across hierarchy/canvas/inspector.

2. **Canvas engine baseline**
   - Implement interaction mode machine (`select`, `pan`, `connect`, `lasso`).
   - Implement pan/zoom, edge create/delete, and drag interactions.

3. **Advanced interaction layer**
   - Add multi-select, lasso selection, node grouping, and minimap orientation.
   - Add text highlight extraction into new node with provenance.

4. **Node rendering and inspector**
   - Implement six node renderers with icon + color token + visible type label/header.
   - Wire inspector editing and semantic controls to selected node context.

5. **History and resilience behavior**
   - Implement command-based undo/redo and visible history panel.
   - Guarantee >=100 reversible actions per canvas session.

6. **Persistence and recovery**
   - Implement normalized IndexedDB persistence and hydration.
   - Implement adaptive snapshots, export/import backup, and restoration validation.
   - Implement cross-tab LWW conflict detection + visible notice.

7. **Generation and adapter integration**
   - Implement `/api/llm/stream` normalized SSE route and provider adapters.
   - Enforce manual retry behavior with unsaved state and selection preservation.
   - Enforce BYOK policy and encrypted-at-rest credential persistence.

8. **Observability and compliance hardening**
   - Emit local structured logs for generation/persistence/conflict lifecycle events.
   - Complete constitution-required quality/test/performance evidence.

## Verification Checklist

- Three-pane layout remains synchronized during selection and pane collapse/expand.
- Canvas supports lasso, multi-select, minimap, grouping, edge create/delete.
- Text extraction creates new nodes from highlighted content with correct provenance.
- Node types (`topic`, `generated`, `question`, `summary`, `keyword`, `portal`) have distinct icon + color token + visible type label/header.
- Node labels/text and key node-state indicators satisfy WCAG 2.1 AA contrast.
- History panel supports stepping through at least 100 reversible actions.
- Manual retry preserves unsaved edits, inspector drafts, and current selection.
- Generated subtopic candidates require explicit user selection before child canvases are created.
- Cross-tab conflict notice appears when local edits are superseded.
- Snapshots and backup import/export restore workspace integrity.
- SSE event contract and request envelope validations pass.
- Local structured logs contain required event fields without sensitive leakage.

## Required Quality Gate Commands

- `npm run lint`
- `npm run format:check` (or repository equivalent formatting check)
- `npm run typecheck` (or repository equivalent static analysis/type gate)
- `npm run test`
- `npm run build`
- `npm run test:e2e`
- constitution compliance check across spec/plan/tasks

## Constitution Quality Checklist

- Code quality evidence includes lint, format check, and static analysis outputs.
- Testing evidence includes unit, integration, contract, and e2e coverage for touched workflows.
- UX consistency evidence includes keyboard parity, focus order/restoration, and non-blocking messaging validation.
- Performance evidence includes p95 interaction and generation-latency artifacts with run metadata.
- Review package includes updated traceability mapping and any documented temporary exceptions with owner and expiry.

## Frontend Evidence Artifacts

- p95 node interaction timing report at baseline load (<=300 nodes/500 edges)
- p95 hierarchy-to-canvas switch timing report
- Undo/redo depth and history panel behavior evidence
- Keyboard/focus traversal evidence across three panes
- Retry-state preservation integration test evidence
- Snapshot/export/import recovery evidence
