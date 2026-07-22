# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

HYBRID Fit — Avaliação Físico-Funcional: an installable PWA (Portuguese/pt-BR) for physical-functional
assessments of elderly, adult (25–55), and athlete populations. All data is stored **locally on-device**
via IndexedDB — there is no backend, no build step, and no sync between devices. Export/Import (.json)
is the only way data moves between devices; Export (.csv) is a one-way flattened dump for spreadsheet analysis.

## Repository layout

```
index.html            All markup + CSS + application JS (single-file app, ~880 lines)
js/db.js              IndexedDB data-access layer (IIFE module `HFDB`)
service-worker.js      Offline cache-first service worker
manifest.json          PWA manifest
assets/                App icons (192, 512, maskable-512, favicon)
```

There is no package.json, no bundler, no framework, and no test suite. This is intentionally a
static, dependency-free site — treat any proposal to add a build toolchain, npm dependency, or
framework as a significant decision to flag to the user rather than do unprompted.

## Running / testing locally

No build step. To try the app:

```
python3 -m http.server 8000
# open http://localhost:8000
```

Opening `index.html` directly via `file://` works for data entry, calculations, and IndexedDB, but
the service worker (and therefore "Install app") requires `http://`/`https://`. There are no
automated tests, linters, or CI — verify changes by loading the page in a browser and exercising
the relevant tab.

## Architecture

### Data layer (`js/db.js`, global `HFDB`)

A Promise-based wrapper around a single IndexedDB database (`hybridfit`, store `avaliacoes`,
keyPath `id`). Key points:
- `HFDB.open()` must be awaited before any other call; it resolves to the effective mode.
- Falls back to an in-memory `Map` (`mode() === 'memory'`) when IndexedDB is unavailable or blocked
  (e.g. sandboxed previews). In memory mode, data only survives the page session — Export/Import
  is the persistence path, and the UI (`db-status`) tells the user this.
- Indexes exist on `ident.nome`, `atualizadoEm`, `ident.categoria` but the app currently only uses
  `getAll()`/`get()`/`put()`/`remove()`/`bulkAddNew()` — no cursor/index queries.
- `bulkAddNew()` (used by Import) skips records whose `id` already exists; it does not merge or
  overwrite.

### Application state (`index.html`, inline `<script>`)

- `state` — small object holding the active tab and the selected protocol per section
  (`bfProto` for body-fat skinfold protocol, `catFunc` for functional-assessment protocol,
  `vo2Proto` for cardio protocol) plus a `dirty` flag for unsaved changes.
- `records` — in-memory array mirroring IndexedDB, repopulated after every write via
  `HFDB.getAll()`. The record list UI always renders from this array, never from the DB directly.
- `currentId` — id of the record currently loaded into the form, or `null` for an unsaved new entry.
- Record shape (built by `collectRecord()` / consumed by `applyRecord()`):
  `{ id, atualizadoEm, ident, anam, antro, neuro, func, apt, doencas[], parq{}, sarc{}, bfProto, catFunc, vo2Proto, folds{} }`.
  The field-name arrays `IDENT`/`ANAM`/`ANTRO`/`NEURO`/`FUNC`/`APT` are the single source of truth
  for which DOM input ids map into which record section — when adding a new input field, add its id
  to the matching array (and to `applyRecord`'s reset in `newRecord()` if needed), don't hand-roll
  a parallel list.

### Tabs / panels

Seven tabs (`TAB_ORDER`): Banco (record bank), Anamnese, Antropometria, Neuromotor, Funcional,
Aptidão, Relatório. `setTab()` toggles `.panel.active` and re-runs `buildReport()` when entering
the Relatório tab. Each protocol-driven card (body-fat skinfold protocol, functional-assessment
protocol EWGSOP2/SPPB, VO2max protocol Cooper/Rockport/Step) shows/hides its input group via a
`.hidden` class rather than removing DOM nodes, and the protocol choice lives in `state`, not on
the DOM element.

### Recompute pipeline

`recompute()` is the single function that reads all current form inputs, runs every calculation
(BMI, waist-hip ratio, body fat %, jump power, 1RM, EWGSOP2 sarcopenia flags, SPPB score, VO2max,
etc.), and re-renders every results block. It is called on essentially every input's `oninput`/
`onchange` handler — there is no debouncing and no partial recompute; keep this function cheap and
side-effect-free (pure DOM read → calculate → DOM write) instead of introducing yield to a
narrower recompute. The `ruler()` helper renders the shared "labeled gradient bar + needle +
verdict badge" widget used by nearly every metric — reuse it for new metrics instead of writing
bespoke markup.

`buildReport()` (Relatório tab) independently re-derives the same figures from form values for the
printable summary — it does not read from the `recompute()` output DOM. When changing a formula,
update it in both places (the metric-producing function used by `recompute()`/`ruler()`, and the
corresponding `row(...)` call in `buildReport()`), or the on-screen value and the printed report
will disagree.

### Printing / PDF export

There is no PDF library — "Imprimir / Salvar PDF" is `window.print()`. The `@media print` block in
`index.html`'s `<style>` hides everything except `#panel-relatorio` regardless of which tab is
active. Changes to the report layout must be checked in print preview, not just on-screen.

### Service worker / offline cache

`service-worker.js` is cache-first for the exact file list in `ASSETS`. **Any new static file
(new JS file, new icon, etc.) must be added to `ASSETS`, and `CACHE_VERSION` must be bumped**, or
installed clients will keep serving stale files indefinitely (the old cache is only deleted on
`activate`, triggered by the version string changing).

## Conventions

- All user-facing strings, labels, and comments are in Portuguese (pt-BR); keep new UI text
  consistent with this.
- Formulas/protocols cite their source in `.refs` blocks next to the relevant card (e.g. Jackson &
  Pollock, Siri 1961, EWGSOP2/Cruz-Jentoft 2019, Guralnik SPPB 1994, Cooper 1968, Brzycki 1993) —
  preserve/extend these citations when adding or modifying a clinical formula.
- Numeric parsing always goes through the `num(id)` helper (returns `null` on empty/NaN, never
  `0`/`NaN`), so downstream logic can use `value !== null` to mean "not yet entered." Follow this
  pattern for new inputs rather than checking truthiness directly.
- This is a clinical decision-support tool, not a diagnostic device — the disclaimer text in the
  footer and the "referência"/"apoio à decisão" framing in verdict copy is intentional; don't
  reword it into definitive medical claims.
