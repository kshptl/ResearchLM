# Workspace UI Contract: Researchlm v1

This document defines the front-end interaction contract for the v1 workspace.

## Scope

- Desktop editing workflows only.
- Three-pane layout: hierarchy (left), canvas (center), inspector/actions (right).
- Side panes are collapsible without destroying active canvas context.

## Layout Contract

- Left pane MUST contain hierarchy navigation and hierarchy creation controls.
- Center pane MUST host the interactive canvas and canvas toolbar.
- Right pane MUST show selected-node details and generation/semantic actions.
- Collapsing either side pane MUST not clear current selection, viewport, or unsaved inspector draft.

## Hierarchy Expansion Contract

- Generated subtopic suggestions MUST be presented as selectable candidates before child canvas creation.
- Only user-selected generated candidates MAY be expanded into child canvases.
- Each selected generated candidate MUST create both a hierarchy link and a corresponding portal node.

## Canvas Interaction Contract

The canvas MUST support the following interactions in v1:

- Pan and zoom
- Multi-node selection
- Lasso selection
- Drag/drop node movement
- Edge create/delete
- Node grouping and ungrouping
- Inline node editing
- Text highlight extraction into new node
- Minimap visibility and viewport indication
- Undo and redo with minimum history depth of 100 actions
- History panel for stepping backward/forward through command timeline

## Node Rendering Contract

Mandatory node types:

- `topic`
- `generated`
- `question`
- `summary`
- `keyword`
- `portal`

Requirements:

- Each type MUST have distinct iconography and visual styling tokens.
- Each type MUST expose a visible type label/header.
- Node labels/text and key node-state indicators MUST meet WCAG 2.1 AA contrast requirements.
- Inspector panel MUST reflect node type and expose type-appropriate actions.
- Semantic representation switching MUST preserve original full content.

## Keyboard & Accessibility Contract

- Core actions MUST be possible with keyboard and pointer.
- Focus order MUST be deterministic across three panes.
- Focus restoration MUST return users to prior meaningful context after modal/popover closure.
- Error messages MUST be actionable and non-blocking where possible.

## Conflict & Recovery Contract

- Cross-tab edits MUST resolve with last-write-wins.
- When local edits are superseded, UI MUST present a visible conflict notice.
- Auto-snapshots and import/export recovery controls MUST remain accessible from workspace-level actions.
- Generation retry MUST be user-initiated and MUST preserve unsaved canvas edits, inspector drafts, and current selection.

## Performance Contract

- 95% node create/edit/move interactions MUST appear in <200ms on one active canvas with up to 300 nodes and 500 edges and no import/export in progress.
- 95% hierarchy-to-canvas view transitions MUST reach interactive state in <1s under the same baseline load.
- Undo/redo execution MUST remain within interaction responsiveness budget for typical workspace scale.

## Out of Scope (v1)

- Tablet/mobile editing parity.
- In-app developer diagnostics panel.
- Real-time multi-user collaboration and merge UI.
