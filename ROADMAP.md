# Roadmap

What's next for the open UI toolkit. Items marked **good first issue** are
small, self-contained and a good way to get to know the codebase.

## Good first issues

1. **Keyboard shortcut to jump between highlights** *(good first issue)*
   In the document view, `n` / `p` move focus to the next or previous
   highlighted entity and scroll it into view. Touches
   `src/components/documentViewer.ts`; add a test in `tests/components.test.ts`.

2. **Export the entity table as CSV** *(good first issue)*
   A "Download CSV" button next to the table filter, exporting the currently
   filtered and sorted rows. Pure function for the CSV (with quoting), plus a
   test.

3. **Remember the last opened tab** *(good first issue)*
   Persist Document / Entities / JSON in `localStorage` (wrapped in
   try/catch like `src/lib/theme.ts`) and restore it on load.

4. **Confidence threshold slider** *(good first issue)*
   A range input (0–100%) that hides entities below the threshold in both
   the viewer and the table. Include `aria-valuetext`.

5. **Copy a single entity's JSON** *(good first issue)*
   A small copy button in each table row that copies that entity's JSON,
   announced through `announce()` from `src/lib/a11y.ts`.

## Larger ideas

- Render PDF pages (pdf.js) with entity boxes on the page image.
- A relationship view: entities linked by co-occurrence, drawn with d3.
- Storybook stories for each component.
