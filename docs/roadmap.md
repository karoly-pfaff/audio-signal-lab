# Audio Signal Lab roadmap

> This is the forward-looking product plan. Current behavior belongs in
> [product-model.md](product-model.md).

## Shipped baseline

The shipped Version 1.0 baseline is defined in [product-model.md](product-model.md#current-release).
It is intentionally not repeated as future work below.

## Near-term priorities

### File-to-file comparison

The existing A/B slots compare saved session states. A dedicated audio comparison workflow should
add synchronized playback, side-by-side or overlay views, and explicit metric deltas without
introducing mixing or arrangement behavior.

Success means that two renders can be compared quickly while the single-file workflow stays simple.

### Annotation depth

Add notes to markers and ranges, useful categories, and better review/export affordances. Notes
should remain portable in session and report formats and should not become a general document
editor.

### Measurement fidelity

Evaluate integrated loudness, true-peak measurement, stereo correlation, and loop-quality signals.
New metrics need tested definitions, plain-language explanations, and clear limits rather than
precision-looking values without a reliable interpretation.

### Timeline exploration

Add waveform zoom and pan, configurable spectrogram presentation, and efficient navigation for long
files. Shared cursor, selection, marker, and overlay alignment must remain stable at every scale.

## Later directions

### Spatial analysis

- stereo-width timeline;
- phase correlation and mono-compatibility warnings;
- vectorscope or another readable stereo-field view.

### Structure discovery

- energy and density maps;
- transition and repeated-pattern hints;
- onset activity and section-level summaries.

These are signal-derived hints, not claims about musical form.

### Advanced comparison and reporting

- aligned or section-level comparison;
- difference and similarity visualizations;
- multi-file or batch review where browser performance permits;
- portable visual snapshots and richer analysis summaries.

## Research backlog

- mel or chroma views;
- spectral rolloff, flatness, flux, and contrast;
- harmonic/noise estimates;
- large-file streaming and analysis-cache strategies;
- performance benchmarks and visual-regression coverage;
- optional local-only assisted findings after privacy and accuracy review.

Backlog entries are hypotheses, not commitments. Shipping one requires a defined user problem,
measurable acceptance criteria, accessibility review, and evidence that it stays inside the product
boundary.

## Planning rules

1. Deepen inspection before expanding workflow breadth.
2. Keep comparison subordinate to understanding, not mixing.
3. Prefer explainable analysis over novelty visualizations.
4. Preserve local-only operation and portable exports without raw audio.
5. Apply the [product boundary](product-model.md#product-boundary) to every proposal.

Release readiness is tracked in [qa-checklist.md](qa-checklist.md); engineering gates are defined in
[code-quality.md](code-quality.md).
