# Accessibility

Audio Signal Lab targets WCAG 2.2 Level AA for the product interface. Accessibility is part of the
release gate, while automated checks are only one part of conformance.

## Product contract

- Core functions are keyboard-operable and focus remains visible.
- The skip link reaches the analysis workspace.
- The keyboard-shortcuts dialog receives focus, traps it, closes with Escape, and restores focus.
- Character shortcuts require a modifier; master mute uses `Alt+M` rather than a bare letter key.
- Space starts playback only when a decoded main track is available, matching the visible Play state.
- Controls expose descriptive names and state; information is not communicated by color alone.
- The interface reflows at 320 CSS pixels without horizontal page scrolling.
- User-supplied audio, filenames, metadata, and artwork are outside editorial control.

## Automated checks

`npm run test:a11y` runs axe-core WCAG 2.0/2.1/2.2 A/AA rules against the initial shell, a
representative loaded-audio dashboard, the keyboard-help dialog, and snapshot rename mode. Component
tests verify the keyboard-openable master-volume control and its focus behavior. The Playwright suite
verifies keyboard file activation, waveform selection across file changes and explicit clearing,
dialog focus, skip-link behavior, 320-pixel reflow with WCAG text-spacing overrides, reduced motion,
and forced colors across Chromium, Firefox, and WebKit. Browser tests also fail on uncaught runtime
errors or external network requests.
Static token checks require analysis labels, including SVG and canvas text plus labels over dashboard
gradients, to use an effective color with at least 4.5:1 contrast. Labels that overlap signal colors
use an opaque surface, including the canvas-drawn mono label, so their contrast is independent of
the current audio or trace. The checks reject inherited element opacity rather than validating the
base token in isolation.

## Current evidence

Evidence recorded on 2026-10-06 on Windows:

| Check                                               | Result  | Evidence                                                                        |
| --------------------------------------------------- | ------- | ------------------------------------------------------------------------------- |
| Axe WCAG 2.2 A/AA, initial and loaded/dialog states | Pass    | `npm run test:a11y`: 38 tests                                                   |
| Keyboard alternatives and focus behavior            | Pass    | Playwright file activation, waveform selection, dialog, and skip-link scenarios |
| 320 CSS px plus WCAG text spacing                   | Pass    | Chromium, Firefox, and WebKit production-build scenarios                        |
| Reduced motion and forced colors                    | Pass    | Chromium, Firefox, and WebKit emulated-media scenarios                          |
| Local-only network behavior                         | Pass    | Every Playwright scenario rejects external HTTP(S) requests                     |
| Screen reader, Chromium pairing                     | Not run | Requires a human assistive-technology pass                                      |
| Platform-native screen reader and Safari            | Not run | Requires macOS Safari plus VoiceOver                                            |
| Audible output quality and announcements            | Not run | Requires a human listening and announcement pass                                |

## Manual release matrix

Before a release, review the production build for:

1. sequential keyboard traversal and visible focus at normal browser zoom;
2. pointer target usability on a physical touch device;
3. one screen-reader pass in a Chromium-based browser and one platform-native pairing;
4. audible playback, seeking, loop behavior, and status announcements;
5. analysis-label contrast over the complete rendered gradient, including intermediate colors that
   automated DOM contrast rules cannot resolve, and over bright or impulse-heavy signal canvases.

Record browser, operating system, assistive technology, and any exception. Do not claim full WCAG
conformance from the automated suite alone.
