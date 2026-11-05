# Changelog

## [1.6.0] — 2026-11-05

Full v1.6 release: unified workspace (tabs & pinning), Find/Replace + Find in Files, auto-update &
signing, i18n Bahasa Indonesia/Inggris, tray, multi-window detach, dan vector PDF export.

### Added

- **Unified Workspace & Tabs** (`src/store/tabStore.ts`, `src/hooks/useTabManager.ts`, `src/components/TabBar.tsx`):
  multi-tab editor dengan tab bar, pin tab, ganti tab aktif, dan window title/dirty berbasis tab.
  Session window schema **v5** dengan migrasi otomatis dari v4 (multi-tab legacy) dan draft v1
  (single-draft). Draft bersih (clean) ikut dibersihkan; window tanpa tab tersisa di-drop.
- **Find & Replace** (`src/hooks/useFindReplace.ts`, `src/hooks/useFindInFiles.ts`, `src/utils/searchRegex.ts`,
  `src/components/FindReplaceBar.tsx`, `src/components/FindResultsPanel.tsx`, `src/components/FindInFilesPanel.tsx`):
  mode normal/regex/extended, case, whole word, dot-matches-newline, wrap-around, in-selection,
  extended Unicode escapes; riwayat pencarian per window; **Find in Files** lintas direktori via
  `FileSearchService` + `fast-glob` dengan preview replace dan tulis-bersih (`dry-run` wajib).
- **Auto-Update & Code Signing** (`electron/services/UpdateService.ts`, `electron/services/UpdateServiceProvider.ts`,
  `src/hooks/useUpdate.ts`, `electron-builder.yml`, `scripts/gen-update-manifest.mjs`, `scripts/checksums.mjs`):
  `electron-updater` di belakang `UpdateProvider` (DI); feed GitHub (`releases.docflow.app/updates/latest.yml`,
  stable; beta: `.../beta/latest.yml`); `DOCFLOW_UPDATE_REQUIRE_SIGNATURE=true`; signing SHA-256;
  auto-check 30 detik; update banner + restart-and-install.
- **i18n** (`src/hooks/useI18n.ts`, `src/store/...`, namespaces `common/editor/find/tabs/update/tray/errors`):
  `i18next` + `react-i18next`; locale `en`/`id`; auto-follow system locale dengan fallback Inggris;
  LanguageSwitcher; label menu native & tray ter-translate.
- **Tray** (`src/hooks/useTray.ts`, `electron/services/TrayService.ts`): show/hide, tooltip, menu tray.
- **Multi-Window** (`electron/services/WindowManager.ts`, `src/hooks/useMultiWindow.ts`, `src/hooks/useTabPersistence.ts`):
  `DOCFLOW_MAX_WINDOWS=5`, detach tab ke window baru, bounds persistence, close guard antar window.
- **Vector PDF Export** (`src/utils/pdfExport.ts`, `src/components/ExportModal.tsx`): `pdf-lib` untuk
  PDF vektor (teks tetap selectable & searchable); fallback raster `html2canvas` + `jsPDF`; error
  `UnsupportedVectorGlyphError` untuk glyph di luar WinAnsi.
- **Extended Unicode find** (`src/utils/searchRegex.ts`): decode extended escapes dan mode regex
  dengan flag Unicode.

### Changed

- `package.json` version updated to `1.6.0`; scripts ditambah: `lint`, `gen:update-manifest`, `release`.
- `electron-builder.yml` ditambah konfigurasi `publish` dan `signingHashAlgorithms: sha256`.
- `.github/workflows/release.yml` ditambah step generate update manifest sebelum release.
- `electron/services/SessionService.ts`: session schema v5 (windows-based) + migration v4 + legacy
  draft; penulisan draft membersihkan window tanpa tab yang layak restore.
- `README.md`, `CHANGELOG.md`, dan panduan (`docs/USER_GUIDE.md`, `docs/UPDATE_GUIDE.md`) diperbarui
  untuk mencerminkan v1.6.

### Tests

- 105 unit test pass (`vitest run`), termasuk test layanan baru (`FileSearchService`, `UpdateService`,
  `I18nService`) dan `pdfVector`, `SessionService`, `tabStore`, hooks-discipline.
- `npm run typecheck` clean.
- `npm run build && npm run verify` clean.

---

## [1.5.0] — 2026-11-03

Full v1.5 release: native context menu, toolbar overflow scroll, full UI state persistence (viewMode, TOC visibility/width, toolbar scroll), React hooks discipline audit, and complete desktop integration.

### Added

- **Native Context Menu** (`electron/services/ContextMenuService`, `src/hooks/useContextMenu`): right-click in Editor and Preview triggers OS-native Electron `Menu` with Cut/Copy/Paste/Select All (editor) or Copy/Select All (preview).
- **Toolbar Overflow Scroll**: `.formatting-toolbar` uses `overflow-x: auto` with gradient `mask-image` so buttons never get cut on narrow windows.
- **Full UI State Persistence** (`uiStore`, `SettingsService`): `viewMode`, `isTocVisible`, `tocWidth`, and `toolbarScrollLeft` saved to `settings.json` with 500ms debounce; restored on boot.
- **Hooks Discipline (X1)**: `useUIStore()` at top-level in `App.tsx`, `TableOfContents.tsx`; `useContextMenu()` at top-level in `DocumentEditor.tsx`, `DocumentViewer.tsx`; regression test `tests/unit/hooks-discipline.test.tsx` added; ESLint `react-hooks/rules-of-hooks: error` enforced.
- **Settings schema v2**: `UIState` interface extended with optional persistence fields (`electron/types/ipc.ts`, `electron/services/SettingsService.ts`).
- **IPCN `app:showContextMenu`**: validated via preload `window.docflow.app.showContextMenu(type)`.

### Changed

- `package.json` version updated to `1.5.0`.
- `README.md` updated to v1.5 with native context menu, toolbar overflow, full persistence, and hooks discipline documentation.
- Badge/status updated to `1.5.0`.

### Tests

- All 58 existing unit tests pass (`vitest run`).
- `npm run typecheck` clean across `tsconfig.json` and `tsconfig.node.json`.

---

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
[1.5.0]: https://github.com/docflow/studio-desktop/releases/tag/v1.5.0
[1.6.0]: https://github.com/docflow/studio-desktop/releases/tag/v1.6.0

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
