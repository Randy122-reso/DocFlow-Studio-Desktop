# 🧾 DocFlow Studio Desktop v1.6 — Rencana Pengembangan (Unified, Tabs + Find/Replace + Auto-Update + i18n + Tray + Multi-Window)

> **Tagline:** *Markdown authoring & publication-grade export, native on Windows & Linux — now with signed auto-update, bilingual UI (ID/EN), system tray, multi-window detach, vector PDF, and Notepad++-class Find/Replace across tabs and files.*
> **Sub-tagline (README):** *Electron desktop app yang menulis, memformat, dan mengekspor Markdown ke PDF/DOCX dengan integrasi OS native: file association `.md`, recent files, save-in-place, native menu File, **multi-tab dokumen (drag-reorder, pin, context menu, session restore)**, **Find/Replace (Normal/Extended/Regex) + Find All in Tabs + Find in Files**, UI sinkronisasi cerdas (TOC sync, Auto-scroll, Zoom, Paged/Continuous), Native Context Menu, Full UI State Persistence, **signed auto-update via `electron-updater`, UI bilingual ID/EN (i18next), system tray, dan multi-window detach tab**.*
> **Naming resmi:**
> - Repo: `docflow-studio-desktop`
> - Package: `@docflow/studio-desktop`
> - App ID: `id.docflow.studio`
> - Versi: **v1.6.0** (full — desktop integration + tabs + find/replace + find-in-files + UI sync + context menu + full UI persistence + **auto-update + signing + i18n + tray + multi-window + vector PDF + extended Unicode find + pinned tabs**)
> - Artifact: `DocFlowStudio-{version}-{arch}.{exe|AppImage|deb}`
> - Proses/container: `docflow-main` (main process), `docflow-renderer` (Chromium renderer sandboxed)
> - Path data (Win): `%APPDATA%\DocFlow Studio\`; (Linux) `~/.config/DocFlow Studio/`
> - Healthcheck: smoke-test e2e "launch + open 3 tabs + find/replace + save + toggle viewMode + context menu + check update + switch locale + quit"
> - Endpoint renderer: `app://docflow/` (custom protocol) atau `file://.../index.html`
> - Update feed: `https://releases.docflow.app/updates/latest.yml` (stable) / `.../beta/latest.yml` (beta)

> **Asumsi:** `TIMELINE_HINT` kosong → dipilih **44 hari kerja** (≈9 minggu) untuk full v1.6 (v1.5 base + distribution/i18n/tray/multi-window + upgrades). `STACK_PREFERENCES` kosong → Electron + React + Vite + TypeScript. `EXTERNAL_INTEGRATIONS` = tidak ada (full offline; update feed opsional F2). `NON_GOALS_HINTS` = cloud sync, backend, AI/Gemini, mobile, macOS, store publishing (F3).

Dokumen ini **menggabungkan** kedua blueprint v1.5 (Unified dan Unified-Tabs-FindReplace) menjadi satu perencanaan terpadu **DocFlow Studio Desktop v1.6**. Dibanding v1.5, v1.6 menambahkan **Domain D8–D10**: **Auto-Update & Signed Distribution**, **Internationalization (i18n ID/EN)**, serta **Desktop Shell (Tray + Multi-Window Detach)**; meng-upgrade **D3 (PDF vektor via `pdf-lib`)**, **D6 (tab pinning visual + perilaku)**, dan **D7 (extended `\x{...}` Unicode escape)**. `session.json` naik ke **v5** (multi-window state), `settings.json` ke **v4** (locale + update channel + tray config), dan IPC channel menjadi **52**. Cross-cutting concerns tetap: **Native Context Menu**, **Resilient Toolbar (Overflow Scroll)**, **Full UI State Persistence**, dan **React Hooks Discipline**.

---

## 1. Analisis Sintesis Domain

### 1.1 Sepuluh domain fungsional + satu disiplin lintas-cutting

| # | Domain | Inti | Keputusan v1.6 |
| :-- | :--- | :--- | :--- |
| D1 | Markdown Editing | buffer teks source-of-truth | `<textarea>` + `tabStore` + **Native Context Menu** |
| D2 | Document Formatting & Preview | tema, page, margin, header/footer | `documentStore` settings + `DocumentViewer` + **Preview Context Menu** |
| D3 | Multi-format Export | DOCX/PDF/DOC/HTML/MD + code script + **PDF vektor** | `docExport`/`pdfExport` (jsPDF raster + **`pdf-lib` vektor**) + `file:saveBinary` |
| D4 | Desktop File Integration | assoc, recent, save-in-place, watcher, recovery | `FileService` + `FileProvider` + **52 IPC channels** |
| D5 | Advanced UI/UX State Sync | TOC, auto-scroll, zoom, paged, copy MD, **overflow scroll**, **full state persistence** | `uiStore` + `useScrollSync` + `FormattingToolbar` + `useUiStatePersistence` |
| D6 | Multi-Document Tabs | multi file, drag, **pin visual**, session restore, close guard | `tabStore` + `TabBar` + `useTabManager` + `useTabPersistence` |
| D7 | Search & Replace | Find/Replace + Find All in Tabs + Find in Files (normal/extended/**extended-unicode**/regex) | `searchStore` + `FindReplaceBar` + `FileSearchService` |
| **D8** | **Auto-Update & Signed Distribution** | **signed build, in-app update banner, staged rollout, channel switch** | **`UpdateService` (electron-updater) + Authenticode/GPG signing + `latest.yml`** |
| **D9** | **Internationalization (i18n)** | **UI ID/EN, locale-aware formatting, live switch** | **`I18nService` + `i18next` + `react-i18next` + `locales/{en,id}/`** |
| **D10** | **Desktop Shell (Tray + Multi-Window)** | **tray icon, minimize-to-tray, detach tab, tab transfer** | **`TrayService` + `WindowManager` + session v5 multi-window** |
| **X1** | **React State Discipline** | hooks di top-level, tidak kondisional | **Audit & regression test** (lihat §4.1, §14, §17.2, §19) |

### 1.2 Kesamaan (common ground)

| Aspek | D1 | D2 | D3 | D4 | D5 | D6 | D7 | D8 | D9 | D10 | Keputusan v1.6 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Input utama | Teks MD | Teks MD | Teks render | File `.md` | Interaksi UI | Pilih tab | Query + options | Tag/channel rilis | Pilihan locale | Drag/klik tray | Single source of truth: buffer di `tabStore` |
| State persisten | Buffer | Settings tema | File output | Path file | UI State | Urutan tab + active tab | Find history | Update channel + last check | Locale | Tray bounds (auto) | `tabStore` + `uiStore` + `searchStore` + `settings.json` (v4) + `session.json` (v5) |
| Trigger user | Ketik/paste | Pilih tema | Klik export | Ctrl+S / dbl-click | Klik TOC / toggle | Klik tab / Ctrl+Tab | Ctrl+F / Ctrl+Shift+F | Cek update manual/otomatis | Ganti bahasa | Klik tray / drag tab keluar | `useTabSession` + `useFindReplace` + `useI18n` + `useUpdate` |
| Error model | Parse | Render | Export | FS / permission | DOM mismatch | Duplicate path / max tabs | Regex/glob invalid | Signature invalid / feed unreachable | Missing key | Tray unavailable | `AppError` taxonomy + toast |
| Cross-platform | Browser | Browser | Browser | OS-specific | Browser | Browser | Main (FS) + renderer (regex) | Win + Linux (signing berbeda) | Browser | OS-specific | Electron abstraction (`FileProvider`, `IUpdateProvider`) |

### 1.3 Perbedaan yang dijembatani

| Aspek | Domain A | Domain B | Jembatan |
| :--- | :--- | :--- | :--- |
| Sumber kebenaran | State React | Disk file | `tabStore` + `savedContent` + invariant `dirty` per tab |
| Waktu simpan | — | Explicit Save | Menu File → Save, Ctrl+S + autosave draft 5s |
| Navigasi file | Paste/upload | Double-click `.md` | `OpenFileRouter` + dedup by path |
| Identitas dokumen | "Untitled-N" | Path absolut | `filePath: string \| null` per tab + `tab.id` (uuid) |
| State UI | Volatile | Persisten | `uiStore` → debounce 500ms → `settings:set` |
| Idempotensi tulis | N/A | Re-save sama | Atomic write `.tmp → rename → fsync` |
| Konflik eksternal | N/A | File diubah editor lain | `diskMtime` compare + watcher debounce 250ms per tab |
| DOM sync | Ref editor | Ref preview | `useScrollSync` — mapping `lineNumber ↔ elementId` |
| OS native context | Web default | Custom menu | IPC `app:showContextMenu` → Main Menu API (editor/preview/tab) |
| Layout responsif | Toolbar terpotong | Scrollable | `overflow-x: auto` + `mask-image` (toolbar & tab bar) |
| **Update binary** | **Build lokal** | **Build dari feed** | **`IUpdateProvider` abstraksi; `electron-updater` default; signature verify wajib** |
| **Bahasa UI** | **String hard-coded ID** | **Locale pengguna** | **`I18nService` + externalized JSON; fallback `en` jika key hilang** |
| **Window topology** | **Single window** | **Multi-window + detached tab** | **`WindowManager` + `session.windows[]` v5; tab transfer via main process** |
| **Pencarian** | Find lokal | Find lintas file | `searchStore` + `FileSearchService` |
| **Hooks integrity** | — | — | Top-level only; akses store via `useXxx()` top-level |

### 1.4 Strategi unifikasi

1. **Satu renderer SPA** dengan sandbox penuh (`nodeIntegration:false`, `contextIsolation:true`, `sandbox:true`), dipanggil dari beberapa `BrowserWindow` (multi-window) yang berbagi main process state.
2. **Pemisahan state**: `tabStore` (dokumen/tab), `uiStore` (zoom, paged, viewMode, locale view), `searchStore` (find), `updateStore` (status update). Persistensi lewat `settings:set` / `session:save` (debounce).
3. **IPC tervalidasi zod** — semua file/session/recent/settings/context-menu/find/**update**/**i18n**/**tray**/**window** lewat `window.docflow.*` (**52 channel**).
4. **Sinkronisasi DOM presisi** — `useScrollSync` per tab aktif, fail-safe.
5. **Hooks discipline** — semua `useUIStore()`, `useTabStore()`, `useSearchStore()`, `useUpdateStore()`, `useTabSession()`, `useScrollSync()`, `useContextMenu()`, `useFindReplace()`, `useI18n()`, `useUpdate()` dipanggil di **top-level** komponen.
6. **Build matrix CI** Windows + Linux publish artifact **signed** + `latest.yml` + `SHA256SUMS` per channel (`stable`, `beta`).

---

## 2. Identitas & Naming

| Item | Nilai |
| :--- | :--- |
| Repo | `github.com/<org>/docflow-studio-desktop` |
| Package | `@docflow/studio-desktop` |
| App ID | `id.docflow.studio` |
| Versi rilis | `1.6.0` |
| Executable | `docflow-studio` (Linux), `DocFlow Studio.exe` (Win) |
| Artifact | `DocFlowStudio-{version}-{arch}.{exe\|AppImage\|deb}` |
| Main process | `docflow-main` |
| Renderer sandbox | `docflow-renderer` |
| Path data (Win) | `%APPDATA%\DocFlow Studio\` |
| Path data (Linux) | `~/.config/DocFlow Studio/` |
| Log | `{userData}/logs/main-{date}.log` |
| Session | `{userData}/session.json` **(schemaVersion 5)** |
| Settings | `{userData}/settings.json` **(schemaVersion 4)** |
| Recent | `{userData}/recent.json` |
| Cache | `{userData}/cache/` |
| Update feed | `https://releases.docflow.app/updates/{channel}/latest.yml` |
| Code signing (Win) | Authenticode (EV cert opsional; self-signed F1 fallback) |
| Code signing (Linux) | GPG detached signature `*.AppImage.sig` + `SHA256SUMS.gpg` |
| Custom protocol | `app://docflow/` |
| Association | `.md`, `.markdown`, `.txt` → `text/markdown`, `text/plain` |
| Tray icon | `build/tray-16.png`, `build/tray-32.png` (monochrome + colored variants) |
| Locales | `src/locales/{en,id}/{common,editor,find,tabs,update,tray,errors}.json` |

---

## 3. Ruang Lingkup

### In scope (full v1.6)

**Authoring & formatting (D1–D2)** — *tidak berubah dari v1.5*
- Editor split-view + preview terformat; 5 tema, 3 paper tone, A4/Letter, margin, header/footer, nomor halaman.
- TOC otomatis, statistik dokumen, paged vs continuous.
- Native Context Menu editor (Copy/Cut/Paste/Select All) & preview (Copy/Select All).

**Multi-Document Tabs (D6) — upgrade v1.6**
- **Tab Pinning visual**: ikon 📌 muncul pada tab pinned; pinned tab **dipaksa di urutan kiri**, tidak dapat di-drag melewati tab non-pinned; **Ctrl+W** pada pinned tab → konfirmasi; "Close Others"/"Close to Right" melewati pinned tab.
- Shortcut `Ctrl+Shift+P` → toggle pin tab aktif.
- Sisanya = v1.5: buka multi, drag-reorder, session restore, close guard, overflow scroll, duplicate-path → fokus tab, `MAX_TABS=30`.

**Search & Replace (D7) — upgrade v1.6**
- **Extended mode penuh**: `\n`, `\t`, `\r`, `\xNN` (byte), **`\x{...}` / `\u{...}` / `\U{...}`** (Unicode code point, mis. `\x{1F600}` → 😀), `\0`.
- Regex engine tetap JavaScript `RegExp`; perbedaan PCRE didokumentasikan di USER_GUIDE.
- Sisanya = v1.5: Find bar non-modal, Find All in Tabs, Find in Files, Replace in Files (dry-run), history 20.

**Export (D3) — upgrade v1.6**
- **PDF vektor (default)** via `pdf-lib` — teks selectable, ukuran ~5× lebih kecil.
- **PDF raster (fallback)** via `jsPDF` — untuk dokumen dengan layout kompleks / font yang tidak didukung.
- ExportModal: pilihan "PDF — Vector (selectable text)" vs "PDF — Raster (print quality)".
- DOCX/Word-HTML/Direct-HTML/Markdown + code script tetap.

**Desktop integration (D4)** — *tidak berubah dari v1.5*
- Save-in-place, Save As, file association, native menu File, recent files, dirty tracking + unsaved guard, autosave draft 5s, watcher, recovery.

**UI/UX sync (D5)** — *tidak berubah dari v1.5*
- FormattingToolbar lengkap + overflow scroll; zoom 85–200% (preset Fit/Reset); auto-scroll; TOC sync; full UI state persistence.

**Auto-Update & Signed Distribution (D8) — BARU**
- **Signed release**: Authenticode (Win), GPG (Linux), checksum `.sha256` per file.
- **`electron-updater`**: check otomatis saat launch (delay 30s) + manual (Help → Check for Updates).
- **Update channel**: `stable` (default) dan `beta` (opt-in di Settings).
- **In-app banner**: "Update vX.Y.Z available — Restart to Update / Later / Skip this version".
- **Staged rollout**: `latest.yml` mendukung `stagingPercentage` (10% → 50% → 100%).
- **Signature verification wajib** sebelum apply; invalid → tampilkan error + log.
- **Offline mode**: jika feed unreachable, tidak error, retry next launch.
- **Update log** terpisah di `{userData}/logs/update-{date}.log`.

**Internationalization (D9) — BARU**
- **UI bilingual ID/EN**, live switch dari menu **View → Language** atau Settings.
- **Externalized strings** di `src/locales/{en,id}/*.json`; key lengkap untuk semua UI.
- **Fallback `en`** jika key hilang; CI check `i18n:missing-keys`.
- **Locale-aware formatting** untuk tanggal, angka, ukuran file (via `Intl.*`).
- **Persist locale** di `settings.json` → `locale: "id" | "en" | "auto"` (`auto` = `app.getLocale()` + fallback ke `en`).
- **Native menu** juga diterjemahkan via `Menu.buildFromTemplate` dengan label dari `I18nService`.

**Desktop Shell (D10) — BARU**
- **System Tray**:
  - Ikon tray menampilkan status (idle/update available).
  - Klik kiri: toggle window visibility.
  - Klik kanan: menu native (Show Window, New Tab, Recent Files →, Check for Updates, Quit).
  - **Minimize-to-tray**: Settings toggle (default: off; bisa `false` agar perilaku standar).
  - **Startup with system**: opsional F2; di v1.6 hanya toggle tidak aktif (placeholder).
- **Multi-Window**:
  - **Detach tab ke window baru**: drag tab keluar dari tab bar → window baru; atau menu tab → "Move to New Window".
  - **Tab transfer antar window**: drag tab ke window lain (jika ada).
  - **Session v5** menyimpan state per window (bounds, tabs, activeTabId) — restore semua window saat launch.
  - **`MAX_WINDOWS=5`** anti-DoS.
  - Window baru selalu mewarisi locale + theme + settings yang sama (main process broadcast `settings:changed`).

**State discipline (X1)** — *tidak berubah*
- Semua store hook dipanggil di top-level; regression test toggle viewMode × 5 **dan** tab × 5 **dan** i18n switch × 3.

### Out of scope / prasyarat eksternal
- Store publishing (MSIX, Flathub) — **F3**.
- Cloud sync, akun, backend, database server.
- AI/Gemini — dihapus total.
- macOS target — **F4**.
- Markdown WYSIWYG inline editing (tetap textarea).
- Custom HTML context menu (tetap native).
- **Notepad++ Find in Projects** — diganti Find in Files.
- **Notepad++ Mark** (bookmark line) — **F2**.
- **Notepad++ Transparency** — tidak diadopsi.
- **PDF vektor untuk tabel/kompleks** — fallback otomatis ke raster.
- **Plugin system** — **F5**.
- **WebDAV sync** — **F5**.
- **Telemetry opt-in** — **F3**.
- **Startup with system auto-enable** — **F2** (v1.6 hanya toggle placeholder).

---

## 4. Prinsip Desain

| Prinsip | Implementasi |
| :--- | :--- |
| **Renderer sandboxed** | `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`. |
| **IPC tervalidasi** | Setiap `ipcMain.handle` zod-parse; invalid → `AppError('IPC_INVALID')`. |
| **Single source of truth** | Buffer per tab di `tabStore`; UI di `uiStore`; Find di `searchStore`; Update di `updateStore`. |
| **UI State Isolation** | Zoom/Paged/Auto-scroll/TOC-sync/ViewMode/Locale hanya `uiStore`; persist debounce 500ms. |
| **Find State Isolation** | Query/options/hasil hanya `searchStore`. |
| **Tab State Isolation** | `tabs[]` + `activeTabId` per window; persist debounce 500ms → `session:save`. |
| **Update State Isolation** | Status update hanya `updateStore`; main process memegang `electron-updater` instance. |
| **Atomic write** | `.tmp` → `rename` → `fsync(dir)` untuk semua tulis disk. |
| **Fail-fast config** | Env var wajib divalidasi di `main.ts` boot; invalid → `app.exit(1)`. |
| **No network (runtime)** | CSP `default-src 'self'; connect-src 'self'`; `shell.openExternal` whitelist. **Pengecualian tunggal: HTTPS update feed** (`connect-src 'self' https://releases.docflow.app`). |
| **Dirty invariant per tab** | `tab.dirty === (tab.fileContent !== tab.savedContent)`. |
| **Recovery-first** | Autosave draft 5s → `session.json`; crash → prompt restore per tab. |
| **Path normalization** | `path.resolve` + `startsWith(userHome)`; tolak path traversal. |
| **Sinkronisasi presisi** | `useScrollSync`: `lineNumber ↔ elementId`; fail-safe. |
| **Hooks top-level only** | Semua hook React dipanggil di top-level komponen. Lihat §4.1. |
| **Native OS Integration** | Context menu (editor/preview/tab), tray menu → Electron `Menu` API. |
| **Resilient Layout** | Toolbar **dan** tab bar wajib `overflow-x: auto` + `mask-image`. |
| **Regex safety** | Regex input `try/catch`; invalid → toast; timeout 5s/pattern/file di `FileSearchService`. |
| **Update safety** | Signature verify wajib sebelum apply; invalid → tolak + log. |
| **i18n completeness** | Semua string user-facing di JSON; fallback `en`; CI check missing keys. |
| **Cross-platform parity** | Semua fitur identik Win & Linux; perbedaan hanya path separator, dialog native, dan signing mechanism. |
| **Log tanpa PII** | Log hanya basename + size; tidak pernah isi Markdown, query find, atau locale user data. |
| **Multi-window safety** | Main process = single source of truth untuk `session.windows[]`; renderer minta via IPC; tidak ada `remote` module. |

### 4.1 React Hooks Discipline (eksplisit)

**Aturan:** Hook (`useUIStore`, `useTabStore`, `useSearchStore`, `useUpdateStore`, `useTabSession`, `useScrollSync`, `useContextMenu`, `useFindReplace`, `useI18n`, `useUpdate`, `useState`, `useEffect`, `useRef`, dll.) **wajib** dipanggil di top-level function component — sebelum `return` JSX, dan **tidak** di dalam:
- ekspresi JSX kondisional (`{condition && useUIStore()}`),
- blok `if`/`else` yang tidak konsisten antar render,
- callback/event handler,
- `Array.map` / loop.

**Bug lama yang ditutup (dari v1.5):**
> Saat user klik **Editor Only**, `viewMode` menjadi `'editor'` → `DocumentViewer` di-unmount → ekspresi `zoomLevel={useUIStore(s => s.zoomLevel)}` tidak dievaluasi lagi → hook count berubah → React melempar **`Rendered fewer hooks than expected.`**

**Bug baru v1.6 yang harus ditutup:**
> Saat user detach tab terakhir dari satu window, `TabBar` di window itu tidak me-render `TabItem` → jika `useTabContextMenu()` / `useUpdateStore()` dipanggil di dalam `.map()`, hook count berubah antar-render. **Solusi:** `useContextMenu('tab')` + `useUpdateStore()` dipanggil di top-level `TabBar.tsx`.

**Perbaikan wajib:**

```tsx
// ❌ SALAH — hook di JSX kondisional
{viewMode !== 'editor' && (
  <DocumentViewer
    zoomLevel={useUIStore(s => s.zoomLevel)}      // hook kondisional
  />
)}

// ✅ BENAR — hook di top-level
const uiState = useUIStore();
const activeTab = useTabStore(s => s.tabs.find(t => t.id === s.activeTabId));
const locale = useI18n().locale;                 // ✅ top-level, dipakai sebagai prop
return (
  <>
    {uiState.viewMode !== 'editor' && activeTab && (
      <DocumentViewer zoomLevel={uiState.zoomLevel} locale={locale} />
    )}
  </>
);
```

**Pencegahan:** ESLint rule `react-hooks/rules-of-hooks: error` (bukan `warn`), CI menolak PR yang melanggar. Regression test §17.2 wajib meng-cover toggle 3 viewMode × 5, buka/tutup tab × 5, dan switch locale × 3 (karena `useI18n` juga hook).

---

## 5. Arsitektur Terpadu (tunggal)

```text
┌────────────────────────────────────────────────────────────────────────────────┐
│                       Electron Main Process (docflow-main)                     │
│  ┌──────────┐  ┌────────────┐  ┌──────────────────┐  ┌──────────────┐          │
│  │ menu.ts  │  │ FileService│  │ RecentFilesSvc   │  │ WindowManager│          │
│  └────┬─────┘  └─────┬──────┘  └────────┬─────────┘  └──────┬───────┘          │
│       │              │                  │                    │                 │
│       └──────────────┴──────────────────┼────────────────────┘                 │
│                                         │                                      │
│                        ┌────────────────▼─────────────────┐                    │
│                        │  IPC Registry (52 channels)      │                    │
│                        │  zod-validated · rate-limited    │                    │
│                        └────────────────┬─────────────────┘                    │
│  ┌──────────────┐  ┌────────────┐  ┌────▼──────────┐  ┌──────────────┐        │
│  │ SettingsSvc  │  │FileSearchSvc│  │ UpdateService │  │ FileWatcher  │        │
│  │              │  │            │  │ (updater)     │  │              │        │
│  └──────────────┘  └────────────┘  └───────────────┘  └──────────────┘        │
│  ┌──────────────┐  ┌────────────┐  ┌───────────────┐  ┌──────────────┐        │
│  │ I18nService  │  │ TrayService│  │ ContextMenuSvc│  │ DialogSvc    │        │
│  └──────────────┘  └────────────┘  └───────────────┘  └──────────────┘        │
└──────────────────────────────────┬─────────────────────────────────────────────┘
                                   │ preload.ts → contextBridge
                                   │ window.docflow.*
┌──────────────────────────────────▼─────────────────────────────────────────────┐
│                Renderer SPA (React 19 + Vite, sandboxed) × N windows           │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ FormattingToolbar (Theme, Font, Size, Page, Margin, Paged↔Continuous,    │  │
│  │ Auto-scroll, Copy MD, Zoom, TOC Sync) [overflow-x: auto]                │  │
│  └──────────────────────────────────┬───────────────────────────────────────┘  │
│  ┌──────────────────────────────────▼───────────────────────────────────────┐  │
│  │ UpdateBanner (conditional: "v1.6.1 available — Restart to Update")       │  │
│  └──────────────────────────────────┬───────────────────────────────────────┘  │
│  ┌──────────────────────────────────▼───────────────────────────────────────┐  │
│  │ FindReplaceBar (Find, Replace, options, history, find-in-files btn)      │  │
│  └──────────────────────────────────┬───────────────────────────────────────┘  │
│  ┌──────────────────────────────────▼───────────────────────────────────────┐  │
│  │ TabBar: [📌 README.md •][CHANGELOG.md][docs.md][+]                       │  │
│  │ [overflow-x: auto · drag-reorder · drag-out-to-detach · ctx-menu native] │  │
│  └──────────────────────────────────┬───────────────────────────────────────┘  │
│  ┌──────────────┐  ┌────────────────▼────────────┐  ┌──────────────┐           │
│  │ Document     │  │ Document Viewer             │  │ TOC Side     │           │
│  │ Editor       │  │ (DOM ref)                   │  │ bar (Sync)   │           │
│  │ (textarea)   │◄─┤ [Native Context Menu]       │  │              │           │
│  │ [Ctx Menu]   │  │                             │  │              │           │
│  └──────┬───────┘  └────────────┬────────────────┘  └──────┬───────┘           │
│         └───────────────────────┼──────────────────────────┘                   │
│  ┌──────────────────────────────▼───────────────────────────────────────────┐  │
│  │ FindResultsPanel (results grouped by tab · collapsible)                  │  │
│  │ FindInFilesPanel (results grouped by file · collapsible)                 │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                    ┌────────────▼────────────┐                                 │
│                    │  Zustand                │                                 │
│                    │  tabStore | uiStore     │                                 │
│                    │  searchStore | updateStore │                              │
│                    └────────────┬────────────┘                                 │
└─────────────────────────────────┼──────────────────────────────────────────────┘
                                  │
┌─────────────────────────────────▼──────────────────────────────────────────────┐
│                    Filesystem & OS Integration                                 │
│  Win  : %APPDATA%\DocFlow Studio\{settings,recent,session}.json                │
│  Linux: ~/.config/DocFlow Studio/{settings,recent,session}.json                │
│  Update feed : https://releases.docflow.app/updates/{stable|beta}/latest.yml   │
│  Assoc : HKCR\DocFlowStudio.md (win) · /usr/share/mime (linux)                 │
│  Tray  : build/tray-{16,32}.png (monochrome/color)                             │
│  Signing: Authenticode (.exe) · GPG (.AppImage.sig + SHA256SUMS.gpg)           │
└────────────────────────────────────────────────────────────────────────────────┘
```

**Alur request/data utama:**

1. **Open flow (per tab)** — Ctrl+O / dbl-click `.md` → `second-instance` argv / `open-file` → `OpenFileRouter` → `FileService.read` → `app:open-file` → `tabStore.openTab(path)` (dedup by path) → re-render tab bar.
2. **Edit flow** — ketik `<textarea>` → `tabStore.setBuffer(activeTabId, content)` → `useDeferredValue` preview → `tab.dirty` recompute → autosave draft 5s.
3. **Tab switch flow** — klik tab / `Ctrl+Tab` → `tabStore.activateTab(id)` → restore cursor & scroll per tab.
4. **Tab close flow** — `Ctrl+W` / `×` → `tabStore.closeTab(id)` → jika dirty prompt Save/Discard/Cancel; jika pinned prompt confirm.
5. **Tab detach flow** — drag tab keluar / context menu "Move to New Window" → IPC `window:detachTab({tabId, sourceWindowId})` → Main Process `WindowManager.createWindow()` + transfer state + broadcast.
6. **Find flow** — `Ctrl+F` → `searchStore.openFind()` → Enter → cari di tab aktif → sorot + scroll. `Ctrl+Shift+F` → `find:inFiles` → `FileSearchService`.
7. **Update flow** — launch + 30s → `UpdateService.checkForUpdates()` → `electron-updater` hit feed → `update:status` broadcast ke semua window → `UpdateBanner` muncul jika ada.
8. **i18n flow** — Settings → Language → `i18n:setLocale('en')` → `I18nService.setLocale` → persist `settings:set` (debounced) → broadcast `i18n:localeChanged` ke semua window → React re-render via `useI18n()`.
9. **Tray flow** — klik kanan tray → `TrayService` menu native → aksi (Show Window / New Tab / Recent Files / Check for Updates / Quit).
10. **Save flow** — Ctrl+S → `tabStore.saveTab(activeTabId)` → `file:save(path, content, expectedMtime)` → atomic write → `savedContent := content; dirty := false`.
11. **Close window flow** — `window.on('close')` → jika ada tab dirty → `dialog:confirmUnsaved` per tab berurutan (Save All / Discard All / Cancel). Jika window terakhir & `minimizeToTray` ON → sembunyikan, bukan quit.

---

## 6. Kontrak Infra & Platform Desktop

| Kebutuhan | Kontrak |
| :--- | :--- |
| Runtime | Electron 33.x, Node.js 20.18 (main), Chromium 130 (renderer). |
| Dev bind | Hanya `127.0.0.1:5173` (Vite); production `app://docflow/`. |
| Outbound network | **Hanya update feed** (HTTPS, whitelisted host). CSP: `connect-src 'self' https://releases.docflow.app`. |
| FS write | Hanya di `app.getPath('userData')` + path pilihan user via dialog. |
| FS read | `*.md`, `*.markdown`, `*.txt`, `*.pdf`, `*.docx`; hard-reject > 50 MB. |
| FS search (find-in-files) | Root dir dipilih user; reject symlink; max 5 MB/file; max 10.000 hasil; timeout 5s/file. |
| Path data | `userData` writable; fallback `app.getPath('temp')` bila read-only. |
| CPU arch | Windows x64 (F1); Linux x64 + arm64. |
| Memory | ≤ 450 MB idle (1 window, 1 tab), ≤ 1.2 GB (3 windows × 3 tab × 5 MB dokumen). |
| Display | Min 1280×720; hidpi 1x/1.5x/2x. |
| Display server (Linux) | X11 + Wayland (Electron auto). Tray: `libappindicator` fallback `XEmbed`. |
| Locale | UTF-8 I/O; UI ID + EN (v1.6); auto-detect dari `app.getLocale()`. |
| Installer | Windows NSIS 3.x (per-user); Linux AppImage + deb. |
| Code signing (Win) | Authenticode (EV cert opsional; self-signed F1 fallback, warning di log). |
| Code signing (Linux) | GPG detached (`.AppImage.sig` + `SHA256SUMS.gpg`). Kunci di CI secret. |
| Auto-update | `electron-updater` 6.x; feed `latest.yml`; verify signature sebelum apply; staged rollout via `stagingPercentage`. |
| Tray | Ikon monokrom (16/32) untuk Win, berwarna untuk Linux; klik kiri toggle, klik kanan menu. |
| Multi-window | Maks 5 window; shared main process state; renderer sandboxed terpisah. |
| Update channel | `stable` (default), `beta` (opt-in). |

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
| PDF raster | `jsPDF` 2.5.2 + `html2canvas` 1.4.1. |
| **PDF vektor** | **`pdf-lib` 1.17.1** (text selectable, ukuran kecil). |
| State | `zustand` 5.0 (`tabStore`, `uiStore`, `searchStore`, **`updateStore`**). |
| **i18n** | **`i18next` 24.x + `react-i18next` 15.x** (ICU message format opsional). |
| **Auto-update** | **`electron-updater` 6.x** (bawaan `electron-builder`). |
| **Drag-reorder** | `@dnd-kit/core` 6.1 + `@dnd-kit/sortable` 8.0 (tab drag + tab-detach out). |
| **Glob** | `fast-glob` 3.3 (find-in-files). |
| Validation | `zod` 3.24. |
| Config store | `electron-store` 10.0. |
| Logging | `electron-log` 5.2. |
| Watcher | `chokidar` 4.0. |
| Testing unit | `vitest` 2.1 + `@testing-library/react` 16. |
| Testing e2e | `playwright` 1.49 (Electron driver). |
| Packaging | `electron-builder` 25.1. |
| Lint/format | `eslint` 9 + `@typescript-eslint` 8 + `prettier` 3.3. |
| **i18n check** | **`i18next-parser` 9.x** (CI missing-keys check). |
| Toolchain | Node 20.18, pnpm 9.12 (corepack). |

Catatan: `jsPDF`, `docx`, `chokidar`, `fast-glob`, `pdf-lib` tidak butuh native compile; `electron-store` di-bundle ke main saja.

---

## 8. Struktur Repo Final (tunggal)

Berikut tree struktur `docflow-studio-desktop/` dengan komentar pada **setiap cabang** (file maupun direktori), menggunakan karakter box-drawing yang bersih. Komentar baru ditambahkan untuk baris yang sebelumnya belum memiliki keterangan; komentar lama dipertahankan dan sebagian diperjelas.

```text
docflow-studio-desktop/                              # Root repository DocFlow Studio Desktop v1.6
├── package.json                                     # Metadata proyek, skrip build/test, dependensi
├── pnpm-lock.yaml                                   # Lockfile pnpm untuk reproducibility
├── electron-builder.yml                             # Konfigurasi packaging Electron (NSIS, AppImage, deb, signing)
├── tsconfig.json                                    # Konfigurasi TypeScript untuk renderer
├── tsconfig.electron.json                           # Konfigurasi TypeScript untuk main/preload
├── vite.config.ts                                   # Konfigurasi Vite untuk renderer
├── electron.vite.config.ts                          # Konfigurasi electron-vite (main + preload + renderer)
├── i18next-parser.config.js                         # Konfigurasi ekstraksi string i18n
├── eslint.config.js                                 # react-hooks/rules-of-hooks = error
├── .env.example                                     # Contoh variabel environment
├── .gitignore                                       # Daftar file/direktori yang diabaikan Git
├── README.md                                        # Dokumentasi utama proyek
├── LICENSE                                          # Lisensi proyek
├── CHANGELOG.md                                     # Catatan perubahan versi
├── docs/                                            # Dokumentasi pengguna dan panduan
│   ├── USER_GUIDE.md                                # Panduan penggunaan aplikasi
│   ├── PLUGINS.md                                   # Dokumentasi plugin (roadmap F5)
│   └── UPDATE_GUIDE.md                              # ⭐ signing + feed + staging
├── electron/                                        # Kode main process Electron
│   ├── main.ts                                      # Entry point main process: lifecycle, single-instance, protocol
│   ├── preload.ts                                   # Context bridge: expose window.docflow.*
│   ├── menu.ts                                      # native menu (i18n-aware)
│   ├── protocol.ts                                  # Handler custom protocol app://docflow/
│   ├── window.ts                                    # BrowserWindow factory
│   ├── ipc/                                         # Kumpulan handler IPC tervalidasi zod
│   │   ├── index.ts                                 # registerAllHandlers()
│   │   ├── fileHandlers.ts                          # 12 file:* channel
│   │   ├── recentHandlers.ts                        # 5 recent:* channel
│   │   ├── settingsHandlers.ts                      # 4 settings:* channel
│   │   ├── sessionHandlers.ts                       # 3 session:* channel (v5 multi-window)
│   │   ├── windowHandlers.ts                        # 8 window:* channel (newWindow, detachTab)
│   │   ├── appHandlers.ts                           # 4 app:* channel
│   │   ├── dialogHandlers.ts                        # 1 dialog:confirmUnsaved
│   │   ├── shellHandlers.ts                         # 2 shell:* channel
│   │   ├── findHandlers.ts                          # 3 find:* channel
│   │   ├── updateHandlers.ts                        # ⭐ 5 update:* channel
│   │   ├── i18nHandlers.ts                          # ⭐ 2 i18n:* channel
│   │   ├── trayHandlers.ts                          # ⭐ 3 tray:* channel
│   │   └── schemas.ts                               # zod per channel
│   ├── services/                                    # Layanan domain main process
│   │   ├── FileService.ts                           # Orkestrasi baca/tulis atomik, konflik mtime, backup
│   │   ├── FileProvider.ts                          # Interface FileProvider (abstraksi filesystem)
│   │   ├── LocalFsProvider.ts                       # Implementasi default FileProvider untuk filesystem lokal
│   │   ├── RecentFilesService.ts                    # Manajemen recent files (LRU, pinned, TTL)
│   │   ├── SettingsService.ts                       # v4 migrate (locale + updateChannel + tray)
│   │   ├── SessionService.ts                        # v5 migrate (windows[])
│   │   ├── OpenFileRouter.ts                        # Routing pembukaan file dari argv/open-file/protocol
│   │   ├── FileWatcher.ts                           # Wrapper chokidar, debounce 250ms per tab
│   │   ├── ContextMenuService.ts                    # Builder menu native untuk editor/preview/tab
│   │   ├── FileSearchService.ts                     # Pencarian file (glob + regex + timeout + dry-run replace)
│   │   ├── DialogService.ts                         # Wrapper dialog native (mockable untuk e2e)
│   │   ├── UpdateService.ts                         # ⭐ electron-updater + signature verify
│   │   ├── I18nService.ts                           # ⭐ main-process translations (menu, tray)
│   │   ├── TrayService.ts                           # ⭐ tray icon + menu
│   │   └── WindowManager.ts                         # ⭐ multi-window lifecycle + tab transfer
│   ├── utils/                                       # Utilitas main process
│   │   ├── paths.ts                                 # Helper normalisasi dan validasi path
│   │   ├── errors.ts                                # Taxonomy AppError dan kode error
│   │   ├── logger.ts                                # Konfigurasi electron-log dan rotasi
│   │   └── signature.ts                             # ⭐ verify Authenticode/GPG
│   └── types/                                       # Tipe TypeScript main process
│       └── ipc.ts                                   # Tipe payload/response IPC
├── src/                                             # Kode renderer React (sandboxed)
│   ├── main.tsx                                     # Entry point renderer: mount React ke DOM
│   ├── App.tsx                                      # ⭐ hooks top-level, refs editor/preview
│   ├── index.css                                    # Stylesheet global dan custom scrollbar
│   ├── components/                                  # Komponen React UI
│   │   ├── TabBar.tsx                               # Tab bar dengan overflow scroll, drag-reorder, context menu
│   │   ├── TabItem.tsx                              # ⭐ pin icon + drag-out-to-detach
│   │   ├── FindReplaceBar.tsx                       # Bar find/replace non-modal dan collapsible
│   │   ├── FindResultsPanel.tsx                     # Panel hasil find-all-in-tabs
│   │   ├── FindInFilesPanel.tsx                     # Panel hasil find-in-files
│   │   ├── DocumentEditor.tsx                       # Editor textarea (forwardRef, onScroll, onContextMenu)
│   │   ├── DocumentViewer.tsx                       # Preview terformat (forwardRef, zoom, paged, context menu)
│   │   ├── FormattingToolbar.tsx                    # Toolbar format dengan overflow-x auto
│   │   ├── TableOfContents.tsx                      # Sidebar TOC dengan sinkronisasi scroll
│   │   ├── TopNav.tsx                               # Navigasi atas: Save/Open, LanguageSwitcher
│   │   ├── ExportModal.tsx                          # ⭐ opsi PDF Vector/Raster
│   │   ├── ZenReviewModal.tsx                       # Modal Zen Review (fokus menulis)
│   │   ├── CodeScriptModal.tsx                      # Modal ekstraksi code block ke script
│   │   ├── ErrorBoundary.tsx                        # Error boundary React
│   │   ├── RecentFilesMenu.tsx                      # Dropdown recent files
│   │   ├── UnsavedChangesDialog.tsx                 # Dialog konfirmasi unsaved changes
│   │   ├── ConflictDialog.tsx                       # Dialog konflik file eksternal
│   │   ├── RecoveryPrompt.tsx                       # Prompt restore draft setelah crash
│   │   ├── StatusBar.tsx                            # path + dirty + tab count + locale + zoom %
│   │   ├── UpdateBanner.tsx                         # ⭐ "vX available — Restart to Update"
│   │   └── LanguageSwitcher.tsx                     # ⭐ dropdown locale (ID/EN)
│   ├── hooks/                                       # Custom React hooks
│   │   ├── useTabSession.ts                         # Orkestrasi load/save/dirty per tab
│   │   ├── useTabManager.ts                         # Open/close/reorder/pin/activate + keyboard nav
│   │   ├── useTabPersistence.ts                     # Debounce 500ms → session:save
│   │   ├── useFindReplace.ts                        # Find/replace di tab aktif
│   │   ├── useFindInFiles.ts                        # Find-in-files via IPC
│   │   ├── useRecentFiles.ts                        # Sinkronisasi recent files
│   │   ├── useWindowBounds.ts                       # Persistensi ukuran/posisi window
│   │   ├── useKeyboardShortcuts.ts                  # Global keyboard shortcuts
│   │   ├── useScrollSync.ts                         # Auto-scroll + TOC sync
│   │   ├── useContextMenu.ts                        # Trigger native context menu
│   │   ├── useUiStatePersistence.ts                 # Debounce uiStore → settings:set
│   │   ├── useI18n.ts                               # ⭐ wrapper react-i18next + IPC locale
│   │   ├── useUpdate.ts                             # ⭐ update status + install
│   │   └── useMultiWindow.ts                        # ⭐ detach + transfer
│   ├── store/                                       # Zustand stores
│   │   ├── tabStore.ts                              # State tabs, activeTab, dirty, pin, close guard
│   │   ├── uiStore.ts                               # State UI: zoom, paged, viewMode, TOC, dll
│   │   ├── searchStore.ts                           # State find/replace dan hasil
│   │   └── updateStore.ts                           # ⭐ updateState, updateStatus
│   ├── locales/                                     # File terjemahan i18n
│   │   ├── index.ts                                 # ⭐ i18next init + language detector
│   │   ├── en/                                      # Terjemahan bahasa Inggris
│   │   │   ├── common.json                          # String umum
│   │   │   ├── editor.json                          # String editor
│   │   │   ├── find.json                            # String find/replace
│   │   │   ├── tabs.json                            # String tab bar
│   │   │   ├── update.json                          # String update
│   │   │   ├── tray.json                            # String tray
│   │   │   └── errors.json                          # String error
│   │   └── id/                                      # ⭐ mirror en/ dengan terjemahan ID
│   │       └── (7 file .json)                       # 7 file JSON mirror en/ dalam bahasa Indonesia
│   ├── types/                                       # Tipe TypeScript renderer
│   │   ├── document.ts                              # Tipe dokumen Markdown
│   │   ├── state.ts                                 # DocumentTab, FindState, SessionState v5, UIState v4, UpdateState
│   │   ├── electron.d.ts                            # Tipe window.docflow (preload bridge)
│   │   └── window.d.ts                              # Augmentasi tipe Window
│   ├── styles/                                      # Definisi tema
│   │   └── themes.ts                                # 5 tema dokumen (modern, academic, minimal, editorial, legal)
│   └── utils/                                       # Utilitas renderer
│       ├── markdownParser.ts                        # Parser Markdown + heading ID + DOMPurify
│       ├── docExport.ts                             # Export DOCX/HTML/Markdown
│       ├── pdfExport.ts                             # ⭐ pdf-lib vector + jsPDF raster fallback
│       ├── documentStats.ts                         # Statistik dokumen (kata, karakter, dll)
│       ├── clipboard.ts                             # Helper copy Markdown
│       ├── searchRegex.ts                           # ⭐ extended unicode \x{...}
│       ├── formatLocale.ts                          # ⭐ Intl.DateTimeFormat/NumberFormat wrapper
│       ├── languageScripts.ts                       # Ekstraksi code block ke 30+ bahasa
│       └── sampleDocuments.ts                       # Dokumen contoh
├── build/                                           # Aset build dan installer
│   ├── icon.ico                                     # Ikon Windows
│   ├── icon.icns                                    # Ikon macOS (roadmap)
│   ├── icon.png                                     # Ikon Linux
│   ├── tray-16.png                                  # ⭐ ikon tray 16px
│   ├── tray-32.png                                  # ⭐ ikon tray 32px
│   ├── installer.nsh                                # Skrip NSIS untuk file association
│   └── docflow-studio.desktop                       # Desktop entry Linux
├── scripts/                                         # Skrip build dan rilis
│   ├── afterPack.ts                                 # Hook afterPack electron-builder
│   ├── verify-build.ts                              # CSP + no-devtools + i18n missing-keys
│   ├── sign-windows.ps1                             # ⭐ signtool wrapper
│   ├── sign-linux.sh                                # ⭐ gpg wrapper
│   └── gen-update-manifest.ts                       # ⭐ latest.yml generator
├── tests/                                           # Test suite
│   ├── unit/                                        # Unit test (vitest)
│   │   ├── FileService.test.ts                      # Test atomic write dan conflict detection
│   │   ├── RecentFilesService.test.ts               # Test dedup, LRU, prune
│   │   ├── SettingsService.test.ts                  # v3→v4 migrate
│   │   ├── SessionService.test.ts                   # v4→v5 migrate (single → windows[])
│   │   ├── FileSearchService.test.ts                # Test glob, regex, timeout, dry-run
│   │   ├── markdownParser.test.ts                   # Test heading ID unik
│   │   ├── docExport.test.ts                        # Test export DOCX/HTML/MD
│   │   ├── documentStats.test.ts                    # Test statistik dokumen
│   │   ├── searchRegex.test.ts                      # ⭐ extended unicode \x{...}
│   │   ├── UpdateService.test.ts                    # ⭐ mock electron-updater
│   │   ├── I18nService.test.ts                      # ⭐ missing key fallback
│   │   └── WindowManager.test.ts                    # ⭐ detach/transfer logic
│   ├── integration/                                 # Integration test (React Testing Library)
│   │   ├── ipc-file.test.ts                         # Test IPC file open/save
│   │   ├── ipc-recent.test.ts                       # Test IPC recent files
│   │   ├── ipc-session.test.ts                      # Test IPC session
│   │   ├── ipc-find.test.ts                         # Test IPC find/replace
│   │   ├── ipc-update.test.ts                       # ⭐ test update IPC
│   │   ├── open-file-router.test.ts                 # Test routing pembukaan file
│   │   ├── ui-persistence.test.tsx                  # Test persistensi UI state
│   │   ├── tabs.test.tsx                            # Test open/close/reorder/persist tab
│   │   ├── find-replace.test.tsx                    # Test find/replace regex/extended
│   │   ├── i18n.test.tsx                            # ⭐ switch locale → string berubah
│   │   ├── multi-window.test.tsx                    # ⭐ detach → new window, state sync
│   │   ├── tab-pinning.test.tsx                     # ⭐ pinned forced left, tidak close bulk
│   │   ├── hooks-discipline.test.tsx                # Test hooks discipline toggle viewMode
│   │   └── tabs-hooks-discipline.test.tsx           # Test hooks discipline toggle tab
│   └── e2e/                                         # End-to-end test (Playwright)
│       ├── playwright.config.ts                     # Konfigurasi Playwright
│       └── specs/                                   # Spesifikasi e2e
│           ├── launch.spec.ts                       # Smoke test launch
│           ├── open-save.spec.ts                    # Test open/save file
│           ├── file-association.spec.ts             # Test file association
│           ├── recent-files.spec.ts                 # Test recent files
│           ├── toc-sync.spec.ts                     # Test TOC sync
│           ├── auto-scroll.spec.ts                  # Test auto-scroll
│           ├── zoom-paged.spec.ts                   # Test zoom dan paged mode
│           ├── context-menu.spec.ts                 # Test native context menu
│           ├── toolbar-overflow.spec.ts             # Test overflow toolbar
│           ├── tabs.spec.ts                         # Test tab bar e2e
│           ├── find-replace.spec.ts                 # Test find/replace e2e
│           ├── find-in-files.spec.ts                # Test find-in-files e2e
│           ├── view-mode-toggle.spec.ts             # Test toggle viewMode
│           ├── auto-update.spec.ts                  # ⭐ mock feed
│           ├── i18n.spec.ts                         # ⭐ switch locale end-to-end
│           ├── tray.spec.ts                         # ⭐ tray click → menu
│           ├── multi-window.spec.ts                 # ⭐ detach → new window
│           └── tab-pinning.spec.ts                  # ⭐ test tab pinning
└── .github/                                         # Konfigurasi GitHub
    └── workflows/                                   # GitHub Actions workflows
        └── release.yml                            # matrix build + signing + latest.yml + upload
```

Semua baris kini memiliki komentar deskriptif. Komentar dengan tanda ⭐ menandai fitur baru/upgrade v1.6.

± **128 file** source, ± **24.000 LOC** (termasuk test & config & locales).

---

## 9. Environment Variables / Konfigurasi

```bash
# ── Core ──
DOCFLOW_USER_DATA_DIR=
DOCFLOW_LOG_LEVEL=info
DOCFLOW_LOG_MAX_FILES=10
DOCFLOW_LOG_MAX_SIZE_MB=20

# ── Files ──
DOCFLOW_MAX_FILE_SIZE_MB=50
DOCFLOW_ENCODING=utf-8
DOCFLOW_WATCH_DEBOUNCE_MS=250
DOCFLOW_AUTOSAVE_DEBOUNCE_MS=1500
DOCFLOW_RECOVERY_INTERVAL_MS=5000

# ── Tabs ──
DOCFLOW_MAX_TABS=30
DOCFLOW_TAB_REOPEN_STACK=10

# ── Find ──
DOCFLOW_FIND_HISTORY_MAX=20
DOCFLOW_FIND_MAX_RESULTS=10000
DOCFLOW_FIND_IN_FILES_MAX_FILE_SIZE_MB=5
DOCFLOW_FIND_IN_FILES_TIMEOUT_MS=5000
DOCFLOW_FIND_GLOB_DEFAULT='**/*.{md,markdown,txt}'

# ── Recent ──
DOCFLOW_RECENT_MAX=20
DOCFLOW_RECENT_TTL_DAYS=90

# ── UI Defaults ──
DOCFLOW_DEFAULT_ZOOM=100
DOCFLOW_DEFAULT_PAGED_MODE=true
DOCFLOW_DEFAULT_AUTOSCROLL=false
DOCFLOW_DEFAULT_SYNC_TOC=true

# ── i18n (v1.6) ──
DOCFLOW_DEFAULT_LOCALE=auto               # auto | id | en
DOCFLOW_LOCALES=en,id                     # daftar locale yang di-bundle

# ── Update (v1.6) ──
DOCFLOW_UPDATE_CHANNEL=stable             # stable | beta
DOCFLOW_UPDATE_FEED_URL=https://releases.docflow.app/updates
DOCFLOW_UPDATE_CHECK_DELAY_MS=30000       # 30s setelah launch
DOCFLOW_UPDATE_CHECK_INTERVAL_MS=3600000  # 1 jam
DOCFLOW_UPDATE_REQUIRE_SIGNATURE=true     # JANGAN false di production

# ── Tray (v1.6) ──
DOCFLOW_TRAY_ENABLED=true
DOCFLOW_TRAY_MINIMIZE_ON_CLOSE=false      # default false (perilaku standar)
DOCFLOW_TRAY_START_MINIMIZED=false

# ── Multi-Window (v1.6) ──
DOCFLOW_MAX_WINDOWS=5

# ── Security ──
DOCFLOW_CSP_ENABLED=true
DOCFLOW_ALLOWED_EXTERNAL=*.wikipedia.org,*.github.com
DOCFLOW_DEVTOOLS_ENABLED=false
DOCFLOW_E2E_MODE=false

# ── CI Signing (tidak dibaca runtime, hanya CI) ──
# WINDOWS_CERT_PFX_BASE64=...        (secret)
# WINDOWS_CERT_PASSWORD=...          (secret)
# LINUX_GPG_PRIVATE_KEY_BASE64=...   (secret)
# LINUX_GPG_PASSPHRASE=...           (secret)
```

`{userData}/settings.json` (unified, **schemaVersion 4** — naik dari v3 karena locale + update + tray):

```jsonc
{
  "schemaVersion": 4,
  "theme": "modern",
  "fontSize": "md",
  "fontFamily": "sans",
  "pageSize": "A4",
  "marginSize": "normal",
  "paperTone": "white",
  "showHeaderFooter": true,
  "showPageNumbers": true,
  "autoNumberHeadings": false,
  "justifyText": false,
  "windowBounds": { "width": 1400, "height": 900, "x": null, "y": null },
  "lastOpenedDir": null,
  "lastExportDir": null,
  "locale": "auto",                            // ⭐ v1.6: auto | id | en
  "updateChannel": "stable",                   // ⭐ v1.6: stable | beta
  "autoCheckUpdates": true,                    // ⭐ v1.6
  "tray": {                                    // ⭐ v1.6
    "enabled": true,
    "minimizeOnClose": false,
    "startMinimized": false
  },
  "uiState": {
    "zoomLevel": 100,
    "isPagedMode": true,
    "autoScroll": false,
    "syncScrollWithToc": true,
    "viewMode": "split",
    "isTocVisible": true,
    "tocWidth": 280,
    "toolbarScrollLeft": 0
  }
}
```

`{userData}/session.json` (unified, **schemaVersion 5** — multi-window):

```jsonc
{
  "schemaVersion": 5,
  "windows": [
    {
      "id": "uuid-v4",
      "bounds": { "width": 1400, "height": 900, "x": 100, "y": 100 },
      "tabs": [
        {
          "id": "uuid-v4",
          "filePath": "/home/user/docs/README.md",
          "displayName": "README.md",
          "fileContent": "...",
          "encoding": "utf-8",
          "lineEnding": "lf",
          "isPinned": true,
          "editorScrollTop": 0,
          "previewScrollTop": 0,
          "cursorOffset": 0,
          "selectionEnd": 0,
          "diskMtimeAtSave": 1730000000000
        }
      ],
      "activeTabId": "uuid-v4"
    }
  ],
  "activeWindowId": "uuid-v4",
  "findHistory": ["foo", "bar", "^#{1,3}\\s+"],
  "findOptions": {
    "matchCase": false,
    "matchWholeWord": false,
    "mode": "normal",
    "dotMatchesNewline": false,
    "wrapAround": true,
    "inSelection": false,
    "backward": false,
    "extendedUnicode": true                     // ⭐ v1.6: enable \x{...}
  }
}
```

**Aturan migrasi:**
- `session.schemaVersion` v4 (tabs[]) → v5 (`windows[]` dengan 1 window). Migrasi di `SessionService.migrate`.
- `settings.schemaVersion` v3 → v4 menambahkan `locale`, `updateChannel`, `autoCheckUpdates`, `tray`. Migrasi di `SettingsService.migrate`.
- Env var divalidasi sebelum `app.whenReady()`; invalid → `dialog.showErrorBox` + `app.exit(1)`.
- **`savedContent` TIDAK di-persist** — di-reload dari disk saat restore.

---

## 10. State Model (unified)

```typescript
// src/types/state.ts — shared main + renderer
export interface DocumentTab {
  id: string;
  filePath: string | null;
  displayName: string;
  fileContent: string;
  savedContent: string;          // runtime only
  diskMtime: number | null;
  dirty: boolean;
  encoding: 'utf-8' | 'utf-8-bom' | 'utf-16le';
  lineEnding: 'lf' | 'crlf' | 'cr';
  isPinned: boolean;             // ⭐ v1.6: pinned dipaksa kiri, close guard
  editorScrollTop: number;
  previewScrollTop: number;
  cursorOffset: number;
  selectionEnd: number;
}

export interface WindowState {
  id: string;                    // ⭐ v1.6
  bounds: { width: number; height: number; x: number | null; y: number | null };
  tabs: DocumentTab[];
  activeTabId: string | null;
}

export interface FindState {
  query: string;
  replaceWith: string;
  matchCase: boolean;
  matchWholeWord: boolean;
  mode: 'normal' | 'extended' | 'regex';
  dotMatchesNewline: boolean;
  wrapAround: boolean;
  backward: boolean;
  inSelection: boolean;
  extendedUnicode: boolean;      // ⭐ v1.6: \x{...} support
  isOpen: boolean;
  history: string[];
}

export interface FindResult {
  tabId?: string;
  filePath: string;
  lineNumber: number;
  columnStart: number;
  columnEnd: number;
  preview: string;
}

export interface UIState {
  zoomLevel: number;
  isPagedMode: boolean;
  autoScroll: boolean;
  syncScrollWithToc: boolean;
  viewMode: 'editor' | 'split' | 'preview';
  isTocVisible: boolean;
  tocWidth: number;
  toolbarScrollLeft: number;
}

export interface UpdateState {           // ⭐ v1.6
  status: 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error';
  availableVersion: string | null;
  downloadProgress: number;       // 0–100
  releaseNotes: string | null;
  lastCheckedAt: number | null;
  channel: 'stable' | 'beta';
}

export interface TrayConfig {            // ⭐ v1.6
  enabled: boolean;
  minimizeOnClose: boolean;
  startMinimized: boolean;
}

export interface SessionState {
  schemaVersion: 5;
  windows: WindowState[];
  activeWindowId: string | null;
  findHistory: string[];
  findOptions: Omit<FindState, 'query' | 'replaceWith' | 'isOpen' | 'history'>;
}

export interface AppSettings {
  schemaVersion: 4;
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
  locale: 'auto' | 'id' | 'en';             // ⭐ v1.6
  updateChannel: 'stable' | 'beta';         // ⭐ v1.6
  autoCheckUpdates: boolean;                // ⭐ v1.6
  tray: TrayConfig;                         // ⭐ v1.6
  uiState: UIState;
}
```

**Kunci integritas:**

| Kunci | File/Store | Menjamin |
| :--- | :--- | :--- |
| `tab.id` UNIQUE | `tabStore` | Identitas stabil untuk reorder |
| `tab.filePath` UNIQUE di tiap `window.tabs[]` | `tabStore` | Tidak ada duplikat file per window |
| `activeTabId ∈ window.tabs[].id` | `tabStore` | Tab aktif valid |
| `tabs.length ≤ DOCFLOW_MAX_TABS` (30) | runtime | Anti DoS |
| `windows.length ≤ DOCFLOW_MAX_WINDOWS` (5) | `WindowManager` | Anti DoS multi-window |
| `tab.dirty === (tab.fileContent !== tab.savedContent)` | runtime | Invariant dirty per tab |
| `pinned tabs` selalu di depan non-pinned | `tabStore.moveTab` | Ordering invariant |
| `recent.path` UNIQUE | `recent.json` | Tidak ada duplikat |
| `recent` max 20 | `recent.json` | LRU eviction |
| `settings.schemaVersion` = 4 monotonic | `settings.json` | Gate migrasi |
| `session.schemaVersion` = 5 monotonic | `session.json` | Gate migrasi windows |
| `update.status === 'ready'` → `availableVersion != null` | `updateStore` | Consistency |
| `update.status === 'downloading'` → `downloadProgress ∈ [0,100]` | `updateStore` | Validasi zod |
| `settings.locale ∈ {auto, id, en}` | `settings.json` | Validasi zod |
| `findState.mode ∈ {normal, extended, regex}` | runtime | Validasi zod |
| `path.startsWith(userHome)` OR user pick | runtime | Anti path traversal |
| **Hooks count stabil per komponen** | runtime | Tidak ada hook kondisional |
| **Semua key `en/*.json` ada di `id/*.json`** | `i18next-parser` | i18n parity |

---

## 11. Service Layer (unified)

### 11.1 `FileProvider` interface

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
| `SettingsService.ts` | Baca/tulis `settings.json`, **migrate v3→v4 (locale + update + tray)**. |
| `SessionService.ts` | Draft recovery 5s, restore multi-tab, **migrate v4→v5 (single window → windows[])**. |
| `OpenFileRouter.ts` | Normalisasi `argv`, `open-file` event, `app://` protocol. |
| `FileWatcher.ts` | Wrapper `chokidar` debounce 250ms; emit per tab via `tabId`. |
| `ContextMenuService.ts` | Build native menu (editor/preview/tab). |
| `FileSearchService.ts` | glob (`fast-glob`) + readFile + regex/replace + dry-run + timeout. |
| `DialogService.ts` | Bungkus dialog native; mockable di e2e. |
| **`UpdateService.ts`** | **`electron-updater` orchestration: check, download, install, signature verify, channel switch, staged rollout.** |
| **`I18nService.ts`** | **Main-process translations (menu, tray, dialog labels); locale switch broadcast ke semua window.** |
| **`TrayService.ts`** | **Tray icon lifecycle, menu (i18n-aware), click behavior, minimize-to-tray.** |
| **`WindowManager.ts`** | **Multi-window lifecycle (create/destroy), tab transfer, session v5 coordination.** |
| `tabStore.ts` (zustand) | Tabs, activeTab, open/close/reorder/**pin**/save, close guard. |
| `uiStore.ts` (zustand) | `zoomLevel`, `isPagedMode`, `autoScroll`, `syncScrollWithToc`, `viewMode`, `isTocVisible`, `tocWidth`. |
| `searchStore.ts` (zustand) | findState, findResults, findInFilesState, history. |
| **`updateStore.ts`** | **`UpdateState`: status, availableVersion, progress, releaseNotes.** |
| `useScrollSync.ts` | Auto-scroll + TOC sync. |
| `useTabSession.ts` | Load/save/dirty orchestration per tab. |
| `useTabManager.ts` | Open/close/reorder/**pin**/activate + keyboard nav + reopen stack. |
| `useTabPersistence.ts` | Debounce 500ms → `session:save`. |
| `useFindReplace.ts` | Find/replace di tab aktif (normal/extended/**extended-unicode**/regex). |
| `useFindInFiles.ts` | Find-in-files (IPC + streaming results). |
| `useContextMenu.ts` | Menangkap `onContextMenu`, kirim IPC `app:showContextMenu`. |
| `useUiStatePersistence.ts` | Debounce 500ms → `settings:set`. |
| **`useI18n.ts`** | **Wrapper `react-i18next` + IPC `i18n:setLocale` + listen `i18n:localeChanged`.** |
| **`useUpdate.ts`** | **Baca `updateStore`, trigger manual check, install.** |
| **`useMultiWindow.ts`** | **Detach tab, transfer tab, listen `window:tabTransferred`.** |

### 11.3 Pipeline: Save dengan konflik (per tab)

```text
tabStore.saveTab(activeTabId)
  → IPC file:save({path, content, expectedMtime})
    → zod.parse
    → FileService.write(path, content, {expectedMtime})
        → canHandle? else FILE_UNSUPPORTED
        → fs.stat → diskMtime
        → if expectedMtime != null && diskMtime != expectedMtime → { conflict:true, diskMtime }
        → write `${path}.tmp` → fs.rename → fsync(dir)
        → { ok:true, mtime }
  → onConflict? ConflictDialog (Overwrite/Reload/Save As) — per tab
  → onSuccess: tab.savedContent:=content; tab.dirty:=false; session:save debounced; recent:add
```

### 11.4 Pipeline: Find in Files

```text
searchStore.openFindInFiles()
  → user pick directory + glob default '**/*.{md,markdown,txt}'
  → IPC find:inFiles({rootDir, glob, query, opts})
    → zod.parse
    → FileSearchService.search():
        → fast-glob(rootDir, {ignore: node_modules, dot:false})
        → for each file (max 5MB, max 10.000 hasil):
            → readFile
            → buildRegExp(query, opts)   // normal/extended/extended-unicode/regex
            → for each match: push { path, lineNumber, columnStart, columnEnd, preview }
            → timeout per file 5s → skip with warning
    → { results, truncated }
  → searchStore.setFindResults(results)
  → FindInFilesPanel render → klik → tabStore.openTab(path) + scroll
```

### 11.5 Pipeline: Replace in Files (dry-run)

```text
IPC find:replaceInFiles({rootDir, glob, query, replaceWith, opts, dryRun:true})
  → FileSearchService.replaceAll() returns { changes: [{path, count, diff}] }
  → UI: dialog konfirmasi (menampilkan diff ringkas)
  → IPC find:replaceInFiles({..., dryRun:false})
    → for each file: atomic write (`.tmp` → `rename` → `fsync`)
```

### 11.6 Pipeline: Native Context Menu (editor/preview/tab)

```text
User right-click di Editor/Preview/Tab
  → onContextMenu={(e)} → e.preventDefault()
  → useContextMenu(type, payload)   // type: 'editor' | 'preview' | 'tab'
    → IPC app:showContextMenu({ type, x, y, hasSelection, isEditable, tabId? })
      → Main Process: ContextMenuService.buildTemplate() (i18n-aware labels)
      → Menu.popup({ window })
        → Eksekusi aksi native (clipboard.copy, tab close, dst)
```

### 11.7 Pipeline: Auto-Update

```text
Main process boot → 30s delay → UpdateService.scheduleCheck()
  → electron-updater.autoUpdater.checkForUpdates()
    → fetch https://releases.docflow.app/updates/stable/latest.yml
    → verify signature (Authenticode/GPG) pada artifact
    → if version > current: emit 'update-available' → broadcast `update:status`
      → renderer: updateStore.setState({status:'available', availableVersion})
      → UpdateBanner muncul
  → user klik "Restart to Update":
    → IPC update:install
    → electron-updater.quitAndInstall()
```

### 11.8 Pipeline: i18n Switch

```text
User: View → Language → English
  → IPC i18n:setLocale('en')
    → I18nService.setLocale('en')
    → settings:set({locale:'en'}) (debounced)
    → broadcast `i18n:localeChanged` ke semua window
  → renderer: useI18n() mendengar event → i18next.changeLanguage('en')
    → re-render semua komponen (string berubah)
  → main: rebuild menu dengan label EN; rebuild tray menu
```

### 11.9 Pipeline: Detach Tab (Multi-Window)

```text
User: drag tab keluar dari TabBar / menu tab → "Move to New Window"
  → useMultiWindow.detachTab(tabId)
  → IPC window:detachTab({tabId, sourceWindowId})
    → WindowManager.createWindow({initialTab: tabId})
      → remove tab dari source window's tabStore (via renderer event)
      → new BrowserWindow (shared preload)
      → tabStore.hydrate([tab], activeTabId)
      → session:save (debounced)
  → WindowManager broadcast `window:tabTransferred` ke semua window
  → source window re-render tanpa tab tersebut
```

### 11.10 Scheduler

| Task | Jadwal | Aksi |
| :--- | :--- | :--- |
| Draft autosave | debounce 1.5s idle | `session:save` |
| Draft recovery flush | tiap 5s saat dirty | `session:save` |
| Tab persistence | debounce 500ms | `session:save` |
| Recent prune | launch + `recent:add` | buang > 90 hari, cap 20 |
| Watcher reconcile | debounce 250ms | `file:changed` (per tabId) |
| Settings save | debounce 500ms | atomic write |
| Find-in-files timeout | per file 5s | skip + warn |
| **Update check** | **launch+30s, lalu tiap 1 jam (configurable)** | **`UpdateService.checkForUpdates`** |
| **Locale broadcast** | **saat `i18n:setLocale`** | **`i18n:localeChanged`** |
| Log rotation | on write > 20MB | rotate 10 file |

---

## 12. Routes & API / Entry Points (unified)

**IPC channels (52):**

| Grup | Channel |
| :--- | :--- |
| `file:*` (12) | `open`, `openPath`, `save`, `saveAs`, `saveDialog`, `info`, `exists`, `read`, `readBinary`, `writeBinary`, `watch`, `unwatch` |
| `recent:*` (5) | `list`, `add`, `remove`, `clear`, `pin` |
| `settings:*` (4) | `get`, `set`, `all`, `reset` |
| `session:*` (3) | `save`, `load`, `clear` (multi-window state bundled) |
| `window:*` (8) | `title`, `dirty`, `minimize`, `maximize`, `close`, `state`, **`newWindow`**, **`detachTab`** |
| `app:*` (4) | `version`, `platform`, `openFile`, `showContextMenu` |
| `dialog:*` (1) | `confirmUnsaved` |
| `shell:*` (2) | `showItemInFolder`, `openExternal` |
| `find:*` (3) | `inFiles`, `replaceInFiles`, `cancel` |
| **`update:*` (5)** | **`check`, `download`, `install`, `status`, `cancel`** |
| **`i18n:*` (2)** | **`getLocale`, `setLocale`** |
| **`tray:*` (3)** | **`show`, `hide`, `setTooltip`** |

**Non-IPC entry points (renderer-local):**

| Entry | Fungsi |
| :--- | :--- |
| **TOC Click** | `TableOfContents` → `useScrollSync` |
| **Zoom —/%/+ / Fit / Reset** | `FormattingToolbar` → `uiStore.setZoomLevel` |
| **Paged↔Continuous** | `FormattingToolbar` → `uiStore.togglePagedMode` |
| **Auto-scroll toggle** | `FormattingToolbar` → `uiStore.toggleAutoScroll` |
| **TOC Sync toggle** | `FormattingToolbar` → `uiStore.toggleSyncScrollWithToc` |
| **Copy MD** | `FormattingToolbar` → `navigator.clipboard.writeText(buffer)` |
| **Right-click Editor/Preview/Tab** | `useContextMenu` → IPC `app:showContextMenu` |
| **Theme/Font/Size/Page/Margin** | `FormattingToolbar` → `settings:set` (debounced) |
| **Toggle ViewMode / TOC** | `FormattingToolbar` → `uiStore.setViewMode` / `toggleToc` |
| **Tab activate/close/reorder/pin/detach** | `TabBar` / `TabItem` → `tabStore.*` / `useMultiWindow.detachTab` |
| **Find bar open** | `Ctrl+F` → `searchStore.openFind()` |
| **Find next/prev** | `Enter`/`Shift+Enter`/`F3`/`Shift+F3` → `useFindReplace` |
| **Find in Files** | `Ctrl+Shift+F` → `searchStore.openFindInFiles()` |
| **Pin toggle** | **`Ctrl+Shift+P`** → `tabStore.togglePin(activeTabId)` |
| **Language switch** | `LanguageSwitcher` / menu View → `i18n:setLocale` |
| **Check update** | menu Help → `update:check` |
| **Tray click** | OS → main `TrayService` → toggle window visibility |

**Rate limits:**
- `file:*` write: ≥300ms antar call per path.
- `settings:set`: debounce 500ms.
- `session:save`: debounce 500ms, hard-cap 4/detik.
- `recent:add`: max 10/detik.
- `window:dirty`: debounce 50ms.
- `shell:openExternal`: 1 per 500ms.
- `app:showContextMenu`: max 5/detik.
- `find:inFiles`: max 1 call / 500ms; `find:replaceInFiles` wajib dry-run dulu.
- **`update:check`: max 1 / 60s; `update:install` max 1 / 10s (mencegah double-click).**
- **`i18n:setLocale`: max 2 / detik.**
- **`window:newWindow` / `window:detachTab`: max 1 / detik (menghindari spam window).**
- **`tray:*`: max 5 / detik.**

---

## 13. Core Flows (unified)

### 13.1 Open dari OS association (per tab)
1. Dbl-click `laporan.md` → OS launch `docflow-studio "laporan.md"`.
2. `app.requestSingleInstanceLock()` false → `second-instance` → instance 2 quit.
3. `OpenFileRouter.extractPathsFromArgv` → `FileService.read` → `app:open-file` → `tabStore.openTab(path)` (dedup by path) → `recent:add`.

### 13.2 Save-in-place dengan konflik
1. Ctrl+S → `tabStore.saveTab(activeTabId)` → jika `filePath === null` → Save As.
2. IPC `file:save` → `FileService` cek mtime.
3. Konflik → `ConflictDialog` Overwrite/Reload/Save As.
4. Sukses → atomic write → `savedContent := content` → toast → `session:clear` (per tab) → `recent:add`.

### 13.3 TOC Sync Scroll
1. Klik heading di `TableOfContents` → `useScrollSync.handleTocClick(item)`.
2. Jika `ui.syncScrollWithToc === false` → abaikan.
3. Preview: `scrollIntoView({ behavior:'smooth' })`. Editor: `scrollTop := (lineNumber-1)*lineHeight`.

### 13.4 Toolbar UI & Zoom
1. Klik `+`/`—` atau ubah Paged↔Continuous.
2. `FormattingToolbar` → `uiStore.setXxx`.
3. `DocumentViewer` bereaksi via `transform: scale()`.
4. `useUiStatePersistence` debounce 500ms → `settings:set`.

### 13.5 Auto-scroll Ketikan
1. User mengetik, `onScroll` di textarea.
2. Jika `ui.autoScroll` ON → hitung persentase `scrollTop / (scrollHeight - clientHeight)` → set `preview.scrollTop` proporsional.

### 13.6 Close window dengan unsaved (multi-tab)
1. X / Alt+F4 → `window.on('close')` → cek semua `tab.dirty` di window tsb.
2. Jika ada dirty → `dialog:confirmUnsaved` (Save All / Discard All / Cancel).
3. Jika `tray.minimizeOnClose` ON dan window bukan terakhir → sembunyikan.
4. Jika window terakhir + `tray.minimizeOnClose` ON → sembunyikan (app tetap di tray).
5. Jika window terakhir + minimize disabled → quit app.

### 13.7 Crash recovery (multi-tab)
1. Tiap 5s saat dirty → `SessionService.write` semua tab.
2. Crash → launch → `SessionService.read` (v5) → `RecoveryPrompt` Restore All/Discard All/Open Original per tab.
3. Jika `diskMtime` mismatch saat restore → prompt Reload / Keep Draft per tab.

### 13.8 Toggle viewMode (regression X1)
1. User klik Editor Only → `viewMode='editor'` → `DocumentViewer` unmount.
2. Karena `useUIStore()` + `useTabStore()` sudah top-level di `App.tsx`, hook count stabil.
3. Ulangi Split / Preview / Editor × 5 → stabil.

### 13.9 Context Menu (editor/preview/tab)
1. Right-click → `useContextMenu(type)` → IPC `app:showContextMenu`.
2. `ContextMenuService` build menu sesuai tipe (label dari `I18nService`).
3. Menu native muncul, aksi dieksekusi OS/Electron.

### 13.10 Toolbar Overflow & Full UI Persistence
1. Resize window → `FormattingToolbar` + `TabBar` scrollable.
2. `uiStore` menyimpan `toolbarScrollLeft` dan `tocWidth`.
3. `useUiStatePersistence` debounce 500ms → `settings:set`.

### 13.11 Open in New Tab
- Ctrl+O → dialog → `file:open` → `tabStore.openTab(path)`.
- Jika `path` sudah ada di window tsb → **fokus tab itu**.
- Jika `tabs.length === MAX_TABS` → toast error.

### 13.12 Close Tab dengan Guard + Pinning
- `Ctrl+W` / `×` / middle-click → `tabStore.closeTab(id)`.
- Jika `tab.isPinned` → `dialog:confirmUnsaved` **Pinned** (Unpin & Close / Cancel).
- Jika `tab.dirty` → `dialog:confirmUnsaved` → Save / Discard / Cancel.
- Setelah close → `activeTabId` = tab terdekat (previous atau next).
- **"Close Others" / "Close to Right" / "Close to Left" melewati pinned tabs**.

### 13.13 Tab Drag-Reorder + Pin Ordering
- Drag via `@dnd-kit` → `tabStore.moveTab(from, to)`.
- **Pinned tabs selalu di kiri**: `moveTab` menolak memindahkan pinned tab melewati non-pinned, dan sebaliknya.
- `useTabPersistence` debounce 500ms → `session:save`.

### 13.14 Tab Context Menu
- Right-click tab → `useContextMenu('tab')` → native menu.
- Aksi: Close, Close Others, Close to Right, Close to Left, **Pin/Unpin**, Copy Full Path, Reveal in Folder, **Move to New Window**.

### 13.15 Find & Replace (Tab Aktif)
1. `Ctrl+F` → `searchStore.openFind()`.
2. `Enter` → cari next di `activeTab.fileContent` → sorot + scroll.
3. `Replace` / `Replace All` → `tabStore.setBuffer(activeTabId, ...)` → mark dirty.
4. Mode normal/extended/**extended-unicode**/regex; invalid → toast.

### 13.16 Find All in All Open Tabs
- Iterasi `tabStore.tabs[]` di window aktif → grouped by tab di `FindResultsPanel`.
- Klik hasil → `tabStore.activateTab(tabId)` + `scrollIntoView` + `setSelectionRange`.

### 13.17 Find in Files
1. `Ctrl+Shift+F` → user pilih folder + glob → IPC `find:inFiles`.
2. `FileSearchService` glob + read + regex (max 5 MB/file, 10.000 hasil, timeout 5s/file).
3. Hasil ke `findInFilesState` → `FindInFilesPanel` render.
4. Klik hasil → `tabStore.openTab(file)` + scroll.

### 13.18 Replace in Files (dry-run)
1. `Ctrl+Shift+F` panel → tombol "Replace in Files" → IPC dry-run.
2. `FileSearchService.replaceAll({dryRun:true})` → list `{path, count, diff}`.
3. Dialog konfirmasi tampilkan diff ringkas → konfirmasi → dry-run:false → atomic write.

### 13.19 Restore Session dengan Tabs & Multi-Window (v1.6)
1. Launch → `session:load` (v5) → filter tabs: buang tab non-dirty tanpa path.
2. Untuk setiap `windows[]` → `WindowManager.createWindow({bounds, tabs, activeTabId})`.
3. Jika `windows.length === 0` → single empty window.
4. `session.schemaVersion === 4` → migrasi ke v5 (single window).
5. Jika file di disk berubah → prompt Reload / Keep Draft per tab.

### 13.20 Auto-Update Flow (v1.6)
1. Launch + 30s → `UpdateService.checkForUpdates()`.
2. `electron-updater` fetch feed → signature verify.
3. Jika ada: broadcast `update:status` → `UpdateBanner` muncul.
4. User klik "Restart to Update" → `update:install` → `quitAndInstall`.
5. Update terpasang → launch ulang → `about` menampilkan versi baru.

### 13.21 Locale Switch (v1.6)
1. Menu View → Language → English / Indonesia / Auto.
2. `i18n:setLocale` → `I18nService.setLocale` → broadcast ke semua window.
3. `useI18n()` mendengar → `i18next.changeLanguage` → re-render.
4. Menu native & tray menu di-rebuild dengan label locale baru.
5. `settings:set` menyimpan locale.

### 13.22 Tray (v1.6)
1. App launch → `TrayService.create()` → icon di tray.
2. Klik kiri → toggle window visibility.
3. Klik kanan → menu (Show/Hide, New Tab, Recent, Check for Updates, Quit).
4. Minimize-to-tray ON → window close → hide, app tetap di tray.
5. Quit dari tray → semua window close + app quit.

### 13.23 Detach Tab (v1.6)
1. Drag tab keluar tab bar (drop zone = screen edge / outside window).
2. `useMultiWindow.detachTab(tabId)` → IPC `window:detachTab`.
3. `WindowManager.createWindow` → new BrowserWindow dengan tab tsb.
4. Tab dihapus dari source window; `session:save` debounce.
5. Broadcast `window:tabTransferred` → semua window re-render.

---

## 14. UI / Views (unified)

| View | Sumber | Catatan |
| :--- | :--- | :--- |
| `App.tsx` | `src/App.tsx` | **⭐ `useUIStore()`, `useTabStore()`, `useSearchStore()`, `useUpdateStore()`, `useI18n()`, `useUpdate()` di top-level**; refs; `useTabManager`, `useKeyboardShortcuts`. |
| `FormattingToolbar` | `FormattingToolbar.tsx` | Lengkap + `overflow-x-auto custom-scrollbar`. |
| `TabBar` | `TabBar.tsx` | **⭐ `overflow-x-auto` + `mask-image`; `@dnd-kit` sortable + drag-out-to-detach; `useContextMenu('tab')` top-level; pinned order enforced.** |
| `TabItem` | `TabItem.tsx` | **⭐ title, dirty `•`, close `×`, pin icon 📌 (jika `isPinned`), middle-click close.** |
| `FindReplaceBar` | `FindReplaceBar.tsx` | non-modal, collapsible; history dropdown; **`extendedUnicode` toggle**. |
| `FindResultsPanel` | `FindResultsPanel.tsx` | grouped by tab; klik → activate tab. |
| `FindInFilesPanel` | `FindInFilesPanel.tsx` | grouped by file; tombol Replace in Files (dry-run). |
| `DocumentEditor` | `DocumentEditor.tsx` | `forwardRef`; `onScroll`; `onContextMenu`. |
| `DocumentViewer` | `DocumentViewer.tsx` | `forwardRef`; props `zoomLevel`, `isPagedMode`; `onContextMenu`. |
| `TableOfContents` | `TableOfContents.tsx` | `useUIStore()` top-level; resizable width. |
| `TopNav` | `TopNav.tsx` | Tombol Save/Open; **`LanguageSwitcher`**. |
| `ExportModal` | `ExportModal.tsx` | **⭐ opsi PDF Vector (selectable) vs Raster (print quality)**. |
| `ZenReviewModal` | `ZenReviewModal.tsx` | Tidak berubah. |
| `CodeScriptModal` | `CodeScriptModal.tsx` | Tidak berubah. |
| `RecentFilesMenu` | — | Dropdown; sinkron native menu Open Recent. |
| `UnsavedChangesDialog` | — | Save/Discard/Cancel **per tab + Save All/Discard All**. |
| `ConflictDialog` | — | Overwrite/Reload/Save As. |
| `RecoveryPrompt` | — | Restore All/Discard All/Open Original per tab. |
| `StatusBar` | — | path + dirty • + **tab count + window count + locale** + encoding + lineEnding + cursor + zoom %. |
| **`UpdateBanner`** | **`UpdateBanner.tsx`** | **⭐ "vX.Y.Z available — Restart to Update / Later / Skip this version".** |
| **`LanguageSwitcher`** | **`LanguageSwitcher.tsx`** | **⭐ dropdown ID / EN / Auto.** |
| `ErrorBoundary` | — | Bungkus top-level view. |
| Native Menu | `electron/menu.ts` | File/Edit/View/Window/Help; **View → Language**; **Help → Check for Updates**. |
| Tray Menu | `TrayService.ts` | Show Window, New Tab, Recent Files →, Check for Updates, Quit. |

### 14.1 Catatan implementasi hooks & UI (wajib)

**`App.tsx`**
```tsx
export default function App() {
  const uiState = useUIStore();               // ✅ top-level
  const tabState = useTabStore();             // ✅ top-level
  const search = useSearchStore();            // ✅ top-level
  const update = useUpdateStore();            // ✅ top-level (v1.6)
  const { locale } = useI18n();               // ✅ top-level (v1.6)
  const { editorRef, previewRef } = useScrollSync();
  useTabManager();
  useKeyboardShortcuts();
  useUpdate();                                // ✅ v1.6 (subscribe status)
  const activeTab = tabState.tabs.find(t => t.id === tabState.activeTabId) ?? null;

  return (
    <>
      <FormattingToolbar />
      <UpdateBanner status={update.status} version={update.availableVersion} />
      <FindReplaceBar />
      <TabBar />
      {activeTab && uiState.viewMode !== 'editor' && (
        <DocumentViewer
          ref={previewRef}
          zoomLevel={uiState.zoomLevel}
          isPagedMode={uiState.isPagedMode}
          locale={locale}
        />
      )}
      <FindResultsPanel />
      <FindInFilesPanel />
    </>
  );
}
```

**`TabBar.tsx`**
```tsx
export function TabBar() {
  const tabs = useTabStore(s => s.tabs);       // ✅ top-level
  const activeId = useTabStore(s => s.activeTabId);
  const { handleContextMenu } = useContextMenu('tab');  // ✅ top-level
  const { t } = useI18n();                     // ✅ top-level

  return (
    <div className="flex overflow-x-auto custom-scrollbar mask-fade whitespace-nowrap">
      {tabs.map(tab => (
        <TabItem key={tab.id} tab={tab} isActive={tab.id === activeId}
                 onContextMenu={handleContextMenu} label={t('tabs.item')} />
      ))}
    </div>
  );
}
```

**`FindReplaceBar.tsx`**
```tsx
export function FindReplaceBar() {
  const search = useSearchStore();             // ✅ top-level
  const { findNext, findPrev, replaceOne, replaceAll } = useFindReplace();
  const { t } = useI18n();                     // ✅ top-level
  if (!search.isOpen) return null;             // ⚠️ early return SETELAH semua hook
  return ( /* ... */ );
}
```

**`UpdateBanner.tsx`**
```tsx
export function UpdateBanner({ status, version }: { status: UpdateStatus; version: string | null }) {
  const { t } = useI18n();                     // ✅ top-level
  const { install } = useUpdate();             // ✅ top-level
  if (status !== 'available' && status !== 'ready') return null;  // setelah hook
  return ( /* ... */ );
}
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
| CSP | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://releases.docflow.app`. |
| External links | `shell.openExternal` whitelist host. |
| File size DoS | Hard-reject > 50 MB. |
| Find-in-files DoS | max 5 MB/file, 10.000 hasil, timeout 5s/file, reject symlink. |
| Regex ReDoS | timeout per file; input regex validasi dulu; no catastrophic backtracking warning. |
| Atomic write | `.tmp` → `rename` → `fsync(dir)`. |
| Bulk replace safety | Wajib `dryRun:true` dulu; diff preview; atomic write per file. |
| External edit race | `expectedMtime` compare + `ConflictDialog` **per tab**. |
| DOM sync safety | Jika `elementId`/slug tidak ditemukan → noop. |
| Native Context Menu safety | Cut/Paste hanya jika `isEditable`; sanitasi input clipboard. |
| Window Bounds safety | Restore validasi `x`/`y` di `screen.getDisplayMatching`. |
| Tab DoS | `DOCFLOW_MAX_TABS=30`; reject saat exceed. |
| **Multi-window DoS** | **`DOCFLOW_MAX_WINDOWS=5`; reject `window:newWindow` / `window:detachTab` saat exceed.** |
| **Update safety** | **Signature verify wajib (`DOCFLOW_UPDATE_REQUIRE_SIGNATURE=true`); feed HTTPS only; staged rollout.** |
| **i18n safety** | **Tidak ada `eval` di translation values; `i18next` escape default; JSON schema validation.** |
| **Tray safety** | **Tidak ada data sensitif di tooltip/menu; tooltip hanya nama app + versi.** |
| Hooks integrity | `react-hooks/rules-of-hooks: error`; regression test toggle viewMode + tab + locale. |
| Log rotation | 10 file × 20 MB; tidak log isi Markdown, query find, locale user, atau update cert. |
| Privilege | Non-root; NSIS per-user default. |
| Ingress | Tidak ada HTTP listener; hanya `127.0.0.1:5173` dev. |
| Crash recovery | `session.json` v5 + prompt restore per tab + per window. |
| Updater | Signature verify, HTTPS `latest.yml`, staging %, no downgrade attack. |
| Fuse (Linux) | AppImage butuh `libfuse2` (dokumentasi user). |
| **Signing keys** | **Tidak pernah di repo; hanya CI secrets; di-mount read-only saat build.** |

---

## 16. Build, Deploy, CI/CD

### 16.1 Pipeline build

```bash
set -euo pipefail
pnpm exec vite build --outDir dist/renderer
pnpm exec electron-vite build
node scripts/verify-build.ts        # CSP + no-devtools + i18n missing-keys + tab/find sanity
pnpm exec electron-builder --win --linux --x64 --arm64 --publish never \
  --config electron-builder.yml

# Signing (Windows)
pwsh scripts/sign-windows.ps1 -Path "release/DocFlowStudio-1.6.0-x64.exe"

# Signing (Linux)
bash scripts/sign-linux.sh "release/DocFlowStudio-1.6.0-x64.AppImage"
bash scripts/sign-linux.sh "release/DocFlowStudio-1.6.0-arm64.AppImage"

# Checksums & update manifest
sha256sum release/*.{exe,AppImage,deb} > release/SHA256SUMS
node scripts/gen-update-manifest.ts --channel stable --out release/latest.yml
```

### 16.2 `electron-builder.yml` (ringkas)

```yaml
appId: id.docflow.studio
productName: DocFlow Studio
directories: { output: release, buildResources: build }
files: [ "dist/**/*", "package.json" ]
extraMetadata: { main: dist/main/main.js }
asar: true
publish:
  provider: generic
  url: https://releases.docflow.app/updates/${env.DOCFLOW_UPDATE_CHANNEL}
  channel: ${env.DOCFLOW_UPDATE_CHANNEL}
win:
  target:
    - { target: nsis,     arch: [x64] }
    - { target: portable, arch: [x64] }
  icon: build/icon.ico
  requestedExecutionLevel: asInvoker
  signAndEditExecutable: true
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
- Steps: install → lint → typecheck → `test:unit` → build → **sign** (Authenticode/GPG dari secrets) → **gen latest.yml** → `test:e2e` (xvfb Ubuntu) → package → upload release + `SHA256SUMS` + `latest.yml`.
- Verifikasi: ukuran < 240 MB, smoke e2e lulus, `verify-build.ts` lulus (**CSP + no-devtools + i18n missing-keys + signature presence check**), `latest.yml` valid schema.

---

## 17. Testing Checklist (unified)

### 17.1 Unit
- [ ] `FileService.write` atomik (kill mid-write → file utuh, `.tmp` tersisa).
- [ ] `FileService.write` conflict detection (`expectedMtime` mismatch).
- [ ] `RecentFilesService.add` dedup + cap 20.
- [ ] `RecentFilesService.prune` > 90 hari.
- [ ] **`SettingsService.migrate` v3→v4 menambahkan `locale`, `updateChannel`, `autoCheckUpdates`, `tray`.**
- [ ] **`SessionService.migrate` v4→v5: single window → `windows[]` (1 elemen).**
- [ ] `SessionService` idempotent.
- [ ] `OpenFileRouter` parse argv Win/Linux.
- [ ] `markdownParser` heading ID unik.
- [ ] `documentStats`, `docExport`, `pdfExport` regression pass.
- [ ] `ContextMenuService.buildTemplate` menghasilkan menu editor/preview/tab yang benar.
- [ ] `FileSearchService.search` glob + regex + timeout.
- [ ] `FileSearchService.replaceAll` dry-run tidak menulis file.
- [ ] `searchRegex.buildRegExp` normal/extended/regex + escape + invalid → thrown error.
- [ ] **`searchRegex` extended-unicode: `\x{1F600}` → 😀, `\u{0041}` → A, `\U{0001F600}` → 😀.**
- [ ] **`UpdateService.checkForUpdates` dengan mock `electron-updater` → emit `update-available` saat versi baru.**
- [ ] **`UpdateService` menolak install jika signature invalid.**
- [ ] **`I18nService` fallback `en` jika key tidak ada di `id`.**
- [ ] **`I18nService` menghasilkan label menu yang benar untuk ID/EN.**
- [ ] **`WindowManager.createWindow` menghormati `DOCFLOW_MAX_WINDOWS`.**
- [ ] **`WindowManager.detachTab` memindahkan tab state + bounds.**
- [ ] **`pdfExport` vektor menghasilkan PDF dengan `pdf-lib` (teks selectable, ukuran < raster).**

### 17.2 Integration & UI Logic (termasuk X1 + tabs + find + i18n + update + multi-window)
- [ ] `file:open` → `file:save` byte-identik.
- [ ] `recent:list` urut `lastOpenedAt` desc.
- [ ] `settings:set` merge tidak hapus field lain.
- [ ] Watcher eksternal → `file:changed` ≤500ms per tab.
- [ ] IPC invalid payload tidak crash main.
- [ ] Close dirty tab → `confirmUnsaved` Save/Discard/Cancel.
- [ ] Tabs: buka 5 tab, close 1 tengah → `activeTabId` pindah ke tetangga.
- [ ] Tabs: buka path sama 2× → fokus tab pertama.
- [ ] Tabs: `Ctrl+W` close tab dirty → prompt.
- [ ] Tabs: drag-reorder tab A↔B → urutan berubah, `session:save`.
- [ ] Tabs: exceed `MAX_TABS` (30) → toast error.
- [ ] **Tabs: `isPinned=true` → tidak dapat di-close dengan "Close Others"; visual pin icon muncul.**
- [ ] **Tabs: `Ctrl+Shift+P` toggle pin; pinned tab dipaksa kiri.**
- [ ] Tabs persistence: set 3 tab → restart → 3 tab ter-restore.
- [ ] **Multi-window: detach tab → window baru dengan 1 tab; source window tanpa tab tsb.**
- [ ] **Multi-window: exceed `MAX_WINDOWS` (5) → toast error.**
- [ ] **Multi-window: restart dengan 2 window → 2 window ter-restore dengan tab masing-masing.**
- [ ] **Multi-window: tab transfer drag dari window A ke B → pindah.**
- [ ] Find: `Ctrl+F` buka bar, ketik "foo", `Enter` → next. `Shift+Enter` → prev.
- [ ] Find mode normal: escape regex meta.
- [ ] Find mode extended: `\n` cocok baris baru, `\t` cocok tab.
- [ ] **Find mode extended-unicode: `\x{1F600}` cocok emoji 😀.**
- [ ] Find mode regex: `^#{1,3}\s+.+$` cocok H1–H3. Invalid regex → toast.
- [ ] Find case-sensitive toggle bekerja.
- [ ] Match whole word: "it" tidak cocok "hitch".
- [ ] Wrap-around: next dari match terakhir → match pertama.
- [ ] In selection: hanya cocok dalam selection.
- [ ] Replace All: 3 match → semua ter-replace; `Ctrl+Z` restore (undo sekali).
- [ ] Find All in Tabs: 2 tab dengan "foo" → grouped, klik → activate.
- [ ] Find in Files: pilih folder 3 file, cari "TODO" → hasil semua file.
- [ ] Replace in Files: dry-run tampil diff, konfirmasi → 3 file ter-replace.
- [ ] Find history: 20 query persist antar restart.
- [ ] TOC Sync: klik H2 → `textarea.scrollTop` tepat + `<h2 id>` scrollIntoView.
- [ ] TOC Sync OFF: klik TOC tidak scroll.
- [ ] Auto-scroll: ketik sampai bawah → preview proporsional.
- [ ] Zoom: `+`/`—` transform preview; state persist.
- [ ] Paged Mode: padding + shadow berubah.
- [ ] Copy MD: clipboard === buffer persis.
- [ ] Context Menu Editor/Preview/Tab: native menu muncul dengan opsi tepat.
- [ ] Toolbar & Tab Overflow: resize < 1024px → scrollable.
- [ ] UI Persistence: `viewMode`, `tocWidth`, `toolbarScrollLeft` persist.
- [ ] **i18n: switch ke EN → semua label UI, menu native, tray menu berubah; switch balik ke ID.**
- [ ] **i18n: `auto` locale → mengikuti `app.getLocale()`; fallback `en`.**
- [ ] **i18n: locale persist antar restart.**
- [ ] **Update: mock feed baru → `UpdateBanner` muncul; klik Restart → install; launch → versi baru.**
- [ ] **Update: signature invalid → install ditolak + toast error.**
- [ ] **Tray: klik kanan tray → menu muncul; klik Show → window muncul.**
- [ ] **Tray: minimize-to-tray ON → close window → sembunyi; klik tray → muncul lagi.**
- [ ] **PDF Vector: export → teks selectable (uji copy-paste), ukuran < raster.**
- [ ] **PDF Raster fallback: export dengan layout kompleks → raster (image).**
- [ ] **⭐ Hooks discipline (viewMode)**: toggle × 5 tanpa error.
- [ ] **⭐ Hooks discipline (tabs)**: toggle tab × 5 tanpa error.
- [ ] **⭐ Hooks discipline (locale)**: switch locale × 3 tanpa error.**

### 17.3 Smoke / Staging
- [ ] Launch Win 10/11 & Ubuntu 22.04/24.04 < 4 detik.
- [ ] Dbl-click `sample.md` → open tab.
- [ ] Buka 3 file berbeda → 3 tab; `Ctrl+Tab` cycle.
- [ ] `Ctrl+F` → temukan heading; `Ctrl+H` → replace.
- [ ] `Ctrl+Shift+F` → cari di folder `docs/`.
- [ ] Ctrl+S tanpa path → Save dialog.
- [ ] Export DOCX → valid di LibreOffice 24.
- [ ] **Export PDF Vector → teks selectable, ukuran kecil.**
- [ ] **Export PDF Raster → gambar, print-quality.**
- [ ] Kill -9 → relaunch → prompt recovery per tab.
- [ ] Toggle Editor/Split/Preview berturut-turut → tidak error.
- [ ] Context menu editor, preview, tab berfungsi.
- [ ] **Detach tab → window baru muncul dengan tab tsb.**
- [ ] **Tray icon muncul; klik kanan → menu; minimize-to-tray → hide.**
- [ ] **Locale switch ID↔EN → semua string berubah.**
- [ ] **Update banner muncul dengan mock feed (build 1.5.x → feed 1.6.0).**
- [ ] Toolbar & tab bar tidak terpotong saat window dikecilkan.

### 17.4 Security
- [ ] Renderer tidak bisa `require('fs')`.
- [ ] `window.docflow` hanya method preload.
- [ ] `path: '../../etc/passwd'` → `PATH_TRAVERSAL`.
- [ ] `<img src=x onerror=alert(1)>` tersanitasi.
- [ ] `shell.openExternal('javascript:...')` → `EXTERNAL_BLOCKED`.
- [ ] File 100 MB ditolak.
- [ ] Find-in-files symlink → diabaikan.
- [ ] Find-in-files folder 5000 file → timeout per file bekerja.
- [ ] Replace in files tanpa dry-run → IPC reject.
- [ ] Regex malicious `(a+)+$` pada string panjang → timeout, tidak hang.
- [ ] CSP hilang di production → `verify-build.ts` gagal.
- [ ] ESLint `react-hooks/rules-of-hooks` error menolak PR.
- [ ] **Update signature invalid → `update:install` reject + log.**
- [ ] **Update feed unreachable → tidak crash, retry next launch.**
- [ ] **i18n translation dengan `<script>` → di-escape (tidak execute).**
- [ ] **`DOCFLOW_MAX_WINDOWS` enforced: detach ke-6 → reject.**
- [ ] **Signing key tidak ada di repo; `verify-build.ts` memeriksa tidak ada `*.pfx`/`*.gpg` di `dist/`.**

---

## 18. Timeline (44 hari kerja)

| Hari | Aktivitas |
| :--- | :--- |
| D1–D2 | Scaffold Electron + Vite + React; port `src/` v1.5; hello-window. |
| D3–D4 | `FileService` + `FileProvider` + atomic write + unit test. |
| D5–D6 | IPC registry (52 channel) + zod + `preload.ts` + `ContextMenuService` skeleton. |
| D7–D8 | `RecentFilesService` + `SettingsService` (v3→v4) + `SessionService` (v4→v5 multi-window). |
| D9–D10 | **`tabStore` refactor** + `useTabSession` + `StatusBar`. |
| D11 | **`TabBar` + `TabItem` + keyboard nav + drag-reorder (`@dnd-kit`).** |
| D12–D13 | **`FindReplaceBar` + `searchStore` + `useFindReplace` (normal/regex/extended/extended-unicode).** |
| D14 | **`FindResultsPanel` + find-all-in-tabs.** |
| D15–D16 | **`FileSearchService` + `findHandlers` + Find in Files + dry-run replace.** |
| D17–D18 | `uiStore` + `FormattingToolbar` + CSS Overflow fix. |
| D19–D20 | `useScrollSync` + TOC sync + Auto-scroll + `useUiStatePersistence`. |
| D21–D22 | Native Context Menu (editor/preview/tab). |
| D23–D24 | Save-in-place, conflict, unsaved guard, recovery prompt. |
| D25–D26 | Native menu + `OpenFileRouter` + file association. |
| D27 | **`pdfExport` vektor via `pdf-lib` + fallback jsPDF; ExportModal opsi.** |
| D28 | **Tab pinning visual + `Ctrl+Shift+P` + bulk-close behavior.** |
| D29–D30 | **`I18nService` + `react-i18next` + locale `en/id` (7 file × 2) + `LanguageSwitcher` + extract strings.** |
| D31–D32 | **`UpdateService` (electron-updater) + `updateStore` + `UpdateBanner` + signature verify + staged rollout.** |
| D33 | **`sign-windows.ps1` + `sign-linux.sh` + `gen-update-manifest.ts` + CI signing secrets + `latest.yml`.** |
| D34–D35 | **`TrayService` + tray icon + minimize-to-tray + menu + click behavior.** |
| D36–D38 | **`WindowManager` + `useMultiWindow` + detach tab + drag-out-to-detach + session v5 test.** |
| D39 | **Extended-unicode `\x{...}` di `searchRegex` + tests.** |
| D40–D41 | Playwright e2e: auto-update, i18n, tray, multi-window, tab-pinning, pdf-vector. |
| D42 | **Audit React hooks + regression (viewMode × 5, tab × 5, locale × 3) + ESLint rule.** |
| D43 | Bugfix e2e + security checklist §17.4 + UI persistence checklist + i18n missing-keys clean. |
| D44 | Beta release **v1.6.0** (signed) + dokumentasi user + UPDATE_GUIDE. |

---

## 19. Definition of Done (DocFlow Studio Desktop v1.6)

- [ ] Repo `docflow-studio-desktop` (branch `main` + `develop`).
- [ ] `pnpm install && pnpm build && pnpm test` hijau di Win & Linux (CI).
- [ ] Semua fitur v1.5 berjalan identik (regression pass).
- [ ] Save-in-place (Ctrl+S) & Save As (Ctrl+Shift+S) berfungsi.
- [ ] File association `.md`/`.markdown`/`.txt` terdaftar.
- [ ] Double-click `.md` membuka app dengan file ter-load.
- [ ] Native menu File lengkap (i18n ID/EN).
- [ ] Recent files tampil di menu, bertahan antar restart.
- [ ] Dirty tracking akurat (`•` di title & tab).
- [ ] Close guard per tab: Save/Discard/Cancel + Save All/Discard All.
- [ ] Crash recovery: kill -9 → relaunch → prompt restore per tab.
- [ ] Konflik eksternal terdeteksi per tab.
- [ ] Atomic write terverifikasi.
- [ ] Export DOCX/PDF/DOC/HTML/MD semua berfungsi.
- [ ] **PDF vektor (selectable text) sebagai default; raster fallback tersedia.**
- [ ] **Multi-Document Tabs**: buka ≥3 file → 3 tab, aktivasi benar, `Ctrl+Tab` bekerja.
- [ ] **Tab close guard**: tutup tab dirty → prompt.
- [ ] **Tab persistence**: restart → semua tab ter-restore di urutan yang sama.
- [ ] **Tab drag-reorder**: urutan persist.
- [ ] **Tab pinning visual**: `📌` muncul, `Ctrl+Shift+P` toggle, pinned forced left, bulk-close melewati pinned.
- [ ] **Tab overflow**: 20 tab → scrollable horizontal.
- [ ] **Tab context menu**: Close/Close Others/Close to Right/Close to Left/Copy Path/Reveal/Pin/**Move to New Window**.
- [ ] **Find**: Ctrl+F, Enter, Shift+Enter, F3, wrap-around bekerja.
- [ ] **Regex find**: `^#{1,3}\s+.+$` → semua H1–H3 tersorot.
- [ ] **Extended find**: `\t` cocok tab; **`\x{1F600}` cocok emoji**.
- [ ] **Match case** & **whole word** bekerja.
- [ ] **Replace All** di current tab dengan undo.
- [ ] **Find All in All Open Tabs**: grouped per tab, klik → activate.
- [ ] **Find in Files**: pilih folder, cari `TODO` → hasil lintas file.
- [ ] **Replace in Files**: dry-run preview → konfirmasi → atomic write.
- [ ] **Find history**: 20 query persist.
- [ ] **i18n**: UI ID/EN, switch live via View → Language, persist antar restart, missing-key fallback `en`, menu native + tray diterjemahkan.
- [ ] **Auto-update**: signed feed, `latest.yml`, banner, staged rollout (10/50/100%), manual check (Help → Check for Updates), auto-check launch+30s + tiap 1 jam, signature verify wajib.
- [ ] **Signing**: Windows Authenticode (`.exe`), Linux GPG (`.AppImage.sig`), `SHA256SUMS.gpg`.
- [ ] **Tray**: ikon muncul, klik kanan menu, minimize-to-tray toggle di Settings.
- [ ] **Multi-window**: detach tab → window baru, restart → semua window ter-restore, `MAX_WINDOWS=5` enforced, drag tab antar window.
- [ ] **Session schema v5**: `windows[]`, migrate v4→v5 benar.
- [ ] **Settings schema v4**: `locale`, `updateChannel`, `autoCheckUpdates`, `tray`, migrate v3→v4 benar.
- [ ] FormattingToolbar lengkap & responsif.
- [ ] TOC Sync ON/OFF berfungsi.
- [ ] Auto-scroll ON → preview mengikuti ketikan proporsional.
- [ ] Native Context Menu editor/preview/tab berfungsi (label i18n).
- [ ] Full UI State Persistence: Zoom, Paged, Auto-scroll, TOC Sync, ViewMode, TOC Width/Visibility persist.
- [ ] **React Hooks Discipline (X1)**:
  - [ ] `App.tsx`, `TabBar.tsx`, `TableOfContents.tsx`, `FindReplaceBar.tsx`, `UpdateBanner.tsx` memanggil store hooks di top-level.
  - [ ] Toggle Editor/Split/Preview × 5 tanpa error.
  - [ ] Toggle buka/tutup 5 tab × 5 tanpa error.
  - [ ] Switch locale × 3 tanpa error.
  - [ ] ESLint `react-hooks/rules-of-hooks: error` aktif di CI.
- [ ] Security checklist §17.4 semua lulus.
- [ ] IPC invalid payload tidak crash main.
- [ ] `electron-builder` menghasilkan `.exe` (signed), `.AppImage` (signed), `.deb`.
- [ ] `latest.yml` valid schema untuk `stable` dan `beta` channel.
- [ ] `README.md`, `LICENSE`, `CHANGELOG.md` (`v1.6.0`), `docs/USER_GUIDE.md`, `docs/UPDATE_GUIDE.md` tersedia.
- [ ] **i18n missing-keys = 0 untuk `en` dan `id` (CI check).**

---

## 20. Roadmap + Ringkasan

| Fase | Deliverable |
| :--- | :--- |
| **F0** | Dokumen perencanaan ini (blueprint unified v1.6 + auto-update + i18n + tray + multi-window + upgrades). |
| **F1** (M1) | **DocFlow Studio Desktop v1.6**: seluruh fitur v1.5 + **signed auto-update** + **i18n ID/EN** + **tray** + **multi-window detach** + **PDF vektor** + **tab pinning** + **extended-unicode find**. Build signed. |
| **F2** (M2) | Tray start-with-system, tab pinning visual advanced (custom color), extended `\x{...}` di Find All in Files, PDF vektor untuk tabel kompleks, i18n locale tambahan (mis. `ms`, `es`). |
| **F3** (M3) | Store publishing (MSIX, Flathub), telemetry opt-in lokal, PDF custom font embedding, Notepad++ Mark (bookmark line). |
| **F4** (M4) | macOS target (arm64 + x64), notarization, drag-to-dock file open, split view dua dokumen dalam satu window. |
| **F5** (M5) | Plugin system (custom provider/export/locale), WebDAV sync opt-in. |

**Ringkasan (≤150 kata):** DocFlow Studio Desktop **v1.6** adalah blueprint terpadu yang menggabungkan seluruh kapabilitas v1.5 (authoring Markdown, export multi-format, integrasi OS native, multi-tab dengan drag-reorder/pin/session-restore, Find/Replace + Find All in Tabs + Find in Files, UI sync TOC/auto-scroll/zoom/paged, Native Context Menu, Full UI State Persistence) dengan **lima kapabilitas baru**: **(1) signed auto-update** via `electron-updater` dengan `latest.yml` + Authenticode/GPG + staged rollout, **(2) i18n ID/EN** via `i18next` dengan externalized strings + live switch, **(3) system tray** dengan minimize-to-tray + native menu, **(4) multi-window detach tab** dengan session schema v5, dan **(5) PDF vektor** via `pdf-lib` (teks selectable). Arsitektur memisahkan empat store renderer — `tabStore`, `uiStore`, `searchStore`, `updateStore` — dengan **52 IPC channel** tervalidasi zod, `session.json` **v5** (multi-window) dan `settings.json` **v4** (locale + update + tray). React Hooks Discipline diperketat: semua store hook wajib di top-level, dengan regression test mencakup viewMode × 5, tab × 5, **dan locale × 3**. Timeline **44 hari kerja** menghasilkan build `.exe`/`.AppImage`/`.deb` **signed** + `latest.yml` untuk channel `stable` & `beta`, siap untuk fase store publishing, PDF advanced, dan multi-locale di masa depan.