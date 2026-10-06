# Audio Signal Lab

Audio Signal Lab is a local-first browser workspace for inspecting and documenting audio. It makes
waveform, spectral, dynamic, stereo, and structural signal behavior visible without becoming a DAW
or audio editor.

## What it does

- Loads browser-decodable audio locally; nothing is uploaded.
- Links waveform, spectrogram, spectrum, signal metrics, markers, and playback around one timeline.
- Detects and visualizes silence, clipping, dynamics, spectral balance, transients, and stereo data.
- Supports time selections, inspection loops, point/range markers, session snapshots, and A/B state.
- Keeps the current local workspace available after reload through content-addressed browser storage.
- Exports portable session JSON and Markdown/JSON reports without embedding raw audio.

The complete current contract is in [docs/product-model.md](docs/product-model.md). Future work is
tracked in [docs/roadmap.md](docs/roadmap.md).

## Local development

Requirements: Node and npm versions compatible with `.node-version` and `package.json`.

```bash
npm ci
npm run dev
```

Common checks:

```bash
npm run build          # strict TypeScript + production bundle
npm run lint           # ESLint + duplication + dead-code checks
npm run test:coverage  # Vitest and global coverage floors
npm run test:a11y      # focused axe WCAG checks
npm run test:e2e       # production build in Chromium, Firefox, and WebKit
npm run verify         # complete local/CI release gate
```

## Documentation

| Document                                     | Responsibility                                   |
| -------------------------------------------- | ------------------------------------------------ |
| [Concept](docs/concept.md)                   | Product intent, audience, and experience         |
| [Product model](docs/product-model.md)       | Current workflows, data behavior, and boundaries |
| [Roadmap](docs/roadmap.md)                   | Forward-looking product priorities               |
| [Architecture](docs/architecture.md)         | Runtime ownership and data flow                  |
| [Code quality](docs/code-quality.md)         | Enforced engineering and coverage gates          |
| [Accessibility](docs/accessibility.md)       | Accessibility contract and manual matrix         |
| [Release QA checklist](docs/qa-checklist.md) | Release execution checklist                      |

## Stack

- TypeScript 6, React 18, Zustand, and Vite 8
- Web Audio API, Canvas, and Web Workers
- Vitest, axe-core, and Playwright
- `music-metadata` and `music-tempo`
