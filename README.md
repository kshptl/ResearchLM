# ResearchLM

ResearchLM is a node-based research workspace for prompt iteration, contextual follow-ups, and provider-flexible LLM exploration.

## What You Can Do

- Build branching prompt trees and compare ideas quickly.
- Bring your own API keys and switch providers/models.
- Persist and resume your workspace locally.
- Follow up from selected response text as context.

## Desktop App

Download installers from GitHub Releases:

```text
https://github.com/kshptl/researchlm/releases
```

## Run Locally (Web)

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`.

## Run Locally (Desktop Dev)

Starts Next.js in dev mode and opens Electron pointed at it.

```bash
npm ci
npm run dev:desktop
```

## Build Desktop Installers (From Source)

```bash
npm ci
npm run dist:desktop
```

Artifacts land in `release/`.

## Privacy / Telemetry

- Web deployments include Vercel Analytics and Vercel Speed Insights.
- You can disable telemetry by setting `NEXT_PUBLIC_DISABLE_VERCEL_ANALYTICS=1`.

## Tests

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e
```

## License

MIT. See `LICENSE`.

