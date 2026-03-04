# Data Model: Researchlm Exploration App

## Entity: Workspace

- **Purpose**: Root container for canvases, hierarchy, pane layout preferences, and persistence metadata.
- **Key fields**:
  - `id`
  - `title`
  - `rootCanvasId`
  - `activeCanvasId`
  - `platformScope` (`desktop-v1`)
  - `schemaVersion`
  - `createdAt`, `updatedAt`
- **Validation rules**:
  - `id` unique and non-empty.
  - `rootCanvasId` and `activeCanvasId` must reference existing canvases in same workspace.
  - `platformScope` must remain `desktop-v1` for this release.

## Entity: PaneLayoutState

- **Purpose**: Persists workspace three-pane shell behavior.
- **Key fields**:
  - `workspaceId`
  - `leftPaneCollapsed`
  - `rightPaneCollapsed`
  - `leftPaneWidthPx`
  - `rightPaneWidthPx`
  - `activeInspectorTab`
  - `lastUpdatedAt`
- **Validation rules**:
  - Widths must remain within desktop layout bounds.
  - Pane collapse/resize operations must preserve center canvas visibility.

## Entity: Canvas

- **Purpose**: Topic-specific graph surface in hierarchy.
- **Key fields**:
  - `id`
  - `workspaceId`
  - `topic`
  - `parentCanvasId` (nullable)
  - `depth`
  - `viewport` (`x`, `y`, `zoom`)
  - `createdAt`, `updatedAt`
- **Validation rules**:
  - `parentCanvasId` must reference same-workspace canvas when present.
  - `depth` must reflect parent relationship.

## Entity: Node

- **Purpose**: Information unit rendered on canvas.
- **Key fields**:
  - `id`
  - `workspaceId`
  - `canvasId`
  - `type` (`topic`, `generated`, `question`, `summary`, `keyword`, `portal`)
  - `title`
  - `content`
  - `semanticRepresentations` (`all`, `lines`, `summary`, `keywords`)
  - `visualToken`
  - `iconToken`
  - `typeLabel`
  - `position` (`x`, `y`)
  - `size` (`width`, `height`)
  - `groupId` (nullable)
  - `sourceNodeId` (nullable)
  - `createdAt`, `updatedAt`
- **Validation rules**:
  - `type` must be one of six mandatory node types.
  - `visualToken`, `iconToken`, and `typeLabel` must be present for every node type renderer.
  - Node labels/text and key node-state indicators must satisfy WCAG 2.1 AA contrast requirements.
  - `sourceNodeId` must reference same-workspace node if present.

## Entity: Edge

- **Purpose**: Relationship link between two nodes.
- **Key fields**:
  - `id`
  - `workspaceId`
  - `canvasId`
  - `fromNodeId`
  - `toNodeId`
  - `relationshipType`
  - `createdAt`, `updatedAt`
- **Validation rules**:
  - Both node references must exist within same canvas.
  - Duplicate `from/to/relationshipType` combinations are disallowed.

## Entity: NodeGroup

- **Purpose**: Logical grouping for multi-select operations.
- **Key fields**:
  - `id`
  - `workspaceId`
  - `canvasId`
  - `name`
  - `nodeIds[]`
  - `colorToken`
  - `createdAt`, `updatedAt`
- **Validation rules**:
  - Every `nodeId` must reference same-canvas node.
  - Empty groups allowed only transiently during edit command transactions.

## Entity: SelectionState

- **Purpose**: Tracks current multi-select and lasso results.
- **Key fields**:
  - `workspaceId`
  - `canvasId`
  - `selectedNodeIds[]`
  - `selectedEdgeIds[]`
  - `lassoBounds` (nullable)
  - `updatedAt`
- **Validation rules**:
  - IDs must reference current canvas entities.
  - `lassoBounds` must be null outside lasso mode.

## Entity: CommandHistoryEntry

- **Purpose**: Undo/redo command record.
- **Key fields**:
  - `id`
  - `workspaceId`
  - `canvasId`
  - `commandType`
  - `forwardPayload`
  - `inversePayload`
  - `transactionId`
  - `label`
  - `createdAt`
- **Validation rules**:
  - `inversePayload` required for undoable commands.
  - History per canvas must preserve at least 100 reversible actions.

## Entity: HistoryPanelState

- **Purpose**: UI state for visible undo/redo history panel.
- **Key fields**:
  - `workspaceId`
  - `canvasId`
  - `isOpen`
  - `cursorIndex`
  - `filterText`
- **Validation rules**:
  - `cursorIndex` must map to valid history position.

## Entity: SemanticViewState

- **Purpose**: Controls semantic detail mode per canvas.
- **Key fields**:
  - `workspaceId`
  - `canvasId`
  - `mode` (`auto`, `manual`)
  - `manualLevel` (`all`, `lines`, `summary`, `keywords`, nullable when auto)
  - `zoomBreakpoints`
- **Validation rules**:
  - `manualLevel` required only for manual mode.
  - Breakpoints must be ordered and non-overlapping.

## Entity: TextExtractionEvent

- **Purpose**: Captures highlight-to-node extraction provenance.
- **Key fields**:
  - `id`
  - `workspaceId`
  - `canvasId`
  - `sourceNodeId`
  - `targetNodeId`
  - `selectionStartOffset`
  - `selectionEndOffset`
  - `createdAt`
- **Validation rules**:
  - Source and target nodes must exist and share canvas context.
  - Offsets must be valid for source content length.

## Entity: HierarchyLink

- **Purpose**: Abstraction relationship between canvases.
- **Key fields**:
  - `id`
  - `workspaceId`
  - `parentCanvasId`
  - `childCanvasId`
  - `linkType` (`broad-topic`, `subtopic`, `sibling-grouping`)
  - `createdAt`
- **Validation rules**:
  - Parent and child must belong to same workspace.
  - Cycles are disallowed.

## Entity: GeneratedSubtopicCandidate

- **Purpose**: Captures generated subtopic suggestions prior to explicit hierarchy expansion.
- **Key fields**:
  - `id`
  - `workspaceId`
  - `canvasId`
  - `sourceNodeId`
  - `label`
  - `rank`
  - `selectedForExpansion` (boolean)
  - `createdAt`
- **Validation rules**:
  - Candidate labels must be non-empty.
  - Child canvases/hierarchy links may only be created from `selectedForExpansion=true` candidates.
  - Candidate records must reference existing source node and canvas context.

## Entity: Snapshot

- **Purpose**: Recovery checkpoint for local-first durability.
- **Key fields**:
  - `id`
  - `workspaceId`
  - `snapshotReason` (`interval`, `operation-threshold`, `pagehide`, `manual`)
  - `graphPayloadRef`
  - `createdAt`
- **Validation rules**:
  - Snapshot payload reference must exist.
  - Snapshot metadata must include schema version.

## Entity: BackupBundleManifest

- **Purpose**: Export/import metadata for workspace backups.
- **Key fields**:
  - `backupId`
  - `workspaceId`
  - `backupFormatVersion`
  - `schemaVersion`
  - `exportedAt`
  - `chunks[]`
  - `checksums[]`
- **Validation rules**:
  - All chunks must pass checksum validation on import.
  - Unsupported format versions must fail with actionable user message.

## Entity: ConflictEvent

- **Purpose**: Records cross-tab last-write-wins supersession incidents.
- **Key fields**:
  - `id`
  - `workspaceId`
  - `canvasId`
  - `entityType` (`node`, `edge`, `group`, `canvas`)
  - `entityId`
  - `winnerTabId`
  - `loserTabId`
  - `detectedAt`
  - `notificationShown`
- **Validation rules**:
  - Conflict events deduplicated by entity + timestamp window.
  - `notificationShown` toggles true only after visible UI notice.

## Entity: GenerationRequest

- **Purpose**: Model invocation metadata and lifecycle.
- **Key fields**:
  - `id`
  - `workspaceId`
  - `canvasId`
  - `sourceNodeId`
  - `intent` (`prompt`, `explain`, `questions`, `subtopics`)
  - `provider`
  - `model`
  - `status` (`pending`, `streaming`, `completed`, `failed`, `cancelled`)
  - `errorCategory`
  - `startedAt`, `completedAt`
- **Validation rules**:
  - Question-generation output must include why/what/when/where/how coverage.
  - Status transitions must follow allowed state machine.

## Entity: GenerationAttempt

- **Purpose**: Retry-aware attempt record for a generation request.
- **Key fields**:
  - `id`
  - `generationRequestId`
  - `attemptNumber`
  - `triggerType` (`initial`, `manual-retry`)
  - `preservedSelectionSnapshot`
  - `preservedInspectorDraftRef`
  - `status`
  - `startedAt`, `completedAt`
- **Validation rules**:
  - Retries must use `triggerType=manual-retry`.
  - Selection and draft references must remain available during retry.

## Entity: ProviderCredential

- **Purpose**: Persisted BYOK credential metadata.
- **Key fields**:
  - `id`
  - `provider`
  - `authType` (`api-key`, `oauth`)
  - `encryptedCredentialRef`
  - `status` (`active`, `invalid`, `revoked`)
  - `lastValidatedAt`
  - `updatedAt`
- **Validation rules**:
  - Plaintext credential persistence is forbidden.
  - Consumer/CLI token patterns are invalid.
  - Revoked credentials cannot start new generation requests.

## Entity: LocalLogEvent

- **Purpose**: Structured local telemetry record.
- **Key fields**:
  - `id`
  - `requestId`
  - `eventDomain` (`generation`, `persistence`, `conflict`)
  - `eventType`
  - `provider` (nullable)
  - `outcome`
  - `timestamp`
  - `metadata`
- **Validation rules**:
  - Logs must never include credential plaintext or sensitive prompt payloads.
  - Log schema must remain structured and machine-parseable.

## Relationships

- Workspace 1:N Canvas
- Canvas 1:N Node
- Canvas 1:N Edge
- Canvas 1:N NodeGroup
- Canvas 1:N CommandHistoryEntry
- Canvas 1:1 HistoryPanelState
- Canvas 1:1 SemanticViewState
- Canvas 1:N TextExtractionEvent
- Workspace 1:N HierarchyLink
- Canvas 1:N GeneratedSubtopicCandidate
- Workspace 1:N Snapshot
- Workspace 1:N BackupBundleManifest
- Workspace 1:N ConflictEvent
- Workspace 1:N GenerationRequest
- GenerationRequest 1:N GenerationAttempt
- Workspace 1:N ProviderCredential
- Workspace 1:N LocalLogEvent

## State Transitions

### GenerationRequest Status

- `pending -> streaming -> completed`
- `pending -> failed`
- `streaming -> failed`
- `pending -> cancelled`
- `streaming -> cancelled`

### GenerationAttempt Status

- `pending -> streaming -> completed`
- `pending -> failed`
- `streaming -> failed`

### ProviderCredential Status

- `active -> invalid`
- `invalid -> active`
- `active -> revoked`
- `invalid -> revoked`

### ConflictEvent Status

- `notificationShown=false -> notificationShown=true` after UI notice is rendered

### Canvas Editing Session (Desktop v1)

- `idle -> selecting -> dragging|connecting|lassoing -> idle`
- `idle -> editing-node -> idle`
- `idle -> undoing|redoing -> idle`
