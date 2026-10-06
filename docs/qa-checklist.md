# Release QA checklist

## Automated gate

- [ ] Use the Node version from `.node-version` and run `npm ci`.
- [ ] Install browser runtimes with `npx playwright install --with-deps chromium firefox webkit`.
- [ ] Run `npm run verify` and confirm every gate passes.

The checks included in `verify` are defined in [code-quality.md](code-quality.md); do not duplicate
their individual pass criteria here.

The latest automated evidence is recorded in [accessibility.md](accessibility.md#current-evidence).
Automated browser coverage uses Chromium, Firefox, and Playwright WebKit; WebKit is not a substitute
for the required manual Safari/VoiceOver release pass.

## Local-first and file handling

- [ ] Load valid WAV, MP3, FLAC, OGG/Opus, and M4A samples where the browser supports them.
- [ ] Try an invalid or renamed non-audio file and confirm the failure is visible and recoverable.
- [ ] Confirm DevTools shows no external network request during startup, loading, analysis, or export.
- [ ] Replace and clear a file while analysis is running; stale BPM/analysis must not reappear.
- [ ] Start two replacements in sequence, fail the newer one, and confirm the last completed track is
      restored without a persistent loading state.
- [ ] Change volume, selection, markers, and sidebar order while a replacement is pending; after a
      failure, confirm those user changes remain while the previous audio is restored.
- [ ] While a direct main replacement is pending, apply a snapshot that changes the previously active
      sidebar row, then fail the replacement; confirm the restored main audio remains detached.
- [ ] Start two overlapping reloads of remembered main audio and let the newer one succeed; confirm
      its saved selection and markers survive and the older completion is ignored.
- [ ] Apply a matching snapshot while remembered main audio is decoding; after success, confirm the
      snapshot's newer selection, markers, and loop intent remain authoritative.
- [ ] Reset the session during a load and confirm cleared state remains cleared.
- [ ] Reset during a pending session import, then race two imports; only the latest user intent may
      commit.
- [ ] Replace the active file and confirm its row, main analysis, playback, and persisted asset agree.
- [ ] While replacing the main file, confirm transport and loop controls cannot create a store/engine
      mismatch; a failed replacement must restore and resume any interrupted analysis.
- [ ] Start automatic reload restoration, load another file before it finishes, and confirm the late
      restoration cannot replace the user's file.
- [ ] Reload the page and confirm the active and secondary audio files restore from IndexedDB.
- [ ] Retain identical audio bytes under different names and modified times, reload both references,
      and confirm each keeps its own identity and snapshot annotations.
- [ ] Reset the session and confirm retained audio is removed from IndexedDB.
- [ ] Export a session and confirm the JSON contains no raw audio, artwork, or browser-local asset IDs.
- [ ] Save the maximum 12-file, 12-snapshot, two-slot, 256-marker state with 255-character Unicode
      filenames and 80-character labels, then export the actual download and re-import that file;
      all portable content must survive within the shared 8,000,000-byte UTF-8 limit.
- [ ] Try overlong portable filenames, labels, and identifiers, including Unicode and JSON-escaped
      text; they must be rejected before acceptance rather than silently shortened.
- [ ] Confirm files above the documented encoded, duration, and decoded-sample limits fail visibly.

## Inspection workflows

- [ ] Verify waveform, spectrogram, loudness, transient, stereo, and tone panels update.
- [ ] Inspect sustained sub-400 Hz audio and a file beginning with a click; confirm the spectrogram
      shows the bass energy and the Tone metric does not omit the initial impulse.
- [ ] Compare sine/cosine phases and adjacent 2,048/4,096/8,192-sample boundaries; the Tone metric
      must remain stable when one sample is appended.
- [ ] Inspect a non-divisible stereo file with tail-only anti-phase content and confirm the stereo
      image includes the tail; confirm mono playback drives both output meters equally.
- [ ] Inspect right-only, left-only, anti-phase, and more-than-two-channel files; waveform and file
      thumbnails must show energy present in any channel without downmix cancellation.
- [ ] Play, pause, stop, seek, jump, loop a selection, and adjust master/main volume.
- [ ] Begin a keyboard range selection, activate a different file without clearing it, and confirm the
      next Shift+Arrow selection starts from the new file's playhead rather than the old anchor.
- [ ] Clear a keyboard range with the visible button, seek elsewhere, and confirm the next Shift+Arrow
      selection starts from the new position; its readout must preserve exact tenth-second values.
- [ ] Jump to a non-zero playhead and immediately create an exact 0.1-second range such as 5.0–5.1,
      before the visible playhead repaints; confirm looping, range markers, snapshots, A/B
      application, and reload preserve it, while 5.0–5.099 remains below the minimum.
- [ ] Use both five-second jump buttons at the beginning, middle, and end; position must stay finite
      and clamp to the track bounds.
- [ ] Let a short selection loop several times, then pause and resume; the audible position must stay
      inside the selection and must not jump by the raw elapsed time.
- [ ] Disable looping after several wraps and confirm the playhead and audible position do not jump.
- [ ] Enable looping and change loop bounds during playback; confirm the audible source and playhead
      restart at the same normalized position.
- [ ] Create, rename, jump to, and delete point and range markers.
- [ ] With an existing loop elsewhere, jump to a range marker and confirm both the selection and
      audible position move into the marker range.
- [ ] Create 256 mixed point/range markers and confirm the 257th is rejected visibly; export and
      re-import without losing any accepted marker.
- [ ] Save, rename, duplicate, apply, and delete snapshots; exercise A and B slots.
- [ ] Apply a snapshot that changes the currently active sidebar row, then remove that row; unrelated
      main audio must remain loaded.
- [ ] Apply a snapshot to a different file with the same filename and confirm file-specific markers
      and selection are rejected; confirm the saved secondary-file order is restored.
- [ ] Export/import the session and export Markdown/JSON reports.
- [ ] Export Markdown containing punctuation, HTML-like metadata, multiline titles, and marker labels;
      confirm every file-derived value remains literal text in a Markdown renderer.
- [ ] Import a portable session with more than 256 main markers and confirm it is rejected visibly
      without truncating data.
- [ ] Test main selection, point-marker, and range-marker times at and above the safe numeric bound;
      accepted boundary values must survive saved snapshots, A/B slots, export, and re-import.
- [ ] Drag files upward and downward before and after target rows and confirm the indicated insertion
      position is the committed order.

## Accessibility and responsive review

- [ ] Complete and record every applicable item in the manual matrix in
      [accessibility.md](accessibility.md).
- [ ] At 320 CSS pixels, load a file and use snapshots, transport, and inspection without hidden
      workflows or horizontal page scrolling.
- [ ] Reach the master-volume popover by keyboard and confirm snapshot rename exposes an accessible
      name while editing.
- [ ] Check SVG, canvas, empty-state, and signal-overlay labels across the full dashboard gradients at
      4.5:1 or better, including bright impulse colors; do not treat an unresolved automated
      color-contrast result or a passing base token with reduced ancestor opacity as a pass.
- [ ] Confirm bare `M` does nothing and `Alt+M` toggles master mute outside editable controls.
- [ ] Press Space with no decoded audio and confirm transport remains stopped.
- [ ] Document browser, operating system, assistive technology, and accepted exceptions.

## Release facts

- [ ] `package.json`, lockfile, UI version, README, and release notes agree.
- [ ] A clean production build contains the favicon and no remote font/runtime dependency.
- [ ] Retain the CI verification log, production-build artifact, and its SHA-256 manifest together.
