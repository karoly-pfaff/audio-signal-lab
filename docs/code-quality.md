# Code quality

The local and CI release gate is:

```bash
npm run verify
```

It runs ESLint with structural limits, a zero-duplication check, dead-code and dependency analysis,
Prettier, strict TypeScript, a high-severity npm advisory audit, dedicated WCAG 2.2 Axe and color
contrast checks, Vitest coverage, a production build, and Chromium/Firefox/WebKit Playwright tests.

## Enforced baseline

- all first-party TypeScript/JavaScript files: at most 250 physical lines, including comments and
  blank lines;
- every first-party function: at most 50 physical lines, including comments and blank lines;
- every TSX file: at most one PascalCase React component declaration; extracted helpers use a
  component-specific filename;
- these structural limits apply to production, unit-test, E2E, worker, and configuration code with
  no file-level exceptions;
- copied-code duplication: 0%;
- ESLint warnings: 0;
- high or critical npm advisories: 0;
- automated WCAG 2.2 A/AA violations: 0, with text and non-text color contrast token checks;
- global unit coverage: 95% statements, 90% branches, 95% functions, and 95% lines;
- production build and all applicable browser scenarios must pass.

The repository pins Node 24.18.1 and npm 11.16.0 exactly in `.node-version`, `package.json`, and the
lockfile. CI publishes the verified production build, its SHA-256 file manifest, and the full gate log
as one retained artifact.

The coverage floor matches the sibling Audio Layer Lab quality gate and prevents regression. New
pure domain logic should still be covered near 100%, while browser-only Web Audio orchestration is
also exercised through Playwright and manual review. The four module-worker factory/display entry
points are excluded from V8 uncovered-file instrumentation because that transform cannot evaluate
their worker URLs consistently; their coordination logic remains unit-tested and their production
wiring remains build- and browser-tested.

Run `npm run test:coverage` for the terminal summary and `coverage/index.html` report.

## Design and review rules

- Give each module and function one coherent responsibility.
- Put policy at the boundary that owns it and prefer explicit data flow over hidden mutable state.
- Validate localStorage, imported JSON, file metadata, and decoded-file assumptions at entry.
- Remove duplication when it represents one rule, not merely similar-looking syntax.
- Keep public exports deliberate and comments focused on constraints.
- Keep `useAudioLabStore.ts` as assembly only; domain behavior belongs in its focused action or
  coordination module.

Every bug fix needs a regression test. Cross-browser tests run against the production build and may
not contact an external origin. Failure screenshots, videos, traces, and reports belong under
`output/playwright/`.
