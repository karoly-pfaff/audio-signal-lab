# AGENTS.md

This file defines the working contract for automated contributors in Audio Signal Lab. Keep
changes evidence-based, scoped, and consistent with the product's local-first privacy model.

## Start here

Read the documents relevant to the task before editing:

- `README.md` — project overview, setup, commands, and documentation index;
- `docs/concept.md` — product intent, audience, and experience principles;
- `docs/product-model.md` — product boundaries and current workflows;
- `docs/roadmap.md` — forward-looking product priorities;
- `docs/architecture.md` — runtime ownership and data flow;
- `docs/accessibility.md` — accessibility contract and manual review matrix;
- `docs/code-quality.md` — implementation and verification rules;
- `docs/qa-checklist.md` — release execution and manual verification.

Follow a closer nested `AGENTS.md` if one is added later. Direct user instructions override this
file. Preserve unrelated user changes.

## Product invariants

- The application is client-only. Audio, filenames, metadata, annotations, presets, and reports
  must not be transmitted to an external service.
- Do not add telemetry, analytics, remote fonts, a backend, or a runtime network dependency without
  an explicit product decision.
- Encoded local audio may be retained in IndexedDB for reload recovery, but it must never be
  uploaded or embedded in portable session/report exports. Reset and orphan cleanup must remove
  unreferenced retained media.
- Playback and file-list features support inspection; do not let the product drift toward editing,
  arranging, effects, or mix export.
- Accessibility is a release requirement.

## Architectural ownership

- `sources/audio/` owns decoding, playback, metering, signal analysis, and BPM detection.
- `sources/store/` owns application workflows, state transitions, persistence, snapshots, and
  cancellation generations.
- `sources/workers/` owns CPU-heavy analysis entry points.
- `sources/components/` renders state and forwards user intent; keep components and colocated tests
  in their owning feature folder and do not let this layer become a second domain layer.
- `sources/utils/` contains focused reusable rules, not an unbounded miscellaneous layer.
- `tests/e2e/` owns production-build browser workflows and test-only browser compatibility shims.

The Zustand store is an assembly-only composition root. Keep new behavior in a focused action,
coordination, persistence, or domain module rather than growing the root.

## Implementation rules

- Write production code, tests, comments, documentation, and identifiers in English.
- Use strict TypeScript. Treat stored, imported, and file-derived data as `unknown` until validated;
  do not introduce `any`.
- Use explicit type-only imports, guard clauses, precise domain names, and options objects where
  they clarify a call.
- Comments explain constraints or trade-offs rather than restating code.
- Remove unused exports and avoid commented-out code, speculative fallbacks, or untracked TODOs.
- Keep every first-party TypeScript/JavaScript file at or below 250 physical lines and every
  function at or below 50 physical lines. The gate counts comments and blank lines and also applies
  to tests, E2E specs, workers, and configuration files.
- Use npm and preserve `package-lock.json`. Review the browser impact, license, and audit result of
  any new runtime dependency.
- Do not edit generated `build/`, `coverage/`, `output/`, `node_modules/`, or `*.tsbuildinfo` files.
- Do not assume Git is available. Never create commits, branches, tags, or releases unless the user
  explicitly asks.

## Testing strategy

- Test observable behavior and owned contracts, including success, boundaries, invalid input,
  cancellation, and meaningful failure paths.
- Every bug fix needs a regression test that fails without the fix.
- Keep Vitest tests beside their production module. Keep browser flows under `tests/e2e/`.
- Tests must be deterministic, storage-isolated, and independent of external services.
- Chromium and Firefox cover native Web Audio startup and decoding. Windows WebKit may use only the
  existing minimal test shim because that Playwright runtime omits Web Audio.

Run checks proportional to the change:

- focused Vitest for local logic;
- `npm run test:a11y` for semantics, focus, interaction, or layout;
- `npm run lint` and `npm run typecheck` for source or configuration changes;
- `npm run test:e2e` for browser, persistence, responsive, or user-workflow changes;
- `npm run verify` before a release or after a cross-cutting change.

## Definition of done

1. The implementation lives at the correct boundary and preserves local-first behavior.
2. Relevant cancellation, cleanup, invalid-input, and accessibility paths are explicit.
3. Tests and documentation prove the changed contract.
4. Proportionate checks pass, with exact results and intentional skips reported.
5. Remaining risk or manual verification is stated plainly.
