# Audio Signal Lab concept

> This document explains the product intent and experience. See
> [product-model.md](product-model.md) for current behavior and [roadmap.md](roadmap.md) for future
> work.

## Vision

Audio Signal Lab is an exploratory audio-analysis workspace for understanding, comparing, and
visually investigating sound without becoming a DAW or audio editor.

It should feel like a scientific instrument for creative audio work: part oscilloscope, part
spectrogram lab, and part listening notebook. Audio should become visible, measurable, navigable,
and easier to discuss.

## Problem

Simple audio players reveal little beyond playback, while professional DAWs and editors optimize
for production, arrangement, and processing. Creative developers, sound designers, and researchers
need a lighter browser tool that exposes structure and signal behavior without introducing a
production workflow.

The product should help answer questions such as:

- Where are the meaningful transitions, silent regions, or clipping events?
- How do loudness, density, spectrum, and stereo behavior change over time?
- Is a loop or generated asset technically and perceptually consistent?
- How does one render or generation differ from another?
- Which observations should be marked, revisited, or shared as a report?

## Audience

Primary users are game-audio creators, sound designers, AI-music creators, creative developers, and
audio QA or research users. Composers and media creators are secondary users when they need fast
visual feedback without opening a production environment.

## Core jobs

1. **Inspect** one audio file through synchronized visualizations, metrics, and playback.
2. **Find** anomalies, transitions, silence, clipping, density changes, and spectral patterns.
3. **Compare** versions or sections without turning the workspace into a mixer.
4. **Document** observations with selections, markers, snapshots, and reports.
5. **Return** to local work without uploading source material.

## Experience principles

- **Analysis first:** each feature must help users inspect, understand, compare, or document audio.
- **Local first:** source audio and derived findings stay in the browser.
- **Progressive depth:** immediate visual feedback comes before heavier analysis.
- **Readable evidence:** metrics need context and visualizations need a shared time model.
- **Non-destructive:** playback and selection support inspection; they never modify source audio.
- **Focused complexity:** advanced analysis remains modular and does not create DAW-like controls.

The enforceable in-scope and out-of-scope boundary lives in
[product-model.md](product-model.md#product-boundary).

## Product relationship

Audio Signal Lab shares technical ancestry and a visual family with Audio Layer Lab, but the two
products serve different jobs:

| Product          | Primary job                                           |
| ---------------- | ----------------------------------------------------- |
| Audio Layer Lab  | Prototype layered listening experiences               |
| Audio Signal Lab | Inspect, measure, compare, and document audio signals |

Inherited code is useful only when it supports the Audio Signal Lab boundary.

## Interface direction

The interface should resemble a clear, dark analysis console rather than a studio desk. A central
time-aligned workspace carries waveform and spectral views; supporting surfaces expose files,
metrics, warnings, markers, snapshots, and contextual details. Playback controls remain compact and
subordinate to inspection.

Visual character may use precise grids, restrained cyan/violet accents, and dense technical data,
but legibility, keyboard use, responsive reflow, and reduced-motion behavior take priority over
decoration.

## Naming

“Signal” communicates inspection and measurement, while “Lab” communicates exploration. Together
they distinguish the product from Audio Layer Lab without implying editing, mixing, or production.
