# 🧾 DocFlow Studio Desktop v1.5 — Rencana Pengembangan (Unified)

> **Tagline:** *Markdown authoring & publication-grade export, now native on Windows & Linux — with synchronized editor/preview, zoom, TOC navigation, native context menus, and full UI state persistence.*
> **Sub-tagline (README):** *Electron desktop app yang menulis, memformat, dan mengekspor Markdown ke PDF/DOCX dengan integrasi OS native: file association `.md`, recent files, save-in-place, native menu File, UI sinkronisasi cerdas (TOC sync, Auto-scroll, Zoom, Paged/Continuous), Native Context Menu, serta penyimpanan state UI secara penuh.*
> **Naming resmi:**
> - Repo: `docflow-studio-desktop`
> - Package: `@docflow/studio-desktop`
> - App ID: `id.docflow.studio`
> - Versi: **v1.5.0** (full — desktop integration + UI sync + context menu + full UI persistence + hooks discipline)
> - Artifact: `DocFlowStudio-{version}-{arch}.{exe|AppImage|deb}`
> - Proses/container: `docflow-main` (main process), `docflow-renderer` (Chromium renderer sandboxed)
> - Path data (Win): `%APPDATA%\DocFlow Studio\`; (Linux) `~/.config/DocFlow Studio/`
> - Healthcheck: smoke-test e2e "launch + open .md + save + toggle viewMode + context menu + quit"
> - Endpoint renderer: `app://docflow/` (custom protocol) atau `file://.../index.html`

> **Asumsi:** `TIMELINE_HINT` kosong → dipilih **28 hari kerja** (≈6 minggu) untuk full v1.5. `STACK_PREFERENCES` kosong → Electron + React + Vite + TypeScript. `EXTERNAL_INTEGRATIONS` = tidak ada (full offline). `NON_GOALS_HINTS` = cloud sync, backend, AI/Gemini, mobile, macOS.

Dokumen ini **menggabungkan** seluruh blueprint menjadi satu perencanaan terpadu **DocFlow Studio Desktop v1.5**. Semua struktur, kontrak, dan flow disatukan. Ditambahkan **Native Context Menu**, **Resilient Toolbar (Overflow Scroll)**, **Full UI State Persistence**, dan **React Hooks Discipline** sebagai cross-cutting concern.

---

## 1. Analisis Sintesis Domain

### 1.1 Lima domain fungsional + satu disiplin lintas-cutting

| # | Domain | Inti | Keputusan v1.5 |
| :-- | :--- | :--- | :--- |
| D1 | Markdown Editing | buffer teks source-of-truth | `<textarea>` + `fileStore` + **Native Context Menu** |
| D2 | Document Formatting & Preview | tema, page, margin, header/footer | `documentStore` settings + `DocumentViewer` + **Preview Context Menu** |
| D3 | Multi-format Export | DOCX/PDF/DOC/HTML/MD + code script | `docExport`/`pdfExport` client-side + `file:saveBinary` |
| D4 | Desktop File Integration | assoc, recent, save-in-place, watcher, recovery | `FileService` + `FileProvider` + 37 IPC channels |
| D5 | Advanced UI/UX State Sync | TOC, auto-scroll, zoom, paged, copy MD, **overflow scroll**, **full state persistence** | `uiStore` + `useScrollSync` + `FormattingToolbar` + `useUiStatePersistence` |
| **X1** | **React State Discipline** | hooks di top-level, tidak kondisional | **Audit & regression test** (lihat §4.1, §14, §17.2, §19) |

### 1.2 Kesamaan (common ground)

| Aspek | D1 Editing | D2 Formatting | D3 Export | D4 Desktop | D5 UI Sync | Keputusan v1.5 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Input utama | Teks MD | Teks MD | Teks render | File `.md` di disk | Interaksi toolbar/TOC | Single source of truth: buffer Markdown di renderer |
| State persisten | Buffer | Settings tema | File output | Path file | UI State (**viewMode, layout, zoom**) | `fileStore` (disk) + `uiStore` (UI) + `session.json`/`settings.json`/`recent.json` |
| Trigger user | Ketik/paste/right-click | Pilih tema/right-click | Klik export | Ctrl+S / menu / dbl-click | Klik TOC / toggle / scroll | `useFileSession` + `useScrollSync` + `useContextMenu` + handler UI |
| Error model | Parse | Render | Export | FS / permission | DOM mismatch / layout | `AppError` taxonomy + toast |
| Cross-platform | Browser | Browser | Browser | OS-specific | Browser | Electron abstraction (`FileProvider`) + Refs |

### 1.3 Perbedaan yang dijembatani

| Aspek | Domain A | Domain B | Jembatan |
| :--- | :--- | :--- | :--- |
| Sumber kebenaran | State React (buffer) | Disk file | `fileStore` + `savedContent` snapshot + invariant `dirty` |
| Waktu simpan | (tidak ada) | Explicit Save / Auto | Menu File → Save, Ctrl+S + autosave draft 5s |
| Navigasi file | Paste/upload | Double-click `.md` | `OpenFileRouter` (argv + `open-file` + protocol) |
| Identitas dokumen | "Untitled" | Path absolut | `filePath: string \| null` |
| State UI | React state volatile | Preferensi persisten | `uiStore` → debounce 500ms → `settings:set` (tanpa IPC per-klik) |
| Idempotensi tulis | N/A | Re-save sama | Atomic write `.tmp → rename → fsync` |
| Konflik eksternal | N/A | File diubah editor lain | `diskMtime` compare + watcher debounce 250ms |
| DOM sync (TOC/auto-scroll) | Ref editor | Ref preview | `useScrollSync` — mapping `lineNumber ↔ elementId`, fail-safe |
| **OS Native Context** | Web default menu | Custom app menu | **IPC `app:showContextMenu` → Main process Menu API** |
| **Layout Responsif** | Toolbar terpotong | Scrollable toolbar | **CSS `overflow-x: auto` + `mask-image` gradient** |
| **Hooks integrity** | — | — | **Top-level only**; `uiStore` diakses via `useUIStore()` di top-level komponen |

### 1.4 Strategi unifikasi

1. **Satu renderer SPA**, seluruh fitur lama (editor, viewer, export, zen, code script, toolbar, TOC) dipindah apa adanya ke shell Electron (`nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`).
2. **Pemisahan state**: `fileStore` (disk/session) dan `uiStore` (zoom, paged, auto-scroll, sync TOC, **viewMode, sidebar state**). `uiStore` **tidak memicu IPC per interaksi** — hanya debounce 500ms ke `settings.json`.
3. **IPC tervalidasi zod** — semua file/session/recent/settings/context-menu lewat `window.docflow.*` (37 channel).
4. **Sinkronisasi DOM presisi** — `useScrollSync` memetakan `lineNumber` (editor) ↔ `elementId` (preview heading dari `marked`), fail-safe jika elemen tidak ditemukan.
5. **Hooks discipline** — semua `useUIStore()`, `useFileSession()`, `useScrollSync()`, `useContextMenu()` dipanggil di **top-level** komponen.
6. **Build matrix CI** Windows + Linux publish artifact signed sekaligus.

---

## 2. Identitas & Naming

| Item | Nilai |
| :--- | :--- |
| Repo | `github.com/<org>/docflow-studio-desktop` |
| Package | `@docflow/studio-desktop` |
| App ID | `id.docflow.studio` |
| Versi rilis | `1.5.0` |
| Executable | `docflow-studio` (Linux), `DocFlow Studio.exe` (Win) |
| Artifact | `DocFlowStudio-{version}-{arch}.{exe\|AppImage\|deb}` |
| Main process | `docflow-main` |
| Renderer sandbox | `docflow-renderer` |
| Path data (Win) | `%APPDATA%\DocFlow Studio\` |
| Path data (Linux) | `~/.config/DocFlow Studio/` |
| Log | `{userData}/logs/main-{date}.log` |
| Session | `{userData}/session.json` |
| Settings | `{userData}/settings.json` |
| Recent | `{userData}/recent.json` |
| Cache | `{userData}/cache/` |
| Custom protocol | `app://docflow/` |
| Association | `.md`, `.markdown`, `.txt` → `text/markdown`, `text/plain` |

---

## 3. Ruang Lingkup

### In scope (full v1.5)

**Authoring & formatting (D1–D2)**
- Editor split-view + preview terformat.
- 5 tema dokumen, 3 paper tone, A4/Letter, margin, header/footer, nomor halaman.
- TOC otomatis, statistik dokumen, paged vs continuous.
- **Native Context Menu**: Copy/Paste/Cut/Select All (Editor) dan Copy/Select All (Preview) via native OS menu.

**Export (D3)**
- DOCX (native), Word HTML `.doc`, PDF via print, Direct PDF (raster), HTML, Markdown.
- Ekstraksi & download code block ke 30+ bahasa script.

**Desktop integration (D4)**
- Save-in-place (Ctrl+S), Save As (Ctrl+Shift+S).
- File association `.md`/`.markdown`/`.txt` (Windows registry + Linux MIME).
- Native menu File → New/Open/Open Recent/Save/Save As/Export/Exit.
- Recent files (max 20, LRU + pinned).
- Dirty tracking + unsaved-changes guard.
- Auto-recovery draft 5s → `session.json`; prompt restore saat launch.
- File watcher eksternal — debounce 250ms.
- **Context Menu Integration**: Klik kanan di area teks memunculkan menu native Electron (`Menu.buildFromTemplate`).

**UI/UX sync (D5)**
- `FormattingToolbar` lengkap: Theme/Font/Size/Page/Margin dropdown, Paged↔Continuous, Auto-scroll toggle, **Copy MD**, Zoom (—, %, +, Fit, Reset), TOC Sync toggle.
- **Toolbar Overflow**: Jika window dikecilkan, toolbar dapat di-*scroll* horizontal (`overflow-x: auto`) tanpa memotong tombol.
- Zoom preview via CSS `transform: scale()` (85%–200%, preset Fit/Reset).
- Auto-scroll: preview mengikuti `scrollTop` editor secara proporsional.
- **TOC Synchronization**: klik outline → `scrollIntoView` preview + `textarea.scrollTo` editor.
- **Full UI State Persistence**: Menyimpan `viewMode` (Editor/Split/Preview), `isTocVisible`, `tocWidth`, `toolbarScrollLeft`, `windowBounds`, dan `uiState` ke `settings.json`.

**State discipline (X1)**
- `useUIStore()` dan `useContextMenu()` dipanggil di **top-level** `App.tsx`, `TableOfContents.tsx`, `DocumentEditor.tsx`, dan `DocumentViewer.tsx`.
- Regression test: toggle Editor Only / Split / Preview berulang tanpa `Rendered fewer hooks than expected`.

### Out of scope / prasyarat eksternal
- Install OS dependency (WebView2, GTK).
- Code signing certificate (Authenticode, GPG) — release pipeline F2.
- Store publishing (MS Store, Flathub) — F3.
- Auto-updater hosting — F2.
- Cloud sync, akun, backend, database server.
- AI/Gemini — dihapus total.
- macOS target — F4.
- Markdown WYSIWYG inline editing (tetap textarea source-of-truth).
- Custom HTML/React Context Menu (tetap gunakan native OS menu untuk reliability).

---

## 4. Prinsip Desain

| Prinsip | Implementasi |
| :--- | :--- |
| **Renderer sandboxed** | `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`. |
| **IPC tervalidasi** | Setiap `ipcMain.handle` zod-parse; invalid → `AppError('IPC_INVALID')`. |
| **Single source of truth** | Buffer di `fileStore`; UI di `uiStore`. Main process tidak menyimpan buffer. |
| **UI State Isolation** | Zoom/Paged/Auto-scroll/TOC-sync/ViewMode hanya mengubah `uiStore`; persist via debounce 500ms. |
| **Atomic write** | `.tmp` → `rename` → `fsync(dir)` untuk semua tulis disk. |
| **Fail-fast config** | Env var wajib divalidasi di `main.ts` boot; invalid → `app.exit(1)`. |
| **No network** | CSP `default-src 'self'; connect-src 'self'`; `shell.openExternal` whitelist. |
| **Dirty invariant** | `dirty === (buffer !== savedContent)`. |
| **Recovery-first** | Autosave draft 5s → `session.json`; crash → prompt restore. |
| **Path normalization** | `path.resolve` + `startsWith(userHome)`; tolak path traversal. |
| **Sinkronisasi presisi** | `useScrollSync`: `lineNumber ↔ elementId`; fail-safe jika elemen tidak ditemukan. |
| **Hooks top-level only** | Semua hook React dipanggil **di top-level komponen**, tidak di dalam JSX kondisional / callback. Lihat §4.1. |
| **Native OS Integration** | Context menu menggunakan Electron `Menu` API, bukan custom HTML, untuk menjamin UX native di Windows & Linux. |
| **Resilient Layout** | Toolbar wajib memiliki `overflow-x: auto` dan `mask-image` untuk mencegah pemotongan tombol pada layar kecil. |
| **Cross-platform parity** | Semua fitur identik Win & Linux; perbedaan hanya path separator + dialog native. |
| **Log tanpa PII** | Log hanya basename + size; tidak pernah isi Markdown. |

### 4.1 React Hooks Discipline (eksplisit)

**Aturan:** Hook (`useUIStore`, `useFileSession`, `useScrollSync`, `useContextMenu`, `useState`, `useEffect`, `useRef`, dll.) **wajib** dipanggil di top-level function component — sebelum `return` JSX, dan **tidak** di dalam:
- ekspresi JSX kondisional (`{condition && useUIStore()}`),
- blok `if`/`else` yang tidak konsisten antar render,
- callback/event handler,
- `Array.map` / loop.

**Bug yang ditutup:**
> Saat user klik **Editor Only**, `viewMode` menjadi `'editor'` → `DocumentViewer` di-unmount → ekspresi `zoomLevel={useUIStore(s => s.zoomLevel)}` tidak dievaluasi lagi → jumlah hook di render berikutnya berkurang → React melempar **`Rendered fewer hooks than expected.`**

**Perbaikan wajib:**

```tsx
// ❌ SALAH — hook di JSX kondisional (App.tsx sebelum perbaikan)
{viewMode !== 'editor' && (
  <DocumentViewer
    zoomLevel={useUIStore(s => s.zoomLevel)}      // hook call kondisional
    isPagedMode={useUIStore(s => s.isPagedMode)}  // hook call kondisional
  />
)}

// ✅ BENAR — hook di top-level App.tsx
const uiState = useUIStore();
return (
  <>
    {/* ... */}
    {viewMode !== 'editor' && (
      <DocumentViewer
        zoomLevel={uiState.zoomLevel}
        isPagedMode={uiState.isPagedMode}
      />
    )}
  </>
);
```

**Pencegahan:** ESLint rule `react-hooks/rules-of-hooks` di-set `error` (bukan `warn`), CI menolak PR yang melanggar. Regression test di §17.2 wajib meng-cover toggle 3 viewMode dan rendering Context Menu.

---

## 5. Arsitektur Terpadu (tunggal)

```text
┌────────────────────────────────────────────────────────────────────────────┐
│                       Electron Main Process (docflow-main)                 │
│  ┌──────────┐  ┌────────────┐  ┌──────────────────┐  ┌──────────┐          │
│  │ menu.ts  │  │ FileService│  │ RecentFilesSvc   │  │ AppEvents│          │
│  └────┬─────┘  └─────┬──────┘  └────────┬─────────┘  └────┬─────┘          │
│       │              │                  │                  │               │
│       └──────────────┴──────────────────┼──────────────────┘               │
│                                         │                                  │
│                        ┌────────────────▼─────────────────┐                │
│                        │  IPC Registry (37 channels)      │                │
│                        │  zod-validated · rate-limited    │                │
│                        └────────────────┬─────────────────┘                │
│  ┌──────────────┐  ┌────────────────────▼──────────────┐  ┌──────────────┐ │
│  │ SettingsSvc  │  │ electron-store (JSON)             │  │ FileWatcher  │ │
│  └──────────────┘  └───────────────────────────────────┘  └──────────────┘ │
└──────────────────────────────────┬─────────────────────────────────────────┘
                                   │ preload.ts → contextBridge
                                   │ window.docflow.*
┌──────────────────────────────────▼─────────────────────────────────────────┐
│                Renderer SPA (React 19 + Vite, sandboxed)                   │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ FormattingToolbar (Theme, Font, Size, Page, Margin,                  │  │
│  │ Paged↔Continuous, Auto-scroll, Copy MD, Zoom, TOC Sync)              │  │
│  │ [CSS overflow-x: auto untuk mencegah terpotong]                      │  │
│  └──────────────────────────────┬───────────────────────────────────────┘  │
│  ┌──────────────┐  ┌────────────▼────────────┐  ┌──────────────┐           │
│  │ Document     │  │ Document Viewer         │  │ TOC Side     │           │
│  │ Editor       │  │ (DOM ref)               │  │ bar (Sync)   │           │
│  │ (textarea)   │◄─┤ [Native Context Menu]   │  │              │           │
│  │ [Ctx Menu]   │  │                         │  │              │           │
│  └──────┬───────┘  └────────────┬────────────┘  └──────┬───────┘           │
│         │                       │                      │                   │
│         └───────────────────────┼──────────────────────┘                   │
│                                 │                                          │
│                    ┌────────────▼────────────┐                             │
│                    │  Zustand                │                             │
│                    │  fileStore | uiStore    │                             │
│                    └────────────┬────────────┘                             │
└─────────────────────────────────┼──────────────────────────────────────────┘
                                  │
┌─────────────────────────────────▼──────────────────────────────────────────┐
│                    Filesystem & OS Integration                             │
│  Win  : %APPDATA%\DocFlow Studio\{settings,recent,session}.json            │
│  Linux: ~/.config/DocFlow Studio/{settings,recent,session}.json            │
│  Docs : *.md, *.markdown, *.txt (user-chosen paths)                        │
│  Assoc: HKCR\DocFlowStudio.md (win) · /usr/share/mime (linux)              │
└────────────────────────────────────────────────────────────────────────────┘
```

**Alur request/data utama (tunggal):**

1. **Open flow** — Ctrl+O / dbl-click `.md` → `second-instance` argv / `open-file` → `OpenFileRouter` → `FileService.read` → `app:open-file` → `fileStore.load` → re-render.
2. **Edit flow** — ketik `<textarea>` → `setBuffer` → `useDeferredValue` preview → `dirty` recompute → autosave draft 5s (`session:save` debounced).
3. **Toolbar flow** — klik Zoom/Paged/Theme → `uiStore.setXxx()` → re-render UI (tanpa IPC) → debounce 500ms → `settings:set` simpan `uiState`.
4. **TOC Sync flow** — klik outline → `useScrollSync.handleTocClick` → jika `ui.syncScrollWithToc` ON → `preview.scrollIntoView` + `textarea.scrollTo(lineNumber × lineHeight)`.
5. **Auto-scroll flow** — `onScroll` editor → jika `ui.autoScroll` ON → proporsional set `preview.scrollTop`.
6. **Context Menu flow** — right-click editor/preview → `useContextMenu` menangkap event → `app:showContextMenu` IPC → Main Process build native menu → eksekusi aksi (Copy/Paste).
7. **Save flow** — Ctrl+S → `fileStore.save` → IPC `file:save(path, content, expectedMtime)` → atomic write → `savedContent := content` → toast → `session:clear`.
8. **Close flow** — `window.on('close')` → jika `dirty` → `dialog:confirmUnsaved` Save/Discard/Cancel.

---

## 6. Kontrak Infra & Platform Desktop

| Kebutuhan | Kontrak |
| :--- | :--- |
| Runtime | Electron 33.x, Node.js 20.18 (main), Chromium 130 (renderer). |
| Dev bind | Hanya `127.0.0.1:5173` (Vite); production `app://docflow/`. |
| Outbound network | Tidak ada; CSP `connect-src 'self'`. |
| FS write | Hanya di `app.getPath('userData')` + path pilihan user via dialog. |
| FS read | `*.md`, `*.markdown`, `*.txt`, `*.pdf`, `*.docx`; hard-reject > 50 MB. |
| Path data | `userData` writable; fallback `app.getPath('temp')` bila read-only. |
| CPU arch | Windows x64 (F1); Linux x64 + arm64. |
| Memory | ≤ 400 MB idle, ≤ 900 MB dokumen 5 MB. |
| Display | Min 1280×720; hidpi 1x/1.5x/2x. |
| Locale | UTF-8 I/O; UI ID + EN di F2. |
| Display server (Linux) | X11 + Wayland (Electron auto). |
| Installer | Windows NSIS 3.x (per-user); Linux AppImage + deb. |
| Code signing | Windows Authenticode + Linux GPG — prasyarat F2, opsional F1. |
| Auto-update (F2) | `electron-updater` + `latest.yml` HTTPS. |

---

## 7. Stack & Dependensi

| Komponen | Pilihan |
| :--- | :--- |
| Language | TypeScript 5.7 (strict). |
| Runtime desktop | Electron 33.2.0. |
| UI | React 19.0.0 + React DOM 19.0.0. |
| Bundler renderer | Vite 6.0. |
| Bundler main | `electron-vite` 2.3. |
| Styling | Tailwind CSS 4.0 + `@tailwindcss/vite`. |
| Icons | lucide-react 0.460. |
| Markdown | `marked` 15.0 (heading ID untuk TOC) + DOMPurify. |
| DOCX | `docx` 9.0. |
| PDF direct | `jsPDF` 2.5.2 + `html2canvas` 1.4.1. |
| State | `zustand` 5.0 (`fileStore`, `uiStore`). |
| Validation | `zod` 3.24. |
| Config store | `electron-store` 10.0. |
| Logging | `electron-log` 5.2. |
| Watcher | `chokidar` 4.0. |
| Testing unit | `vitest` 2.1 + `@testing-library/react` 16. |
| Testing e2e | `playwright` 1.49 (Electron driver). |
| Packaging | `electron-builder` 25.1. |
| Lint/format | `eslint` 9 + `@typescript-eslint` 8 + `prettier` 3.3. |
| Toolchain | Node 20.18, pnpm 9.12 (corepack). |

Catatan: `jsPDF`, `docx`, `chokidar` tidak butuh native compile; `electron-store` di-bundle ke main saja.

---

## 8. Struktur Repo Final (tunggal)

```text
docflow-studio-desktop/
├── package.json
├── pnpm-lock.yaml
├── electron-builder.yml
├── tsconfig.json
├── tsconfig.electron.json
├── vite.config.ts
├── electron.vite.config.ts
├── eslint.config.js                # react-hooks/rules-of-hooks = error
├── .env.example
├── .gitignore
├── README.md
├── LICENSE
├── CHANGELOG.md
├── docs/
│   ├── USER_GUIDE.md
│   └── PLUGINS.md
├── electron/
│   ├── main.ts                     # lifecycle, single-instance, protocol
│   ├── preload.ts                  # contextBridge → window.docflow
│   ├── menu.ts                     # native menu File/Edit/View/Window/Help
│   ├── protocol.ts                 # app://docflow/ handler
│   ├── window.ts                   # BrowserWindow factory + bounds persist
│   ├── ipc/
│   │   ├── index.ts                # registerAllHandlers()
│   │   ├── fileHandlers.ts         # 12 file:* channel
│   │   ├── recentHandlers.ts       # 5 recent:* channel
│   │   ├── settingsHandlers.ts     # 4 settings:* channel (termasuk uiState)
│   │   ├── sessionHandlers.ts      # 3 session:* channel
│   │   ├── windowHandlers.ts       # 6 window:* channel
│   │   ├── appHandlers.ts          # 4 app:* channel (termasuk context menu)
│   │   ├── dialogHandlers.ts       # 1 dialog:confirmUnsaved
│   │   ├── shellHandlers.ts        # 2 shell:* channel
│   │   └── schemas.ts              # zod per channel
│   ├── services/
│   │   ├── FileService.ts          # atomic write, mtime conflict, backup
│   │   ├── FileProvider.ts         # interface
│   │   ├── LocalFsProvider.ts      # default
│   │   ├── RecentFilesService.ts   # LRU + pinned + TTL prune
│   │   ├── SettingsService.ts      # versioned migrate (termasuk uiState)
│   │   ├── SessionService.ts       # crash recovery draft
│   │   ├── OpenFileRouter.ts       # argv + open-file + protocol
│   │   ├── FileWatcher.ts          # chokidar wrapper (debounce 250ms)
│   │   ├── ContextMenuService.ts   # Native Menu builder untuk editor/preview
│   │   └── DialogService.ts        # wrapper dialog (mockable di e2e)
│   ├── utils/
│   │   ├── paths.ts
│   │   ├── errors.ts               # AppError taxonomy
│   │   └── logger.ts
│   └── types/
│       └── ipc.ts
├── src/
│   ├── main.tsx
│   ├── App.tsx                     # ⭐ hooks top-level, refs editor/preview
│   ├── index.css                   # ⭐ custom-scrollbar for toolbar
│   ├── components/
│   │   ├── DocumentEditor.tsx      # forwardRef, onScroll, onContextMenu
│   │   ├── DocumentViewer.tsx      # forwardRef, props zoomLevel/isPagedMode, onContextMenu
│   │   ├── FormattingToolbar.tsx   # ⭐ UI lengkap + overflow-x-auto
│   │   ├── TableOfContents.tsx     # ⭐ hooks top-level, sync toggle
│   │   ├── TopNav.tsx
│   │   ├── ExportModal.tsx
│   │   ├── ZenReviewModal.tsx
│   │   ├── CodeScriptModal.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── RecentFilesMenu.tsx
│   │   ├── UnsavedChangesDialog.tsx
│   │   ├── ConflictDialog.tsx
│   │   ├── RecoveryPrompt.tsx
│   │   └── StatusBar.tsx           # path + dirty • + encoding + lineEnding + cursor
│   ├── hooks/
│   │   ├── useFileSession.ts       # load/save/dirty
│   │   ├── useRecentFiles.ts
│   │   ├── useWindowBounds.ts
│   │   ├── useKeyboardShortcuts.ts # Ctrl+S/O/N/Shift+S
│   │   ├── useScrollSync.ts        # auto-scroll + TOC sync
│   │   ├── useContextMenu.ts       # ⭐ trigger native menu
│   │   └── useUiStatePersistence.ts# debounce uiStore → settings:set
│   ├── store/
│   │   ├── fileStore.ts            # zustand: session + dirty + toast
│   │   └── uiStore.ts              # zustand: zoomLevel, isPagedMode, autoScroll, syncScrollWithToc, viewMode, isTocVisible, tocWidth
│   ├── types/
│   │   ├── document.ts
│   │   ├── state.ts                # SessionState, RecentFile, AppSettings, UIState
│   │   ├── electron.d.ts           # window.docflow typing
│   │   └── window.d.ts
│   ├── styles/
│   │   └── themes.ts
│   └── utils/
│       ├── markdownParser.ts       # heading ID + DOMPurify
│       ├── docExport.ts
│       ├── pdfExport.ts
│       ├── documentStats.ts
│       ├── clipboard.ts            # Copy MD
│       ├── languageScripts.ts
│       └── sampleDocuments.ts
├── build/
│   ├── icon.ico
│   ├── icon.icns
│   ├── icon.png
│   ├── installer.nsh               # file association registry
│   └── docflow-studio.desktop
├── scripts/
│   ├── afterPack.ts
│   └── verify-build.ts             # CSP + no-devtools check
├── tests/
│   ├── unit/
│   │   ├── FileService.test.ts
│   │   ├── RecentFilesService.test.ts
│   │   ├── SettingsService.test.ts
│   │   ├── SessionService.test.ts
│   │   ├── markdownParser.test.ts
│   │   ├── docExport.test.ts
│   │   └── documentStats.test.ts
│   ├── integration/
│   │   ├── ipc-file.test.ts
│   │   ├── ipc-recent.test.ts
│   │   ├── ipc-session.test.ts
│   │   ├── open-file-router.test.ts
│   │   ├── ui-persistence.test.tsx # ⭐ test viewMode, tocWidth persist
│   │   └── hooks-discipline.test.tsx  # ⭐ toggle Editor/Split/Preview × 5
│   └── e2e/
│       ├── playwright.config.ts
│       └── specs/
│           ├── launch.spec.ts
│           ├── open-save.spec.ts
│           ├── file-association.spec.ts
│           ├── recent-files.spec.ts
│           ├── toc-sync.spec.ts
│           ├── auto-scroll.spec.ts
│           ├── zoom-paged.spec.ts
│           ├── context-menu.spec.ts # ⭐ test right-click & copy
│           ├── toolbar-overflow.spec.ts # ⭐ test scroll
│           └── view-mode-toggle.spec.ts
└── .github/
    └── workflows/
        └── release.yml             # matrix build + upload artifacts
```

± 92 file source, ± 18.000 LOC (termasuk test & config).

---

## 9. Environment Variables / Konfigurasi

```bash
# ── Core ──
DOCFLOW_USER_DATA_DIR=                 # override userData (testing only)
DOCFLOW_LOG_LEVEL=info                 # trace|debug|info|warn|error
DOCFLOW_LOG_MAX_FILES=10
DOCFLOW_LOG_MAX_SIZE_MB=20

# ── Files ──
DOCFLOW_MAX_FILE_SIZE_MB=50
DOCFLOW_ENCODING=utf-8                 # auto-detect BOM / utf-16le
DOCFLOW_WATCH_DEBOUNCE_MS=250
DOCFLOW_AUTOSAVE_DEBOUNCE_MS=1500
DOCFLOW_RECOVERY_INTERVAL_MS=5000

# ── Recent Files ──
DOCFLOW_RECENT_MAX=20
DOCFLOW_RECENT_TTL_DAYS=90

# ── UI Defaults (v1.5) ──
DOCFLOW_DEFAULT_ZOOM=100               # 50–200
DOCFLOW_DEFAULT_PAGED_MODE=true
DOCFLOW_DEFAULT_AUTOSCROLL=false
DOCFLOW_DEFAULT_SYNC_TOC=true

# ── Security ──
DOCFLOW_CSP_ENABLED=true               # JANGAN false di production
DOCFLOW_ALLOWED_EXTERNAL=*.wikipedia.org,*.github.com
DOCFLOW_DEVTOOLS_ENABLED=false
DOCFLOW_E2E_MODE=false
```

`{userData}/settings.json` (unified, termasuk `uiState` v1.5):

```jsonc
{
  "schemaVersion": 3,
  "theme": "modern",                   // modern|academic|minimal|editorial|legal
  "fontSize": "md",                    // sm|md|lg
  "fontFamily": "sans",                // sans|serif|display|mono
  "pageSize": "A4",                    // A4|Letter
  "marginSize": "normal",              // compact|normal|spacious
  "paperTone": "white",                // white|cream|dark
  "showHeaderFooter": true,
  "showPageNumbers": true,
  "autoNumberHeadings": false,
  "justifyText": false,
  "windowBounds": { "width": 1400, "height": 900, "x": null, "y": null },
  "lastOpenedDir": null,
  "lastExportDir": null,
  "uiState": {                         // ⭐ v1.5 FULL STATE
    "zoomLevel": 100,
    "isPagedMode": true,
    "autoScroll": false,
    "syncScrollWithToc": true,
    "viewMode": "split",               // editor | split | preview
    "isTocVisible": true,
    "tocWidth": 280,
    "toolbarScrollLeft": 0
  }
}
```

**Aturan:** env var dibaca sebelum `app.whenReady()`; invalid → `dialog.showErrorBox` + `app.exit(1)`. `schemaVersion` naik (v2 → v3) untuk menambahkan state UI baru; migrasi di `SettingsService.migrate`. `DOCFLOW_CSP_ENABLED=false` ditolak `verify-build.ts` di production.

---

## 10. State Model (unified)

```typescript
// src/types/state.ts — shared main + renderer
export interface UIState {
  zoomLevel: number;           // 50–200
  isPagedMode: boolean;
  autoScroll: boolean;
  syncScrollWithToc: boolean;
  viewMode: 'editor' | 'split' | 'preview';
  isTocVisible: boolean;
  tocWidth: number;            // 200-500 px
  toolbarScrollLeft: number;
}

export interface SessionState {
  filePath: string | null;
  fileContent: string;
  savedContent: string;
  diskMtime: number | null;
  dirty: boolean;
  encoding: 'utf-8' | 'utf-8-bom' | 'utf-16le';
  lineEnding: 'lf' | 'crlf' | 'cr';
}

export interface RecentFile {
  path: string;
  displayName: string;
  lastOpenedAt: number;
  size: number;
  pinned: boolean;
}

export interface AppSettings {
  schemaVersion: number;
  theme: 'modern'|'academic'|'minimal'|'editorial'|'legal';
  fontSize: 'sm'|'md'|'lg';
  fontFamily: 'sans'|'serif'|'display'|'mono';
  pageSize: 'A4'|'Letter';
  marginSize: 'compact'|'normal'|'spacious';
  paperTone: 'white'|'cream'|'dark';
  showHeaderFooter: boolean;
  showPageNumbers: boolean;
  autoNumberHeadings: boolean;
  justifyText: boolean;
  windowBounds: { width: number; height: number; x: number|null; y: number|null };
  lastOpenedDir: string | null;
  lastExportDir: string | null;
  uiState: UIState;            // ⭐ v1.5
}
```

**Kunci integritas:**

| Kunci | File/Store | Menjamin |
| :--- | :--- | :--- |
| `recent.path` UNIQUE | `recent.json` | Tidak ada duplikat |
| `recent` max 20 (pinned tidak dihitung) | `recent.json` | LRU eviction |
| `settings.schemaVersion` monotonic | `settings.json` | Gate migrasi |
| `session.dirty === (fileContent !== savedContent)` | runtime | Invariant dirty |
| `session.diskMtime` compare on save | runtime | Deteksi konflik |
| `uiState.zoomLevel ∈ [50,200]` | `settings.json` | Validasi zod |
| `uiState.viewMode` valid string | `settings.json` | Validasi zod |
| `path.startsWith(userHome)` OR user pick | runtime | Anti path traversal |
| **Hooks count stabil per komponen** | runtime | Tidak ada hook kondisional |

---

## 11. Service Layer (unified)

### 11.1 `FileProvider` interface (plug-and-play)

```typescript
export interface ReadResult { content: string; size: number; mtime: number; encoding: 'utf-8'|'utf-8-bom'|'utf-16le'; }
export interface WriteOptions { encoding?: 'utf-8'|'utf-8-bom'|'utf-16le'; expectedMtime?: number|null; createBackup?: boolean; }
export interface WriteResult { path: string; size: number; mtime: number; }
export interface FileInfo { path: string; size: number; mtime: number; isFile: boolean; isSymlink: boolean; }
export interface Watcher { close(): Promise<void>; on(e: 'change'|'unlink'|'error', cb: (p: string)=>void): void; }

export interface FileProvider {
  readonly id: string;
  canHandle(path: string): boolean;
  read(path: string): Promise<ReadResult>;
  write(path: string, content: string, opts?: WriteOptions): Promise<WriteResult>;
  info(path: string): Promise<FileInfo | null>;
  exists(path: string): Promise<boolean>;
  watch(path: string): Promise<Watcher>;
}
```

### 11.2 Domain service (tunggal)

| File | Tanggung jawab |
| :--- | :--- |
| `FileService.ts` | Orchestrator: pilih provider, atomic write, mtime conflict, backup. |
| `RecentFilesService.ts` | CRUD recent, LRU cap 20, prune TTL, pinned. |
| `SettingsService.ts` | Baca/tulis `settings.json`, migrasi schema, persist `uiState`. |
| `SessionService.ts` | Draft recovery 5s, restore saat launch, clear on save. |
| `OpenFileRouter.ts` | Normalisasi `argv`, `open-file` event, `app://` protocol. |
| `FileWatcher.ts` | Wrapper `chokidar` debounce 250ms; emit ke renderer. |
| `ContextMenuService.ts` | Build native menu (`Menu.buildFromTemplate`) untuk editor & preview. |
| `DialogService.ts` | Bungkus dialog native; mockable di e2e. |
| `fileStore.ts` (zustand) | Session renderer + dirty + toast. |
| `uiStore.ts` (zustand) | `zoomLevel`, `isPagedMode`, `autoScroll`, `syncScrollWithToc`, `viewMode`, `isTocVisible`, `tocWidth`. |
| `useScrollSync.ts` | Auto-scroll + TOC sync (mapping `lineNumber ↔ elementId`). |
| `useFileSession.ts` | Load/save/dirty orchestration. |
| `useContextMenu.ts` | Menangkap `onContextMenu`, mengirim IPC `app:showContextMenu`. |
| `useUiStatePersistence.ts` | Debounce 500ms → `settings:set`. |

### 11.3 Pipeline: Save dengan konflik

```text
fileStore.save()
  → IPC file:save({path, content, expectedMtime})
    → zod.parse
    → FileService.write(path, content, {expectedMtime})
        → canHandle? else FILE_UNSUPPORTED
        → fs.stat → diskMtime
        → if expectedMtime != null && diskMtime != expectedMtime → { conflict:true, diskMtime }
        → write `${path}.tmp` → fs.rename → fsync(dir)
        → { ok:true, mtime }
  → onConflict? ConflictDialog (Overwrite/Reload/Save As)
  → onSuccess: savedContent:=content; dirty:=false; session:clear; recent:add
```

### 11.4 Pipeline: Native Context Menu

```text
User right-click di Editor/Preview
  → onContextMenu={(e)} → e.preventDefault()
  → useContextMenu(type, hasSelection, isEditable)
    → IPC app:showContextMenu({ type, x, y, hasSelection, isEditable })
      → Main Process: Menu.buildFromTemplate([...])
      → Menu.popup({ window })
        → Eksekusi aksi native (clipboard.copy, clipboard.paste, dll)
```

### 11.5 Scheduler

| Task | Jadwal | Aksi |
| :--- | :--- | :--- |
| Draft autosave | debounce 1.5s idle | `session:save` |
| Draft recovery flush | tiap 5s saat dirty | `session:save` (idempotent) |
| Recent prune | launch + `recent:add` | buang > 90 hari, cap 20 |
| Watcher reconcile | debounce 250ms | `file:changed` |
| Settings save (termasuk uiState) | debounce 500ms | atomic write |
| Log rotation | on write > 20MB | rotate 10 file |

---

## 12. Routes & API / Entry Points (unified)

**IPC channels (37):**

| Grup | Channel |
| :--- | :--- |
| `file:*` (12) | `open`, `openPath`, `save`, `saveAs`, `saveDialog`, `info`, `exists`, `read`, `readBinary`, `writeBinary`, `watch`, `unwatch` |
| `recent:*` (5) | `list`, `add`, `remove`, `clear`, `pin` |
| `settings:*` (4) | `get`, `set`, `all`, `reset` |
| `session:*` (3) | `save`, `load`, `clear` |
| `window:*` (6) | `title`, `dirty`, `minimize`, `maximize`, `close`, `state` |
| `app:*` (4) | `version`, `platform`, `openFile`, **`showContextMenu`** |
| `dialog:*` (1) | `confirmUnsaved` |
| `shell:*` (2) | `showItemInFolder`, `openExternal` |

**Non-IPC entry points (renderer-local):**

| Entry | Fungsi |
| :--- | :--- |
| **TOC Click** | `TableOfContents` → `useScrollSync` (top-level hook) |
| **Zoom —/%/+ / Fit / Reset** | `FormattingToolbar` → `uiStore.setZoomLevel` |
| **Paged↔Continuous** | `FormattingToolbar` → `uiStore.togglePagedMode` |
| **Auto-scroll toggle** | `FormattingToolbar` → `uiStore.toggleAutoScroll` |
| **TOC Sync toggle** | `FormattingToolbar` / `TableOfContents` → `uiStore.toggleSyncScrollWithToc` |
| **Copy MD** | `FormattingToolbar` → `navigator.clipboard.writeText(buffer)` |
| **Right-click Editor/Preview** | `DocumentEditor`/`DocumentViewer` → `useContextMenu` → IPC |
| **Theme/Font/Size/Page/Margin** | `FormattingToolbar` → `settings:set` (debounced) |
| **Toggle ViewMode / TOC** | `FormattingToolbar` → `uiStore.setViewMode` / `toggleToc` |

**Rate limits:**
- `file:*` write: ≥300ms antar call per path.
- `settings:set` (termasuk uiState): debounce 500ms.
- `session:save`: debounce 1.5s, hard-cap 2/detik.
- `recent:add`: max 10/detik.
- `window:dirty`: debounce 50ms.
- `shell:openExternal`: 1 per 500ms.
- `app:showContextMenu`: max 5/detik (mencegah spam klik kanan).

---

## 13. Core Flows (unified)

### 13.1 Open dari OS association
1. Dbl-click `laporan.md` → OS launch `docflow-studio "laporan.md"` / `%U`.
2. Instance 1 jalan → `app.requestSingleInstanceLock()` false → `second-instance` → instance 2 quit.
3. `OpenFileRouter.extractPathsFromArgv` → `FileService.read` → `app:open-file` → `fileStore.load` → editor/preview/TOC update + `recent:add`.

### 13.2 Save-in-place dengan konflik
1. Ctrl+S → `fileStore.save()` → jika `filePath === null` → Save As flow.
2. IPC `file:save({path, content, expectedMtime})` → `FileService` cek mtime.
3. Konflik → `ConflictDialog` Overwrite/Reload/Save As.
4. Sukses → atomic write → `savedContent := content` → toast → `session:clear` → `recent:add`.

### 13.3 TOC Sync Scroll
1. User klik heading di `TableOfContents`.
2. `TableOfContents` (hooks di top-level) → `useScrollSync.handleTocClick(item)`.
3. Jika `ui.syncScrollWithToc === false` → abaikan.
4. Preview: `scrollIntoView({ behavior:'smooth' })`.
5. Editor: `scrollTop := (lineNumber-1)*lineHeight`, `setSelectionRange`, `focus`.
6. Fail-safe jika elemen tidak ditemukan.

### 13.4 Toolbar UI & Zoom
1. Klik `+`/`—` atau ubah Paged↔Continuous.
2. `FormattingToolbar` → `uiStore.setZoomLevel` / `togglePagedMode`.
3. `DocumentViewer` bereaksi via `transform: scale()` / `max-width`+`box-shadow`.
4. `useUiStatePersistence` debounce 500ms → `settings:set` (disk).

### 13.5 Auto-scroll Ketikan
1. User mengetik, `onScroll` di textarea.
2. Jika `ui.autoScroll` ON → hitung persentase `scrollTop / (scrollHeight - clientHeight)` → set `preview.scrollTop` proporsional.

### 13.6 Close dengan unsaved
1. X / Alt+F4 → `window.on('close')` → cek `session.dirty`.
2. Jika dirty → `dialog:confirmUnsaved` → Save/Discard/Cancel.

### 13.7 Crash recovery
1. Tiap 5s saat dirty → `SessionService.write`.
2. Crash → launch → `SessionService.read` → `RecoveryPrompt` Restore/Discard/Open Original.

### 13.8 Toggle viewMode (regression X1)
1. User klik Editor Only → `viewMode='editor'` → `DocumentViewer` unmount.
2. Karena `useUIStore()` sudah top-level di `App.tsx`, jumlah hook tetap stabil → tidak ada `Rendered fewer hooks than expected`.
3. Ulangi Split / Preview / Editor × 5 → tetap stabil.

### 13.9 Context Menu (Baru)
1. User klik kanan di `DocumentEditor` atau `DocumentViewer`.
2. `useContextMenu` menangkap event `onContextMenu` → `e.preventDefault()`.
3. Mengirim IPC `app:showContextMenu` dengan payload `{ type, x, y, hasSelection, isEditable }`.
4. `ContextMenuService` di Main Process menyusun menu (Cut/Copy/Paste/Select All untuk editor; Copy/Select All untuk preview).
5. Menu muncul secara native, aksi dieksekusi oleh OS/Electron.

### 13.10 Toolbar Overflow & Full UI Persistence (Baru)
1. User mengecilkan window → `FormattingToolbar` tidak terpotong karena `overflow-x: auto`.
2. User menggeser scrollbar toolbar atau mengubah lebar TOC.
3. `uiStore` menyimpan `toolbarScrollLeft` dan `tocWidth`.
4. `useUiStatePersistence` mendeteksi perubahan → debounce 500ms → `settings:set`.
5. Saat aplikasi dibuka kembali, `App.tsx` membaca `settings.json` dan menghidrasi `uiStore`.

---

## 14. UI / Views (unified)

| View | Sumber | Catatan |
| :--- | :--- | :--- |
| `App.tsx` | `src/App.tsx` | **⭐ `const uiState = useUIStore()` di top-level**; refs; `useFileSession`, `useKeyboardShortcuts`. |
| `FormattingToolbar` | `src/components/FormattingToolbar.tsx` | **Dirobak total**: Lengkap dengan **`overflow-x-auto custom-scrollbar`** agar tidak terpotong. |
| `DocumentEditor` | `src/components/DocumentEditor.tsx` | `forwardRef`; `onScroll`; **`onContextMenu`** via `useContextMenu`. |
| `DocumentViewer` | `src/components/DocumentViewer.tsx` | `forwardRef`; props `zoomLevel`, `isPagedMode`; **`onContextMenu`**. |
| `TableOfContents` | `src/components/TableOfContents.tsx` | **⭐ `const ui = useUIStore()` di top-level**; **resizable width** (drag handle). |
| `TopNav` | `src/components/TopNav.tsx` | Tombol Save/Open panggil `fileStore`. |
| `ExportModal` | `src/components/ExportModal.tsx` | + opsi "Save as native file" via `file:saveBinary`. |
| `ZenReviewModal` | `src/components/ZenReviewModal.tsx` | Tidak berubah. |
| `CodeScriptModal` | `src/components/CodeScriptModal.tsx` | Tidak berubah. |
| `RecentFilesMenu` | BARU | Dropdown; sinkron native menu Open Recent. |
| `UnsavedChangesDialog` | BARU | Save/Discard/Cancel. |
| `ConflictDialog` | BARU | Overwrite/Reload/Save As. |
| `RecoveryPrompt` | BARU | Restore/Discard/Open Original. |
| `StatusBar` | BARU | path, dirty •, encoding, lineEnding, cursor pos, zoom %. |
| `ErrorBoundary` | ada | Bungkus top-level view. |
| Native Menu | `electron/menu.ts` | File/Edit/View/Window/Help. |

### 14.1 Catatan implementasi hooks & UI (wajib)

**`App.tsx`**
```tsx
export default function App() {
  const uiState = useUIStore();               // ✅ top-level
  const session = useFileSession();
  const { editorRef, previewRef } = useScrollSync();  // ✅ top-level
  useKeyboardShortcuts();
  // ...
  return (
    <>
      {viewMode !== 'editor' && (
        <DocumentViewer
          ref={previewRef}
          zoomLevel={uiState.zoomLevel}       // ✅ baca field
          isPagedMode={uiState.isPagedMode}
        />
      )}
    </>
  );
}
```

**`FormattingToolbar.tsx` (CSS Overflow)**
```tsx
<div className="flex items-center gap-2 px-4 py-2 overflow-x-auto custom-scrollbar whitespace-nowrap relative mask-fade">
  {/* Konten toolbar */}
</div>
```

**`DocumentEditor.tsx` (Context Menu)**
```tsx
export const DocumentEditor = forwardRef((props, ref) => {
  const { handleContextMenu } = useContextMenu('editor'); // ✅ top-level
  
  return (
    <textarea
      ref={ref}
      onContextMenu={(e) => handleContextMenu(e)}
      // ...
    />
  );
});
```

**ESLint:** `react-hooks/rules-of-hooks: error`, `react-hooks/exhaustive-deps: warn`.

---

## 15. Security & Reliability

| Area | Tindakan |
| :--- | :--- |
| Renderer isolation | `contextIsolation`, `sandbox`, `nodeIntegration:false`, `webSecurity:true`. |
| Preload bridge | Hanya `window.docflow.*` typed. |
| IPC validation | zod per channel; reject `IPC_INVALID`. |
| Path traversal | `path.resolve` + `startsWith(userHome)`; tolak di luar dialog. |
| Malicious Markdown | DOMPurify sebelum `dangerouslySetInnerHTML`. |
| CSP | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'`. |
| External links | `shell.openExternal` whitelist host. |
| File size DoS | Hard-reject > 50 MB. |
| Atomic write | `.tmp` → `rename` → `fsync(dir)`. |
| External edit race | `expectedMtime` compare + `ConflictDialog`. |
| DOM sync safety | Jika `elementId`/slug tidak ditemukan → noop (fail-safe). |
| **Native Context Menu safety** | Hanya mengaktifkan opsi Cut/Paste jika `isEditable`; sanitasi input clipboard. |
| **Window Bounds safety** | Saat restore, validasi `x` dan `y` di `screen.getDisplayMatching` untuk mencegah window *off-screen*. |
| **Hooks integrity** | `react-hooks/rules-of-hooks: error`; regression test toggle viewMode. |
| Log rotation | 10 file × 20 MB; tidak log isi Markdown. |
| Privilege | Non-root; NSIS per-user default. |
| Ingress | Tidak ada HTTP listener; hanya `127.0.0.1:5173` dev. |
| Crash recovery | `session.json` + prompt restore. |
| Updater (F2) | Signature verify, HTTPS `latest.yml`. |
| Fuse (Linux) | AppImage butuh `libfuse2` (dokumentasi user). |

---

## 16. Build, Deploy, CI/CD

### 16.1 Pipeline build

```bash
set -euo pipefail
pnpm exec vite build --outDir dist/renderer
pnpm exec electron-vite build
node scripts/verify-build.ts        # CSP + no-devtools + hooks lint
pnpm exec electron-builder --win --linux --x64 --arm64 --publish never \
  --config electron-builder.yml
sha256sum release/*.{exe,AppImage,deb} > release/SHA256SUMS
```

### 16.2 `electron-builder.yml` (ringkas)

```yaml
appId: id.docflow.studio
productName: DocFlow Studio
directories: { output: release, buildResources: build }
files: [ "dist/**/*", "package.json" ]
extraMetadata: { main: dist/main/main.js }
asar: true
win:
  target:
    - { target: nsis,     arch: [x64] }
    - { target: portable, arch: [x64] }
  icon: build/icon.ico
  requestedExecutionLevel: asInvoker
nsis:
  oneClick: false
  perMachine: false
  allowToChangeInstallationDirectory: true
  include: build/installer.nsh
fileAssociations:
  - { ext: md,       name: Markdown Document, mimeType: text/markdown, role: Editor }
  - { ext: markdown, name: Markdown Document, mimeType: text/markdown, role: Editor }
  - { ext: txt,      name: Text Document,     mimeType: text/plain,    role: Editor }
linux:
  target:
    - { target: AppImage, arch: [x64, arm64] }
    - { target: deb,      arch: [x64] }
  category: Office
  icon: build/icon.png
  mimeTypes: [text/markdown, text/plain]
  desktop:
    entry:
      Name: DocFlow Studio
      Comment: Markdown authoring & export
      MimeType: text/markdown;text/plain;
      Exec: docflow-studio %U
      Categories: Office;TextEditor;
```

### 16.3 CI (`release.yml`)

- Trigger: tag `v*.*.*` atau `workflow_dispatch`.
- Matrix: `[windows-latest, ubuntu-22.04]` × Node 20.18 × pnpm 9.12.
- Steps: install → lint → typecheck → `test:unit` → build → `test:e2e` (xvfb di Ubuntu) → package → upload release + `SHA256SUMS`.
- Verifikasi: ukuran < 200 MB, smoke e2e lulus, `verify-build.ts` lulus.

---

## 17. Testing Checklist (unified)

### 17.1 Unit
- [ ] `FileService.write` atomik (kill mid-write → file utuh, `.tmp` tersisa).
- [ ] `FileService.write` conflict detection (`expectedMtime` mismatch).
- [ ] `RecentFilesService.add` dedup + cap 20 (pinned tidak dihitung).
- [ ] `RecentFilesService.prune` > 90 hari.
- [ ] `SettingsService.migrate` v2→v3 menambahkan state UI baru tanpa kehilangan field.
- [ ] `SessionService` idempotent (2x tulis sama → mtime stabil).
- [ ] `OpenFileRouter` parse argv Win/Linux.
- [ ] `markdownParser` heading ID unik.
- [ ] `documentStats`, `docExport`, `pdfExport` regression pass.
- [ ] `ContextMenuService.buildTemplate` menghasilkan menu yang benar berdasarkan `isEditable` dan `hasSelection`.

### 17.2 Integration & UI Logic (termasuk X1)
- [ ] `file:open` → `file:save` byte-identik.
- [ ] `recent:list` urut `lastOpenedAt` desc.
- [ ] `settings:set` merge tidak hapus field lain; state UI baru ter-persist.
- [ ] Watcher eksternal → `file:changed` ≤500ms.
- [ ] IPC invalid payload tidak crash main.
- [ ] Close dirty → `confirmUnsaved` Save/Discard/Cancel.
- [ ] **TOC Sync**: klik H2 → `textarea.scrollTop` tepat + `<h2 id>` scrollIntoView.
- [ ] **TOC Sync OFF**: klik TOC tidak scroll.
- [ ] **Auto-scroll**: ketik sampai bawah → preview proporsional (jika ON).
- [ ] **Zoom**: `+`/`—` mengubah transform preview; state persist.
- [ ] **Paged Mode**: Continuous → padding berubah, shadow hilang.
- [ ] **Copy MD**: clipboard === buffer persis.
- [ ] **Context Menu (Editor)**: Right-click → copy, paste, select all, cut berfungsi.
- [ ] **Context Menu (Preview)**: Right-click → hanya copy dan select all yang muncul.
- [ ] **Toolbar Overflow**: Resize window < 1024px → toolbar bisa di-scroll horizontal.
- [ ] **UI Persistence**: Ubah `viewMode` ke `preview`, restart mock → state kembali `preview`.
- [ ] **⭐ Hooks discipline (`hooks-discipline.test.tsx`)**: render App, toggle `viewMode` × 5, buka/tutup context menu → jumlah hook call stabil.

### 17.3 Smoke / Staging
- [ ] Launch Win 10/11 & Ubuntu 22.04/24.04 < 3 detik.
- [ ] Dbl-click `sample.md` → open.
- [ ] Ctrl+S tanpa path → Save dialog.
- [ ] Export DOCX → valid di LibreOffice 24.
- [ ] Print PDF → teks selectable.
- [ ] Kill -9 → relaunch → prompt recovery.
- [ ] **Toggle Editor Only / Split / Preview berturut-turut → tidak error**.
- [ ] **Context menu klik kanan di editor dan preview berfungsi native**.
- [ ] **Toolbar tidak terpotong saat window dikecilkan**.

### 17.4 Security
- [ ] Renderer tidak bisa `require('fs')`.
- [ ] `window.docflow` hanya method preload.
- [ ] `path: '../../etc/passwd'` → `PATH_TRAVERSAL`.
- [ ] `<img src=x onerror=alert(1)>` tersanitasi.
- [ ] `shell.openExternal('javascript:...')` → `EXTERNAL_BLOCKED`.
- [ ] File 100 MB ditolak.
- [ ] Symlink ke `/etc/shadow` ditolak `LocalFsProvider.canHandle`.
- [ ] CSP hilang di production → `verify-build.ts` gagal.
- [ ] ESLint `react-hooks/rules-of-hooks` error menolak PR yang melanggar.
- [ ] **Context Menu paste hanya terjadi jika `isEditable`**.

---

## 18. Timeline (28 hari kerja)

| Hari | Aktivitas |
| :--- | :--- |
| D1–D2 | Scaffold Electron + Vite + React; port seluruh `src/` lama; hello-window. |
| D3–D4 | `FileService` + `FileProvider` + atomic write + unit test. |
| D5–D6 | IPC registry (37 channel) + zod + `preload.ts` + `ContextMenuService` skeleton. |
| D7–D8 | `RecentFilesService` + `SettingsService` (v3) + `SessionService`. |
| D9–D10 | `fileStore` + `useFileSession` + integrasi renderer + `StatusBar`. |
| D11–D12 | **`uiStore` + `FormattingToolbar` (Theme..Zoom) + CSS Overflow fix.** |
| D13–D14 | **`useScrollSync` + TOC sync toggle + Auto-scroll + `useUiStatePersistence`.** |
| D15–D16 | **Implementasi Native Context Menu (IPC + Service + Hooks) di Editor & Viewer.** |
| D17–D18 | Save-in-place, conflict, unsaved guard, recovery prompt. |
| D19–D20 | Native menu + `OpenFileRouter` + file association (Win `.nsh`, Linux `.desktop`). |
| D21–D22 | Playwright e2e: launch, open/save, assoc, recent, **context menu, toolbar overflow**. |
| D23–D24 | **Audit React hooks + regression viewMode/context menu + ESLint rule.** |
| D25–D26 | CI matrix Win+Linux + artifact + checksum; polish (RecentFilesMenu, ConflictDialog, RecoveryPrompt). |
| D27 | Bugfix hasil e2e + security checklist §17.4 + UI persistence checklist. |
| D28 | Beta release **v1.5.0** (unsigned) + dokumentasi user. |

---

## 19. Definition of Done (DocFlow Studio Desktop v1.5)

- [ ] Repo `docflow-studio-desktop` (branch `main` + `develop`).
- [ ] `pnpm install && pnpm build && pnpm test` hijau di Win & Linux (CI).
- [ ] Semua fitur lama DocFlow Studio berjalan identik (regression pass).
- [ ] Save-in-place (Ctrl+S) & Save As (Ctrl+Shift+S) berfungsi.
- [ ] File association `.md`/`.markdown`/`.txt` terdaftar.
- [ ] Double-click `.md` membuka app dengan file ter-load.
- [ ] Native menu File lengkap.
- [ ] Recent files tampil di menu, bertahan antar restart.
- [ ] Dirty tracking akurat (`•` di title).
- [ ] Close guard: Save/Discard/Cancel.
- [ ] Crash recovery: kill -9 → relaunch → prompt restore.
- [ ] Konflik eksternal terdeteksi.
- [ ] Atomic write terverifikasi.
- [ ] Export DOCX/PDF/DOC/HTML/MD semua berfungsi.
- [ ] **FormattingToolbar lengkap** dan **Responsif (Overflow Scroll)**.
- [ ] **TOC Synchronization** ON/OFF berfungsi.
- [ ] **Auto-scroll** ON → preview mengikuti ketikan proporsional.
- [ ] **Native Context Menu**: Klik kanan di Editor/Preview memunculkan menu OS asli (Copy/Paste/Cut/Select All).
- [ ] **Full UI State Persistence**: Zoom, Paged, Auto-scroll, TOC Sync, **ViewMode, TOC Sidebar Width/Visibility** tersimpan di `settings.json`.
- [ ] **React Hooks Discipline (X1)**:
  - [ ] `App.tsx` dan `TableOfContents.tsx` memanggil `useUIStore()` di top-level.
  - [ ] `DocumentEditor.tsx` dan `DocumentViewer.tsx` memanggil `useContextMenu()` di top-level.
  - [ ] Toggle **Editor Only → Split → Preview** × 5 berturut-turut tanpa error.
  - [ ] ESLint `react-hooks/rules-of-hooks: error` aktif di CI.
- [ ] Security checklist §17.4 semua lulus.
- [ ] IPC invalid payload tidak crash main.
- [ ] `electron-builder` menghasilkan `.exe`, `.AppImage`, `.deb`.
- [ ] `README.md`, `LICENSE`, `CHANGELOG.md` (`v1.5.0`), `docs/USER_GUIDE.md` tersedia.

---

## 20. Roadmap + Ringkasan

| Fase | Deliverable |
| :--- | :--- |
| **F0** | Dokumen perencanaan ini (blueprint unified v1.5). |
| **F1** (M1) | **DocFlow Studio Desktop v1.5**: seluruh fitur lama + desktop integration (save-in-place, association, native menu, recent, recovery, watcher) + **UI sync (TOC, auto-scroll, zoom, paged, copy MD)** + **Native Context Menu** + **Toolbar Overflow Fix** + **Full UI State Persistence** + **hooks discipline fix**. Build unsigned. |
| **F2** (M2) | Auto-update (`electron-updater`), code signing Win Authenticode + Linux GPG, i18n ID/EN, tray minimize. |
| **F3** (M3) | Store publishing (MSIX, Flathub), PDF vektor via `pdf-lib`, telemetry opt-in lokal. |
| **F4** (M4) | macOS target (arm64 + x64), notarization, drag-to-dock file open. |
| **F5** (M5) | Plugin system (custom provider/export), sinkron WebDAV opt-in. |

**Ringkasan (≤120 kata):** DocFlow Studio Desktop **v1.5** adalah blueprint terpadu yang menggabungkan authoring Markdown, export multi-format, integrasi OS native, UI sinkronisasi cerdas (TOC, Auto-scroll, Zoom, Paged), **Context Menu OS native**, dan **Full UI State Persistence** (viewMode, tocWidth, dll). Arsitektur memisahkan `fileStore` dan `uiStore` di renderer sandboxed, dengan 37 IPC channel tervalidasi zod. **React Hooks Discipline** diperketat: `useUIStore()` dan `useContextMenu()` wajib di top-level. Toolbar diperbaiki dengan CSS *overflow scroll* agar tidak terpotong. Build matrix Windows + Linux menghasilkan `.exe`, `.AppImage`, dan `.deb` dalam 28 hari kerja, siap untuk fase auto-update dan code signing di masa depan.