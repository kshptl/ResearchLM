# Visual Review Checklist: Researchlm Exploration App

**Purpose**: Capture approval metadata and rubric evidence for visual baseline updates and release-candidate visual sign-off.

## Approval Metadata Template (FR-036)

- [ ] `reviewId` recorded
- [ ] `approvalOwner` recorded
- [ ] `reviewer` recorded
- [ ] `reviewedAt` (ISO-8601) recorded
- [ ] `linkedFRs` recorded
- [ ] `linkedUserStories` recorded
- [ ] `changedVSIds` recorded
- [ ] `rationale` recorded

## Visual Rubric (FR-037 / SC-011)

Score each category from 1.0 to 5.0.

- [ ] visualHierarchy score recorded
- [ ] readability score recorded
- [ ] spacingConsistency score recorded
- [ ] colorHarmony score recorded
- [ ] affordanceClarity score recorded
- [ ] average score >= 4.0
- [ ] no category score < 3.5

## Evidence Artifact Record

- [ ] Baseline/current/diff artifact links captured for each changed snapshot
- [ ] `npm run test:visual` result captured
- [ ] `npm run validate:visual-coverage` result captured
- [ ] Artifact record saved at `specs/001-build-researchlm-app/checklists/visual-review/<date>-<commit>.md`
