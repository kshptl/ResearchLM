# Feature Specification: Researchlm Exploration App

**Feature Branch**: `001-build-researchlm-app`  
**Created**: 2026-03-02  
**Status**: Draft  
**Input**: User description: "Build an application that implements the content from the pdf in this folder: 3586183.3606756.pdf"

## Clarifications

### Session 2026-03-02

- Q: How should BYOK provider credentials be handled across sessions? → A: Persist provider credentials locally with encryption at rest.
- Q: What recovery scope should be included for local-first workspace continuity? → A: Include both automatic local snapshots and user-facing export/import backup.
- Q: How should “balanced” question generation be made measurable? → A: Require at least one question each for why, what, when, where, and how per request.
- Q: How should concurrent edits from multiple tabs be resolved? → A: Use last-write-wins with user-visible conflict notification.
- Q: What observability scope should be required in this release? → A: Local structured logging only, without a developer diagnostics panel.
- Q: What canvas feature depth is required for v1? → A: Advanced canvas baseline including multi-select, pan/zoom, inline node editing, edge management, grouping, keyboard shortcuts, minimap, lasso selection, and undo/redo history panel.
- Q: Which node types are mandatory in v1? → A: Six node types (`topic`, `generated`, `question`, `summary`, `keyword`, `portal`) with distinct visual treatment.
- Q: What workspace layout is required for v1 UI? → A: Three-pane layout with left hierarchy, center canvas, and right inspector/actions; side panes are collapsible.
- Q: What undo/redo depth is required for v1? → A: At least 100 undo/redo actions per canvas session.
- Q: What responsive platform scope is required for v1? → A: Desktop-only in v1; tablet/mobile editing is out of scope.
- Q: How should performance baselines define normal load and healthy provider? → A: Define normal load as one active canvas with up to 300 nodes and 500 edges and no import/export in progress; define healthy provider as no 5xx, timeout, or rate-limit responses during measured requests.
- Q: How should node visual differentiation be made measurable? → A: Each node type must have a distinct icon, color token, and type label/header, with contrast-compliant styling.
- Q: How should generation retry behavior preserve active work context? → A: Retry is manual, editing remains available, and unsaved canvas/inspector state plus current selection must be preserved.
- Q: Which canonical term should be used for node links? → A: Use `edge` as the canonical term (formerly referred to as "connection").
- Q: How should US1 acceptance coverage reflect advanced canvas scope? → A: Add explicit scenarios for lasso/multi-select, minimap orientation, undo/redo history panel behavior, and six node-type rendering distinctions.
- Q: How should constitution compliance be represented in this specification? → A: Add explicit constitution compliance requirements with mandatory checks and review-blocking rules.
- Q: Which verification gates are mandatory before merge? → A: Require lint, formatting check, static analysis/typecheck, test suites, build, end-to-end tests, and practical performance budget checks.
- Q: How should generated subtopics become hierarchy canvases? → A: Show generated subtopic candidates and require explicit user selection for which candidates become child canvases with hierarchy links and portal nodes.
- Q: How should US4 acceptance criteria cover recovery and conflict behaviors? → A: Add separate acceptance scenarios for backup import/export recovery and for visible cross-tab conflict notifications.
- Q: What contrast standard should node visuals meet? → A: Node labels/text and key node-state indicators must meet WCAG 2.1 AA contrast requirements.
- Q: How should visual quality and UI appeal be validated for release readiness? → A: Require merge-blocking visual regression tests plus rubric-based design review sign-off mapped to all FR and User Story visual states.

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Explore Topics on a Canvas (Priority: P1)

As a knowledge worker researching a complex topic, I can create topic nodes on an infinite canvas, ask for generated responses, and convert highlighted response text into new nodes so I can rapidly explore many related ideas without losing context.

**Why this priority**: This is the core value of the product; without exploration on canvas, the feature does not deliver the paper's primary workflow.

**Independent Test**: Can be fully tested by creating a new workspace, using advanced canvas controls (multi-select, lasso, minimap, undo/redo panel), adding all six node types, generating responses through each expansion action, and extracting highlighted text into new nodes that remain editable and movable.

**Acceptance Scenarios**:

1. **Given** an empty workspace, **When** a user adds a node with a topic and requests generated exploration output, **Then** the system adds a new response node linked to the originating node.
2. **Given** a response node containing rich text, **When** a user highlights text and creates a node from it, **Then** the extracted text appears in a new node that can be positioned and linked to other nodes via edges.
3. **Given** a generation request fails, **When** the user retries generation, **Then** the retry is manual and existing unsaved canvas edits, inspector draft state, and current selection remain intact.
4. **Given** a generation request fails, **When** failure feedback is shown, **Then** the feedback is non-blocking and includes a normalized failure category, concise cause, recommended next action, and retry availability state.
5. **Given** multiple nodes on the canvas, **When** a user performs lasso selection or modifier-key multi-select, **Then** the selected set is highlighted consistently and can be moved or grouped as one operation.
6. **Given** a zoomed or panned canvas, **When** a user references the minimap, **Then** the minimap shows the current viewport and supports fast orientation back to the active working area.
7. **Given** a user performs more than 100 reversible canvas operations, **When** they open the undo/redo history panel and step backward/forward, **Then** prior states can be restored and replayed in order for at least 100 actions.
8. **Given** nodes of each required type (`topic`, `generated`, `question`, `summary`, `keyword`, `portal`), **When** they are rendered on the canvas, **Then** each type displays a distinct icon, color token, and visible type label/header.
9. **Given** a user extracts highlighted text, **When** the selected span is shorter than 3 non-whitespace characters, **Then** extraction is rejected with a non-blocking message, and **When** the selected span is longer than 5000 characters, **Then** extraction is rejected with a non-blocking message that states the maximum allowed span.
10. **Given** any expansion action returns empty, repetitive, off-topic, or malformed output, **When** the result is processed, **Then** no new node or child canvas is auto-created and a non-blocking quality notice offers retry, action-change, or dismiss options.
11. **Given** default and active exploration states, **When** the workspace renders in supported desktop browsers, **Then** visual regression snapshots for layout, node styling, generation actions, and failure notices match approved baselines.

---

### User Story 2 - Build Multilevel Hierarchies (Priority: P2)

As a knowledge worker, I can move between canvas view and hierarchy view, add broader topics and subtopics, and dive into subtopic canvases so I can structure information across levels of abstraction.

**Why this priority**: The paper's distinctive contribution is multilevel exploration and sensemaking; hierarchy management enables that differentiation.

**Independent Test**: Can be fully tested by creating a root canvas, adding sibling and child canvases in hierarchy view, diving into a node from canvas view, and verifying the hierarchy updates and navigation remains consistent.

**Acceptance Scenarios**:

1. **Given** a canvas with at least one topic node, **When** a user performs a semantic dive on that node, **Then** a child canvas is created and the user is navigated into that subtopic canvas.
2. **Given** multiple related canvases, **When** a user opens hierarchy view, **Then** the canvases are shown as a connected abstraction structure that supports moving to any selected canvas.
3. **Given** generated subtopic candidates are available, **When** a user selects specific candidates for expansion, **Then** only the selected candidates become child canvases with corresponding hierarchy links and portal nodes.
4. **Given** a node already has a semantic-dive child canvas, **When** the user triggers semantic dive again on the same node, **Then** the existing child canvas is reused by default and duplicate hierarchy links are not created.
5. **Given** generated subtopic candidates are presented, **When** a user dismisses selected candidates and later reloads the workspace, **Then** dismissed and pending candidate states remain consistent until the user clears them or completes expansion.
6. **Given** hierarchy creation and navigation interactions, **When** canvases and candidate states change, **Then** visual regression snapshots for hierarchy structure, active-state emphasis, and candidate lifecycle chips match approved baselines.

---

### User Story 3 - Manage Information Overload (Priority: P3)

As a knowledge worker, I can switch node detail levels (full, lines, summary, keywords) and use automatic detail changes while zooming so I can keep large maps understandable and continue sensemaking.

**Why this priority**: Complex information work fails when content becomes unreadable; detail control is required for usability at scale.

**Independent Test**: Can be fully tested by generating long responses, changing semantic detail levels manually and by zooming, and confirming users can still identify and revisit prior concepts.

**Acceptance Scenarios**:

1. **Given** a dense canvas with many long response nodes, **When** a user zooms out with automatic semantic detail enabled, **Then** node content shifts to lower-detail representations and remains legible at overview scale.
2. **Given** a node with available semantic representations, **When** a user manually selects a specific detail level, **Then** that representation persists until the user changes it again.
3. **Given** semantic mode changes (auto/manual and level selection), **When** zoom and manual controls are used, **Then** visual regression snapshots for semantic badges, node text representations, and selector affordances match approved baselines.

---

### User Story 4 - Preserve and Resume Sensemaking (Priority: P3)

As a returning user, I can reopen a workspace and continue from my prior canvases, hierarchy, and node relationships so multi-session research remains coherent.

**Why this priority**: Complex exploration often spans multiple sessions; continuity is necessary for real-world use.

**Independent Test**: Can be fully tested by creating a multi-canvas hierarchy, saving the workspace, reloading it in a new session, and verifying structure and content integrity.

**Acceptance Scenarios**:

1. **Given** a saved workspace with multiple canvases and links, **When** the user reopens the workspace, **Then** all canvases, nodes, links, and hierarchy relationships are restored.
2. **Given** a workspace backup exported from a prior session, **When** the user imports the backup into a recoverable workspace state, **Then** canvases, nodes, edges, hierarchy links, and semantic settings are restored from the imported backup.
3. **Given** the same workspace is open in multiple tabs, **When** an edit in one tab supersedes pending edits in another tab under last-write-wins, **Then** the affected tab shows a visible conflict notification that identifies superseded scope and remains visible until dismissed or replaced by a newer conflict.
4. **Given** a backup import contains valid and invalid segments, **When** import recovery runs, **Then** the system restores valid segments, skips invalid segments, and presents a recovery summary with restored/skipped counts and reasons.
5. **Given** active workspace state and recent snapshots are unreadable, **When** the user reopens the workspace, **Then** the system enters a recovery-required state with explicit actions to import a backup or create a new workspace.
6. **Given** near-simultaneous edits occur across tabs on different entity types, **When** reconciliation runs, **Then** conflict resolution applies per entity using the same deterministic tie-break order and preserves referential integrity across nodes, edges, canvases, and hierarchy links.
7. **Given** persistence, recovery, and credential lifecycle states, **When** conflict/recovery/auth flows are triggered, **Then** visual regression snapshots for conflict notices, recovery-required UI, and credential actions match approved baselines.

### Edge Cases

- A user requests generated content while offline or when model access fails.
- Generated response is empty, repetitive, or significantly off-topic.
- A user triggers semantic dive repeatedly on the same node.
- A hierarchy branch is deleted while users are currently viewing a descendant canvas.
- A workspace reaches high density (hundreds of nodes) and users must still navigate and locate earlier content.
- A user highlights extremely short or extremely long text spans for extraction.
- Local workspace data becomes corrupted or partially unreadable and recovery must use snapshots or import.
- The same workspace is edited in multiple browser tabs and updates conflict.
- A backup import contains partially invalid data and recovery can only be partial.
- Near-simultaneous cross-tab edits affect related entities (for example node and edge) and require deterministic reconciliation without orphaning references.
- A user opens the workspace on unsupported viewport sizes where desktop editing is out of scope.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a canvas workspace where users can create, edit, move, group, and create/remove edges between nodes. This requirement defines baseline graph authoring behavior.
- **FR-002**: The system MUST allow users to submit a node's text as a prompt and create a new response node from generated output.
- **FR-003**: The system MUST provide the expansion actions described in the paper workflow with explicit output forms: direct prompt produces one `generated` node with full response text, explanation produces one `summary` node linked to the source context, question generation produces a set of `question` nodes that satisfy FR-004, and subtopic generation produces selectable subtopic candidates rather than immediate child-canvas creation.
- **FR-004**: For question generation, the system MUST include at least one exploratory question each for why, what, when, where, and how in every generated question set.
- **FR-005**: The system MUST allow users to highlight text inside a node and create a new node from the highlighted selection.
- **FR-006**: The system MUST support semantic detail levels for node content: full detail, line-level summary, short summary, and keywords.
- **FR-007**: The system MUST support both automatic semantic detail changes based on zoom level and manual override of semantic detail level.
- **FR-008**: The system MUST provide semantic dive from a selected node to create or enter a dedicated subtopic canvas.
- **FR-009**: The system MUST provide a hierarchy view that shows canvases as a multilevel structure and supports navigation across levels.
- **FR-010**: The system MUST allow users to add broader-topic canvases, sibling hierarchies, and subtopic canvases; for generated subtopics, the system MUST present candidates and only create child canvases for user-selected candidates. Candidate lifecycle MUST include presented, selected, dismissed, and pending states, and candidate state MUST persist across reload until expanded or explicitly cleared.
- **FR-011**: The system MUST allow users to remove canvases or branches while preserving consistency of remaining hierarchy links.
- **FR-012**: The system MUST preserve workspace state across sessions, including canvases, nodes, links, hierarchy structure, and selected semantic settings.
- **FR-013**: The system MUST keep exploration and sensemaking in one integrated environment to avoid forced context switching between separate tools; node authoring, expansion, hierarchy navigation, semantic-level control, recovery actions, and provider credential management MUST all be available within the same workspace shell without requiring users to switch to external tools.
- **FR-014**: The system MUST provide clear non-blocking generation-failure feedback, require user-initiated retry, and keep editing available while preserving unsaved canvas edits, inspector draft state, and current selection during retry. Payload field requirements for failure notices are defined by FR-025.
- **FR-015**: The system MUST support keyboard and pointer interactions for core actions (node creation, selection, navigation, and view switching).
- **FR-016**: The system MUST allow users to persist BYOK provider credentials locally using encryption at rest and support credential revocation or replacement.
- **FR-017**: The system MUST provide automatic local snapshots and user-facing export/import backup to support recovery from local data loss or corruption; if import can only partially restore content, the system MUST preserve valid content, skip invalid content, and provide a recovery summary with restored/skipped counts and reasons.
- **FR-018**: When the same workspace is edited concurrently across tabs, the system MUST apply last-write-wins and display a visible conflict notification to the user; the notification MUST identify superseded scope and remain visible until user dismissal or replacement by a newer conflict event.
- **FR-019**: The system MUST emit local structured logs for generation, persistence, and conflict-resolution events, and this release MUST not require a developer diagnostics panel. Logs MUST redact or omit prohibited sensitive fields (`providerCredential`, `authorizationHeader`, raw prompt text, raw model response text, and unredacted highlighted user text) and MUST classify events using a documented taxonomy.
- **FR-020**: The v1 canvas MUST include advanced interaction affordances beyond baseline graph authoring: lasso selection, minimap orientation, drag-and-drop grouping workflows, keyboard shortcuts for core actions, and an undo/redo history panel.
- **FR-021**: The v1 node system MUST support six node types (`topic`, `generated`, `question`, `summary`, `keyword`, `portal`), and each type MUST have a distinct icon, color token, and visible type label/header; node labels/text and key node-state indicators MUST meet WCAG 2.1 AA contrast requirements.
- **FR-022**: The v1 workspace UI MUST use a three-pane layout with a collapsible left hierarchy panel, center canvas workspace, and collapsible right inspector/actions panel.
- **FR-023**: The v1 canvas MUST support undo and redo for at least 100 user actions per canvas session, covering node, edge, grouping, and layout operations.
- **FR-024**: The v1 interactive editing experience MUST target desktop browsers only; tablet and mobile editing are out of scope for this release. On unsupported viewport sizes, the system MUST disable editing actions and show a persistent non-blocking guidance message directing users to desktop editing.
- **FR-025**: For each failed generation request, the system MUST emit a non-blocking generation failure notice model containing `requestId`, `attemptNumber`, normalized `category`, concise `message`, `retryable`, and recommended `nextAction`. This requirement defines failure-notice payload schema only; behavioral continuity and retry rules are defined in FR-014.
- **FR-026**: If active workspace state and recent snapshots are unreadable at load time, the system MUST enter a recovery-required state offering explicit actions to import backup or create a new workspace without silently discarding unreadable data.
- **FR-027**: The system MUST persist per-workspace pane layout state (`leftPaneCollapsed`, `rightPaneCollapsed`, `leftPaneWidthPx`, `rightPaneWidthPx`, `activeInspectorTab`) across reloads; restored pane widths MUST be clamped to 240-480 px and MUST preserve a center-canvas minimum width of 640 px.
- **FR-028**: Credential lifecycle changes MUST affect generation deterministically: revoked/invalid credentials MUST block new generation and manual retries before dispatch with normalized `auth` failure category, and replaced credentials MUST be used for subsequent requests without page reload.
- **FR-029**: Authentication and authorization failures during generation MUST be handled distinctly from generic upstream failures: notices MUST use normalized `auth` or `permission` categories, MUST NOT trigger automatic retries, and MUST provide a direct action to open provider credential settings.
- **FR-030**: Text extraction MUST enforce span bounds using non-whitespace character count: selections below 3 characters or above 5000 characters MUST be rejected with a non-blocking message that states the applicable bound.
- **FR-031**: Repeated semantic dive on the same source node MUST reuse the existing child canvas by default and MUST NOT create duplicate hierarchy links unless the user explicitly chooses a separate "create additional child canvas" action.
- **FR-032**: Cross-tab last-write-wins reconciliation MUST use deterministic per-entity ordering (`updatedAtMs`, then `tabId` lexical order as tie-break) and MUST preserve referential integrity across related entities after reconciliation.
- **FR-033**: If any expansion action result is empty, repetitive beyond the documented uniqueness policy, significantly off-topic relative to the source node intent, or structurally malformed for its expected output form, the system MUST not auto-create result nodes/canvases and MUST emit a non-blocking quality notice with options to retry, change expansion action, or dismiss. The documented uniqueness policy MUST define default thresholds (`minUniqueItemRatio = 0.70`, `maxDuplicateItemRatio = 0.30`) in `/home/kush/researchlm/specs/001-build-researchlm-app/measurement-protocol.md`, where ratios are item-based (`uniqueItemRatio = uniqueNormalizedItems / totalItems`, `duplicateItemRatio = duplicateNormalizedItems / totalItems`) after trim+casefold normalization. Off-topic MUST be evaluated using `keywordCoverage = matchedSourceKeywords / requiredSourceKeywords`, and output is off-topic when `keywordCoverage < 0.50`. `requiredSourceKeywords` MUST be derived deterministically from the source node text by trim+casefold normalization and punctuation removal, then selecting the first 10 unique tokens with length >= 4 in source order (no stopword-removal step in v1); `matchedSourceKeywords` counts exact normalized token matches found in generated output.
- **FR-034**: The system MUST maintain visual regression coverage for all User Stories and FR-linked user-visible UI states. Each covered state MUST have a canonical `VS-###` ID in `/home/kush/researchlm/specs/001-build-researchlm-app/visual-coverage-matrix.md` and at least one baseline artifact reference per supported browser project.
- **FR-035**: Visual regression tests MUST run as merge-blocking CI checks on supported desktop browser projects with deterministic rendering controls: fixed viewport (1440x900), `deviceScaleFactor=1`, locale `en-US`, timezone `UTC`, reduced-motion mode, deterministic font loading, and masking of approved dynamic regions. Deterministic font source/version/fallback policy and capture setup MUST be defined in `/home/kush/researchlm/specs/001-build-researchlm-app/contracts/visual-regression-contract.md`. Visual diff pass criteria MUST be defined in `/home/kush/researchlm/specs/001-build-researchlm-app/measurement-protocol.md` and enforced in CI.
- **FR-036**: Any baseline snapshot update MUST include approval metadata in `/home/kush/researchlm/specs/001-build-researchlm-app/checklists/visual-review.md` with fields: `reviewId`, `approvalOwner`, `reviewer`, `reviewedAt`, `linkedFRs`, `linkedUserStories`, `changedVSIds`, and `rationale`. `approvalOwner` is the accountable signer for the baseline update decision.
- **FR-037**: The UI MUST satisfy a design-review rubric covering visual hierarchy, readability, spacing consistency, color harmony, and affordance clarity, with thresholds defined in `/home/kush/researchlm/specs/001-build-researchlm-app/measurement-protocol.md`.

Required visual browser projects are `chromium-desktop` and `firefox-desktop`, as defined by `/home/kush/researchlm/playwright.config.ts` and `/home/kush/researchlm/specs/001-build-researchlm-app/contracts/visual-regression-contract.md`.

### Visual Acceptance State Inventory (Canonical)

- **VS-001**: Workspace default (three panes visible, no selection).
- **VS-002**: Node selected with inspector details visible.
- **VS-003**: Generation actions visible (`prompt`, `explain`, `questions`, `subtopics`).
- **VS-004**: Generation failure notice (non-blocking, actionable).
- **VS-005**: Hierarchy view with active-canvas emphasis.
- **VS-006**: Subtopic candidate lifecycle (`presented`, `selected`, `dismissed`, `pending`).
- **VS-007**: Semantic auto mode at low zoom.
- **VS-008**: Semantic manual `keywords` mode.
- **VS-009**: Persistence controls panel (`snapshot`, `export`, `import`).
- **VS-010**: Conflict notice visible.
- **VS-011**: Recovery-required state.
- **VS-012**: Unsupported viewport guidance state.

Each `VS-###` state MUST have at least one approved baseline per required browser project, as defined in `/home/kush/researchlm/specs/001-build-researchlm-app/contracts/visual-regression-contract.md`.

### Assumptions

- The requested implementation scope is the interactive system behaviors described in the Researchlm paper (not replication of the study protocol, statistical analysis, or publication assets).
- Single-user workflow is in scope for this feature; real-time multi-user collaboration is out of scope.
- Desktop browser usage is in scope for full interaction; tablet/mobile editing workflows are out of scope for v1.
- Generated content quality depends on the connected language model and is treated as assistive output rather than guaranteed factual truth.
- Users may work across multiple sessions and require saved state continuity.
- Users can opt to keep provider credentials locally for multi-session continuity when protected with encryption at rest.
- Recovery for local-first data MUST include both automatic snapshots and manual export/import capability.
- Performance budget runs assume desktop browser profile execution (latest stable Chrome/Firefox, 1440x900 viewport, 4 vCPU and 16 GB RAM class machine, no CPU throttling).
- Generation latency budget runs assume provider quota availability and stable network conditions (target <100 ms median RTT and no active provider rate-limit during measured requests).
- FR-033 uniqueness policy defaults are fixed for v1 (no runtime user override); any threshold change requires a specification update and maintainer approval.

### Code Quality & Maintainability Requirements

- The feature MUST pass the repository's existing formatting, linting, and static-analysis quality gates with no new violations in modified files.
- Canvas interaction logic, hierarchy logic, and generation orchestration MUST remain separated by responsibility to keep future changes isolated.
- Any product behavior that diverges from the paper's described interaction model MUST be documented in the feature notes.
- The specification, implementation plan, and task list MUST each include an explicit constitution compliance check before implementation and review approval.
- Reviewers MUST block approval when constitution-mandated quality, testing, UX, or performance obligations are unmet or unverified.
- Any approved temporary exception to merge-blocking quality or performance gates MUST document an owner, mitigation plan, and expiry date in feature notes.
- Requirement-to-task traceability MUST be maintained in `/home/kush/researchlm/specs/001-build-researchlm-app/traceability.md`, and each functional and non-functional requirement MUST map to at least one task before implementation approval.

### Testing & Verification Requirements

- Unit tests MUST cover state transitions for node operations, semantic levels, and hierarchy mutations.
- Integration tests MUST cover end-to-end user flows for prompt expansion, semantic dive, and hierarchy navigation.
- End-to-end acceptance tests MUST verify that a user can start from a blank workspace and complete one full exploration-and-sensemaking cycle.
- The repository verification pipeline MUST pass lint, formatting check, static analysis/typecheck, required test suites, build, and end-to-end tests before merge, and MUST include practical performance budget checks for affected hot paths.
- Practical performance budget checks MUST include artifacts for p95 node interaction latency, p95 hierarchy/canvas switch latency, and p95 generation first-visible-content latency, each with dataset profile and execution metadata sufficient for reruns.
- Visual regression tests MUST produce baseline/current/diff artifacts for required FR/US states; failed visual diffs MUST block merge unless approved baseline updates are present.
- Requirement-to-test traceability MUST include visual test IDs and artifact references for every FR and User Story.

### User Experience Consistency Requirements

- Terminology MUST stay consistent across views (for example: canvas, hierarchy, subtopic, semantic dive, semantic level).
- Switching between canvas and hierarchy views MUST preserve user orientation and selected context.
- Core actions MUST be accessible via keyboard and pointer, with visible focus indicators and descriptive labels.
- Error and retry messages for generation failures MUST be concise, actionable, non-blocking, and include normalized category, recommended next action, and retry availability.
- Conflict notifications MUST communicate superseded scope and user action options, and remain visible until dismissal or replacement by a newer conflict event.
- Keyboard traversal order MUST be deterministic across left hierarchy pane, center canvas/toolbar, and right inspector/actions pane, with no hidden focus traps.
- Focus MUST restore to the last meaningful trigger element after modal/popover/panel closure and after view transitions that temporarily move focus context.
- Critical workflows MUST preserve visual consistency of spacing, typography scale, semantic emphasis, and action-affordance prominence across hierarchy, canvas, and inspector panes.
- User-visible notices (failure, conflict, recovery, unsupported viewport) MUST maintain consistent visual severity hierarchy and readability across supported desktop browsers.

### Performance Requirements

- For 95% of interactions, creating/editing/moving a node MUST reflect on screen within 200 ms on one active canvas containing up to 300 nodes and 500 edges with no import/export operation in progress.
- For 95% of view switches between canvas and hierarchy, transition to interactive state MUST complete within 1 second under the same workspace load baseline.
- For 95% of generation requests, first visible response content MUST appear within 5 seconds when the upstream provider returns neither timeout, 5xx, nor rate-limit responses during the measured request.
- Performance validation MUST include automated interaction timing checks and manual stress testing with high-density workspaces.
- If generation latency exceeds target, the system MUST show progress feedback and preserve full editing capability while waiting.
- Performance evidence MUST be retained as versioned artifacts for review, including run metadata and threshold pass/fail outcomes.
- Performance evidence runs MUST record browser/version, viewport, hardware profile class, network profile summary, dataset profile, and provider quota/rate-limit status for each measured run.

### Key Entities *(include if feature involves data)*

- **Workspace**: A user's persisted research space containing canvases, hierarchy links, interaction state, and view preferences.
- **Canvas**: A topic-focused working surface containing nodes and links; participates in parent-child hierarchy relationships.
- **Node**: A unit of information (topic, question, generated text, summary, or keyword set) with position, content, semantic representations, and relationship links.
- **Edge**: A directional or undirected relationship between nodes indicating conceptual association (formerly referred to as "connection").
- **NodeGroup**: A persisted grouping construct within a canvas containing `groupId`, `canvasId`, `memberNodeIds`, optional `label`, and layout bounds used for grouped move/layout operations.
- **Hierarchy Link**: A relationship between canvases representing broader-topic, sibling, or subtopic structure.
- **Subtopic Candidate**: A generated child-canvas proposal with `candidateId`, `sourceNodeId`, `title`, and lifecycle state (`presented`, `selected`, `dismissed`, `pending`) that persists until expanded or explicitly cleared.
- **Generation Request**: A user-triggered action that asks for model output with intent type (prompt, explain, questions, subtopics) and source context.
- **Generation Failure Notice**: A non-blocking failure payload containing `requestId`, `attemptNumber`, normalized `category`, concise `message`, `retryable`, and `nextAction` guidance.
- **Log Redaction Policy**: A structured policy defining prohibited sensitive fields, taxonomy class, and redaction/omit rules for local structured logs.
- **Semantic View State**: The currently selected detail mode (auto or manual level) controlling how node content is displayed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 90% of representative users can create a topic node, generate follow-up content, and extract text into new nodes without assistance in under 5 minutes.
- **SC-002**: At least 85% of representative users can construct a three-level topic hierarchy and navigate between levels without losing orientation.
- **SC-003**: At least 90% of tested sessions preserve and restore workspace structure correctly across close-and-reopen cycles.
- **SC-004**: In within-subject usability evaluation with at least 12 participants using matched prompt sets and equal time boxes between Researchlm and a linear chat baseline, median self-rated ability to manage complex information (7-point scale) improves by at least 25% in Researchlm.
- **SC-005**: In the same controlled within-subject trials, median count of unique participant-confirmed subtopics covered is at least 30% higher in Researchlm than the linear chat baseline for the same time box.
- **SC-006**: 95% of core interaction actions (node manipulation and view navigation) meet the stated responsiveness targets.
- **SC-007**: 100% of required test layers (unit, integration, end-to-end acceptance) pass in the continuous verification pipeline.
- **SC-008**: No critical accessibility issues remain open for keyboard navigation, focus visibility, or actionable error messaging in the defined user flows.
- **SC-009**: 100% of required visual regression checks pass in CI for release-candidate branches.
- **SC-010**: 100% of FRs and User Stories are mapped to at least one visual test and baseline artifact in the visual coverage matrix.
- **SC-011**: Design-review rubric average is >= 4.0/5.0 with no rubric category below 3.5/5.0 on release candidates.
