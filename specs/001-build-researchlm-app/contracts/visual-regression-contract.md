# Visual Regression Contract

## Purpose

Define deterministic visual acceptance rules for FR-034 through FR-037 and SC-009 through SC-011.

## Required Browser Projects

- `chromium-desktop`
- `firefox-desktop`

All required visual states MUST be captured and approved in both projects.

## Deterministic Capture Environment

The visual harness MUST enforce the following settings before each snapshot:

- viewport: `1440x900`
- `deviceScaleFactor`: `1`
- locale: `en-US`
- timezone: `UTC`
- reduced motion: `reduce`
- color scheme: `light`

### Font Determinism Policy

- Visual tests MUST use a deterministic font stack defined in CSS variables and loaded from pinned local assets or a pinned package version.
- The contract-required fallback order is:
  1. primary UI font (pinned)
  2. `Segoe UI`
  3. `Helvetica Neue`
  4. `Arial`
  5. `sans-serif`
- The test harness MUST wait for `document.fonts.ready` before taking snapshots.
- If the primary pinned font is unavailable, the test run MUST fail fast and mark visual checks invalid for baseline comparison.

## Canonical Visual State Coverage

The following states are mandatory and correspond to `spec.md` state IDs:

- `VS-001` workspace default
- `VS-002` selected node + inspector details
- `VS-003` generation actions
- `VS-004` generation failure notice
- `VS-005` hierarchy active-state emphasis
- `VS-006` subtopic candidate lifecycle
- `VS-007` semantic auto mode
- `VS-008` semantic manual keywords mode
- `VS-009` persistence controls panel
- `VS-010` conflict notice visible
- `VS-011` recovery-required state
- `VS-012` unsupported viewport guidance state

### Snapshot Cardinality Rule

- Minimum required approved baselines: `1 snapshot per VS state per required browser project`.
- With 12 states and 2 required projects, minimum baseline set = `24 snapshots`.
- A missing baseline for any required state/project pair is a merge-blocking failure.

## Dynamic Region Masking

Allowed masking is limited to non-semantic unstable UI elements:

- timestamps
- request IDs
- streaming cursor
- transient loading indicators

Masking MUST NOT cover semantic content, layout, typography hierarchy, actionable controls, or notice severity styling.

## Diff Threshold Enforcement

Thresholds are defined in `/home/kush/researchlm/specs/001-build-researchlm-app/measurement-protocol.md` and MUST be enforced in CI.

## Baseline Update Approval Metadata

Every approved baseline change MUST include:

- `reviewId`
- `approvalOwner`
- `reviewer`
- `reviewedAt`
- `linkedFRs`
- `linkedUserStories`
- `changedVSIds`
- `rationale`

Metadata is recorded in `/home/kush/researchlm/specs/001-build-researchlm-app/checklists/visual-review.md`.

## CI Gate Expectations

- Visual checks MUST run in merge-blocking CI.
- Visual check failures MUST upload baseline/current/diff artifacts.
- Visual coverage validation (FR/US to VS mapping + artifact presence) MUST pass before merge.
