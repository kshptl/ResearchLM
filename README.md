# ResearchLM

ResearchLM is a node-based research workspace for prompt iteration, contextual follow-ups, and provider-flexible LLM exploration.

## Why People Use It

- Visual thinking: build branching prompt trees and compare ideas quickly.
- Real provider control: BYOK auth, provider-specific model discovery, and default model preferences.
- Local-first workflow: session persistence, resume flows, and desktop packaging support.
- Fast iteration: regenerate nodes, follow-up from selected response context, and graph-level context chaining.

## Stack

- Next.js App Router + React + TypeScript (strict)
- shadcn/ui + Tailwind CSS
- React Flow (`@xyflow/react`) for canvas/node graph interactions
- IndexedDB persistence
- Multi-provider generation adapters (OpenAI, Anthropic, Gemini, OpenRouter, GitHub)
- Electron packaging for desktop distribution

## Requirements

- Node.js 20+
- npm 10+

## Quick Start (Web)

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`.

## Quick Start (Desktop Dev)

Runs Next.js in dev mode and starts Electron against it.

```bash
npm ci
npm run dev:desktop
```

## Testing and Quality

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e
```

## Telemetry

- Web deployments include Vercel Analytics and Vercel Speed Insights.
- Desktop development/builds disable telemetry by setting:
  - `NEXT_PUBLIC_DISABLE_VERCEL_ANALYTICS=1`
- You can disable telemetry for any environment by setting that same env var.

## Desktop Build and Packaging

1. Build Next.js standalone output for desktop packaging.
2. Prepare desktop runtime bundle (`dist/standalone`).
3. Build platform installers/packages into `release/`.

```bash
npm run dist:desktop
```

Useful related commands:

```bash
# Build desktop artifacts without installers (smoke build)
npm run build:desktop

# Build desktop web bundle and run Electron locally from dist/standalone
npm run build:desktop:web
npm run prepare:desktop
npm run start:desktop
```

## Release Process (GitHub)

Desktop release workflow: `.github/workflows/desktop-release.yml`

1. Bump version and create a tag:

```bash
# First release:
npm version 1.0.0

# Later releases:
# npm version patch|minor|major
git push origin main --follow-tags
```

2. The release workflow builds desktop artifacts on:
- `ubuntu-latest`
- `windows-latest`
- `macos-latest`

3. For tag pushes (`v*`), artifacts are attached to the GitHub Release automatically.

## Security Notes

- Electron window is hardened (`contextIsolation: true`, `nodeIntegration: false`, sandboxed preload).
- External links are opened in the system browser, not inside the app window.
- Desktop mode runs the local bundled Next.js server on loopback (`127.0.0.1`) only.

## Repository Structure

- `app/` Next.js routes and API endpoints
- `components/` UI components and workspace views
- `features/` domain logic (generation, graph model, persistence)
- `electron/` Electron main/preload runtime
- `scripts/prepare-electron.mjs` desktop bundle staging
- `tests/` unit, integration, and e2e suites

## Contributing

1. Create a branch from `main`.
2. Keep changes scoped and tested.
3. Run lint/typecheck/tests before opening PRs.

## License

MIT. See `LICENSE`.
