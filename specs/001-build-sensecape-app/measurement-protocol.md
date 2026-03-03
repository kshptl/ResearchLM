# Measurement Protocol

## FR-033 Output Quality Policy

- minUniqueItemRatio: 0.70
- maxDuplicateItemRatio: 0.30
- keywordCoverage off-topic threshold: 0.50
- requiredSourceKeywords derivation: trim + case-fold + punctuation stripping, then first 10 unique source tokens with length >= 4

### FR-033 Formulas and Defaults

- uniqueItemRatio = uniqueItemCount / totalItemCount
- duplicateItemRatio = 1 - uniqueItemRatio
- keywordCoverage = matchedRequiredKeywords / totalRequiredKeywords
- default generated-item boundary: whitespace-delimited token
- default empty-output trigger: trimmed output length == 0

### Policy Ownership and Change Control

- owner: product + applied-research leads
- change window: weekly release planning unless emergency rollback needed
- required evidence for threshold updates: 3-run sample with before/after deltas
- versioning: each policy revision increments a dated policy note in this document

## SC-004/SC-005 Evaluation Method

### Participant Sampling

- recruit 12-18 participants across novice/intermediate/advanced research workflow familiarity
- include at least 30% participants who have not used graph-based note tools
- capture device/browser metadata for each run

### Baseline Method

- baseline condition: manual note-taking workflow in the same source corpus
- treatment condition: Sensecape multilevel workflow with semantic levels enabled
- randomize condition order per participant to reduce sequence bias

### Analysis Steps

- compute per-participant deltas for task completion time and insight count
- run paired comparisons on SC-004 (understanding) and SC-005 (overload management)
- document outliers and rerun rationale when data quality flags occur

## Performance Evidence Metadata Schema

- runId
- recordedAt (ISO-8601)
- browser/version
- viewport
- hardware class
- network summary
- dataset profile (node/edge/canvas counts)
- quota/rate-limit status
- git branch and commit hash
- scenario label (node-interaction, view-switch, generation-first-visible-content)
