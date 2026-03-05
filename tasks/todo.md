# Task Plan

## 2026-03-04 Manual Persistence + workspaceId Assumption Scan

- [x] Identify all tests/components tied to manual persistence controls (`Snapshot now`, `Export backup`, `Import backup`, `Simulate conflict`).
- [x] Identify tests/components that assume a single `workspaceId`.
- [x] Capture file-level expectations/assertions relevant to migrating to auto-save chat sessions.
- [x] Add review notes with concise findings summary.

### Review

- Manual persistence buttons are defined in `components/workspace/provider-settings/persistence-status.tsx` and wired from `app/(workspace)/page.tsx`.
- Test coverage tied to these controls appears in:
  - `tests/contract/workspace-ui.contract.test.tsx`
  - `tests/integration/persistence/workspace-resume.test.tsx`
  - `tests/integration/persistence/workspace-backup-restore.test.tsx`
  - `tests/integration/persistence/cross-tab-conflict-notice.test.tsx`
  - `tests/e2e/us4-session-resume.spec.ts`
  - `tests/e2e/visual/us4-visual.spec.ts`
- Explicit single-workspace assumptions (`"local-workspace"` / `"root"` / global localStorage keys) appear in:
  - `app/(workspace)/page.tsx`
  - `components/workspace/canvas/canvas-board.tsx`
  - `features/generation/use-generation.ts`
  - `tests/integration/persistence/semantic-view-resume.test.tsx`
  - `tests/integration/workspace/semantic-manual-persistence.test.tsx`
  - `tests/integration/persistence/cross-tab-conflict-notice.test.tsx`

## 2026-03-04 Auto-Save Chat Sessions + Resume/New UI

- [x] Add chat session persistence store and repository APIs (`chatSessions`, active chat setting, list/get/save).
- [x] Refactor workspace page state around active chat session (load/create/switch) and remove manual persistence controls.
- [x] Wire debounced autosave (300ms) for all graph/content/layout updates plus immediate flush on chat switch/unload.
- [x] Add top-right editable chat title (double click to edit, Enter/blur commit rename).
- [x] Add startup chooser: recent chats list on left, vertical shadcn separator, new chat prompt on right.
- [x] Generate default chat title from first prompt via selected provider/model with safe fallback.
- [x] Update `CanvasBoard`/`CentralPromptBar` interfaces to support resume chooser and parent-driven persistence sync.
- [x] Update tests for removed manual persistence UI and new chat resume/autosave flows; run validation suite.

### Review

- Added `chatSessions` store in IndexedDB (`DB_VERSION` 3) with repository helpers for session and setting persistence.
- Rebuilt workspace page persistence flow around chat sessions:
  - bootstraps a draft chat immediately,
  - loads existing sessions for resume list,
  - saves snapshots + session metadata via debounced autosave (300ms),
  - flushes on visibility/unload and on explicit chat resume.
- Removed manual persistence UI/actions (`Snapshot now`, `Export backup`, `Import backup`, `Simulate conflict`) from settings.
- Added top-right editable chat title with double-click inline edit and Enter/blur commit.
- Added startup resume/new split in central prompt UI using shadcn components:
  - left `Resume chat` list in `ScrollArea`,
  - center vertical `Separator`,
  - right new prompt composer.
- Added first-prompt AI title generation attempt through `/api/llm/stream`, with robust fallback to prompt-derived title if unavailable.
- Extended `CanvasBoard` contract to accept chat-scoped initial state and emit graph/model updates upward for autosave.
- Updated automated coverage for the new behavior and removed obsolete manual-persistence expectations.
- Verification:
  - `npm run typecheck`: pass.
  - `npx vitest run tests/contract/workspace-ui.contract.test.tsx tests/integration/persistence/workspace-resume.test.tsx tests/integration/persistence/workspace-backup-restore.test.tsx tests/integration/persistence/cross-tab-conflict-notice.test.tsx --reporter=dot`: pass.
  - `npx playwright test tests/e2e/us4-session-resume.spec.ts tests/e2e/auth-model-picker.spec.ts --project=chromium-desktop`: pass.

## 2026-03-04 Node Color Contrast Auto-Adjust

- [x] Implement node color theme derivation that computes readable foreground/border/muted tokens from selected color.
- [x] Apply computed theme tokens to node card subtree so text, borders, controls, and handles adapt automatically.
- [x] Preserve existing default node color behavior when no custom color is selected.
- [x] Add unit tests for color parsing and contrast guarantees.
- [x] Run verification (`typecheck`, focused Vitest, focused Playwright) and record outcomes.

### Review

- Added `createNodeThemeStyle` in `features/graph-model/node-color-theme.ts`:
  - Parses `hsl(...)`, `rgb(...)`, and hex color tokens.
  - Computes contrast-aware foreground using WCAG contrast ratio (pure black/white selection for robust readability on mid-tones).
  - Derives node-local theme tokens (`--foreground`, `--border`, `--muted-foreground`, etc.) from selected color.
- Updated `components/workspace/canvas/flow-nodes/researchlm-node.tsx`:
  - Applies computed node-local CSS variables at node root when a custom color is selected.
  - Keeps prior default topic node background/foreground when no custom color is selected.
  - Ensures existing shadcn token-based classes inside the node automatically inherit readable colors.
- Added tests in `tests/unit/graph-model/node-color-theme.test.ts`:
  - Unparseable token fallback.
  - Contrast >= 4.5 for light, dark, and mid-tone selected colors.
- Verification:
  - `npm run typecheck`: pass.
  - `npx vitest run tests/unit/graph-model/node-color-theme.test.ts tests/unit/components/researchlm-node-wheel.test.tsx`: pass.
  - `npx playwright test tests/e2e/node-tooltips.spec.ts --project=chromium-desktop`: pass.

## 2026-03-04 Prompt Padding + Resize Smoothness

- [x] Fix left padding in the initial central prompt input so text no longer touches the edge.
- [x] Fix left padding in node prompt editors for all newly created/future nodes.
- [x] Investigate React Flow resize lag with Context7 and apply a smoother resize strategy.
- [x] Fix settings default-model picker lockup (selection/dismiss should not freeze app interactions).
- [x] Validate behavior with targeted tests (`typecheck`, relevant Vitest, relevant Playwright).

### Review

- Prompt padding fixes:
  - Updated initial prompt input left/right padding in `components/workspace/canvas/central-prompt-bar.tsx` (`px-0` -> `px-3`).
  - Updated node inline prompt editor textarea padding in `components/workspace/canvas/flow-nodes/researchlm-node.tsx` (`px-0` -> `px-2`).
- Resize smoothness improvements:
  - Context7 research (`/xyflow/xyflow`, `/xyflow/web`) confirms `NodeResizer` lifecycle callbacks and highlights React Flow performance risk from frequent unnecessary re-renders.
  - Restored live resize rendering using `NodeResizer.onResize` in `components/workspace/canvas/flow-nodes/researchlm-node.tsx`, but batched updates with `requestAnimationFrame` to reduce update pressure.
  - Persisted metadata timestamp updates only on `onResizeEnd` while still applying transient dimension changes during drag.
  - Prevented force-layout teardown/recreate loops during live resize by removing dimensions from the force-layout effect signature and triggering a single layout refresh nonce bump on final resize in `components/workspace/canvas/canvas-board.tsx`.
- Settings model picker lockup fix:
  - Replaced settings default-model `Select` with shadcn `Combobox` in `app/(workspace)/page.tsx` to avoid Radix modal lock behavior in the floating panel.
  - Added Playwright regression checks for outside-click dismiss + continued panel interactivity in `tests/e2e/auth-model-picker.spec.ts`.
- Verification:
  - `npm run typecheck`: pass.
  - `npx playwright test tests/e2e/floating-edges-force-layout.spec.ts --project=chromium-desktop`: pass (includes live-resize-before-mouseup regression).
  - `npx playwright test tests/e2e/auth-model-picker.spec.ts --project=chromium-desktop`: pass.
  - `npx playwright test tests/e2e/node-tooltips.spec.ts --project=chromium-desktop`: pass.

## 2026-03-04 Shadcn Re-Hash + Tooltip Provider Verification

- [x] Re-sync shadcn UI component files to upstream output (no local component customizations).
- [x] Ensure root `TooltipProvider` wraps the app layout exactly as shadcn expects.
- [x] Replace handcrafted provider dropdown composition with generated shadcn combobox primitives.
- [x] Remove conflicting global theme/CSS blocks that break stock shadcn token rendering.
- [x] Run verification (`npm run typecheck` + targeted Playwright tooltip/auth spec) and document outcomes.

### Review

## 2026-03-04 Sonner Neutral Top-Dismiss Behavior

- [x] Align app-level Sonner mounting with shadcn neutral styling (no rich color overrides).
- [x] Ensure toasts enter from top and include dismiss affordance.
- [x] Remove conflicting per-toast bottom positioning overrides.
- [x] Run verification (`npm run typecheck` + targeted Vitest Sonner notification suites) and document outcomes.

### Review

- Updated root layout to mount `<Toaster />` (removed `richColors`).
- Updated Sonner wrapper defaults to `position="top-center"` and `closeButton=true`.
- Removed conflict toast `position: "bottom-center"` override so it follows top entry behavior.
- Verification:
  - `npm run typecheck` passed.
  - `vitest` passed: `tests/integration/persistence/cross-tab-conflict-notice.test.tsx`, `tests/integration/workspace/generation-failure-notice.test.tsx`.
  - `playwright` passed: `tests/e2e/auth-model-picker.spec.ts` (chromium-desktop).

## 2026-03-04 Node Card Spacing + Content-Only Scroll (Tailwind v4)

- [x] Remove unexpected shadcn card slot whitespace in node cards.
- [x] Ensure only the content region scrolls and footer stays visible.
- [x] Verify with typecheck and focused node interaction tests.

### Review

- Tightened node card layout by overriding shadcn card defaults on `ResearchlmNode` (`gap-0 py-0`) so v4 slot spacing does not add extra vertical whitespace.
- Kept content-only scrolling by preserving the markdown region as the sole `overflow-y-auto` container and leaving footer as non-shrinking fixed section.
- Avoided shadcn slot padding side effects by replacing `border-b`/`border-t` utility triggers with explicit arbitrary border properties on header/footer.
- Verification:
  - `npm run typecheck`: pass.
  - `vitest` pass: `tests/unit/components/researchlm-node-wheel.test.tsx`.
  - `playwright` pass: `tests/e2e/node-tooltips.spec.ts` (chromium-desktop).

## 2026-03-04 Settings Panel Typography + Spacing Cleanup

- [x] Reduce settings panel shell spacing and heading sizes.
- [x] Normalize provider auth card spacing/font sizes to compact density.
- [x] Tighten persistence section spacing/buttons/text.
- [x] Verify with typecheck + targeted settings/auth tests.

### Review

- Compressed settings panel shell spacing in [page.tsx](/home/kush/researchlm/app/(workspace)/page.tsx): tighter header row, smaller title size, reduced scroll-area padding, and reduced section heading spacing.
- Normalized provider form density in [provider-credentials-form.tsx](/home/kush/researchlm/components/workspace/provider-settings/provider-credentials-form.tsx): removed shadcn card slot gap/py inflation, reduced internal spacing, tightened tabs/table typography, and set combobox input sizing to text-xs.
- Removed the inner provider card header label "Provider Credentials (BYOK)" to simplify visual hierarchy.
- Tightened persistence controls in [persistence-status.tsx](/home/kush/researchlm/components/workspace/provider-settings/persistence-status.tsx): smaller copy/button text and tighter action wrapping gaps.
- Updated E2E selector to locate settings form structurally (by settings panel) instead of the removed header text in [auth-model-picker.spec.ts](/home/kush/researchlm/tests/e2e/auth-model-picker.spec.ts).
- Verification:
  - `npm run typecheck`: pass.
  - `vitest` pass: `tests/integration/workspace/focus-restoration.test.tsx`.
  - `playwright` pass: `tests/e2e/auth-model-picker.spec.ts` (chromium-desktop).

## 2026-03-04 GitHub Provider Merge + Follow-up Context Blocks

- [x] Merge GitHub Models + Copilot into one `github` provider in settings/auth/model discovery paths.
- [x] Keep auth tabs as `API Key` + `Copilot OAuth` under the merged provider.
- [x] Ensure model discovery and runtime provider IDs stay canonical (`github`) with backward compatibility aliases.
- [x] Replace node streaming three-dot indicator with shadcn spinner beside the color picker action.
- [x] Prefill follow-up nodes with a visible context block from selected text.
- [x] Convert visible `[Context]...[/Context]` blocks into backend `<context>...</context>` XML tags at generation time.
- [x] Verify with typecheck + targeted Vitest + targeted Playwright.

### Review

- Merged provider handling:
  - Added canonical provider normalization for GitHub aliases in credential storage and active credential selection.
  - Updated auth method registry so `github` exposes API key + Copilot OAuth tabs.
  - Updated auth route to accept `/api/auth/providers/github` and return `provider: "github"` for Copilot OAuth success.
  - Updated provider discovery/catalog output to normalize GitHub entries and dedupe settings options.
  - Updated model discovery to canonicalize provider IDs and always emit `providerId: "github"` for merged GitHub flows.
  - Updated adapter registry/runtime mapping to support `provider: "github"`.
- Follow-up context blocks:
  - Added `features/generation/context-block.ts` helpers.
  - Right-click follow-up now seeds child prompt with `[Context]...[/Context]` visible block for user editing.
  - Backend prompt composition now transforms visible context blocks into XML context tags before request dispatch.
- Node streaming indicator:
  - Removed jumping dots and added shadcn `Spinner` beside the color picker footer action.
- Verification:
  - `npm run typecheck`: pass.
  - `vitest` pass:
    - `tests/unit/auth/method-registry.test.ts`
    - `tests/unit/providers/model-discovery.test.ts`
    - `tests/unit/providers/github-copilot-adapter.test.ts`
    - `tests/unit/generation/context-block.test.ts`
    - `tests/unit/generation/conversation-context.test.ts`
    - `tests/integration/workspace/response-follow-up-context-menu.test.tsx`
    - `tests/contract/llm-stream.contract.test.ts`
    - `tests/unit/providers/catalog.test.ts`
- `playwright` pass:
  - `tests/e2e/auth-model-picker.spec.ts`
  - `tests/e2e/node-tooltips.spec.ts` (chromium-desktop)

## 2026-03-04 Default Model Settings + System Dark Mode + Motion Polish

- [x] Add a settings-panel default model picker that reflects active authorized providers/models and updates the workspace default model.
- [x] Persist workspace default model selection so first-node picker and settings picker stay in sync across reloads.
- [x] Wire `next-themes` provider for system-tied dark mode and update core workspace surfaces to use theme-aware tokens.
- [x] Add tasteful motion polish (panel/picker/menu entry transitions + subtle node/card transitions) using existing shadcn/tw-animate conventions.
- [x] Verify with `npm run typecheck`, targeted Vitest, and targeted Playwright coverage for settings/model/theme behavior.

### Review

- Added shared default-model preference utilities in `features/generation/default-model-preference.ts` (localStorage persistence + in-tab sync event + subscription API).
- Updated `CanvasBoard` to:
  - initialize default provider/model from persisted preference,
  - persist updates whenever first-node model selection (or fallback reselection) changes,
  - subscribe to preference changes pushed from Settings,
  - publish active authorized provider/model catalog back to the settings panel.
- Added a new `Default Model` section in the settings panel (`app/(workspace)/page.tsx`) that:
  - shows only models from currently authorized providers,
  - updates the shared default model state used by generation.
- Wired system dark mode with `next-themes`:
  - added `components/theme-provider.tsx`,
  - wrapped root layout with `<ThemeProvider ... defaultTheme="system" enableSystem />`,
  - kept Sonner/Tooltip under the same provider.
- Applied theme-token styling to core workspace surfaces (settings shell, node detail panel, prompt bar, node cards, markdown content, persistence/auth text) and added dark node token variables in `app/globals.css`.
- Added motion polish using existing tw-animate classes:
  - settings panel slide/fade in,
  - node detail panel slide/fade in,
  - central prompt bar fade/zoom/slide in,
  - context follow-up menu fade/zoom in,
  - subtle node-card entrance and hover lift.
- Added automated coverage:
  - `tests/unit/generation/default-model-preference.test.ts` (persistence + subscription behavior),
  - extended `tests/e2e/auth-model-picker.spec.ts` with settings default-model sync validation.
- Verification:
  - `npm run typecheck`: pass.
  - `npx vitest run tests/unit/generation/default-model-preference.test.ts tests/unit/generation/context-block.test.ts`: pass.
  - `npx playwright test tests/e2e/auth-model-picker.spec.ts --project=chromium-desktop`: pass.
  - `npx playwright test tests/e2e/node-tooltips.spec.ts --project=chromium-desktop`: pass.

## 2026-03-04 Provider Auth Section Cleanup (Minimal + Tabs + Saved Table)

- [x] Replace auth-method dropdown with compact provider-specific tabs.
- [x] Keep OAuth/API/AWS flows but trim non-essential management controls from default UI.
- [x] Remove replace-credential management flow from settings panel and form props.
- [x] Add saved providers table (provider, auth method, masked key, revoke action).
- [x] Update integration/e2e coverage for new auth control flow.
- [x] Run verification (`npm run typecheck`, targeted Vitest + Playwright).

### Review

- Refactored `ProviderCredentialsForm` to use shadcn `Tabs` as the auth method selector and deduped methods by type for a cleaner surface.
- Preserved required provider-specific OAuth behavior (including GitHub Copilot enterprise deployment input) while reducing control density.
- Replaced the old saved-credentials management panel with a shadcn `Table` plus masked secret display and per-row revoke action.
- Removed `onReplace` wiring from the workspace settings panel and credentials form.
- Updated tests:
  - `tests/integration/workspace/focus-restoration.test.tsx` now validates saved providers table rendering + revoke callback.
  - `tests/e2e/auth-model-picker.spec.ts` now selects auth via tabs instead of the removed method dropdown.
- Verification:
  - `npm run typecheck`: pass.
  - `npx vitest run tests/integration/workspace/focus-restoration.test.tsx tests/contract/workspace-ui.contract.test.tsx`: pass.
  - `npx playwright test tests/e2e/auth-model-picker.spec.ts --project=chromium-desktop`: pass.

## 2026-03-04 Conflict Notice Startup Regression

- [x] Investigate repeated conflict notice display on page load.
- [x] Remove startup behavior that auto-activates the most recent persisted conflict event.
- [x] Add regression test ensuring old persisted conflicts do not auto-open notice after reload.
- [x] Run verification (`npm run typecheck`, targeted Vitest).

### Review

- Root cause was startup hydration in `WorkspacePage` forcing `activeNoticeId` to the latest persisted conflict event.
- Fixed by loading historical conflict events for recordkeeping without auto-activating a notice.
- Added integration coverage in `tests/integration/persistence/cross-tab-conflict-notice.test.tsx`:
  - Existing conflict actionability test still passes.
  - New test verifies historical persisted conflict does not auto-render the conflict notice on page load.
- Verification:
  - `npm run typecheck`: pass.
  - `npx vitest run tests/integration/persistence/cross-tab-conflict-notice.test.tsx`: pass.

- [x] Review feature input and extract core concepts from the provided PDF.
- [x] Determine short branch name and next feature number across remote, local, and specs sources.
- [x] Create feature branch and scaffold spec using specify script.
- [x] Draft complete feature specification in `specs/001-build-researchlm-app/spec.md`.
- [x] Validate specification quality and create checklist in `specs/001-build-researchlm-app/checklists/requirements.md`.
- [x] Run planning setup and generate `plan.md` for `001-build-researchlm-app`.
- [x] Complete Phase 0 research artifact at `specs/001-build-researchlm-app/research.md`.
- [x] Complete Phase 1 design artifacts: `data-model.md`, `contracts/`, and `quickstart.md`.
- [x] Update agent context via `.specify/scripts/bash/update-agent-context.sh opencode`.
- [x] Re-run plan workflow after UI clarifications with expanded front-end architecture detail.
- [x] Expand planning artifacts to cover advanced canvas/node UI scope and front-end contracts.
- [x] Re-run `/speckit.plan` after latest clarification pass and regenerate phase artifacts.
- [x] Tighten planning outputs to address latest analysis gaps (quality gates, extraction/retry UX, history panel, performance baseline definitions).
- [x] Regenerate `specs/001-build-researchlm-app/tasks.md` from latest clarified spec and refreshed plan artifacts.
- [x] Re-run `/speckit.plan` after final clarification updates and regenerate planning/design artifacts.

## Review

- Completed full spec for implementing the Researchlm-style multilevel exploration and sensemaking application described in the PDF.
- Confirmed no unresolved clarification markers remain.
- Prepared outputs for next phase (`/speckit.plan` or `/speckit.clarify`).
- Completed planning workflow through Phase 2 planning stop-point with constitution gates passing pre- and post-design.
- Refined planning depth for front-end requirements (three-pane layout, six node types, advanced canvas interactions, undo/redo depth, desktop-only scope).
- Rebuilt plan/research/data-model/contracts/quickstart from template after setup-plan reset and revalidated no unresolved planning placeholders.
- Replaced task plan with front-end-heavy, requirement-complete breakdown including explicit coverage for extraction flow, retry preservation UX, history panel UI, and formatting/static-analysis quality gates.
- Rebuilt plan outputs again after constitution/compliance and acceptance-coverage clarifications; confirmed no unresolved placeholders or clarification markers in planning artifacts.

## 2026-03-04 Provider Parity Mapping

- [x] Inventory all files/symbols hardcoding provider enums, provider options, and model lists.
- [x] Document auth schema limitations versus opencode-style provider requirements (OAuth, API key, well-known/API endpoints, provider metadata blobs).
- [x] Document runtime adapter limitations and required architectural changes for dynamic catalog-driven providers.
- [x] Map impacted tests plus missing tests required for safe migration.
- [x] Add review notes summarizing findings and verification evidence.

### Review

- Mapped hardcoded provider/model/auth enums across request schema, generation types, provider registry/adapters, settings UI, canvas model overrides, and tests.
- Identified auth model gaps for OAuth token lifecycle fields, provider API/well-known discovery metadata, and provider-specific credential/config payload support.
- Documented runtime architecture changes needed to support dynamic providers/models from a catalog source instead of compile-time provider wiring.
- Enumerated existing tests requiring migration updates and proposed missing unit/integration/contract suites for dynamic catalog + auth parity coverage.

## 2026-03-04 OpenCode Auth Parity Implementation

- [x] Add a dynamic provider catalog layer (models.dev fetch + local fallback + priority ordering).
- [x] Add auth method registry with OpenCode-style options (OpenAI OAuth browser/headless, GitHub Copilot OAuth, API-key fallback).
- [x] Migrate credential store to structured auth payloads with backward-compatible legacy record hydration.
- [x] Update generation and stream request contracts to dynamic provider IDs and structured auth.
- [x] Replace static provider adapter registry with catalog-driven runtime adapter selection.
- [x] Implement OpenAI and GitHub Copilot auth API routes needed by the settings form.
- [x] Refactor provider credentials form to use dynamic provider list and method list.
- [x] Update workspace generation wiring to stop hardcoding Bedrock provider defaults.
- [x] Extend sensitive-field log redaction for OAuth and provider-secret fields.
- [x] Update/add tests for catalog, auth method selection, credential migration, and dynamic stream validation.
- [x] Run `npm test` and `npm run lint`, then document implementation review outcomes.

### Review

- Added dynamic provider catalog loading via `models.dev` with fallback providers and priority ordering.
- Implemented OpenCode-style auth method registry and provider auth route handlers for OpenAI (browser/headless), Anthropic (oauth variants), and GitHub Copilot (device oauth).
- Migrated credential storage to structured payloads (`api`, `oauth`, `wellknown`, `aws-profile`, `aws-env-chain`) while upgrading legacy records in-place.
- Switched stream request parsing to dynamic provider IDs with structured auth unions and catalog-enriched provider runtime metadata.
- Reworked provider adapter registry to support aliasing/inference from provider catalog metadata and added real runtime adapters for OpenAI-compatible, Anthropic, Gemini, GitHub Models, and GitHub Copilot paths.
- Refactored provider settings form to dynamic provider and method sources with OAuth start/complete/poll UX and preserved saved-credential management behavior.
- Removed Bedrock hardcoding from canvas generation defaults and model override picker by sourcing models from catalog.
- Expanded secret redaction taxonomy for OAuth/token-specific fields.
- Added/updated tests:
  - `tests/unit/providers/catalog.test.ts`
  - `tests/unit/auth/method-registry.test.ts`
  - `tests/unit/persistence/credential-lifecycle.test.ts`
  - `tests/unit/persistence/log-redaction-policy.test.ts`
  - `tests/contract/llm-stream.contract.test.ts`
- Verification:
  - `npm test`: pass (52 files / 91 tests).
  - `npm run typecheck`: pass.
  - `npm run lint`: blocked by existing project toolchain mismatch (`next lint` on Next 16 resolves as invalid project directory `.../lint`).

## 2026-03-04 OpenAI No-Text Generation Fix

- [x] Trace end-to-end OpenAI generation path from UI payload to adapter stream parsing.
- [x] Reproduce and identify root cause for no-text output.
- [x] Fix provider endpoint URL construction so versioned base paths are preserved.
- [x] Ensure SSE `error` events propagate as surfaced generation failures instead of silent empty output.
- [x] Add regression tests for URL joining and stream error propagation.
- [x] Run verification (`npm test`, `npm run typecheck`) before claiming completion.

### Review

- Root cause identified in adapter endpoint construction: leading `/` in `new URL("/chat/completions", "https://api.openai.com/v1")` dropped `/v1`, causing provider errors and empty output.
- Added `joinProviderUrl()` helper and migrated OpenAI, Anthropic, OpenRouter, GitHub Models, GitHub Copilot, and Gemini adapters to it.
- Updated stream consumer to throw on SSE `error` events so failures surface in UI instead of silently returning blank text.
- Added tests:
  - `tests/unit/providers/url.test.ts`
  - `tests/unit/generation/stream-consumer.test.ts`
- Verification:
  - `npm test`: pass (54 files / 96 tests).
  - `npm run typecheck`: pass.

## 2026-03-04 Auth-Scoped Model Catalog

- [x] Add provider model discovery endpoint that resolves models using active auth context (not global catalog only).
- [x] Implement provider-specific live model fetchers where supported (OpenAI-compatible, Anthropic, Gemini) with strict fallback behavior.
- [x] Add client-side model cache keyed by provider + credential version with startup stale refresh policy.
- [x] Refactor canvas model source to use active credentials only and refresh on auth save/replace/revoke.
- [x] Ensure workspace default provider/model selection stays valid when active auth set changes.
- [x] Add/adjust tests for URL/model discovery and cache behavior.
- [x] Run verification (`npm test`, `npm run typecheck`) and document outcomes.

### Review

- Added auth-scoped model discovery route `POST /api/providers/models` that accepts provider/auth payloads and returns per-provider model lists.
- Added provider discovery service with live model listing for OpenAI-compatible providers, Anthropic, and Gemini, with strict no-broad-fallback behavior when live discovery fails.
- Added browser model cache keyed by `providerId + credentialVersion` with TTL and stale refresh logic.
- Updated canvas model loading to:
  - seed from cache on startup,
  - background-refresh stale/missing entries,
  - only include providers with active credentials,
  - refresh immediately when credentials change.
- Added initial prompt model picker so the first generated node can choose model/provider before first request.
- Added tests:
  - `tests/unit/providers/model-cache.test.ts`
  - `tests/unit/providers/model-discovery.test.ts`
- Verification:
  - `npm run typecheck`: pass.
  - Targeted suites pass (`provider model` + `workspace UI` + `generation flow`).
  - Full parallel `npm test` intermittently hits existing Vitest worker OOM in this environment (non-deterministic infra/resource issue).

## 2026-03-04 Missing-Auth Guidance Toast + Authorized Model Scope

- [x] Add explicit no-auth toast guidance when there are zero active credentials.
- [x] Wire toast CTA to open settings panel directly.
- [x] Keep model list sourced only from authorized providers (active credentials + cache/refresh semantics).
- [x] Update Playwright auth-model coverage for no-auth toast and multi-provider authorized model visibility.
- [x] Run verification (`npm run typecheck`, targeted Playwright) and document results.

### Review

- Added a non-blocking toast in empty/authless state: `No active provider credentials. Open Settings to authenticate and enable model selection.`
- Added toast actions:
  - `Open settings panel` (opens settings drawer)
  - `Dismiss auth notice` (local dismissal)
- Preserved active-auth-only model behavior while keeping existing cache strategy (refreshes only stale/missing provider model entries).
- Updated Playwright test `tests/e2e/auth-model-picker.spec.ts` to verify:
  - toast visibility when no credentials,
  - no model picker before auth,
  - model picker after auth,
  - options include only authorized providers.
- Verification:
  - `npm run typecheck`: pass.
  - `npx playwright test tests/e2e/auth-model-picker.spec.ts`: pass (Chromium + Firefox).

## 2026-03-04 OpenAI OAuth First-Prompt "Instructions are required" Fix

- [x] Reproduce and trace first-prompt OpenAI OAuth generation failure (`{"detail":"Instructions are required"}`).
- [x] Compare OpenAI OAuth/Codex request behavior with OpenCode implementation.
- [x] Update OpenAI OAuth adapter request shape to include required `instructions`.
- [x] Improve OpenAI error parsing to surface `detail` payloads directly.
- [x] Add regression tests for OAuth request body and detail-error propagation.
- [x] Run verification (`vitest`, `typecheck`, targeted Playwright) and document outcomes.

### Review

- Root cause: OpenAI OAuth path (Codex endpoint) request body omitted `instructions`, causing provider response `{"detail":"Instructions are required"}` on first prompt.
- Fixes in `lib/providers/openai/adapter.ts`:
  - Added `toOauthInstructions()` and always sent `instructions` for OAuth/Codex requests.
  - Extended error message parsing to include top-level `detail` fields.
- Regression coverage in `tests/unit/providers/openai-adapter.test.ts`:
  - Assert OAuth payload includes non-empty `instructions`.
  - Assert `detail` errors are surfaced in adapter error events.
- Verification:
  - `npx vitest run tests/unit/providers/openai-adapter.test.ts`: pass (3 tests).
  - `npm run typecheck`: pass.
  - `npx playwright test tests/e2e/auth-model-picker.spec.ts`: pass (Chromium + Firefox).

## 2026-03-04 OpenAI OAuth First-Prompt "Store must be set to false" Fix

- [x] Reproduce/provider-compare the `Store must be set to false` failure.
- [x] Align OpenAI OAuth Codex payload with OpenCode default (`store: false`).
- [x] Add regression assertion that OAuth request body always sets `store: false`.
- [x] Re-run targeted verification (`vitest`, `typecheck`, Playwright auth/model spec).

### Review

- Root cause: OpenAI OAuth Codex request body still omitted `store: false` after prior payload updates.
- Fix: Set `store: false` in OAuth request body in `lib/providers/openai/adapter.ts`.
- Regression test: `tests/unit/providers/openai-adapter.test.ts` now asserts OAuth payload contains `store: false`.
- Verification:
  - `npx vitest run tests/unit/providers/openai-adapter.test.ts`: pass.
  - `npm run typecheck`: pass.
  - `npx playwright test tests/e2e/auth-model-picker.spec.ts`: pass.

## 2026-03-04 Full OAuth Parity Pass (OpenCode)

- [x] Audit OAuth request/auth parity against OpenCode for OpenAI, Anthropic, and GitHub Copilot.
- [x] Patch OpenAI OAuth adapter parity gaps (token refresh + required Codex payload/header behavior).
- [x] Patch Anthropic OAuth adapter parity gaps (token refresh + required beta header/query behavior).
- [x] Patch GitHub Copilot OAuth adapter parity gaps (enterprise base URL and request header parity).
- [x] Update model discovery for OAuth enterprise variants where base URL depends on auth payload.
- [x] Add/update unit tests for all OAuth-enabled providers to assert parity-critical request shape.
- [x] Run verification (`vitest` targeted suites, `typecheck`, Playwright auth/model spec) and document outcomes.

### Review

- OpenCode parity audit completed against:
  - `packages/opencode/src/plugin/codex.ts`
  - `packages/opencode/src/plugin/copilot.ts`
  - `opencode-anthropic-auth@0.0.13` (`index.mjs`)
- OpenAI OAuth parity fixes:
  - Added refresh-token exchange when near expiry.
  - Added account-id extraction fallback from JWT `organizations[0].id`.
  - Ensured Codex payload includes `instructions` and `store: false`.
  - Added `session_id` header and preserved Codex-specific headers.
- Anthropic OAuth parity fixes:
  - Added refresh-token exchange when near expiry.
  - Added required beta headers: `oauth-2025-04-20` and `interleaved-thinking-2025-05-14`.
  - Added `user-agent` parity and `beta=true` query parameter for OAuth requests.
- GitHub Copilot OAuth parity fixes:
  - Added enterprise base URL resolution (`https://copilot-api.<enterprise-domain>`).
  - Matched token precedence to OpenCode (`refresh` token first for OAuth).
  - Set `x-initiator` from last non-system message role (`user` vs `agent`).
  - Wired OAuth response provider overrides in credentials form so enterprise provider IDs persist correctly.
- Model discovery parity fixes:
  - Copilot enterprise model discovery now uses enterprise base URL from OAuth auth payload.
  - Anthropic OAuth discovery now includes required beta headers/query and OAuth user-agent.
- Verification:
  - `npx vitest run tests/unit/providers/openai-adapter.test.ts tests/unit/providers/anthropic-adapter.test.ts tests/unit/providers/github-copilot-adapter.test.ts tests/unit/providers/model-discovery.test.ts`: pass.
  - `npx vitest run tests/unit/providers/openai-adapter.test.ts tests/unit/providers/anthropic-adapter.test.ts`: pass.
  - `npm run typecheck`: pass.
  - `npx playwright test tests/e2e/auth-model-picker.spec.ts`: pass.

## 2026-03-04 Remove Generation Quality Guards

- [x] Remove quality-category failure notice classification from runtime error mapping.
- [x] Remove output-quality guard module and obsolete unit tests.
- [x] Update generation failure integration coverage to align with no-quality-guard behavior.
- [x] Run verification (`npm run typecheck`, targeted Vitest suites) and document outcomes.

### Review

- Removed `quality` from `GenerationFailureCategory` and removed quality-specific action mapping/classification so runtime notices no longer emit `quality:` categories.
- Deleted dead quality-guard implementation and tests:
  - `features/generation/output-contract.ts`
  - `tests/unit/generation/output-quality-guard.test.ts`
- Updated integration coverage in `tests/integration/workspace/generation-failure-notice.test.tsx` to assert empty output does not produce quality failure notices.
- Added `tests/unit/generation/failure-notice-contract.test.ts` to lock in no-`quality` classification behavior.
- Verification:
  - `npm run typecheck`: pass.
  - `npx vitest run tests/unit/generation/failure-notice-contract.test.ts tests/integration/workspace/generation-failure-notice.test.tsx tests/unit/generation/stream-consumer.test.ts`: pass.

## 2026-03-04 Preserve Parent Context on Regenerate

- [x] Trace prompt construction paths for initial submit vs regenerate in canvas node flow.
- [x] Patch regenerate path to reuse parent-chain context composition.
- [x] Add regression coverage for parent->child regenerate sequence using updated parent response.
- [x] Run verification (`npm run typecheck`, targeted Vitest) and document outcomes.

### Review

- Root cause: `handlePromptSubmit` composed ancestor context, but `handleRegenerate` sent only `node.prompt`, so child regenerate requests dropped parent conversation context.
- Added shared conversation-context helpers in `features/generation/conversation-context.ts` and reused them in both submit and regenerate paths from `components/workspace/canvas/canvas-board.tsx`.
- Added regression coverage:
  - `tests/unit/generation/conversation-context.test.ts`
  - `tests/integration/workspace/regenerate-context.test.tsx`
- Updated shared React Flow test mock to include missing `MarkerType` export required for edge rendering in this scenario.
- Verification:
  - `npm run typecheck`: pass.
  - `npx vitest run tests/integration/workspace/regenerate-context.test.tsx tests/unit/generation/conversation-context.test.ts`: pass.
  - `npx vitest run tests/unit/generation tests/integration/workspace/regenerate-context.test.tsx tests/integration/workspace/generation-failure-notice.test.tsx`: pass.

## 2026-03-04 Node Prompt Double-Click Editing

- [x] Add prompt-area double-click affordance to enter prompt editing mode for any node.
- [x] Implement multiline prompt editor keyboard behavior (`Enter` submit, `Shift+Enter` newline).
- [x] Route prompt-area edit start through React Flow adapter callbacks into canvas editing state.
- [x] Add/update tests for prompt edit UX and ensure existing retry-editing coverage aligns with no-quality-guard behavior.
- [x] Run verification (`npm run typecheck`, targeted Vitest suites) and document outcomes.

### Review

- Added `onPromptEditStart` callback through `features/graph-model/react-flow-adapters.ts` and wired it in `components/workspace/canvas/canvas-board.tsx`.
- Updated `components/workspace/canvas/flow-nodes/researchlm-node.tsx`:
  - prompt area is now a double-click editable zone,
  - editing uses a textarea with `Enter` to submit prompt regeneration and `Shift+Enter` to keep newline editing,
  - existing prompt text preloads into the editor when entering edit mode.
- Added integration regression coverage in `tests/integration/workspace/prompt-editing.test.tsx`.
- Updated `tests/integration/workspace/retry-nonblocking-editing.test.tsx` to align with current no-quality-guard behavior while still asserting node-content editing remains available.
- Verification:
  - `npm run typecheck`: pass.
  - `npx vitest run tests/integration/workspace/prompt-editing.test.tsx tests/integration/workspace/retry-nonblocking-editing.test.tsx tests/integration/workspace/regenerate-context.test.tsx`: pass.

## 2026-03-04 Side Panel Prompt-Only Editing + Response Follow-Up Context Menu

- [x] Make side panel prompt editable by default and remove response edit controls.
- [x] Keep response read-only in side panel while preserving text selection behavior.
- [x] Add selected-response right-click context action (`Follow up`) to create child node and focus prompt input.
- [x] Update/add integration coverage for side panel prompt editing and response follow-up interaction.
- [x] Run verification (`npm run typecheck`, targeted Vitest) and document outcomes.

### Review

- Updated side panel in `components/workspace/canvas/canvas-board.tsx`:
  - prompt is editable by default via `Node prompt` textarea,
  - Enter submits regenerate and Shift+Enter inserts newline,
  - response is strictly read-only (removed toggle/edit response textarea).
- Added response-selection context menu flow in `canvas-board.tsx`:
  - right-click on selected response text opens a `Follow up` action,
  - selecting `Follow up` calls existing child-node creation path and focuses prompt editing on the new node.
- Added integration test:
  - `tests/integration/workspace/response-follow-up-context-menu.test.tsx`
  - verifies selected-response right-click -> `Follow up` -> new node created + prompt editor focused.
- Updated integration test:
  - `tests/integration/workspace/retry-nonblocking-editing.test.tsx`
  - now validates side-panel prompt editing (and confirms response editor/toggle are absent).
- Verification:
  - `npm run typecheck`: pass.
  - `npx vitest run tests/integration/workspace/retry-nonblocking-editing.test.tsx tests/integration/workspace/prompt-editing.test.tsx tests/integration/workspace/response-follow-up-context-menu.test.tsx tests/integration/workspace/regenerate-context.test.tsx`: pass.
  - `npx vitest run tests/integration/workspace/generation-flow.test.tsx tests/integration/workspace/generation-failure-notice.test.tsx`: pass.

## 2026-03-04 Focused Node Scroll vs Canvas Zoom Wheel Behavior

- [x] Ensure wheel events over focused node content are consumed by node scrolling, not canvas zoom.
- [x] Ensure wheel events outside focused node still bubble to canvas zoom behavior.
- [x] Add regression coverage for focused vs unfocused wheel propagation behavior.
- [x] Run verification (`npm run typecheck`, targeted Vitest) and document outcomes.

### Review

- Added focused-node wheel behavior wiring:
  - `features/graph-model/react-flow-adapters.ts` now carries `isFocused` in node data.
  - `components/workspace/canvas/canvas-board.tsx` passes `focusedNodeId` to `toRFNodes`.
- Added focused wheel-capture behavior in `components/workspace/canvas/flow-nodes/researchlm-node.tsx`:
  - when node is focused and wheel occurs over node content, event propagation is stopped so canvas zoom does not trigger.
  - wheel outside focused node still reaches React Flow canvas for zoom.
- Added regression unit coverage:
  - `tests/unit/components/researchlm-node-wheel.test.tsx` verifies focused node blocks parent wheel propagation, unfocused node bubbles.
- Verification:
  - `npm run typecheck`: pass.
  - `npx vitest run tests/unit/components/researchlm-node-wheel.test.tsx tests/integration/workspace/response-follow-up-context-menu.test.tsx tests/integration/workspace/retry-nonblocking-editing.test.tsx tests/integration/workspace/prompt-editing.test.tsx tests/integration/workspace/regenerate-context.test.tsx`: pass.

## 2026-03-04 Rounded Node Resizer Visual Alignment

- [x] Align resize controls visually with rounded node shape.
- [x] Remove square-looking resize frame while keeping resize affordance clear.
- [x] Run verification (`npm run typecheck`, targeted Vitest) and document outcomes.

### Review

- Updated `components/workspace/canvas/flow-nodes/researchlm-node.tsx` NodeResizer styling:
  - hid square guide frame (`lineClassName="border-transparent!"`),
  - switched handles to rounded dots with border/shadow,
  - reset handle transform offsets for cleaner edge alignment on rounded nodes.
- Result: selected nodes keep rounded visual silhouette while still clearly exposing resize handles.
- Verification:
  - `npm run typecheck`: pass.
  - `npx vitest run tests/unit/components/researchlm-node-wheel.test.tsx tests/integration/workspace/prompt-editing.test.tsx`: pass.

## 2026-03-04 Floating Edges + Multi-Parent Context + Always-On Force Layout

- [x] Add floating edge type and register it in canvas edge types.
- [x] Switch canvas default edges to floating and enable loose connection mode.
- [x] Add duplicate/self-connection guards while preserving many-to-one and one-to-many links.
- [x] Refactor conversation context composition to use all upstream graph edges with branch-merge dedupe.
- [x] Add always-on force layout simulation with drag pin/release behavior.
- [x] Align NodeResizer corner handles to rounded node corners.
- [x] Add/adjust unit/integration/Playwright coverage for context graph behavior and canvas edge/layout behavior.
- [x] Run verification (`typecheck`, targeted Vitest, targeted Playwright) and capture outcomes.

### Review

- Added floating edge renderer (`components/workspace/canvas/flow-edges/floating-edge.tsx`) and edge registry, then wired it into `CanvasBoard` + adapter edge mapping.
- Added `features/graph-model/edge-validation.ts` and applied it to both `onConnect` and `isValidConnection`.
- Refactored context builder to traverse incoming edges recursively (cycle-safe), include all upstream ancestors, and dedupe converged branches.
- Added force layout engine (`features/graph-model/force-layout.ts`) backed by `d3-force`, with always-on auto simulation and drag-time pinning/release.
- Updated node resizer handle class + global CSS offsets so corner handles visually align with rounded corners.
- Added tests:
  - `tests/unit/graph-model/edge-validation.test.ts`
  - `tests/unit/graph-model/force-layout.test.ts`
  - updated `tests/unit/generation/conversation-context.test.ts`
  - new `tests/e2e/floating-edges-force-layout.spec.ts`
- Verification:
  - `npm run typecheck`: pass.
  - `npx vitest run ...` targeted suites: `PASS (16) FAIL (0)`.
  - `npx playwright test tests/e2e/floating-edges-force-layout.spec.ts tests/e2e/auth-model-picker.spec.ts --project=chromium-desktop`: `2 passed`.

## 2026-03-04 Direct shadcn/ui Adoption Pass

- [x] Replace remaining raw controls in workspace shell (`page.tsx`) with shadcn components (`Button`, `Sheet`, `Card`, `Alert`, `ScrollArea`, `Separator`).
- [x] Replace remaining raw controls in provider/auth settings form with shadcn form primitives (`Select`, `Input`, `Button`, `Label`, `Card`).
- [x] Replace remaining raw controls in canvas/inspector/hierarchy/persistence components with shadcn primitives.
- [x] Add a guard script to detect accidental reintroduction of raw controls outside allowed low-level UI primitives.
- [x] Run verification (`npm run typecheck`, targeted Vitest, targeted Playwright) and document review outcomes.

### Review

- Migrated workspace shell to shadcn primitives:
  - `app/(workspace)/page.tsx` now uses `Sheet` for settings drawer, `Button` for triggers/actions, `Alert` for recovery state, and `ScrollArea`/`Separator` for panel sections.
- Migrated provider/auth form to shadcn controls:
  - `components/workspace/provider-settings/provider-credentials-form.tsx` now uses shadcn `Select`, `Input`, `Button`, `Label`, and `Card`.
- Migrated remaining workspace UI controls to shadcn primitives:
  - `components/workspace/canvas/*`, `components/workspace/hierarchy/*`, `components/workspace/inspector/inspector-panel.tsx`, `components/workspace/persistence/conflict-notice.tsx`, `components/workspace/provider-settings/persistence-status.tsx`, `components/workspace/semantic/semantic-level-selector.tsx`.
- Updated node rendering to shadcn card layout:
  - `components/workspace/canvas/flow-nodes/researchlm-node.tsx` now uses `CardHeader` (prompt), `CardContent` (response), and `CardFooter` icon actions (`regenerate`, `follow up`, `color`, `delete`) with hover-revealed labels.
  - Added node action callbacks in `features/graph-model/react-flow-adapters.ts` and wired them in `components/workspace/canvas/canvas-board.tsx`.
- Added guard script:
  - `scripts/check-no-raw-controls.mjs` with npm script `check:no-raw-controls`.
- Verification:
  - `npm run check:no-raw-controls`: pass.
  - `npm run typecheck`: pass.
  - `npx vitest run tests/integration/workspace/prompt-editing.test.tsx tests/integration/workspace/response-follow-up-context-menu.test.tsx tests/integration/workspace/retry-nonblocking-editing.test.tsx tests/integration/workspace/regenerate-context.test.tsx tests/integration/workspace/generation-flow.test.tsx tests/integration/workspace/generation-failure-notice.test.tsx tests/unit/components/researchlm-node-wheel.test.tsx tests/unit/providers/model-discovery.test.ts tests/unit/providers/openai-adapter.test.ts tests/unit/providers/anthropic-adapter.test.ts tests/unit/providers/github-copilot-adapter.test.ts`: pass.
  - `npx playwright test tests/e2e/auth-model-picker.spec.ts tests/e2e/floating-edges-force-layout.spec.ts --project=chromium-desktop`: pass.

## 2026-03-04 Floating Settings Panel + Prompt Edit Close-on-Outside-Click

- [x] Replace top-level settings drawer behavior with floating panel semantics.
- [x] Ensure node detail panel shifts left while settings panel is open (no overlay stacking between side panels).
- [x] Close inline node prompt editor when clicking outside the active node editor container.
- [x] Re-run targeted interaction tests (Vitest + Playwright) and capture outcomes.

### Review

- Kept settings as a floating panel (`aside`) and continued passing `settingsPanelOpen` + `settingsPanelWidthPx` into canvas so node detail panel offsets to the left while settings is open.
- Confirmed inline prompt editor closes on outside click via node editor container markers (`data-node-editor-id`) and click-away handler.
- Fixed flaky integration test in `tests/integration/workspace/prompt-editing.test.tsx` by re-querying the prompt button after closing editor before the second double-click.
- Stabilized conflict notice coverage in `tests/integration/persistence/cross-tab-conflict-notice.test.tsx` by anchoring assertions to the conflict-specific text instead of generic `role="status"` (which now includes the auth guidance toast).
- Verification:
  - `npx vitest run tests/integration/workspace/prompt-editing.test.tsx tests/integration/workspace/response-follow-up-context-menu.test.tsx tests/integration/workspace/retry-nonblocking-editing.test.tsx tests/integration/workspace/regenerate-context.test.tsx`: pass.
  - `npx vitest run tests/integration/persistence/workspace-resume.test.tsx tests/integration/persistence/workspace-backup-restore.test.tsx tests/integration/persistence/cross-tab-conflict-notice.test.tsx tests/integration/workspace/subtopic-candidate-lifecycle.test.tsx tests/contract/workspace-ui.contract.test.tsx`: pass.
  - `npx vitest run tests/integration/workspace/prompt-editing.test.tsx tests/integration/persistence/cross-tab-conflict-notice.test.tsx`: pass.
  - `npm run typecheck`: pass.
  - `npx playwright test tests/e2e/auth-model-picker.spec.ts tests/e2e/floating-edges-force-layout.spec.ts --project=chromium-desktop`: pass.

## 2026-03-04 Node Content-Only Scroll + Larger Default Node Size

- [x] Record implementation scope for content-only node scroll, always-visible footer, and larger default node size.
- [x] Update node card layout so only the content section scrolls and footer remains visible.
- [x] Increase default node size for new conversation nodes.
- [x] Run targeted verification (`vitest`, `typecheck`) and document outcomes.

### Review

- Updated node layout in `components/workspace/canvas/flow-nodes/researchlm-node.tsx`:
  - card now uses a `flex` column structure,
  - `CardContent` is the only scrollable area (`min-h-0 flex-1 overflow-hidden` + inner `overflow-y-auto`),
  - footer is `shrink-0` so actions remain visible while content scrolls.
- Increased default node sizing:
  - new conversation nodes now start at `300x220` via `features/graph-model/mutations.ts`,
  - fallback force-layout defaults for nodes without explicit dimensions were aligned in `features/graph-model/force-layout.ts`.
- Verification:
  - `npx vitest run tests/integration/workspace/prompt-editing.test.tsx tests/integration/workspace/response-follow-up-context-menu.test.tsx tests/integration/workspace/retry-nonblocking-editing.test.tsx tests/unit/components/researchlm-node-wheel.test.tsx tests/unit/graph-model/force-layout.test.ts`: pass.
  - `npm run typecheck`: pass.
  - `npx playwright test tests/e2e/floating-edges-force-layout.spec.ts --project=chromium-desktop`: pass.

## 2026-03-04 Node Icon Buttons Use Tooltip Labels

- [x] Replace in-button hover text with icon-only footer action buttons.
- [x] Add shadcn tooltip labels for each node footer action button.
- [x] Run targeted verification (`vitest`, `typecheck`, Playwright smoke) and document outcomes.

### Review

- Updated `components/workspace/canvas/flow-nodes/researchlm-node.tsx`:
  - removed inline hover text from footer action buttons,
  - made footer action buttons icon-only,
  - wrapped each action in shadcn `Tooltip` with labels (`Regenerate`, `Follow up`, `Color`, `Delete`).
- Kept accessibility labels on the underlying buttons for stable test targeting and screen-reader clarity.
- Verification:
  - `npx vitest run tests/integration/workspace/prompt-editing.test.tsx tests/integration/workspace/response-follow-up-context-menu.test.tsx tests/integration/workspace/retry-nonblocking-editing.test.tsx tests/unit/components/researchlm-node-wheel.test.tsx`: pass.
  - `npm run typecheck`: pass.
  - `npx playwright test tests/e2e/floating-edges-force-layout.spec.ts --project=chromium-desktop`: pass.

## 2026-03-04 Replace Remaining Native Button Tooltips with shadcn Tooltip

- [x] Remove leftover native `title` attributes from button elements.
- [x] Replace button hover hints with shadcn `Tooltip` components.
- [x] Run targeted verification (`vitest`, `typecheck`, Playwright smoke) and document outcomes.

### Review

- Replaced remaining native button tooltips in:
  - `components/workspace/canvas/flow-nodes/researchlm-node.tsx` (prompt edit affordance now uses shadcn tooltip),
  - `components/workspace/canvas/canvas-board.tsx` (node color swatch buttons + response follow-up menu button now use shadcn tooltip).
- Confirmed there are no remaining `title=` attributes in `app/` and `components/`.
- Verification:
  - `npx vitest run tests/integration/workspace/prompt-editing.test.tsx tests/integration/workspace/response-follow-up-context-menu.test.tsx tests/integration/workspace/retry-nonblocking-editing.test.tsx tests/integration/workspace/regenerate-context.test.tsx tests/unit/components/researchlm-node-wheel.test.tsx`: pass.
  - `npm run typecheck`: pass.
  - `npx playwright test tests/e2e/floating-edges-force-layout.spec.ts --project=chromium-desktop`: pass.

## 2026-03-04 shadcn Tooltip Transparency Root Cause Fix

- [x] Investigate tooltip rendering path and verify whether shadcn tooltip component is being used.
- [x] Identify missing shadcn theme token mappings causing tooltip utility classes to resolve incorrectly.
- [x] Add missing color tokens to Tailwind theme and CSS variables in globals.
- [x] Add browser-level regression test validating tooltip background is non-transparent.
- [x] Run targeted verification (`typecheck`, Vitest, Playwright) and document outcomes.

### Review

- Root cause: tooltip primitives were shadcn/Radix, but theme token mappings were incomplete for shadcn utility classes (`bg-popover`, `text-popover-foreground`, and related semantic tokens), causing tooltip content to appear transparent/inconsistent.
- Additional alignment: switched shared tooltip primitive to match the visual pattern requested from shadcn docs experience (dark tooltip bubble, light text, arrow pointer, fade/slide animation) via `bg-foreground` + `text-background` + `TooltipPrimitive.Arrow`.
- Updated `tailwind.config.ts` to include missing semantic color mappings:
  - `popover`, `popover-foreground`,
  - `card-foreground`,
  - `primary-foreground`, `secondary-foreground`,
  - `muted`, `muted-foreground`,
  - `accent`, `accent-foreground`,
  - `destructive`, `destructive-foreground`,
  - `input`, `ring-3`.
- Updated `app/globals.css` root tokens to define the above semantic variables.
- Added Playwright regression in `tests/e2e/node-tooltips.spec.ts` that hovers node action buttons and asserts rendered tooltip content has non-transparent background.
- Updated Playwright regression in `tests/e2e/node-tooltips.spec.ts` to assert:
  - tooltip background equals resolved `--foreground` color,
  - tooltip arrow fill equals resolved `--foreground` color.
- Verification:
  - `rg -n "title=" components app`: no matches.
  - `npm run typecheck`: pass.
  - `npx vitest run tests/integration/workspace/prompt-editing.test.tsx tests/integration/workspace/response-follow-up-context-menu.test.tsx tests/integration/workspace/retry-nonblocking-editing.test.tsx tests/integration/workspace/regenerate-context.test.tsx tests/unit/components/researchlm-node-wheel.test.tsx`: pass.
  - `npx playwright test tests/e2e/node-tooltips.spec.ts tests/e2e/floating-edges-force-layout.spec.ts --project=chromium-desktop`: pass.

## 2026-03-04 Remove Canvas Modes/History + Settings Hierarchy Cleanup

- [x] Remove connect/lasso/semantic top toolbar and related mode/semantic persistence logic from canvas.
- [x] Remove undo/redo/history state, keyboard shortcuts, and history panel rendering.
- [x] Remove settings hierarchy and generated subtopic UI/functionality.
- [x] Fix settings panel overflow so content scrolls within the panel container.
- [x] Run verification (`npm run typecheck` + targeted Vitest suites) and document outcomes.

### Review

- Removed the canvas top control bar entirely (connect/lasso + semantic levels) and deleted associated mode/semantic persistence state and lifecycle effects from `components/workspace/canvas/canvas-board.tsx`.
- Removed history functionality from canvas runtime:
  - deleted history state/cursor bookkeeping,
  - removed undo/redo keyboard handlers,
  - removed bottom history/semantic panel rendering.
- Removed settings hierarchy and generated subtopic controls from `app/(workspace)/page.tsx` while preserving provider credentials and persistence sections.
- Fixed settings panel overflow by converting the panel container to a constrained flex column with `overflow-hidden` and a `min-h-0 flex-1` `ScrollArea`.
- Updated UI contract expectations in `tests/contract/workspace-ui.contract.test.tsx` to reflect hierarchy/subtopic removal.
- Verification:
  - `npm run typecheck`: pass.
  - `npx vitest run tests/contract/workspace-ui.contract.test.tsx tests/integration/workspace/prompt-editing.test.tsx tests/integration/workspace/response-follow-up-context-menu.test.tsx tests/integration/workspace/regenerate-context.test.tsx tests/integration/workspace/retry-nonblocking-editing.test.tsx tests/integration/persistence/workspace-resume.test.tsx tests/integration/persistence/workspace-backup-restore.test.tsx`: pass.
  - `npx playwright test tests/e2e/auth-model-picker.spec.ts --project=chromium-desktop`: pass.

## 2026-03-04 shadcn Tooltip Parity (Arrow Seam + Animation)

- [x] Audit tooltip primitive implementation against shadcn expectations.
- [x] Fix missing Tailwind animation plugin wiring used by shadcn utility classes.
- [x] Update tooltip primitive styling for visible arrow seam (arrow stroke + content border).
- [x] Add regression assertions for tooltip animation and arrow stroke.
- [x] Run verification and document outcomes.

### Review

- Root cause identified:
  - `tailwindcss-animate` plugin was not installed/wired, so shadcn animation utility classes (`animate-in`, `slide-in-*`, etc.) were inert.
  - Tooltip arrow used only fill color with no stroke, so there was no visible edge/seam between the arrow and tooltip body.
- Fixes:
  - Added `tailwindcss-animate` dependency and plugin registration in `tailwind.config.ts`.
  - Updated `components/ui/tooltip.tsx`:
    - added `border border-border` on tooltip content,
    - added arrow stroke (`stroke-border`) with explicit stroke width.
  - Extended `tests/e2e/node-tooltips.spec.ts` to assert:
    - tooltip animation is active (`animationName !== "none"`),
    - arrow has non-none stroke and non-zero stroke width.
- Verification:
  - `npm run typecheck`: pass.
  - `npx playwright test tests/e2e/node-tooltips.spec.ts --project=chromium-desktop`: pass.

## 2026-03-04 Tailwind/shadcn Baseline Audit + Tooltip Parity Correction

- [x] Audit Tailwind + shadcn setup for missing foundational config pieces.
- [x] Ensure animation utilities used by shadcn components are installed/wired.
- [x] Align tailwind config with shadcn baseline defaults (`darkMode` class + radius scale).
- [x] Keep tooltip animation parity while removing non-standard arrow seam customization.
- [x] Re-run typecheck and tooltip browser regression.

### Review

- Verified and fixed missing Tailwind animation foundation:
  - Installed `tailwindcss-animate`.
  - Registered plugin in `tailwind.config.ts`.
- Aligned base Tailwind config with shadcn expectations:
  - Added `darkMode: ["class"]`.
  - Added radius scale backed by `--radius` in `theme.extend.borderRadius`.
  - Added `--radius` token to `app/globals.css`.
  - Added shadcn-style base layer defaults:
    - `* { @apply border-border; }`
    - `body { @apply bg-background text-foreground; }`
- Tooltip parity correction per user feedback:
  - Removed manual arrow/bubble seam line (no arrow stroke or content border).
  - Kept animation behavior working via plugin.
- Verification:
  - `npm run typecheck`: pass.
  - `npx playwright test tests/e2e/node-tooltips.spec.ts --project=chromium-desktop`: pass.

## 2026-03-04 Upgrade Tailwind to Latest + Full Setup Audit

- [x] Upgrade Tailwind from v3 to latest published release.
- [x] Apply official v4 migration for PostCSS and CSS entrypoint.
- [x] Align shadcn baseline config/files for v4 (`components.json`, theme tokens, dark variant support).
- [x] Resolve migration-side compile fallout in button variant typings (`outline-solid`, `icon-xs`).
- [x] Validate with typecheck, production build, and focused interaction/e2e suites.

### Review

- Upgraded Tailwind to latest:
  - `tailwindcss` -> `^4.2.1`.
- Applied official v4 migration output:
  - `postcss.config.js` now uses `@tailwindcss/postcss`.
  - `app/globals.css` now uses `@import "tailwindcss"`, `@theme`, and v4-compatible layer structure.
  - `tailwind.config.ts` removed by v4 migration tooling (config now CSS-first).
- Finalized shadcn-compatible v4 animation setup:
  - switched from `tailwindcss-animate` to `tw-animate-css` (v4-compatible),
  - added `@import "tw-animate-css";` in `app/globals.css`.
- Updated shadcn metadata to match v4 no-config shape:
  - `components.json` tailwind config path set to empty string.
- Fixed compile errors surfaced during migration by extending button variants:
  - `outline-solid` variant and `icon-xs` size in `components/ui/button.tsx`.
- Verification:
  - `npm run typecheck`: pass.
  - `npm run build`: pass.
  - `npx vitest run tests/integration/workspace/focus-restoration.test.tsx`: pass.
  - `npx playwright test tests/e2e/auth-model-picker.spec.ts --project=chromium-desktop`: pass.
  - `npx playwright test tests/e2e/node-tooltips.spec.ts --project=chromium-desktop`: pass.

## 2026-03-05 Edge-To-Void Node Creation + Follow-Up Context UX

- [x] Add canvas behavior so dragging a connection into empty space creates a new node and connecting edge.
- [x] Keep follow-up context out of prompt text area and represent it as dedicated node context metadata.
- [x] Render follow-up context in prompt editors/panels as styled context blocks.
- [x] Ensure backend prompt composition still injects context as model-ready XML.
- [x] Update and run targeted tests (typecheck, unit, integration, Playwright).

### Review

- Canvas edge drag behavior:
  - Added `onConnectEnd` handler in `components/workspace/canvas/canvas-board.tsx` using React Flow final connection state.
  - If drag ends off-node, a new conversation node is created at drop location and auto-connected from/to origin based on handle direction.
- Follow-up context UX:
  - Added `promptContextBlocks?: string[]` to graph node shape in `features/graph-model/types.ts`.
  - `createConversationNode` now accepts/stores `promptContextBlocks` in `features/graph-model/mutations.ts`.
  - Response selection follow-up now creates a child node with clean prompt text and separate context blocks (no inline `[Context]` tags) in `canvas-board.tsx`.
  - Added styled context block rendering in:
    - inline node prompt editor (`components/workspace/canvas/flow-nodes/researchlm-node.tsx`)
    - node side panel prompt section (`components/workspace/canvas/canvas-board.tsx`)
- Backend prompt assembly:
  - Added helpers in `features/generation/context-block.ts` to apply context blocks to composed prompts while keeping user-visible prompt clean.
  - Updated `features/generation/conversation-context.ts` to include `promptContextBlocks` during model prompt composition and XML transformation.
- Verification:
  - `rtk npm typecheck`: pass.
  - `rtk vitest run tests/unit/generation/context-block.test.ts tests/unit/generation/conversation-context.test.ts tests/integration/workspace/response-follow-up-context-menu.test.tsx`: pass.
  - `rtk playwright test tests/e2e/floating-edges-force-layout.spec.ts --project=chromium-desktop`: pass.
