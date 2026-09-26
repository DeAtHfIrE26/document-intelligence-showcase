# Components and contract

Everything in `src/` is framework-free TypeScript: each component is a
function that renders into a container you pass in, using DOM APIs only.
Swap the mock for a real service by implementing `Extractor`.

## The contract (`src/types.ts`)

```ts
interface ExtractionResult {
  document: DocumentInfo;       // id, title, fileName, fileType, sizeBytes, wordCount, origin…
  chunks: Chunk[];              // { index, start, end, text } – offsets into the whole document
  entities: ExtractedEntity[];  // { id, text, type, confidence (0–1), start, end, chunkIndex }
  elapsedMs?: number;
}

interface Extractor {
  extract(input: { kind: 'sample'; id: string } | { kind: 'file'; file: File },
          options?: { onStage?: (stage: Stage) => void; signal?: AbortSignal }): Promise<ExtractionResult>;
}
// Stage: 'upload' → 'parse' → 'chunk' → 'extract' → 'index'
```

Chunks overlap (512 characters, 128 of overlap), and the pipeline extracts
entities per chunk, so the same entity can appear once per chunk.
`documentText()` and `uniqueEntities()` in `src/lib/document.ts` rebuild the
text and de-duplicate.

## Extractor

| Export | What it does |
|---|---|
| `createMockExtractor({ stageDelayMs })` | Samples return recorded pipeline output; `.txt`/`.md` uploads go through a rule-based extractor. Reports stages in order; honours `AbortSignal`; throws `ExtractionError` (`not-found`, `unsupported`, `too-large`, `aborted`). |
| `chunkText(text, size, overlap)` | Overlapping chunks that prefer sentence and word boundaries; always terminates. |
| `extractEntities(text, chunks)` | Dates, money, percents, quantities, titled names, organisations, name pairs, numbers; never overlapping. |

## Components

| Function | Renders | Accessibility |
|---|---|---|
| `createDropzone(el, { onFile, maxBytes, accept })` | Drag-and-drop / click / keyboard file picker with a size check | `role="button"`, Enter/Space, described by the hint, errors in `role="alert"` |
| `createProcessingView(el, onCancel?)` | Staged progress list with a progress bar; `start`, `setStage`, `finish`, `hide` | `role="progressbar"` with `aria-valuenow`, `aria-busy`, per-stage status text |
| `renderDocumentViewer(el, result, entities, activeTypes)` | Full text with entity `<mark>`s | Scrollable region is focusable and labelled |
| `renderEntityTable(el, entities, state, onState, onSelect?)` | Sortable, filterable table | `aria-sort` on headers, labelled search, live row count |
| `renderTypeFilter(el, counts, active, onChange)` | Toggle chips that double as the legend | `aria-pressed` |
| `initTabs(tablist, onChange?)` | WAI-ARIA tabs | Arrow keys, Home/End, roving `tabindex` |

## Helpers

| Module | Exports |
|---|---|
| `lib/highlight.ts` | `buildSegments(text, spans, offset)` (pure: sorted, clipped, overlap-free) and `renderSegments(el, segments)` (DOM nodes only) |
| `lib/format.ts` | `formatFileSize`, `confidenceLevel`, `entityLabel`, `formatRelationshipName`, `formatPercent`, `formatDuration` |
| `lib/fileTypes.ts` | `detectFileType(name, mime)`, `extensionOf`, `MAX_UPLOAD_BYTES` |
| `lib/a11y.ts` | `announce(message)`, `prefersReducedMotion()`, `focusElement(el)` |
| `lib/theme.ts` | `initialTheme()`, `applyTheme(theme, persist)` |
| `lib/escapeHtml.ts` | `escapeHtml(value)`, for the rare place a string must go into markup |

## Styling

`src/styles/tokens.css` holds the colour, spacing and motion tokens for the
dark (default) and light themes; `app.css` styles the components. Entity
colours are grouped by family (people, organisations, places, dates,
numbers) through one custom property, `--e`. Motion uses only `transform`
and `opacity` and is switched off under `prefers-reduced-motion`.
