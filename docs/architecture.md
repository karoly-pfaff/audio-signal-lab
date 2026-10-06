# Architecture

Audio Signal Lab is a client-only React application. Audio bytes are decoded in the browser and are
never uploaded. Decoded `AudioBuffer` objects live only for the current page session; the encoded
local files are content-addressed and retained in IndexedDB for reload recovery.

## Runtime flow

```text
local file
  -> Web Audio decode + metadata extraction
  -> SHA-256 asset ID + IndexedDB retention
  -> Zustand application state
  -> analysis worker + BPM analysis
  -> waveform, spectrogram, metrics, markers, and playback
```

- `sources/audio/AudioEngine.ts` owns the Web Audio graph, playback clock, loop points, fades, and
  metering. It uses the legacy `webkitAudioContext` constructor when required by Safari.
- `sources/audio/analysis.ts` and `sources/audio/bpm.ts` own signal calculations.
- `sources/workers/analysis.worker.ts` and `spectrogram.worker.ts` move CPU-heavy work off the UI
  thread. Both have deterministic non-worker fallbacks for constrained test environments.
- `sources/store/useAudioLabStore.ts` is the small Zustand composition root. Focused action modules
  own file loading, main-track behavior, transport, annotations, sessions, snapshots, and A/B state.
  `loadCoordinator.ts` owns stale-operation generations and worker analysis delivery.
- `sources/store/persistence.ts` is the localStorage schema and untrusted-data boundary.
- `sources/store/mediaStorage.ts` owns content-addressed IndexedDB storage and cleanup, while
  `mediaRestoration.ts` reloads retained files through the normal guarded decode path.
- `sources/store/presets.ts` and `snapshots.ts` own portable session JSON and in-session snapshots.
- `sources/components/` renders the state and forwards user intent. Its feature folders separate
  application chrome, analysis, file management, markers, snapshots, transport, shared controls,
  and waveform rendering; tests stay beside the feature they verify.

## State and identity

The localStorage schema stores lightweight session state: filenames, local asset IDs, volume/loop
settings, BPM, selection, markers, file identity, snapshots, and A/B slots. Encoded audio is stored
separately in IndexedDB and is restored automatically after reload; decoded buffers and blob
artwork URLs are never serialized. Portable JSON exports deliberately remove browser-local asset
IDs and artwork and do not include raw audio.

Main-track and secondary-file loads use generation tokens. A replacement, clear, removal, reset, or
newer load invalidates stale asynchronous decode, analysis, and BPM continuations. Tokens are never
reused, superseded BPM workers are aborted, and overlapping replacements retain the last completed
state as their rollback target. A sidebar replacement synchronizes an active main track only while
the captured or newer main intent still belongs to that row, so its completion cannot cancel a newer
direct-main load. Remembered annotation provenance survives overlapping reload attempts
until one succeeds, while annotations changed by a snapshot during decoding remain authoritative at
commit. Failure rollback restores only load-owned media and analysis fields; volume,
order, selection, and markers edited while the load was pending remain authoritative. An active
sidebar association is restored only when that row still owns the restored decoded buffer, including
after snapshot changes. Object URLs are revoked when their owning file is
replaced or removed. Artwork URLs shared by the main track and sidebar are reference-checked and are
revoked only after their last state owner releases them.

Every decoded file carries a content-derived identity, including files promoted from the sidebar.
Snapshot annotations are restored only when both the saved and active identities exist and match;
a filename match alone is never treated as proof that the audio is the same. Snapshot application
also restores the saved secondary-file order without reusing obsolete load generations.

IndexedDB stores content-addressed bytes independently from reference-scoped filenames and modified
timestamps, so deduplicated files retain their own reload identity. Mutations are serialized behind
an epoch guard. Reset invalidates not-yet-committed
writes before clearing the database, while new post-reset writes execute after the clear. Retention
cleanup reads the latest live references after pending stores settle, so replacements remove orphaned
assets without racing parallel loads, including direct-main assets released by sidebar activation.

Snapshots bind annotations to the main-file identity captured with them. Applying a snapshot to a
different file keeps general mix settings but drops file-specific selection and markers; matching
annotations are reconciled against the current decoded duration before loop points are changed.
Applying a snapshot also clears any active sidebar association unless that row still owns the same
decoded main buffer and retained asset.

Reload restoration may commit only while the relevant slot is still in its explicit `remembered`
state, so a late IndexedDB read cannot overwrite a file the user loaded meanwhile. Transport resume
requests use a separate engine generation: stop, pause, or a new playback request invalidates an
older pending `AudioContext.resume()`, and playback cannot start without decoded audio. The playback
clock is normalized to the audible loop range; changing active loop bounds restarts the native source
at that same normalized position. Store loop state is synchronized whenever the active file changes.
Range-marker navigation applies the marker selection and loop bounds before seeking to its start.
Replacement loading disables transport mutations; success and failure commits atomically reconcile
the visible transport, loop intent, engine buffer, and restarted analysis work. Session imports use a
separate generation so reset or a newer import invalidates an older pending file read. Main session
marker counts are rejected before tolerant per-marker normalization can truncate imported data.

## Resource limits

The browser boundary rejects encoded audio above 256 MiB, decoded audio longer than 60 minutes, or
decoded buffers above 100 million channel-sample values (about 400 MiB of raw float samples). These
limits are checked before persistence and analysis; they make memory behavior explicit, but available
browser memory and codec support can impose lower practical limits.

Point and range annotations share one 256-marker limit across live editing, persistence, and portable
imports. The UI rejects the next marker visibly instead of creating state that an export/import cycle
would silently truncate. Main, snapshot, and A/B selection and marker times share the same nonnegative
safe-integer upper bound, so every accepted annotation remains valid after snapshotting and export.

Portable session files have one shared 8,000,000-byte UTF-8 limit for export and import. Filenames,
labels, snapshot names, timestamps, hashes, and identifiers are bounded before they enter portable
state; the exporter also measures the final formatted JSON blob, including Unicode encoding and JSON
escaping. This keeps the maximum 12-file, 12-snapshot, two-slot, 256-marker workspace round-trippable
without dropping user content.

Spectrogram display analysis uses 2,048-sample Hann windows with 50% overlap across the complete
decoded signal. Results are aggregated into at most 256 display frames, preserving full temporal
coverage without retaining an unbounded frame matrix. Window centers are distributed through the
final sample, and display buckets use proportional boundaries so a non-divisible buffer cannot
manufacture a silent tail. Frequency pixels aggregate contiguous bin ranges so every stored FFT bin
is visible even when the canvas is shorter than the spectrum. Spectral centroid uses complete,
positive-edge Hann-derived frames and fractionally weights the final anchored frame over one hop;
this includes boundary impulses without introducing phase- or one-sample-length discontinuities.
Shared spectrum frames carry their source-buffer identity, so a file switch cannot display the
previous file's spectrum while the new worker result is pending.

Stereo-image samples are distributed proportionally through the final decoded sample rather than
using a floored stride. Output metering uses speaker channel interpretation, so mono sources report
the same audible signal on both destination channels while native stereo remains independent.
Waveform and file-thumbnail envelopes aggregate each proportional time bucket across every decoded
channel. Energy that exists only outside channel zero, including anti-phase stereo content, remains
visible without downmix cancellation.

At narrow widths the same file loading, snapshot, transport, and inspection workflows remain in the
document flow rather than being hidden; the three desktop columns become a vertically scrollable
workspace.

## Verification

The enforced engineering gate is documented in [code-quality.md](code-quality.md). Release execution
and manual browser/device checks are tracked in [qa-checklist.md](qa-checklist.md). CI archives the
production build together with a deterministic SHA-256 file manifest and the complete verification
log, so the tested output can be identified independently of a runner workspace.
