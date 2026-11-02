# 🧾 DocFlow Studio Desktop — Rencana Pengembangan

> **Tagline:** *Markdown authoring & publication-grade export, now native on Windows & Linux.*
> **Sub-tagline (README):** *Electron desktop app yang menulis, memformat, dan mengekspor Markdown ke PDF/DOCX dengan integrasi OS native: file association `.md`, recent files, save-in-place, dan menu File native.*
> **Naming resmi:**
> - Repo: `docflow-studio-desktop`
> - Image/artifact: `DocFlowStudio-{version}-{arch}.{exe|AppImage|deb}`
> - Proses/container: `docflow-main` (main process), `docflow-renderer` (Chromium renderer sandboxed)
> - Path data utama: Windows `%APPDATA%\DocFlow Studio\`; Linux `~/.config/DocFlow Studio/`
> - Volume: N/A — diganti `userData/` directory
> - Nama network: N/A — hanya `127.0.0.1:5173` saat dev
> - Healthcheck: N/A — diganti smoke-test e2e "launch + open .md + save + quit"
> - Endpoint publik/contoh: `app://docflow/` (custom protocol, optional) atau `file://.../index.html`

> **Asumsi:** `TIMELINE_HINT` kosong → dipilih 4 minggu (20 hari kerja). `STACK_PREFERENCES` kosong → dipilih Electron + React + Vite + TypeScript untuk mempertahankan seluruh kode renderer yang sudah ada. `EXTERNAL_INTEGRATIONS` = tidak ada (full offline). `NON_GOALS_HINTS` = cloud sync, backend, AI/Gemini, mobile.

Dokumen ini mensintesis empat domain — **markdown editing**, **document formatting & preview**, **multi-format export**, dan **desktop file integration** — menjadi satu perencanaan terpadu bernama **DocFlow Studio Desktop**.

---

## 1. Analisis Sintesis Domain

### 1.1 Kesamaan (common ground)

| Aspek | Markdown Editing | Document Formatting | Multi-format Export | Desktop File Integration | Keputusan DocFlow Studio Desktop |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Input utama | Teks Markdown | Teks Markdown | Teks ter-render | File `.md` di disk | Single source of truth: buffer Markdown di renderer |
| State persisten | Buffer in-memory | Settings tema | File output | Path file aktif | Satu `fileStore` React + `session.json` |
| Trigger user | Ketik/paste | Pilih tema | Klik export | Ctrl+S / menu / double-click | Satu file-session hook (`useFileSession`) |
| Error model | Parse error | Render error | Export error | FS error / permission | Satu `AppError` taxonomy + toast |
| Cross-platform | Browser | Browser | Browser | OS-specific | Electron abstraction (`FileProvider`) |

### 1.2 Perbedaan yang perlu dijembatani

| Aspek | Markdown Editing | Desktop File Integration | Jembatan |
| :--- | :--- | :--- | :--- |
| Sumber kebenaran | State React | Disk file | Buffer state + `savedContent` snapshot, `dirty` derivasi |
| Waktu simpan | Tidak ada | Explicit Save / Auto | Menu File → Save, Ctrl+S, plus auto-save draft 5s ke `session.json` |
| Navigasi file | Paste/upload | Double-click `.md` di OS | `open-file` handler + `second-instance` argv parsing |
| Identitas dokumen | "Untitled" | Path absolut | `filePath: string \| null` di session |
| Idempotensi | N/A | Re-save harus sama | Atomic write `.tmp → rename` + `fsync` |
| Konflik eksternal | N/A | File diubah editor lain | `diskMtime` compare + watcher debounce 250ms |
| File association | N/A | Windows & Linux registry | electron-builder `fileAssociations` + `.desktop` MIME |

### 1.3 Strategi unifikasi

1. **Satu renderer SPA dipertahankan**, semua fitur lama (editor, viewer, export, zen review, code script) dipindah apa adanya ke dalam shell Electron dengan `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`.
2. **File operations dipusatkan di main process** melalui `FileService` + `FileProvider` interface; renderer hanya memanggil `window.docflow.file.*` via IPC tervalidasi zod.
3. **Session state dipisah dari settings**: `session.json` (path + buffer + dirty) dirotasi per 5 detik, `settings.json` ditulis saat change, `recent.json` LRU cap 20 entry. Migrasi versioned via `schemaVersion`.
4. **Native menu dan IPC channel tunggal** untuk semua entry point (Open, Recent, Save, Save As, Close) sehingga OS-level (file association, drag-to-dock-icon) dan in-app UI berbagi satu jalur kode.
5. **Build matrix CI** (Windows + Linux) mem-publish artifact signed sekaligus, dengan `latest.yml` untuk auto-update opsional F2.

---

## 2. Identitas & Naming (resmi)

| Item | Nilai |
| :--- | :--- |
| Repo | `github.com/<org>/docflow-studio-desktop` |
| Package name | `@docflow/studio-desktop` |
| App ID | `id.docflow.studio` |
| Executable name | `docflow-studio` (linux), `DocFlow Studio.exe` (win) |
| Artifact pattern | `DocFlowStudio-{version}-{arch}.{exe\|AppImage\|deb}` |
| Main process name | `docflow-main` |
| Renderer sandbox | `docflow-renderer` (Chromium sandboxed) |
| Path data (Win) | `%APPDATA%\DocFlow Studio\` |
| Path data (Linux) | `~/.config/DocFlow Studio/` |
| Log dir | `{userData}/logs/main-{date}.log` |
| Session file | `{userData}/session.json` |
| Settings file | `{userData}/settings.json` |
| Recent file | `{userData}/recent.json` |
| Cache dir | `{userData}/cache/` |
| Custom protocol | `app://docflow/` (register via `protocol.handle`) |
| Healthcheck (dev) | `127.0.0.1:5173` + `smoke.e2e.ts` |
| Default association | `.md`, `.markdown`, `.txt` → `text/markdown` |

---

## 3. Ruang Lingkup

### In scope

- Editor Markdown split-view + preview terformat (fitur lama dipertahankan).
- 5 tema dokumen, 3 paper tone, A4/Letter, margin, header/footer, nomor halaman.
- TOC otomatis, statistik dokumen, paged vs continuous mode.
- Export DOCX (native), Word HTML `.doc`, PDF via print, Direct PDF (raster), HTML, Markdown.
- Ekstraksi & download code block ke 30+ bahasa script.
- **BARU:** Save-in-place ke file asli (Ctrl+S).
- **BARU:** Save As dengan native dialog.
- **BARU:** File association `.md` (double-click membuka app).
- **BARU:** Native menu File → Open / Open Recent / Save / Save As / Export.
- **BARU:** Recent files list (max 20, LRU, pinned support).
- **BARU:** Dirty tracking + unsaved-changes guard saat close.
- **BARU:** Auto-recovery draft 5 detik ke `session.json`.
- **BARU:** File watcher eksternal (deteksi edit dari VSCode, dll).
- **BARU:** Session restore saat app reopen.
- Drag & drop file, paste clipboard, import dari file picker.

### Out of scope / prasyarat eksternal

- Installasi OS dependency (WebView2 di Windows, GTK di Linux).
- Code signing certificate (Windows Authenticode, GPG) — prasyarat release.
- Store publishing (Microsoft Store, Flathub) — di roadmap F3.
- Auto-updater server hosting — F2.
- Cloud sync, akun, backend, database server.
- AI/Gemini integration — dihapus total dari snapshot ini.
- macOS target — di luar cakupan (F4+).
- Markdown WYSIWYG inline editing (tetap source-of-truth textarea).

### Infra wajib menyediakan

- Node.js ≥ 20.18 untuk build.
- Windows: MinGW-w64 toolchain tidak perlu (electron-builder pakai prebuilt).
- Linux: `libgtk-3-0`, `libnss3`, `libasound2`, `libgbm1`, `fuse` untuk AppImage.
- GitHub Actions runner: `windows-latest`, `ubuntu-22.04`.
- Storage user: ≥ 500 MB bebas di `userData` (cache + logs + recovery).

---

## 4. Prinsip Desain

| Prinsip | Implementasi |
| :--- | :--- |
| **Renderer sandboxed** | `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true` di semua window. |
| **IPC tervalidasi** | Setiap `ipcMain.handle` menerima payload yang di-parse dengan schema zod; reject → `AppError('IPC_INVALID', ...)`. |
| **Single source of truth** | File state hanya di `fileStore` renderer; main process tidak menyimpan buffer Markdown kecuali saat write. |
| **Atomic write** | Semua tulis ke disk lewat `path.tmp` → `fs.rename` → `fsync(dir)`; gagal partial tidak korup. |
| **Fail-fast config** | Env var wajib divalidasi di `main.ts` boot; jika invalid → dialog + `app.exit(1)`. |
| **No network** | CSP `default-src 'self'; connect-src 'self'`; `shell.openExternal` hanya untuk URL whitelisted. |
| **Dirty invariant** | `dirty === (buffer !== savedContent)`; setiap mutasi buffer lewat setter yang recompute flag. |
| **Recovery-first** | Autosave draft ke `session.json` tiap 5 detik; crash → prompt restore saat launch berikutnya. |
| **Path normalization** | Semua path di IPC dinormalisasi `path.resolve` + cek `startsWith(userHome)`; tolak path traversal. |
| **Idempotent IPC** | `recent:add` dedup by `path`; `settings:set` merge; `file:watch` idempotent per path. |
| **Log tanpa PII** | Log hanya path basename + size, tidak pernah isi Markdown. |
| **Cross-platform parity** | Semua fitur berjalan identik di Windows & Linux; perbedaan OS hanya di path separator + dialog native. |

---

## 5. Arsitektur Terpadu

```
┌──────────────────────────────────────────────────────────────────────┐
│                       Electron Main Process (docflow-main)           │
│  ┌──────────┐  ┌─────────────┐  ┌──────────────────┐  ┌───────────┐  │
│  │ menu.ts  │  │ FileService │  │ RecentFilesSvc   │  │ AppEvents │  │
│  └────┬─────┘  └──────┬──────┘  └────────┬─────────┘  └─────┬─────┘  │
│       │               │                  │                  │        │
│       └───────────────┴──────────┬───────┴──────────────────┘        │
│                                  │                                   │
│                        ┌─────────▼──────────┐                        │
│                        │  IPC Registry      │  zod-validated         │
│                        │  (32 channels)     │  rate-limited          │
│                        └─────────┬──────────┘                        │
│  ┌──────────────┐  ┌─────────────▼──────────┐  ┌──────────────────┐  │
│  │ SettingsSvc  │  │ electron-store (JSON)  │  │ FileWatcher (fs) │  │
│  └──────────────┘  └────────────────────────┘  └──────────────────┘  │
└───────────────────────────────┬──────────────────────────────────────┘
                                │ preload.ts → contextBridge
                                │ window.docflow.*
┌───────────────────────────────▼──────────────────────────────────────┐
│                Renderer SPA (React 19 + Vite, sandboxed)             │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌─────────────────┐ │
│  │ Document   │  │ Document   │  │ Export     │  │ ZenReviewModal  │ │
│  │ Editor     │  │ Viewer     │  │ Modal      │  │                 │ │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └────────┬────────┘ │
│        │               │               │                  │          │
│        └───────────────┴──────┬────────┴──────────────────┘          │
│                               │                                      │
│                    ┌──────────▼─────────┐                            │
│                    │ fileStore (zustand)│  session + dirty + toast   │
│                    └──────────┬─────────┘                            │
│                               │                                      │
│                    ┌──────────▼─────────┐                            │
│                    │ window.docflow.*   │  typed bridge              │
│                    └────────────────────┘                            │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────────┐
│                    Filesystem & OS Integration                       │
│  Win  : %APPDATA%\DocFlow Studio\{settings,recent,session}.json       │
│  Linux: ~/.config/DocFlow Studio/{settings,recent,session}.json      │
│  Docs : *.md, *.markdown, *.txt (user-chosen paths)                  │
│  Assoc: HKCR\DocFlowStudio.md (win) · /usr/share/mime (linux)        │
└──────────────────────────────────────────────────────────────────────┘
```

**Alur request/data utama:**

1. **Open flow:** User Ctrl+O / double-click `.md` → OS dispatch ke `second-instance` argv atau `open-file` event → main `FileService.read(path)` → IPC emit `app:open-file` → renderer `fileStore.load(path, content)` → editor re-render.
2. **Edit flow:** User ketik di `<textarea>` → `setBuffer(content)` → React state update → `useDeferredValue` untuk preview → dirty recompute → autosave draft 5s ke `session.json` via IPC `session:save` (debounced).
3. **Save flow:** Ctrl+S → `fileStore.save()` → jika `filePath === null` → `file:saveDialog` → path → IPC `file:save(path, content)` → `FileService.write` (atomic) → `savedContent := content` → toast "Saved ✓" → `recent:add`.
4. **Export flow:** Klik Export → `ExportModal` → renderer memanggil `exportToDocx` / `downloadDirectPdf` (pure client-side, tidak lewat IPC) → `triggerFileDownload` diganti `file:saveBinary` bila ingin native dialog.
5. **Close flow:** `window.on('close')` → jika `dirty` → `dialog.showMessageBox` Save/Discard/Cancel → Save → `file:save` → close; Cancel → `event.preventDefault()`.

**Yang TIDAK diurus aplikasi:** cloud sync, autentikasi user, backend database, rendering PDF di server, auto-update hosting, dan code signing — semua itu prasyarat eksternal/release pipeline.

---

## 6. Kontrak Infra & Platform Desktop

| Kebutuhan | Kontrak untuk infra/platform |
| :--- | :--- |
| Runtime | Electron 33.x, Node.js 20.18 di main process, Chromium 130 di renderer. |
| Bind address dev | Hanya `127.0.0.1:5173` (Vite dev server); production renderer load `file://`. |
| Outbound network | Tidak ada. CSP `connect-src 'self'`; `shell.openExternal` hanya whitelist. |
| Filesystem write | Hanya di `app.getPath('userData')` dan path yang dipilih user via dialog. |
| Filesystem read | Hanya file `*.md`, `*.markdown`, `*.txt`, `*.pdf`, `*.docx`; hard-reject > 50 MB. |
| Path data | `userData` writable; fallback `app.getPath('temp')` bila read-only. |
| Volume | N/A (desktop). Backup user via Time Machine/restic, bukan tanggung jawab app. |
| DNS | Tidak dipakai. |
| NTP | Tidak dipakai; timestamp pakai `Date.now()` lokal. |
| CPU arch | `x64` dan `arm64` (Windows x64 only di F1; Linux x64 + arm64). |
| Memory | ≤ 400 MB idle, ≤ 900 MB dengan dokumen 5 MB. |
| GPU | Software rendering fallback; tidak butuh discrete GPU. |
| Display | Minimum 1280×720; hidpi scale 1x, 1.5x, 2x. |
| Locale | UTF-8 file I/O; UI Bahasa Indonesia + English di F2. |
| Display server (Linux) | X11 dan Wayland (Electron auto). |
| Code signing | Windows Authenticode (opsional F1, wajib F2); Linux GPG detached (opsional). |
| Installer | Windows NSIS 3.x; Linux AppImage + deb. |
| Auto-update (F2) | `electron-updater` + `latest.yml` static host. |

---

## 7. Stack & Dependensi

| Komponen | Pilihan |
| :--- | :--- |
| Language | TypeScript 5.7 (strict mode). |
| Runtime desktop | Electron 33.2.0. |
| UI framework | React 19.0.0 + React DOM 19.0.0. |
| Bundler renderer | Vite 6.0. |
| Bundler main | `electron-vite` 2.3 (tsc + esbuild). |
| Styling | Tailwind CSS 4.0 + `@tailwindcss/vite`. |
| Icons | lucide-react 0.460. |
| Markdown | `marked` 15.0. |
| DOCX | `docx` 9.0. |
| PDF direct | `jsPDF` 2.5.2 + `html2canvas` 1.4.1. |
| State store | `zustand` 5.0. |
| Validation | `zod` 3.24. |
| Config store | `electron-store` 10.0. |
| Logging | `electron-log` 5.2. |
| File watcher | `chokidar` 4.0 (main process). |
| Testing unit | `vitest` 2.1 + `@testing-library/react` 16. |
| Testing e2e | `playwright` 1.49 + `@playwright/test` Electron driver. |
| Packaging | `electron-builder` 25.1. |
| Updater (F2) | `electron-updater` 6.3. |
| Lint | `eslint` 9 + `@typescript-eslint` 8. |
| Format | `prettier` 3.3. |
| Node toolchain | Node 20.18, `corepack` pnpm 9.12. |

**Catatan build khusus:** `jsPDF` dan `docx` aman di browser, tidak ada native deps. `chokidar` memakai `fsevents` optional di macOS (tidak dipakai). `electron-store` butuh `electron` sebagai peer — di-bundle ke main saja. Tidak ada `node-gyp` compilation.

---

## 8. Struktur Repo Final

```
docflow-studio-desktop/
├── package.json                              # scripts, deps, electron-builder config ref
├── pnpm-lock.yaml
├── electron-builder.yml                      # targets, fileAssociations, NSIS
├── tsconfig.json                             # renderer TS config (strict)
├── tsconfig.electron.json                    # main/preload TS config
├── vite.config.ts                            # renderer Vite config
├── electron.vite.config.ts                   # main + preload bundling
├── .env.example                              # DOCFLOW_* flags
├── .gitignore
├── README.md
├── LICENSE
├── electron/
│   ├── main.ts                               # app lifecycle, single-instance lock, protocol
│   ├── preload.ts                            # contextBridge → window.docflow
│   ├── menu.ts                               # native Menu template (File/Edit/View/Help)
│   ├── protocol.ts                           # app://docflow/ handler
│   ├── window.ts                             # BrowserWindow factory + bounds persist
│   ├── ipc/
│   │   ├── index.ts                          # registerAllHandlers()
│   │   ├── fileHandlers.ts                   # 11 file:* channels
│   │   ├── recentHandlers.ts                 # 5 recent:* channels
│   │   ├── settingsHandlers.ts               # 5 settings:* channels
│   │   ├── windowHandlers.ts                 # 8 window:* channels
│   │   ├── appHandlers.ts                    # 4 app:* channels
│   │   └── schemas.ts                        # zod schemas per channel
│   ├── services/
│   │   ├── FileService.ts                    # atomic write, mtime check, watcher
│   │   ├── FileProvider.ts                   # interface (local/memory)
│   │   ├── LocalFsProvider.ts                # default implementation
│   │   ├── RecentFilesService.ts             # LRU + pinned + TTL prune
│   │   ├── SettingsService.ts                # versioned migrate
│   │   ├── SessionService.ts                 # crash recovery draft
│   │   └── OpenFileRouter.ts                 # argv + open-file + protocol → renderer
│   ├── utils/
│   │   ├── paths.ts                          # userData subpaths, normalize
│   │   ├── errors.ts                         # AppError taxonomy
│   │   └── logger.ts                         # electron-log config
│   └── types/
│       └── ipc.ts                            # shared IPC payload types
├── src/
│   ├── main.tsx                              # React root
│   ├── App.tsx                               # top-level layout (ported)
│   ├── index.css
│   ├── components/                           # (dari source lama)
│   │   ├── DocumentEditor.tsx
│   │   ├── DocumentViewer.tsx
│   │   ├── FormattingToolbar.tsx
│   │   ├── TableOfContents.tsx
│   │   ├── TopNav.tsx                        # DIUBAH: pakai native menu
│   │   ├── ExportModal.tsx
│   │   ├── ZenReviewModal.tsx
│   │   ├── CodeScriptModal.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── RecentFilesMenu.tsx               # BARU
│   │   ├── UnsavedChangesDialog.tsx          # BARU
│   │   └── StatusBar.tsx                     # BARU: path + dirty + encoding
│   ├── hooks/
│   │   ├── useFileSession.ts                 # BARU: load/save/dirty
│   │   ├── useRecentFiles.ts                 # BARU
│   │   ├── useWindowBounds.ts                # BARU
│   │   └── useKeyboardShortcuts.ts           # BARU: Ctrl+S/O/N
│   ├── store/
│   │   └── fileStore.ts                      # BARU: zustand session + settings
│   ├── types/
│   │   ├── document.ts                       # (dari source lama)
│   │   ├── electron.d.ts                     # window.docflow typing
│   │   └── window.d.ts
│   ├── styles/
│   │   └── themes.ts                         # (dari source lama)
│   └── utils/                                # (dari source lama)
│       ├── markdownParser.ts
│       ├── docExport.ts
│       ├── pdfExport.ts                      # DIUBAH: opsi save-native
│       ├── documentStats.ts
│       ├── clipboard.ts
│       ├── languageScripts.ts
│       ├── sampleDocuments.ts
│       └── storage.ts                        # DIHAPUS: diganti SessionService
├── build/
│   ├── icon.ico
│   ├── icon.icns
│   ├── icon.png
│   ├── installer.nsh                         # NSIS include (file association)
│   └── docflow-studio.desktop                # Linux .desktop template
├── scripts/
│   ├── afterPack.ts                          # rename artifact, checksum
│   └── verify-build.ts                       # smoke load index.html
├── tests/
│   ├── unit/
│   │   ├── FileService.test.ts
│   │   ├── RecentFilesService.test.ts
│   │   ├── SettingsService.test.ts
│   │   ├── markdownParser.test.ts
│   │   ├── docExport.test.ts
│   │   └── documentStats.test.ts
│   ├── integration/
│   │   ├── ipc-file.test.ts
│   │   ├── ipc-recent.test.ts
│   │   └── open-file-router.test.ts
│   └── e2e/
│       ├── playwright.config.ts
│       └── specs/
│           ├── launch.spec.ts
│           ├── open-save.spec.ts
│           ├── file-association.spec.ts
│           └── recent-files.spec.ts
└── .github/
    └── workflows/
        └── release.yml                       # matrix build + upload artifacts
```

± 78 file source, ± 14.800 LOC (termasuk test dan config).

---

## 9. Environment Variables / Konfigurasi

```bash
# ── Core ──
DOCFLOW_USER_DATA_DIR=                 # override userData (testing only; kosong = default OS)
DOCFLOW_LOG_LEVEL=info                 # trace|debug|info|warn|error
DOCFLOW_LOG_MAX_FILES=10               # rotasi: simpan 10 file terakhir
DOCFLOW_LOG_MAX_SIZE_MB=20             # rotate saat satu file > 20MB

# ── Files ──
DOCFLOW_MAX_FILE_SIZE_MB=50            # hard-reject file > 50MB
DOCFLOW_ENCODING=utf-8                 # default; auto-detect BOM utf-8-bom / utf-16le
DOCFLOW_WATCH_DEBOUNCE_MS=250          # debounce chokidar
DOCFLOW_AUTOSAVE_DEBOUNCE_MS=1500      # debounce tulis session.json
DOCFLOW_RECOVERY_INTERVAL_MS=5000      # interval draft recovery

# ── Recent Files ──
DOCFLOW_RECENT_MAX=20                  # LRU cap
DOCFLOW_RECENT_TTL_DAYS=90             # prune entry lebih tua dari 90 hari

# ── Security ──
DOCFLOW_CSP_ENABLED=true               # JANGAN false di production
DOCFLOW_ALLOWED_EXTERNAL=*.wikipedia.org,*.github.com  # shell.openExternal whitelist
DOCFLOW_DEVTOOLS_ENABLED=false         # true hanya di dev
DOCFLOW_E2E_MODE=false                 # true: mock dialog native saat test
```

**File konfigurasi runtime** — `{userData}/settings.json` (ditulis oleh `SettingsService`, di-override env di atas):

```jsonc
{
  "schemaVersion": 1,
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
  "lastExportDir": null
}
```

**Aturan:**
- Semua env var dibaca di `main.ts` boot sebelum `app.whenReady()`; nilai invalid → `dialog.showErrorBox` + `app.exit(1)`.
- Secret tidak ada (offline app); token code-signing disimpan di CI secret store, bukan repo.
- `DOCFLOW_CSP_ENABLED=false` dilarang di build production — build script menolak (`verify-build.ts`).
- `DOCFLOW_E2E_MODE=true` menyebabkan `dialog.showSaveDialog` diganti path deterministic.
- Setiap perubahan `schemaVersion` wajib disertai migrasi di `SettingsService.migrate(from, to)`.

---

## 10. Skema Data / State Model

```typescript
// src/types/state.ts — shared between main and renderer
export interface SessionState {
  filePath: string | null;      // absolute path or null (untitled)
  fileContent: string;          // current buffer
  savedContent: string;         // last known disk content
  diskMtime: number | null;     // ms since epoch (fs.stat.mtimeMs)
  dirty: boolean;               // derived: fileContent !== savedContent
  encoding: 'utf-8' | 'utf-8-bom' | 'utf-16le';
  lineEnding: 'lf' | 'crlf' | 'cr';
}

export interface RecentFile {
  path: string;                 // absolute, normalized, unique
  displayName: string;          // basename
  lastOpenedAt: number;         // ms since epoch
  size: number;                 // bytes at last open
  pinned: boolean;              // user-pinned (survives prune)
}

export interface AppSettings {
  schemaVersion: number;        // integer, monotonic
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
}
```

```jsonc
// JSON Schema ringkas untuk validasi electron-store
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["schemaVersion", "theme", "pageSize"],
  "properties": {
    "schemaVersion": { "type": "integer", "minimum": 1, "maximum": 999 },
    "theme": { "enum": ["modern","academic","minimal","editorial","legal"] },
    "fontSize": { "enum": ["sm","md","lg"] },
    "pageSize": { "enum": ["A4","Letter"] },
    "windowBounds": {
      "type": "object",
      "required": ["width","height"],
      "properties": {
        "width": { "type": "integer", "minimum": 800, "maximum": 7680 },
        "height": { "type": "integer", "minimum": 600, "maximum": 4320 }
      }
    }
  },
  "additionalProperties": false
}
```

**Kunci integritas**

| Kunci | File/Store | Tipe | Menjamin |
| :--- | :--- | :--- | :--- |
| `recent.path` UNIQUE | `recent.json` | String | Tidak ada duplikat entri recent |
| `recent` max 20 | `recent.json` | Constraint | LRU eviction; pinned tidak dihitung |
| `recent.lastOpenedAt` monotonic | `recent.json` | Number | Urut stabil saat sort |
| `settings.schemaVersion` monotonic | `settings.json` | Integer | Gate migrasi |
| `session.dirty === (fileContent !== savedContent)` | runtime | Boolean | Invariant dirty |
| `session.diskMtime` compare on save | runtime | Number | Deteksi konflik eksternal |
| `file.size ≤ DOCFLOW_MAX_FILE_SIZE_MB * 1MB` | runtime | Integer | Cegah OOM |
| `path.startsWith(userHome)` OR explicit user pick | runtime | String | Cegah path traversal |
| `session.filePath` atomically written with content | `session.json` | String? | Restore konsisten |

---

## 11. Kontrak Service Layer

### 11.1 Interface utama (file provider — plug-and-play)

```typescript
// electron/services/FileProvider.ts
export interface ReadResult {
  content: string;
  size: number;
  mtime: number;
  encoding: 'utf-8' | 'utf-8-bom' | 'utf-16le';
}

export interface WriteOptions {
  encoding?: 'utf-8' | 'utf-8-bom' | 'utf-16le';
  expectedMtime?: number | null;   // conflict detect
  createBackup?: boolean;          // .md.bak
}

export interface WriteResult {
  path: string;
  size: number;
  mtime: number;
}

export interface FileInfo {
  path: string;
  size: number;
  mtime: number;
  isFile: boolean;
  isSymlink: boolean;
}

export interface Watcher {
  close(): Promise<void>;
  on(event: 'change' | 'unlink' | 'error', cb: (path: string) => void): void;
}

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

### 11.2 Provider/implementasi

| Provider | File | Kapan dipakai |
| :--- | :--- | :--- |
| `LocalFsProvider` | `electron/services/LocalFsProvider.ts` | Default, semua file user. |
| `MemoryProvider` | `tests/unit/MemoryProvider.ts` | Unit test tanpa fs. |
| `RemoteProvider` | — | Future F2 (network drive). |

### 11.3 Domain service

| File | Tanggung jawab |
| :--- | :--- |
| `FileService.ts` | Orchestrator: pilih provider, atomic write, mtime conflict, backup. |
| `RecentFilesService.ts` | CRUD recent, LRU cap, prune TTL, pinned. |
| `SettingsService.ts` | Baca/tulis `settings.json`, migrasi schema version. |
| `SessionService.ts` | Draft recovery tiap 5s, restore saat launch, clear on save success. |
| `OpenFileRouter.ts` | Normalisasi input OS: `argv`, `open-file` event, `app://` protocol. |
| `FileWatcher.ts` | Wrapper `chokidar` dengan debounce 250ms; emit ke renderer. |
| `DialogService.ts` | Bungkus `dialog.showSaveDialog`/`showOpenDialog`/`showMessageBox`, mock-able di E2E. |

### 11.4 Pipeline inti (save dengan konflik)

```
fileStore.save()
  → IPC file:save({path, content, expectedMtime})
    → schema.parse(payload)              # zod reject → AppError('IPC_INVALID')
    → FileService.write(path, content, {expectedMtime})
        → provider.canHandle(path)?       # else → AppError('FILE_UNSUPPORTED')
        → fs.stat(path)                   # diskMtime
        → if expectedMtime != null && diskMtime != expectedMtime:
              → return { conflict: true, diskMtime }
        → write `${path}.tmp`             # atomic staging
        → fs.rename(`${path}.tmp`, path)  # atomic commit
        → fsync(dir)                      # durability
        → watcher already attached? noop  # idempotent
        → return { ok: true, mtime }
  → renderer: onConflict? show dialog "Overwrite / Reload / Cancel"
  → onSuccess: savedContent := content; dirty := false
```

### 11.5 Retry & scheduler

| Task | Jadwal/Interval | Aksi |
| :--- | :--- | :--- |
| Draft autosave | debounce 1.5s idle | IPC `session:save` ke `session.json` |
| Draft recovery flush | setiap 5s selama dirty | Tulis ulang `session.json` (idempotent) |
| Recent prune | setiap launch + setiap `recent:add` | Hapus entry > 90 hari; cap 20 |
| File watcher reconcile | debounce 250ms per event | Emit `file:changed` ke renderer |
| Log rotation | on write > 20MB | Rotate `main-{date}.log` → `.1`..`.10` |
| Settings save | debounce 500ms | Atomic write `settings.json` |
| Updater check (F2) | setiap 4 jam saat app aktif | `electron-updater.checkForUpdates` |

---

## 12. Routes & API / Entry Points

| Route/Entry | Fungsi |
| :--- | :--- |
| `IPC file:open` | Buka dialog open, baca file, return `{path, content, mtime}`. |
| `IPC file:openPath` | Buka path spesifik (dari recent / assoc / drag-drop). |
| `IPC file:save` | Tulis ke path yang diketahui (save-in-place), cek mtime. |
| `IPC file:saveAs` | Dialog Save As → tulis. |
| `IPC file:saveDialog` | Hanya dialog, return path (tanpa menulis). |
| `IPC file:info` | `fs.stat` → `{size, mtime, isFile}`. |
| `IPC file:exists` | Boolean check, tidak throw. |
| `IPC file:read` | Baca file (dipakai drag-drop & assoc). |
| `IPC file:readBinary` | Baca `.pdf` / `.docx` untuk embed (future). |
| `IPC file:writeBinary` | Tulis PDF/DOCX/PNG dari renderer (export native dialog). |
| `IPC file:watch` | Attach watcher ke path. |
| `IPC file:unwatch` | Detach watcher. |
| `IPC recent:list` | Return array `RecentFile` sorted desc. |
| `IPC recent:add` | Upsert by path (dedup), cap 20. |
| `IPC recent:remove` | Hapus satu entry. |
| `IPC recent:clear` | Hapus semua (keep pinned? → opsional flag). |
| `IPC recent:pin` | Toggle `pinned` flag. |
| `IPC settings:get` | Baca satu key. |
| `IPC settings:set` | Merge update, validasi zod. |
| `IPC settings:all` | Return full `AppSettings`. |
| `IPC settings:reset` | Reset ke default (keep `schemaVersion`). |
| `IPC session:save` | Tulis draft recovery. |
| `IPC session:load` | Baca draft recovery (saat boot). |
| `IPC session:clear` | Hapus draft (setelah save sukses). |
| `IPC app:version` | Return `app.getVersion()`. |
| `IPC app:platform` | Return `process.platform`. |
| `IPC app:openFile` | Emit event `app:open-file` (dari OS / assoc). |
| `IPC window:title` | Set title bar text. |
| `IPC window:dirty` | Set dirty marker di title (`•`) + Windows taskbar. |
| `IPC window:minimize` | Minimize. |
| `IPC window:maximize` | Toggle maximize. |
| `IPC window:close` | Close window (respects unsaved guard). |
| `IPC window:state` | Query bounds + maximized state. |
| `IPC dialog:confirmUnsaved` | Return `'save' \| 'discard' \| 'cancel'`. |
| `IPC shell:showItemInFolder` | `shell.showItemInFolder(path)` untuk "Reveal in Explorer". |
| `IPC shell:openExternal` | Whitelist `DOCFLOW_ALLOWED_EXTERNAL` only. |
| `Protocol app://docflow/*` | Serve `index.html` + asset statis (production). |
| `CLI argv[1]` | Path `.md` saat launch (double-click / `docflow-studio foo.md`). |
| `Menu File → Open` | Trigger `file:open`. |
| `Menu File → Open Recent` | Submenu dinamis dari `recent:list`. |
| `Menu File → Save` | Trigger `file:save` atau `saveAs` jika untitled. |
| `Menu File → Save As` | Trigger `file:saveAs`. |
| `Menu File → Export` | Buka `ExportModal` renderer. |
| `Menu View → Toggle TOC` | Toggle sidebar renderer. |
| `Menu Help → About` | `app.showAboutPanel()`. |

**Rate limit per entry (renderer-side + main-side):**
- `file:*` write channels: minimal 300ms jarak antar call per path (mencegah spam Ctrl+S).
- `settings:set`: debounce 500ms di renderer sebelum dispatch IPC.
- `recent:add`: max 10 call/detik; drop sisanya di main.
- `session:save`: debounce 1.5s; hard-cap 2 tulis/detik.
- `window:dirty`: debounce 50ms.
- `shell:openExternal`: 1 call per 500ms.

---

## 13. Alur Inti (Core Flows)

### 13.1 Flow: Open file dari OS association (double-click `.md`)

1. User double-click `laporan.md` di Windows Explorer / Nautilus.
2. OS launch `docflow-studio.exe "laporan.md"` (Windows) atau kirim `%U` ke `.desktop` (Linux).
3. Instance pertama sudah jalan → `app.requestSingleInstanceLock()` return `false` di instance kedua → emit `second-instance` event dengan argv ke instance pertama → instance kedua `app.quit()`.
4. Instance pertama `OpenFileRouter.extractPathsFromArgv(argv)` → `C:\Users\me\laporan.md`.
5. Jika file > `DOCFLOW_MAX_FILE_SIZE_MB` (50 MB) → **error path**: `dialog.showErrorBox("File too large")`, abort.
6. `FileService.read(path)` → `{content, mtime, encoding}`.
7. Main emit `app:open-file` → renderer `fileStore.loadFromDisk(path, content, mtime)`.
8. Renderer update editor + preview + TOC + `recent:add({path, displayName, lastOpenedAt: Date.now(), size})`.
9. Judul window di-set `DocFlow Studio — laporan.md`.

### 13.2 Flow: Save-in-place dengan konflik eksternal

1. User tekan Ctrl+S.
2. Renderer `useFileSession.save()` → cek `filePath === null`? → jika ya, jalankan flow Save As.
3. Jika `filePath !== null` → IPC `file:save({path, content, expectedMtime: session.diskMtime})`.
4. Main: `fs.stat(path)` → `currentMtime`.
5. Bandingkan: `expectedMtime !== null && currentMtime !== expectedMtime` → **error path konflik**:
   - Main return `{ conflict: true, diskMtime: currentMtime }`.
   - Renderer `UnsavedChangesDialog` mode `conflict` → pilihan **Overwrite** (lanjut), **Reload** (baca disk, ganti buffer), **Save As** (pilih path baru).
6. Jika tidak konflik → `fs.writeFile(path.tmp, content)` → `fs.rename` → `fs.fsync(dir)`.
7. Return `{ ok: true, mtime }`.
8. Renderer: `savedContent := content; dirty := false; diskMtime := mtime` → toast "Saved ✓" → `session:clear` → `recent:add`.
9. Watcher (jika aktif) sudah terpasang; rename memicu event internal → di-suppress 500ms via flag `selfWrite`.

### 13.3 Flow: Close dengan unsaved changes

1. User klik X / `Alt+F4` / `Ctrl+Q`.
2. `window.on('close', e)` di main: cek `session.dirty` (dikirim renderer via `window:dirty`).
3. Jika `dirty === false` → close normal, `settings.save()` (bounds) → app quit.
4. Jika `dirty === true` → `e.preventDefault()` → `dialog:confirmUnsaved`:
   - **Save** → jalankan §13.2 → jika sukses → `win.destroy()`.
   - **Discard** → `session:clear` → `win.destroy()`.
   - **Cancel** → noop, window tetap.
5. Jika proses quit karena `app.quit()` (mis. updater), guard yang sama dijalankan via `before-quit` hook.

### 13.4 Flow: Crash recovery

1. Setiap 5s selama `dirty`, `SessionService.write({filePath, fileContent, diskMtime, timestamp})` atomik.
2. App crash / kill -9 → `session.json` tersisa.
3. Launch berikutnya → `SessionService.read()` → jika ada dan `timestamp > 60_000 ms lalu` dan `filePath` masih ada di disk → renderer prompt **"Restore unsaved changes from {time}?"** dengan pilihan Restore / Discard / Open Original.
4. Restore → `fileStore.loadFromDisk(filePath, session.fileContent, session.diskMtime)` dengan `dirty = true`.

### 13.5 Flow: Export dengan native save dialog

1. User klik "Export DOCX" di `ExportModal`.
2. `exportToDocx(markdown, title, settings)` menghasilkan `Blob` (client-side, tanpa IPC).
3. Alih-alih `triggerFileDownload`, panggil `window.docflow.file.saveBinary({data: blob, defaultName: `${title}.docx`, filters: [{name:'Word', extensions:['docx']}]})`.
4. Main: `dialog.showSaveDialog` → path → `fs.writeFile(path, Buffer.from(await blob.arrayBuffer()))`.
5. Return `{path}` → toast "Exported to {path}" → `shell.showItemInFolder(path)` optional.
6. **Error path** jika user cancel dialog → return `{cancelled: true}` → tidak ada toast error.

---

## 14. UI / Views / Presentasi

| View/Scene/Asset | Sumber | Catatan |
| :--- | :--- | :--- |
| `App.tsx` (root) | `src/App.tsx` | Dipertahankan; ditambah `useFileSession` + `StatusBar`. |
| `TopNav` | `src/components/TopNav.tsx` | Diubah: tombol Save/Open memanggil `fileStore`, tombol "Open .md" diganti native. |
| `DocumentEditor` | `src/components/DocumentEditor.tsx` | Sama; textarea tetap source-of-truth. |
| `DocumentViewer` | `src/components/DocumentViewer.tsx` | Sama; tidak berubah. |
| `FormattingToolbar` | `src/components/FormattingToolbar.tsx` | Sama. |
| `TableOfContents` | `src/components/TableOfContents.tsx` | Sama. |
| `ExportModal` | `src/components/ExportModal.tsx` | Ditambah opsi "Save as native file" (pakai `file:saveBinary`). |
| `ZenReviewModal` | `src/components/ZenReviewModal.tsx` | Sama. |
| `CodeScriptModal` | `src/components/CodeScriptModal.tsx` | Sama. |
| `RecentFilesMenu` | BARU | Dropdown di TopNav; sinkron dengan native menu Open Recent. |
| `UnsavedChangesDialog` | BARU | Modal Save/Discard/Cancel; dipicu `dialog:confirmUnsaved`. |
| `ConflictDialog` | BARU | Overwrite / Reload / Save As. |
| `RecoveryPrompt` | BARU | Saat launch, restore draft. |
| `StatusBar` | BARU | Bar bawah: path, dirty •, encoding, line ending, cursor pos. |
| `AboutPanel` | Built-in Electron | `app.showAboutPanel()`. |
| Native Menu | `electron/menu.ts` | File, Edit, View, Window, Help. |
| Tray Icon (F2) | — | Minimize-to-tray opsional. |

---

## 15. Security & Reliability

| Area | Tindakan |
| :--- | :--- |
| Renderer isolation | `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, `webSecurity: true`. |
| Preload bridge | Hanya expose `window.docflow.*` typed; tidak ada `require` di renderer. |
| IPC validation | Setiap payload zod-parse; reject dengan `AppError('IPC_INVALID')` + log. |
| Path traversal | Normalisasi `path.resolve`; reject jika path di luar `userHome` dan bukan dari user dialog. |
| Malicious Markdown | `marked` output disanitasi dengan `DOMPurify` sebelum `dangerouslySetInnerHTML`. |
| CSP | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'` (production). |
| External links | `shell.openExternal` hanya jika `host` match `DOCFLOW_ALLOWED_EXTERNAL`. |
| File size DoS | Hard-reject > 50 MB di `FileService.read`; streaming read untuk file besar. |
| Atomic write | `path.tmp` → `rename` + `fsync(dir)` mencegah korupsi. |
| External edit race | `expectedMtime` compare; dialog konflik. |
| Replay / double-save | Idempotent `file:save` (content sama = noop) via hash compare. |
| Secret handling | Tidak ada secret di app; code signing di CI secret. |
| Log rotation | `electron-log` rotasi 20 MB × 10 file; tidak log isi Markdown. |
| Container/privilege | Non-root, tidak butuh admin/root; installer NSIS user-level default. |
| Ingress | Tidak ada HTTP listener; hanya `127.0.0.1:5173` dev. |
| Time drift | Timestamp mtime compare dengan toleransi 1000ms; tidak ada server sync. |
| Audit | Log setiap `file:save`, `file:saveAs`, `file:open` (basename only). |
| Crash recovery | `session.json` draft + prompt restore; tidak hilangkan data user. |
| CSP bypass dev | Build `verify-build.ts` tolak `DOCFLOW_CSP_ENABLED=false` di production. |
| Updater signature (F2) | `electron-updater` wajib signature verify; `latest.yml` HTTPS only. |
| Fuse (Linux) | AppImage butuh `libfuse2`; dokumentasi prasyarat user. |

---

## 16. Build, Deploy, CI/CD

### 16.1 Build pipeline (electron-vite + electron-builder)

```bash
# scripts/build.sh (dipanggil di CI dan lokal)
set -euo pipefail

# 1. Renderer build (Vite)
pnpm exec vite build --outDir dist/renderer

# 2. Main + preload build (electron-vite)
pnpm exec electron-vite build

# 3. Verify CSP + no-DEVTOOLS
node scripts/verify-build.ts

# 4. Package
pnpm exec electron-builder --win --linux --x64 --arm64 \
  --publish never \
  --config electron-builder.yml

# 5. Checksum
sha256sum release/*.{exe,AppImage,deb} > release/SHA256SUMS
```

### 16.2 `electron-builder.yml`

```yaml
appId: id.docflow.studio
productName: DocFlow Studio
copyright: Copyright © 2026 DocFlow
directories:
  output: release
  buildResources: build
files:
  - dist/**/*
  - package.json
extraMetadata:
  main: dist/main/main.js
asar: true
compression: maximum
win:
  target:
    - target: nsis
      arch: [x64]
    - target: portable
      arch: [x64]
  icon: build/icon.ico
  requestedExecutionLevel: asInvoker
nsis:
  oneClick: false
  perMachine: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true
  shortcutName: DocFlow Studio
  include: build/installer.nsh
fileAssociations:
  - ext: md
    name: Markdown Document
    description: Markdown source document
    role: Editor
    mimeType: text/markdown
  - ext: markdown
    name: Markdown Document
    description: Markdown source document
    role: Editor
    mimeType: text/markdown
  - ext: txt
    name: Text Document
    description: Plain text document
    role: Editor
    mimeType: text/plain
linux:
  target:
    - target: AppImage
      arch: [x64, arm64]
    - target: deb
      arch: [x64]
  category: Office
  icon: build/icon.png
  mimeTypes:
    - text/markdown
    - text/plain
  desktop:
    entry:
      Name: DocFlow Studio
      Comment: Markdown authoring & export
      MimeType: text/markdown;text/plain;
      Exec: docflow-studio %U
      Categories: Office;TextEditor;
```

`build/installer.nsh` menambahkan registry file association saat install dan membersihkannya saat uninstall.

### 16.3 CI/CD pipeline (`.github/workflows/release.yml`)

- **Trigger:** push tag `v*.*.*` atau `workflow_dispatch` manual.
- **Matrix:** `[windows-latest, ubuntu-22.04]` × `node 20.18` × `pnpm 9.12`.
- **Steps:**
  1. Checkout + setup node + pnpm cache.
  2. `pnpm install --frozen-lockfile`.
  3. `pnpm lint && pnpm typecheck`.
  4. `pnpm test:unit` (vitest).
  5. `pnpm build` (renderer + main + preload).
  6. `pnpm test:e2e` (Playwright Electron, headless di Ubuntu via `xvfb-run`).
  7. `pnpm package` (electron-builder `--win --linux`).
  8. Upload artifact ke GitHub Release (`softprops/action-gh-release`).
  9. (F2) Publish `latest.yml` ke static host.
- **Verifikasi:** artifact checksum di `SHA256SUMS`, ukuran file < 200 MB, `smoke.e2e` lulus.

---

## 17. Testing Checklist

### 17.1 Unit / Service

- [ ] `FileService.write` atomik: kill proses mid-write → file asli utuh, `.tmp` tersisa.
- [ ] `FileService.write` conflict detection: `expectedMtime` mismatch → return `{conflict: true}`.
- [ ] `RecentFilesService.add` dedup by path; cap 20 (pinned tidak dihitung).
- [ ] `RecentFilesService.prune` menghapus entry > 90 hari.
- [ ] `SettingsService.migrate` dari `schemaVersion: 0` → `1` tanpa kehilangan field.
- [ ] `OpenFileRouter` parse `argv` di Windows (`--` prefix) dan Linux (`%U`).
- [ ] `markdownParser` tetap lulus semua test lama (asterisk, callout, surrogate).
- [ ] `docExport.parseInlineFormattingToDocx` tetap lulus test lama.
- [ ] `documentStats` tetap lulus test lama.
- [ ] `SessionService` idempotent: tulis 2x sama = file tidak berubah mtime.

### 17.2 Integration

- [ ] `file:open` → `file:save` → isi file di disk persis sama byte-per-byte.
- [ ] `file:saveAs` dengan path existing → dialog overwrite muncul.
- [ ] `recent:add` → `recent:list` mengembalikan urutan `lastOpenedAt` desc.
- [ ] `settings:set` merge tidak menghapus field lain.
- [ ] Watcher eksternal: ubah file via `echo >> file.md` → renderer terima `file:changed` dalam ≤ 500ms.
- [ ] IPC invalid payload (missing `path`) → return error, tidak crash main.
- [ ] `app:open-file` dari `second-instance` membuka file di window existing.
- [ ] Close dengan dirty → `dialog:confirmUnsaved` muncul; Save → file tertulis; Discard → tidak tertulis.

### 17.3 Smoke / Staging

- [ ] Launch app di Windows 10 & 11 (VM), window muncul < 3 detik.
- [ ] Launch AppImage di Ubuntu 22.04 & 24.04 (VM), window muncul < 3 detik.
- [ ] Drag-drop `sample.md` ke window → editor + preview terisi.
- [ ] Double-click `sample.md` di Explorer/Nautilus → app launch + file terbuka.
- [ ] Ctrl+S tanpa path → native Save dialog muncul.
- [ ] Ctrl+S dengan path existing → toast "Saved ✓", mtime file berubah.
- [ ] Export DOCX → file `.docx` valid bisa dibuka di LibreOffice 24.
- [ ] Print PDF → dialog print native muncul; hasil PDF punya teks selectable.
- [ ] Restart app → recent files muncul di menu Open Recent.
- [ ] Kill -9 proses → relaunch → prompt recovery muncul.

### 17.4 Security

- [ ] Renderer tidak bisa `require('fs')` (test di devtools console → error).
- [ ] `window.docflow` hanya expose method yang didefinisikan di preload.
- [ ] Payload IPC `path: '../../etc/passwd'` → reject `PATH_TRAVERSAL`.
- [ ] Markdown `<img src=x onerror=alert(1)>` → tersanitasi, tidak execute.
- [ ] `shell.openExternal('javascript:alert(1)')` → reject `EXTERNAL_BLOCKED`.
- [ ] CSP header absent di production build → `verify-build.ts` gagal.
- [ ] File 100 MB → reject dengan toast error, app tidak OOM.
- [ ] Symlink ke `/etc/shadow` → `LocalFsProvider.canHandle` reject.

---

## 18. Timeline

| Hari/Milestone | Aktivitas |
| :--- | :--- |
| D1–D2 | Scaffold Electron + Vite + React; pindahkan seluruh `src/` lama; hello-window berjalan. |
| D3–D4 | `FileService` + `FileProvider` + atomic write + unit test. |
| D5–D6 | IPC registry + zod schema + `preload.ts` bridge; semua 32 channel stub. |
| D7–D8 | `RecentFilesService` + `SettingsService` + `SessionService`; integrasi renderer `fileStore`. |
| D9–D10 | Native menu (`menu.ts`) + `OpenFileRouter` (argv + `open-file` + protocol). |
| D11–D12 | File association Windows (`installer.nsh`) + Linux (`.desktop` MIME); test di 2 VM. |
| D13–D14 | Save-in-place, conflict dialog, unsaved-changes guard, recovery prompt. |
| D15–D16 | Playwright e2e: launch, open/save, association, recent. |
| D17–D18 | CI matrix build Windows + Linux; artifact upload; checksum. |
| D19 | Polish UI (StatusBar, RecentFilesMenu, ConflictDialog) + fix bug hasil e2e. |
| D20 | Beta release `v0.1.0` (unsigned) + dokumentasi user + handover QA. |

---

## 19. Definition of Done (DocFlow Studio Desktop)

- [ ] Repo `docflow-studio-desktop` public/private sesuai org, branch `main` + `develop`.
- [ ] `pnpm install && pnpm build && pnpm test` hijau di Windows dan Linux (CI).
- [ ] Semua 20 fitur lama DocFlow Studio berjalan identik (regression pass).
- [ ] Save-in-place berfungsi: Ctrl+S pada file terbuka menulis ke path yang sama.
- [ ] Save As berfungsi: Ctrl+Shift+S membuka native dialog.
- [ ] File association `.md` terdaftar di Windows registry setelah install, dan di `/usr/share/mime` setelah install deb.
- [ ] Double-click `.md` membuka app dengan file ter-load (Windows + Linux).
- [ ] Native menu File lengkap: New, Open, Open Recent, Save, Save As, Export, Exit.
- [ ] Recent files tampil di menu dan bertahan antar restart; cap 20; pinned tidak dihapus prune.
- [ ] Dirty tracking akurat: title bar menampilkan `•` saat unsaved; hilang setelah save.
- [ ] Close guard: Save/Discard/Cancel berfungsi; Cancel mencegah close.
- [ ] Crash recovery: kill -9 → relaunch → prompt restore draft.
- [ ] Konflik eksternal terdeteksi: edit file via VSCode → Ctrl+S di DocFlow → dialog konflik.
- [ ] Atomic write terverifikasi: write 10 MB tanpa korupsi; simulasi kill mid-write lolos test.
- [ ] Export DOCX/PDF/DOC/HTML/MD semua berfungsi dan bisa dibuka di LibreOffice.
- [ ] Code script download 30+ bahasa tetap berfungsi.
- [ ] Security checklist §17.4 semua lulus.
- [ ] IPC invalid payload tidak crash main; error ter-log.
- [ ] Log rotation aktif: 10 file × 20 MB; tidak log isi Markdown.
- [ ] `electron-builder` menghasilkan `.exe` (NSIS + portable) dan `.AppImage` + `.deb`; checksum tersedia.
- [ ] `README.md` berisi sub-tagline, screenshot, cara build, cara pakai file association.
- [ ] `LICENSE` (MIT atau proprietary) disertakan.
- [ ] `CHANGELOG.md` mencatat `v0.1.0` dengan daftar fitur.
- [ ] User manual singkat (≤ 5 halaman) tersedia di `docs/USER_GUIDE.md`.

---

## 20. Roadmap Lanjutan + Ringkasan

| Fase | Deliverable |
| :--- | :--- |
| **F0** | Dokumen perencanaan ini (blueprint). |
| **F1** (M1) | App desktop Windows + Linux dengan semua fitur lama + 4 fitur baru (save-in-place, association, native menu, recent). Build unsigned. |
| **F2** (M2) | Auto-update (`electron-updater`), code signing Windows Authenticode, GPG Linux, i18n ID/EN, tray minimize. |
| **F3** (M3) | Store publishing (Microsoft Store MSIX, Flathub), telemetry opt-in lokal (bukan cloud), PDF export vektor via `pdf-lib`. |
| **F4** (M4) | macOS target (arm64 + x64), notarization, drag-to-dock file open. |
| **F5** (M5) | Plugin system: custom export provider, custom markdown extension, sync via WebDAV (opt-in). |

### Cara menambah provider/modul baru (plug-and-play)

| Langkah | Aksi | File yang disentuh |
| :--- | :--- | :--- |
| 1 | Implement `FileProvider` interface (minimal `read`/`write`/`info`/`watch`) | `electron/services/MyProvider.ts` |
| 2 | Registrasi di `FileService` factory (`providerRegistry.set(id, ctor)`) | `electron/services/FileService.ts` |
| 3 | Tambah entry di `providerRegistry` map + default priority | `electron/services/index.ts` |
| 4 | Tambah schema zod payload jika provider butuh opsi baru (mis. `remoteUrl`) | `electron/ipc/schemas.ts` |
| 5 | Tambah unit test (`MemoryProvider` pattern) + integration test 1 flow | `tests/unit/MyProvider.test.ts` |
| 6 | Update `docs/PLUGINS.md` dengan contoh + env var baru | `docs/PLUGINS.md` |

**Ringkasan (≤120 kata):** DocFlow Studio Desktop adalah reinkarnasi Electron dari DocFlow Studio web, mempertahankan seluruh kemampuan authoring Markdown dan ekspor DOCX/PDF/HTML sambil menambahkan integrasi OS native: save-in-place, file association `.md`, native menu File, recent files, dirty tracking, dan crash recovery. Arsitektur memisahkan main process (file I/O, menu, dialog, watcher) dari renderer sandboxed (React SPA) via 32 IPC channel tervalidasi zod. State dipisah menjadi `session.json`, `settings.json`, `recent.json` dengan invariant dirty dan atomic write. Build matrix Windows + Linux menghasilkan `.exe` NSIS, `.AppImage`, dan `.deb` dalam 20 hari kerja, dengan roadmap auto-update, code signing, store publishing, dan macOS di fase berikutnya.