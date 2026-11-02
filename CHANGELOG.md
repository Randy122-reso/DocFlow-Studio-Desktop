# Changelog

## [1.0.0] — 2026-11-03

Beta release implementing the complete v1 design: native UI synchronization, toolbar redesign, and persistent UI state.

### Added

- **UI State Store (`uiStore`)**: Zustand-managed state for zoom, paged/continuous mode, auto-scroll, and TOC sync.
- **TOC Synchronization toggle & `useScrollSync` hook**: clicking an outline item scrolls both editor (`textarea.scrollTop`) and preview (`scrollIntoView`) synchronously; toggle ON/OFF available in sidebar.
- **FormattingToolbar redesign**: theme dropdown, font-size dropdown (S/M/L), page-size dropdown (A4/Letter), margin dropdown (compact/normal/spacious), paged/continuous toggle buttons, auto-scroll toggle, TOC sync toggle, copy Markdown button, and zoom controls (+ / – / reset 100%).
- **Zoom preview**: CSS `transform: scale()` on preview article with 50%–200% range; persisted to `settings.json`.
- **Paged / Continuous mode**: visual page card (`paged-mode`) vs continuous scroll (`continuous-mode`); persisted.
- **Auto-scroll**: when enabled, preview scroll position follows editor scroll proportionally.
- **Copy Markdown**: one-click clipboard copy of current editor content.
- **UI State Persistence**: `settings.json` now stores `uiState` (zoomLevel, isPagedMode, autoScroll, syncScrollWithToc) and migrates from older versions.
- **DocumentViewer updates**: accepts `zoomLevel` and `isPagedMode` props; applies CSS scale and mode classes.
- **TableOfContents updates**: sync toggle button in header; click handler integrated with `useScrollSync`.
- **App integration**: loads `uiStore` from settings on boot; writes back to `settings.json` with 500ms debounce.
- **SettingsService migration**: `migrate()` and `init()` handle missing `uiState` from legacy settings; schema updated for `uiState`.

### Changed

- Badge/status updated to `1.0.0 beta`.
- `package.json` version remains `0.1.0` for artifact compatibility; release tag `v1.0.0` corresponds to this changelog entry.

### Tests

- All 58 existing unit tests pass (`vitest run`).
- `npm run typecheck` and `npm run build` clean.

[0.1.0]: https://github.com/docflow/studio-desktop/releases/tag/v0.1.0
[1.0.0]: https://github.com/docflow/studio-desktop/releases/tag/v1.0.0

---

## [0.1.0] — 2026-11-02

Initial implementation of the desktop application from the product plan.

### Added

- Electron + React + Vite + TypeScript application shell with sandboxed renderer,
  context isolation, and a minimal `contextBridge` API.
- Markdown editor with editor/split/preview modes, formatting toolbar, live preview,
  GitHub-flavored Markdown, tables, task lists, callouts, and sanitized HTML.
- Five document themes (Modern, Academic, Minimal, Editorial, Legal) with typography,
  A4/Letter page size, margins, paper tones, header/footer, page numbers, automatic
  heading numbering, and justified text.
- Automatic table of contents with unique heading IDs and document statistics
  (words, characters, sentences, paragraphs, headings, code blocks, links, images,
  reading time).
- Export to DOCX, PDF via system print, direct raster PDF, Word-compatible DOC,
  standalone HTML, and Markdown.
- Code block extraction for 30+ languages with copy and download actions.
- Native menu, recent files with pinning and TTL, drag & drop, file associations
  (`.md`, `.markdown`, `.txt`), and single-instance file routing.
- Save-in-place, Save As, dirty tracking, close guard, mtime conflict resolution,
  atomic writes, encoding detection/preservation, and external file watching.
- Draft auto-recovery and restore/discard/original prompts.
- Rotating local logger, zod-validated IPC, path traversal checks, CSP, and
  external link allow-list.
- Windows NSIS/portable and Linux AppImage/deb packaging configuration with
  generated application icons and SHA-256 checksum generation.
- 58 unit tests covering file/recent/settings/session services, Markdown parsing,
  sanitization, and document statistics.
- Build verification script for CSP, sandbox settings, and production output.

### Known limitations

- Direct PDF export is raster-based; use PDF via Print for selectable text.
- Paged preview is a visual page card, not full CSS pagination.
- File providers are local only; the provider contract is ready for future backends.
- Code signing, auto-update, and CI release workflows are not configured yet.
- Linux packaging has not been exercised from the Windows development environment.

[0.1.0]: https://github.com/docflow/studio-desktop/releases/tag/v0.1.0
