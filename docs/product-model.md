# Product model

> This document is the source of truth for current product behavior. Product intent lives in
> [concept.md](concept.md), while future work lives in [roadmap.md](roadmap.md).

## Product goal

Audio Signal Lab helps users inspect, measure, and document local audio through synchronized
visualizations and signal analysis. Playback exists to support inspection rather than editing or
production.

## Supported workflows

### Load and return

- Select or drop browser-decodable local audio files.
- Keep secondary files in a reference list and activate one as the main inspection target.
- Restore retained local files and lightweight session state after a page reload.
- Surface invalid or undecodable files without discarding the current active track.

### Inspect and listen

- Play, pause, stop, seek, jump, and adjust monitoring volume.
- Inspect waveform, spectrogram, spectrum, band energy, dynamics, transients, stereo information,
  metadata, BPM, and summary signal metrics.
- See silence and clipping regions on the shared timeline.
- Select a time range and loop it for focused listening.

### Annotate and revisit

- Create, rename, navigate to, and remove point or range markers.
- Save, rename, duplicate, and restore session snapshots.
- Store two session states in A/B slots for quick state comparison.
- Reconcile restored annotations with the duration and identity of a reloaded file.

The current A/B feature compares saved session states; dedicated synchronized file-to-file
comparison is roadmap work.

### Export and import

- Export and import portable session JSON containing settings, annotations, snapshots, and file
  identity metadata.
- Export Markdown or JSON inspection reports for the active file.
- Keep raw audio, artwork, and browser-local storage identifiers out of portable exports.

## Data lifecycle

| Data                        | Storage                     | Lifetime and portability                             |
| --------------------------- | --------------------------- | ---------------------------------------------------- |
| Encoded local audio         | IndexedDB, keyed by SHA-256 | Restored on reload; removed when unreferenced/reset  |
| Decoded `AudioBuffer`       | Memory                      | Current page session only                            |
| Session state and asset IDs | localStorage                | Same browser origin; schema-validated                |
| Artwork object URLs         | Memory                      | Revoked on replacement or removal                    |
| Session/report exports      | User-downloaded files       | Portable, without audio, artwork, or local asset IDs |

Audio, filenames, metadata, annotations, and reports are processed locally and are not sent to an
external service.

## Product boundary

In scope:

- visual and numeric signal inspection;
- non-destructive listening, selection, and looping;
- annotations, snapshots, comparison evidence, and reports;
- local persistence that supports returning to an inspection.

Out of scope:

- waveform editing, trimming, or source modification;
- clip arrangement, multitrack production, mixing, mastering, or final audio export;
- effects chains, automation, MIDI, instruments, or plugin hosting;
- required cloud storage, accounts, telemetry, or runtime network services.

## Current release

Version 1.0 provides the stable single-file inspection workflow, secondary file references, session
state A/B, local reload recovery, portable sessions, and inspection reports. Release readiness is
defined by [qa-checklist.md](qa-checklist.md).
