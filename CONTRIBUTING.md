# Contributing

Thanks for your interest! This repository is the open part of the
Document Intelligence Framework: the UI components, their tests and a
playground that runs them against a mock extractor. The extraction pipeline
itself is private, so contributions here are about the interface, its
accessibility, tests and documentation.

## Getting started

```bash
git clone https://github.com/DeAtHfIrE26/document-intelligence-showcase.git
cd document-intelligence-showcase
npm ci
npm run dev        # playground at http://localhost:5173
```

Node 20 or newer is required (`.nvmrc` pins 22).

## Before you open a pull request

```bash
npm run check      # lint, typecheck, tests, production build
```

CI runs the same command on every push and pull request.

- **Tests:** every change to `src/` needs a test in `tests/`. Components are
  tested with Vitest and jsdom; keep them fast and deterministic
  (`createMockExtractor({ stageDelayMs: 0 })`).
- **Safety:** never set `innerHTML` in `src/` (lint enforces it). Build nodes
  with `el()` from `src/lib/dom.ts`, so document text can never inject
  markup.
- **Accessibility:** new controls must work with the keyboard alone, expose
  their state (`aria-pressed`, `aria-selected`, `aria-sort`), and respect
  `prefers-reduced-motion`.
- **Contract:** the UI renders `ExtractionResult` from `src/types.ts`. If you
  need a new field, open an issue first: the production service has to
  provide it too.
- **Data:** sample documents must be public domain or synthetic. Never add
  real personal or company data.

## Commit and PR style

- One logical change per pull request, with a short description of what
  changed and how you tested it (the PR template has a checklist).
- Conventional, imperative commit subjects ("Add keyboard shortcut for tabs").

## Good first issues

See [ROADMAP.md](ROADMAP.md) for small, well-scoped ideas.
