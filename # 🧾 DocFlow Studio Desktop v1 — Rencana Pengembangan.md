# 🧾 DocFlow Studio Desktop v1 — Rencana Pengembangan

> **Tagline:** *Markdown authoring & publication-grade export, now native on Windows & Linux with advanced UI synchronization.*
> **Sub-tagline (README):** *Electron desktop app yang menulis, memformat, dan mengekspor Markdown ke PDF/DOCX dengan integrasi OS native: file association `.md`, recent files, save-in-place, native menu File, serta UI sinkronisasi cerdas (TOC, Auto-scroll, dan Zoom).*
> **Naming resmi:**
> - Repo: `docflow-studio-desktop`
> - Image/artifact: `DocFlowStudio-{version}-{arch}.{exe|AppImage|deb}`
> - Proses/container: `docflow-main` (main process), `docflow-renderer` (Chromium renderer sandboxed)
> - Path data utama: Windows `%APPDATA%\DocFlow Studio\`; Linux `~/.config/DocFlow Studio/`
> - Volume: N/A — diganti `userData/` directory
> - Nama network: N/A — hanya `127.0.0.1:5173` saat dev
> - Healthcheck: N/A — diganti smoke-test e2e "launch + open .md + save + quit"
> - Endpoint publik/contoh: `app://docflow/` (custom protocol, optional) atau `file://.../index.html`

> **Asumsi:** `TIMELINE_HINT` kosong → dipilih 4 minggu (20 hari kerja). `STACK_PREFERENCES` kosong → dipilih Electron + React + Vite + TypeScript. `EXTERNAL_INTEGRATIONS` = tidak ada (full offline). `NON_GOALS_HINTS` = cloud sync, backend, AI/Gemini, mobile.

Dokumen ini mensintesis lima domain — **markdown editing**, **document formatting & preview**, **multi-format export**, **desktop file integration**, dan **advanced UI/UX state synchronization** — menjadi satu perencanaan terpadu bernama **DocFlow Studio Desktop v1**.

---

## 1. Analisis Sintesis Domain

### 1.1 Kesamaan (common ground)

| Aspek | Markdown Editing | Document Formatting | Multi-format Export | Desktop File Integration | UI/UX Synchronization | Keputusan DocFlow Studio Desktop v1 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Input utama | Teks Markdown | Teks Markdown | Teks ter-render | File `.md` di disk | Interaksi Toolbar/TOC | Single source of truth: buffer Markdown di renderer |
| State persisten | Buffer in-memory | Settings tema | File output | Path file aktif | UI State (Zoom, Paged) | Satu `fileStore` + `uiStore` (zustand) + `session.json` |
| Trigger user | Ketik/paste | Pilih tema | Klik export | Ctrl+S / menu / double-click | Klik TOC / Toggle Toolbar | Satu hook `useFileSession` + event handlers UI |
| Error model | Parse error | Render error | Export error | FS error / permission | Sync Scroll error (DOM mismatch) | Satu `AppError` taxonomy + toast |
| Cross-platform | Browser | Browser | Browser | OS-specific | Browser | Electron abstraction (`FileProvider` & React Refs) |

### 1.2 Perbedaan yang perlu dijembatani

| Aspek | Markdown Editing | Desktop File Integration | UI/UX Synchronization | Jembatan |
| :--- | :--- | :--- | :--- | :--- |
| Sumber kebenaran | State React | Disk file | State UI (Zoom, Layout) | Buffer state + `savedContent` snapshot + `uiStore` |
| Waktu simpan | Tidak ada | Explicit Save / Auto | Perubahan state UI (Auto-save settings) | Menu File → Save, Ctrl+S + auto-save UI state ke `settings.json` |
| Navigasi file | Paste/upload | Double-click `.md` di OS | Klik TOC / Scroll manual | `open-file` handler + TOC refs (Editor Textarea & Preview DOM) |
| Identitas dokumen | "Untitled" | Path absolut | State UI yang persisten | `filePath: string \| null` + `uiState` di `settings.json` |
| Idempotensi | N/A | Re-save harus sama | Render ulang saat zoom/paged berubah | Atomic write `.tmp → rename` + React state derivation |

### 1.3 Strategi unifikasi

1. **Satu renderer SPA dipertahankan**, semua fitur lama dipindah ke dalam shell Electron dengan `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`.
2. **Pemisahan State**: `fileStore` untuk manajemen file/session (disk I/O), dan `uiStore` (Zustand) untuk manajemen antarmuka (Zoom level, Paged vs Continuous, Auto-scroll, TOC Sync toggle).
3. **Sinkronisasi DOM & State**: Menggunakan `useRef` untuk menangkap elemen `<textarea>` (editor) dan `<div>` (preview). Fitur TOC sync menggunakan mapping `lineNumber` ke `scrollTop` (editor) dan `elementId` ke `scrollIntoView` (preview).
4. **Persistensi UI**: Preferensi toolbar (Theme, Font size, Paged mode, TOC sync) disimpan ke `settings.json` agar tetap sama saat aplikasi dibuka kembali.
5. **Build matrix CI** (Windows + Linux) mem-publish artifact signed sekaligus.

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

- Editor Markdown split-view + preview terformat.
- 5 tema dokumen, 3 paper tone, A4/Letter, margin, header/footer, nomor halaman.
- **BARU:** Toolbar UI interaktif (Theme/Font dropdown, Font Size S/M/L, Page Size, Margin, Paged/Continuous toggle).
- **BARU:** Fitur Zoom Preview (85%, Fit, Reset) dengan CSS Transform.
- **BARU:** Auto-scroll toggle (Preview mengikuti ketikan Editor secara proporsional).
- **BARU:** Copy MD (salin seluruh isi textarea ke clipboard).
- **BARU:** TOC Synchronization Toggle (Klik outline → Editor & Preview scroll sinkron).
- TOC otomatis, statistik dokumen.
- Export DOCX (native), Word HTML `.doc`, PDF via print, Direct PDF (raster), HTML, Markdown.
- Ekstraksi & download code block ke 30+ bahasa script.
- Save-in-place (Ctrl+S), Save As, File association `.md`, Native menu, Recent files (max 20).
- Dirty tracking + unsaved-changes guard saat close, Auto-recovery draft 5 detik.
- File watcher eksternal (deteksi edit dari VSCode, dll).

### Out of scope / prasyarat eksternal

- Installasi OS dependency (WebView2 di Windows, GTK di Linux).
- Code signing certificate (Windows Authenticode, GPG) — prasyarat release.
- Store publishing (Microsoft Store, Flathub) — di roadmap F3.
- Auto-updater server hosting — F2.
- Cloud sync, akun, backend, database server.
- AI/Gemini integration — dihapus total.
- macOS target — F4+.
- Markdown WYSIWYG inline editing (tetap source-of-truth textarea).

---

## 4. Prinsip Desain

| Prinsip | Implementasi |
| :--- | :--- |
| **Renderer sandboxed** | `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`. |
| **IPC tervalidasi** | Setiap `ipcMain.handle` menerima payload yang di-parse dengan schema zod. |
| **Single source of truth** | File state di `fileStore` (disk), UI state di `uiStore` (Zustand). |
| **Sinkronisasi Presisi** | `TOC sync` menghitung `lineNumber` editor dan `elementId` preview (marked.js heading ID). |
| **Atomic write** | Semua tulis ke disk lewat `path.tmp` → `fs.rename` → `fsync(dir)`. |
| **Fail-fast config** | Env var wajib divalidasi di `main.ts` boot; invalid → `app.exit(1)`. |
| **No network** | CSP `default-src 'self'; connect-src 'self'`. |
| **Dirty invariant** | `dirty === (buffer !== savedContent)`; setiap mutasi buffer lewat setter. |
| **Recovery-first** | Autosave draft ke `session.json` tiap 5 detik; crash → prompt restore. |
| **Path normalization** | `path.resolve` + cek `startsWith(userHome)`; tolak path traversal. |
| **UI State Isolation** | Mengubah Zoom/Paged mode TIDAK memicu IPC save ke disk, hanya React state (`uiStore`). |

---

## 5. Arsitektur Terpadu

```
┌──────────────────────────────────────────────────────────────────────┐
│                       Electron Main Process (docflow-main)           │
│  ┌──────────┐  ┌─────────────┐  ┌──────────────────┐  ┌───────────┐  │
│  │ menu.ts  │  │ FileService │  │ RecentFilesSvc   │  │ AppEvents │  │
│  └────┬─────┘  └──────┬──────┘  └────────┬─────────┘  └─────┬─────┘  │
│       └───────────────┴──────────┬───────┴──────────────────┘        │
│                        ┌─────────▼──────────┐                        │
│                        │  IPC Registry      │  zod-validated         │
│                        └─────────┬──────────┘                        │
└───────────────────────────────┬──┴───────────────────────────────────┘
                                │ preload.ts → contextBridge
┌───────────────────────────────▼──────────────────────────────────────┐
│                Renderer SPA (React 19 + Vite, sandboxed)             │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ FormattingToolbar (Theme, Font, Paged, Zoom, Auto-scroll, TOC) │  │
│  └───────────────────────────────┬────────────────────────────────┘  │
│  ┌────────────┐  ┌────────────┐  │  ┌────────────┐  ┌─────────────┐  │
│  │ Document   │  │ Document   │◄─┴─►│ TOC Side   │  │ Export      │  │
│  │ Editor     │  │ Viewer     │ Sync│ bar (Sync) │  │ Modal       │  │
│  │ (textarea) │  │ (DOM ref)  │  │  │            │  │             │  │
│  └─────┬──────┘  └─────┬──────┘  │  └─────┬──────┘  └──────┬──────┘  │
│        │               │         │        │                │         │
│        └───────────────┴─────────┼────────┴────────────────┘         │
│                                  │                                   │
│                    ┌─────────────▼──────────┐                        │
│                    │  Zustand Store         │                        │
│                    │  fileStore | uiStore   │                        │
│                    └─────────────┬──────────┘                        │
└──────────────────────────────────┼───────────────────────────────────┘
                                   │
┌──────────────────────────────────▼───────────────────────────────────┐
│                    Filesystem & OS Integration                       │
│  Win  : %APPDATA%\DocFlow Studio\{settings,recent,session}.json      │
│  Linux: ~/.config/DocFlow Studio/{settings,recent,session}.json      │
└──────────────────────────────────────────────────────────────────────┘
```

**Alur request/data utama:**

1. **Open flow:** User Ctrl+O / double-click `.md` → OS dispatch ke `second-instance` argv → main `FileService.read(path)` → renderer `fileStore.load(path, content)` → editor re-render.
2. **Edit flow:** Ketik di `<textarea>` → `setBuffer(content)` → preview re-render (deferred) → `uiStore.autoScroll` memicu scroll sinkron → autosave draft 5s.
3. **TOC Sync flow:** Klik TOC → `scrollIntoView()` pada preview DOM & hitung `scrollTop` (lineHeight * lineNumber) pada editor Textarea.
4. **Save flow:** Ctrl+S → `fileStore.save()` → IPC `file:save(path, content)` → `FileService.write` (atomic) → `savedContent := content` → toast "Saved ✓".
5. **Toolbar flow:** Klik Zoom / Paged / Theme → `uiStore.setXxx()` → re-render UI (tanpa IPC) → debounce 500ms → `settings:set` simpan preferensi.
6. **Close flow:** `window.on('close')` → jika `dirty` → `dialog.showMessageBox` Save/Discard/Cancel.

---

## 6. Kontrak Infra & Platform Desktop

| Kebutuhan | Kontrak untuk infra/platform |
| :--- | :--- |
| Runtime | Electron 33.x, Node.js 20.18 di main process, Chromium 130 di renderer. |
| Bind address dev | Hanya `127.0.0.1:5173` (Vite dev server). |
| Outbound network | Tidak ada. CSP `connect-src 'self'`. |
| Filesystem write | Hanya di `app.getPath('userData')` dan path yang dipilih user via dialog. |
| Filesystem read | Hanya file `*.md`, `*.markdown`, `*.txt`, `*.pdf`, `*.docx`; hard-reject > 50 MB. |
| Path data | `userData` writable; fallback `app.getPath('temp')` bila read-only. |
| CPU arch | `x64` dan `arm64` (Windows x64 only di F1; Linux x64 + arm64). |
| Memory | ≤ 400 MB idle, ≤ 900 MB dengan dokumen 5 MB. |
| Display | Minimum 1280×720; hidpi scale 1x, 1.5x, 2x. |
| Locale | UTF-8 file I/O; UI Bahasa Indonesia + English di F2. |
| Display server (Linux) | X11 dan Wayland (Electron auto). |
| Installer | Windows NSIS 3.x; Linux AppImage + deb. |

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
| Markdown | `marked` 15.0 (digunakan untuk generate ID heading untuk TOC). |
| DOCX | `docx` 9.0. |
| PDF direct | `jsPDF` 2.5.2 + `html2canvas` 1.4.1. |
| State store | `zustand` 5.0 (fileStore & uiStore). |
| Validation | `zod` 3.24. |
| Config store | `electron-store` 10.0. |
| File watcher | `chokidar` 4.0 (main process). |
| Testing | `vitest` 2.1 + `playwright` 1.49. |
| Packaging | `electron-builder` 25.1. |

---

## 8. Struktur Repo Final

```
docflow-studio-desktop/
├── package.json                              # scripts, deps, electron-builder config
├── electron-builder.yml                      # targets, fileAssociations, NSIS
├── tsconfig.json                             # renderer TS config (strict)
├── vite.config.ts                            # renderer Vite config
├── electron.vite.config.ts                   # main + preload bundling
├── electron/
│   ├── main.ts                               # app lifecycle, single-instance lock
│   ├── preload.ts                            # contextBridge → window.docflow
│   ├── menu.ts                               # native Menu template
│   ├── ipc/                                  # IPC handlers (file, recent, settings)
│   └── services/
│       ├── FileService.ts                    # atomic write, mtime check
│       ├── RecentFilesService.ts             # LRU + pinned
│       ├── SettingsService.ts                # versioned migrate (termasuk UI state)
│       └── SessionService.ts                 # crash recovery draft
├── src/
│   ├── main.tsx                              # React root
│   ├── App.tsx                               # top-level layout (refs for editor/viewer)
│   ├── components/
│   │   ├── DocumentEditor.tsx                # DIUBAH: expose ref, handle scroll event
│   │   ├── DocumentViewer.tsx                # DIUBAH: expose ref, terima zoom & paged props
│   │   ├── FormattingToolbar.tsx             # BARU: UI lengkap sesuai screenshot
│   │   ├── TableOfContents.tsx               # BARU: toggle sinkronisasi & handler klik
│   │   ├── ExportModal.tsx
│   │   ├── ZenReviewModal.tsx
│   │   └── StatusBar.tsx                     # BARU: path + dirty + encoding
│   ├── hooks/
│   │   ├── useFileSession.ts                 # BARU: load/save/dirty
│   │   ├── useScrollSync.ts                  # BARU: logic auto-scroll & TOC sync
│   │   └── useKeyboardShortcuts.ts           # BARU: Ctrl+S/O/N
│   ├── store/
│   │   ├── fileStore.ts                      # BARU: zustand session
│   │   └── uiStore.ts                        # BARU: zustand zoom, paged, autoscroll, TOC sync
│   ├── types/
│   │   └── state.ts                          # Session, Recent, AppSettings, UIState
│   └── utils/
│       ├── markdownParser.ts                 # (diupdate untuk support heading ID)
│       └── documentStats.ts
└── tests/
    ├── unit/
    └── e2e/
```

---

## 9. Environment Variables / Konfigurasi

```bash
# ── Core ──
DOCFLOW_USER_DATA_DIR=                 # override userData (testing only)
DOCFLOW_LOG_LEVEL=info                 # trace|debug|info|warn|error

# ── Files ──
DOCFLOW_MAX_FILE_SIZE_MB=50            # hard-reject file > 50MB
DOCFLOW_ENCODING=utf-8                 # default
DOCFLOW_WATCH_DEBOUNCE_MS=250          # debounce chokidar
DOCFLOW_AUTOSAVE_DEBOUNCE_MS=1500      # debounce tulis session.json
DOCFLOW_RECOVERY_INTERVAL_MS=5000      # interval draft recovery

# ── UI Defaults ──
DOCFLOW_DEFAULT_ZOOM=100               # 50 - 200
DOCFLOW_DEFAULT_PAGED_MODE=true        # true|false
DOCFLOW_DEFAULT_AUTOSCROLL=false       # true|false
DOCFLOW_DEFAULT_SYNC_TOC=true          # true|false
```

**File konfigurasi runtime** — `{userData}/settings.json`:
```jsonc
{
  "schemaVersion": 1,
  "theme": "modern",
  "fontSize": "md",
  "fontFamily": "sans",
  "pageSize": "A4",
  "marginSize": "normal",
  "paperTone": "white",
  "windowBounds": { "width": 1400, "height": 900, "x": null, "y": null },
  "uiState": {
    "zoomLevel": 100,
    "isPagedMode": true,
    "autoScroll": false,
    "syncScrollWithToc": true
  }
}
```

---

## 10. Skema Data / State Model

```typescript
// src/types/state.ts
export interface UIState {
  zoomLevel: number;           // 50 - 200
  isPagedMode: boolean;        // Paged vs Continuous
  autoScroll: boolean;         // Preview ikut scroll saat ngetik
  syncScrollWithToc: boolean;  // Klik TOC -> Editor & Preview sinkron
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
  uiState: UIState;            // BARU: persistent UI state
}
```

---

## 11. Kontrak Service Layer

| File | Tanggung jawab |
| :--- | :--- |
| `FileService.ts` | Orchestrator: atomic write, mtime conflict, backup. |
| `RecentFilesService.ts` | CRUD recent, LRU cap, prune TTL, pinned. |
| `SettingsService.ts` | Baca/tulis `settings.json`, migrasi schema, persist `uiState`. |
| `SessionService.ts` | Draft recovery tiap 5s, restore saat launch. |
| `uiStore.ts` (Zustand)| Mengelola state UI reaktif (Zoom, Paged, Sync TOC) & sinkronisasi ke `settings.json`. |
| `useScrollSync.ts` | Custom hook yang mengawasi event scroll & klik TOC untuk menyinkronkan `textarea` dan `div` preview. |

### 11.4 Pipeline: TOC Sync Scroll
```
User klik TOC item
  → useScrollSync.handleTocClick(item)
    → if (!uiState.syncScrollWithToc) return;
    → PREVIEW: document.getElementById(item.slug) → scrollIntoView({ behavior: 'smooth' })
    → EDITOR: 
        - Hitung posisi karakter dari lineNumber.
        - textarea.scrollTo({ top: lineNumber * lineHeight, behavior: 'smooth' })
        - textarea.setSelectionRange(pos, pos)
        - textarea.focus()
```

---

## 12. Routes & API / Entry Points

| Route/Entry | Fungsi |
| :--- | :--- |
| `IPC file:open` | Buka dialog open, baca file, return `{path, content, mtime}`. |
| `IPC file:save` | Tulis ke path yang diketahui (save-in-place). |
| `IPC file:saveAs` | Dialog Save As → tulis. |
| `IPC settings:set` | Merge update, validasi zod (termasuk `uiState`). |
| `IPC recent:add` | Upsert by path (dedup), cap 20. |
| `IPC window:dirty` | Set dirty marker di title (`•`). |
| **TOC Click** | `onClick` handler di `TableOfContents.tsx` → memicu `useScrollSync` (tanpa IPC). |
| **Toolbar UI** | `onClick` handler (Zoom, Paged, Auto-scroll) → `uiStore` (tanpa IPC). |

**Rate limit per entry:**
- `settings:set` (termasuk uiState): debounce 500ms di renderer sebelum dispatch IPC.
- `file:*` write channels: minimal 300ms jarak antar call per path.

---

## 13. Alur Inti (Core Flows)

### 13.1 Flow: Open file dari OS association
*(Sama seperti blueprint asli: OS dispatch → FileService → fileStore.load → render).*

### 13.2 Flow: Save-in-place dengan konflik eksternal
*(Sama seperti blueprint asli: mtime check → atomic write → toast).*

### 13.3 Flow: TOC Sync Scroll (Fitur Baru)
1. User melihat panel Outline di sidebar kanan/kiri.
2. User mengklik salah satu heading (misal: "Pendahuluan").
3. `TableOfContents.tsx` mengecek state `syncScrollWithToc` (jika OFF, abaikan).
4. Jika ON:
   - `previewRef.current` mencari elemen `<h2 id="pendahuluan">` lalu memanggil `scrollIntoView({ behavior: 'smooth' })`.
   - `editorRef.current` (textarea) menghitung `scrollTop = (lineNumber - 1) * lineHeight` lalu `scrollTo()`.
   - Kursor di editor dipindahkan ke baris tersebut.

### 13.4 Flow: Toolbar UI & Zoom (Fitur Baru)
1. User mengubah Zoom menjadi 120% atau mengklik "Continuous" mode.
2. Komponen `FormattingToolbar` memanggil `uiStore.setZoomLevel(120)` atau `uiStore.togglePagedMode()`.
3. `DocumentViewer` bereaksi via CSS transform `scale(1.2)` atau merubah `max-width` dan `box-shadow`.
4. State `uiState` di-debounce 500ms, lalu dikirim via IPC `settings:set` agar tersimpan di disk.

### 13.5 Flow: Auto-scroll Ketikan
1. User mengetik di ujung bawah textarea.
2. `onScroll` atau `useEffect` pada editor mendeteksi `scrollTop`.
3. Jika `uiState.autoScroll === true`, hitung persentase scroll editor, lalu set `previewRef.scrollTop` dengan persentase yang sama.

---

## 14. UI / Views / Presentasi

| View/Scene/Asset | Sumber | Catatan |
| :--- | :--- | :--- |
| `App.tsx` (root) | `src/App.tsx` | Dipertahankan; ditambah `useFileSession`, `StatusBar`, dan Refs (`editorRef`, `previewRef`). |
| `FormattingToolbar` | `src/components/FormattingToolbar.tsx` | **DIROMAK TOTAL** sesuai screenshot: Dropdown Tema, Font, Size, Page, Margin, Paged/Continuous, Auto-scroll, Copy MD, Zoom Controls. |
| `DocumentEditor` | `src/components/DocumentEditor.tsx` | Diubah: menerima `ref` (forwardRef) untuk sinkronisasi scroll. |
| `DocumentViewer` | `src/components/DocumentViewer.tsx` | Diubah: menerima `zoomLevel`, `isPagedMode`, dan `ref`. |
| `TableOfContents` | `src/components/TableOfContents.tsx` | **DIROMAK**: Menambahkan toggle "Sync Scroll" dan logic klik yang memicu `useScrollSync`. |
| `ExportModal` | `src/components/ExportModal.tsx` | Sama. |
| `RecentFilesMenu` | `src/components/RecentFilesMenu.tsx` | Dropdown di TopNav; sinkron dengan native menu. |
| `UnsavedChangesDialog` | `src/components/UnsavedChangesDialog.tsx` | Modal Save/Discard/Cancel. |
| `ConflictDialog` | `src/components/ConflictDialog.tsx` | Overwrite / Reload / Save As. |
| `RecoveryPrompt` | `src/components/RecoveryPrompt.tsx` | Saat launch, restore draft. |
| `StatusBar` | `src/components/StatusBar.tsx` | Bar bawah: path, dirty •, encoding, line ending, cursor pos. |

---

## 15. Security & Reliability

| Area | Tindakan |
| :--- | :--- |
| Renderer isolation | `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`. |
| IPC validation | Setiap payload zod-parse; reject dengan `AppError('IPC_INVALID')`. |
| Path traversal | Normalisasi `path.resolve`; reject jika path di luar `userHome`. |
| Malicious Markdown | `marked` output disanitasi dengan `DOMPurify` sebelum `dangerouslySetInnerHTML`. |
| CSP | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';`. |
| File size DoS | Hard-reject > 50 MB di `FileService.read`. |
| Atomic write | `path.tmp` → `rename` + `fsync(dir)` mencegah korupsi. |
| External edit race | `expectedMtime` compare; dialog konflik. |
| **DOM Sync Safety** | Jika `elementId` tidak ditemukan (karena parsing error), abaikan perintah scroll (fail-safe). |

---

## 16. Build, Deploy, CI/CD

*(Sama seperti blueprint asli: electron-vite + electron-builder, matrix Windows + Linux, artifact .exe, .AppImage, .deb).*

---

## 17. Testing Checklist

### 17.1 Unit / Service
- [ ] `FileService.write` atomik: kill proses mid-write → file asli utuh.
- [ ] `RecentFilesService.add` dedup by path; cap 20.
- [ ] `SettingsService.migrate` dari `schemaVersion: 0` → `1` tanpa kehilangan field (termasuk migrasi `uiState`).
- [ ] `markdownParser` menghasilkan ID heading yang unik (untuk TOC).

### 17.2 Integration & UI Logic (BARU)
- [ ] **TOC Sync**: Klik heading "H2" → `textarea.scrollTop` berubah ke baris yang tepat & elemen preview ter-scroll ke `<h2 id="...">`.
- [ ] **TOC Sync OFF**: Jika toggle OFF, klik TOC tidak memicu scroll di Editor/Preview.
- [ ] **Auto-scroll**: Ketik di editor hingga scroll ke bawah → preview ikut scroll proporsional (jika toggle ON).
- [ ] **Zoom**: Klik tombol `+` / `-` → preview membesar/mengecil (CSS transform), state tersimpan.
- [ ] **Paged Mode**: Toggle ke "Continuous" → padding preview berubah, shadow hilang.
- [ ] **Copy MD**: Klik Copy MD → clipboard berisi string yang persis sama dengan state editor.

### 17.3 Smoke / Staging
- [ ] Launch app di Windows 10 & 11 (VM), window muncul < 3 detik.
- [ ] Double-click `sample.md` di Explorer → app launch + file terbuka.
- [ ] Kill -9 proses → relaunch → prompt recovery muncul.
- [ ] Export DOCX → file `.docx` valid bisa dibuka di LibreOffice 24.

---

## 18. Timeline

| Hari/Milestone | Aktivitas |
| :--- | :--- |
| D1–D2 | Scaffold Electron + Vite + React; pindahkan seluruh `src/` lama. |
| D3–D4 | `FileService` + `FileProvider` + atomic write + unit test. |
| D5–D6 | IPC registry + zod schema + `preload.ts` bridge. |
| D7–D8 | `RecentFilesService` + `SettingsService` + `SessionService`. |
| D9–D10 | **`uiStore` (Zustand) + Implementasi Toolbar UI (Theme, Zoom, Paged).** |
| D11–D12 | **`useScrollSync` hook + TOC Synchronization Toggle + Auto-scroll.** |
| D13–D14 | Save-in-place, conflict dialog, unsaved-changes guard, recovery prompt. |
| D15–D16 | Playwright e2e: launch, open/save, association, recent, **TOC Sync**. |
| D17–D18 | CI matrix build Windows + Linux; artifact upload; checksum. |
| D19 | Polish UI (StatusBar, RecentFilesMenu, ConflictDialog) + fix bug. |
| D20 | Beta release `v1.0.0` (unsigned) + dokumentasi user. |

---

## 19. Definition of Done (DocFlow Studio Desktop v1)

- [ ] Repo `docflow-studio-desktop` public/private sesuai org, branch `main` + `develop`.
- [ ] `pnpm install && pnpm build && pnpm test` hijau di Windows dan Linux (CI).
- [ ] Semua fitur lama DocFlow Studio berjalan identik (regression pass).
- [ ] Save-in-place (Ctrl+S) & Save As (Ctrl+Shift+S) berfungsi.
- [ ] File association `.md` terdaftar (Windows registry & Linux `/usr/share/mime`).
- [ ] Double-click `.md` membuka app dengan file ter-load.
- [ ] Recent files tampil di menu dan bertahan antar restart.
- [ ] Dirty tracking akurat: title bar `•` saat unsaved.
- [ ] Close guard: Save/Discard/Cancel berfungsi.
- [ ] Crash recovery: kill -9 → relaunch → prompt restore draft.
- [ ] **FormattingToolbar UI lengkap sesuai screenshot (Zoom, Paged, Auto-scroll, Copy MD, dll).**
- [ ] **TOC Synchronization**: Klik outline men-scroll Editor & Preview secara sinkron (bisa di-toggle ON/OFF).
- [ ] **UI State Persistence**: Pengaturan Zoom, Paged Mode, dan TOC Sync tersimpan di `settings.json`.
- [ ] Security checklist §17.4 semua lulus.
- [ ] `electron-builder` menghasilkan `.exe` (NSIS + portable) dan `.AppImage` + `.deb`; checksum tersedia.
- [ ] `README.md` berisi dokumentasi fitur baru dan panduan build.

---

## 20. Roadmap Lanjutan + Ringkasan

| Fase | Deliverable |
| :--- | :--- |
| **F0** | Dokumen perencanaan ini (blueprint). |
| **F1** (M1) | **DocFlow Studio Desktop v1**: Fitur lama + save-in-place, association, native menu, recent files, serta **UI Toolbar lengkap & TOC Sync Scroll**. Build unsigned. |
| **F2** (M2) | Auto-update, code signing, i18n ID/EN, tray minimize. |
| **F3** (M3) | Store publishing (MSIX, Flathub), PDF export vektor via `pdf-lib`. |
| **F4** (M4) | macOS target (arm64 + x64), notarization. |

**Ringkasan (≤120 kata):** DocFlow Studio Desktop v1 adalah evolusi Electron dari DocFlow Studio web, mempertahankan authoring Markdown dan ekspor dokumen sambil menambahkan integrasi OS native dan pembaruan UI yang masif. Fitur unggulan meliputi Toolbar interaktif (Zoom, Paged/Continuous, Auto-scroll, Copy MD) dan **Sinkronisasi TOC** yang memungkinkan pengguna mengklik outline untuk men-scroll Editor dan Preview secara bersamaan. Arsitektur memisahkan `fileStore` (disk I/O) dan `uiStore` (Zustand) untuk menjaga performa DOM. Build matrix Windows + Linux menghasilkan `.exe` NSIS, `.AppImage`, dan `.deb` dalam 20 hari kerja, dengan roadmap auto-update dan macOS di fase berikutnya.