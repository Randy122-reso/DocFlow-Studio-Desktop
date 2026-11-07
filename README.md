# DocFlow Studio Desktop

**Markdown authoring & publication-grade export — native on Windows and Linux.**

DocFlow Studio Desktop adalah aplikasi desktop untuk menulis dokumen Markdown dengan preview langsung,
mengatur tata letak halaman, dan mengekspor ke DOCX, PDF, DOC, HTML, atau Markdown. Semua pemrosesan
dijalankan secara lokal; tidak ada konten dokumen yang dikirim ke jaringan.

> **v1.6.2** — Unified Workspace, Tabs & Pinning, Find/Replace + Find in Files, Auto-Update, i18n Bahasa
> Indonesia/Inggris, Tray, Multi-Window, Vector PDF Export, plus the full `SOLUSI.md` scroll-performance
> patch (imperative gutter scrolling, layout zoom, content-visibility, ref-based scroll persistence).

![Status](https://img.shields.io/badge/status-1.6.2%20stable-10b981)
![Electron](https://img.shields.io/badge/Electron-33-2b2b2b)
![React](https://img.shields.io/badge/React-19-087ea4)
![License](https://img.shields.io/badge/license-MIT-2f855a)

---

## Fitur utama

### Menulis & melihat

- Editor Markdown dengan tampilan **editor**, **split**, atau **preview**.
- Preview aman (DOMPurify) dengan GitHub-flavored Markdown, tabel, task list, dan code block.
- Dukungan **GitHub-style callouts** (`> [!NOTE]`, `TIP`, `IMPORTANT`, `WARNING`, `CAUTION`).
- Table of contents otomatis dengan ID heading unik dan navigasi klik.
- Statistik dokumen: kata, karakter, kalimat, paragraf, heading, code block, link, gambar, dan estimasi
  waktu baca.
- Formatting toolbar lengkap: theme, font size, page size, margin, paged/continuous toggle, zoom
  controls, auto-scroll toggle, TOC sync toggle, dan copy Markdown.
- Zen Review untuk membaca dokumen tanpa distraksi.

### Workspace: Tabs & Pinning

- **Multi-tab editor**: tab bar dengan tombol baru, tutup, pin, dan ganti tab aktif.
- Setiap tab membawa buffer, scroll position, cursor, dan dirty state sendiri.
- **Pin tab** agar tidak diotomatis ditutup oleh close guard / auto-clean.
- Window mengikuti tab aktif untuk menentukan judul & dirty indicator.
- Session ditampung per **window** (schema v5) dengan migrasi otomatis dari format v4 (single-tab) dan
  draft v1 (single-draft).

### Find & Replace

- **Find & Replace** di editor: mode *normal*, *regex*, *extended* (escape `\b`, `\n`, `\t`, unicode
  escapes), *match case*, *whole word*, *dot matches newline*, *wrap around*, dan *in selection*.
- **Find in Files**: cari berbasis teks lintas direktori (glob `**/*.{md,markdown,txt}`) dengan preview
  ganti, hitung perubahan, lalu tulis ulang (`dry-run` wajib dikonfirmasi).
- Riwayat pencarian (`findHistory`) dan opsi pencarian tersimpan per window.

### Auto-Update & distribusi

- Auto-update via `electron-updater` + feed GitHub (`https://releases.docflow.app/updates/latest.yml`,
  stable; beta: `.../beta/latest.yml`).
- Update memakai **signature SHA-256**; `DOCFLOW_UPDATE_REQUIRE_SIGNATURE=true` pada produksi.
- Update banner, download progress, dan restart-and-install.
- Manifest update dihasilkan otomatis lewat `npm run gen:update-manifest` (dipakai CI release).
- Code signing dan checksum generation (`npm run checksums`) sudah disertifikasi.

### i18n

- Dukungan **Bahasa Indonesia dan Inggris** (`en` / `id`) melalui `i18next` + `react-i18next`.
- Namespace: `common`, `editor`, `find`, `tabs`, `update`, `tray`, `errors`.
- Bahasa sistem otomatis, dengan pengganti manual lewat Language Switcher.
- Menu native dan label tray ikut ter-translate.

### Tray & multi-window

- **System tray**: show/hide, tooltip, dan entri menu aplikasi.
- **Multi-window**: tombol *new window* (`Ctrl+Shift+N`) dengan batas maksimum 5 window
  (`DOCFLOW_MAX_WINDOWS`), detach tab ke window baru, dan pengetatan bounds.
- Single-instance dengan **file routing** dari OS ke window yang tepat.

### Tampilan dokumen

- **5 tema**: Modern, Academic, Minimal, Editorial, Legal.
- Ukuran halaman **A4 / Letter**, margin compact/normal/spacious.
- Paper tone white/cream/dark, ukuran font, dan family font.
- Header/footer, nomor halaman, penomoran heading otomatis, dan justify text.
- Pengaturan disimpan otomatis dan dipakai konsisten oleh preview serta export.

### Export

| Format | Teknologi | Catatan |
| --- | --- | --- |
| **DOCX** | `docx` | Dokumen Word native dengan style, tabel, header/footer, nomor halaman. |
| **PDF via Print** | Chromium print | Teks tetap selectable; membuka dialog print sistem. |
| **Direct PDF** | `pdf-lib` | **Vector PDF** native: teks tetap selectable dan dapat di-search; fallback raster (`html2canvas` + `jsPDF`) bila glyph tidak bisa di-encode WinAnsi. |
| **DOC** | Word-compatible HTML | File `.doc` yang dapat dibuka Word/LibreOffice. |
| **HTML** | Standalone HTML | Satu file mandiri dengan style tertanam. |
| **Markdown** | Source | Sumber Markdown apa adanya. |

Semua dialog penyimpanan menggunakan native save dialog. Ekspor biner ditulis secara atomik.

### Code block & script extraction

- Deteksi bahasa dari fenced code block (30+ bahasa).
- Modal Code Script: pilih blok, ganti/deteksi bahasa, copy, atau download sebagai file source.

### File & sesi

- Open/save-in-place, Save As, dan file association `.md`, `.markdown`, `.txt`.
- Recent files dengan pin, hapus satu entri, dan clear (pin dipertahankan).
- Dirty tracking pada judul window dan close guard dengan pilihan Save / Discard / Cancel.
- Auto-recovery draft (debounce) dan deteksi perubahan file eksternal dengan opsi reload/rewrite.
- Konflik mtime saat save: overwrite, reload, atau Save As.
- Drag & drop file dari file manager.
- Restore draft setelah crash/exit tak terduga.
- Encoding UTF-8, UTF-8 BOM, dan UTF-16LE; line ending LF/CRLF/CR dipertahankan.

### Desktop & keamanan

- Native menu (File/Edit/View/Window/Help), recent files, dan keyboard shortcuts.
- Renderer **sandboxed**: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
- Preload API minimal via `contextBridge`; tidak ada akses Node langsung dari renderer.
- Semua IPC divalidasi dengan **zod**, termasuk path dan ukuran file.
- Path traversal/null-byte ditolak; file ditulis atomik (temp file + rename + fsync).
- CSP ketat di production; external link hanya untuk host yang di-allow-list.
- Log rotasi tanpa pernah menulis isi dokumen.

### Performance & arsitektur render (v1.6.2)

Perbaikan dari `SOLUSI.md` untuk menghilangkan lag saat mengetik/scroll dan highlight yang meleset:

- **Selective Zustand subscriptions** — `App.tsx` tidak lagi berlangganan seluruh array `tabs`;
  hanya `activeTabId`, tab aktif, dan `tabCount`. Perubahan tab lain tidak memicu re-render shell.
- **Debounced/throttled scroll** — preview menyimpan `previewScrollTop` 150 ms setelah scroll berhenti;
  editor memakai `requestAnimationFrame` untuk paint dan debounce 180 ms untuk persistensi.
- **Memoized editor metrics** — `split('\n')`, rentang baris terlihat, dan spacer dihitung dalam
  `useMemo`; tinggi baris gutter dibaca dari `getComputedStyle` sehingga selalu akurat.
- **Debounced search highlight** — query pencarian di-debounce 300 ms sebelum `findAll` dijalankan.
- **Web Worker Markdown** — `marked` berjalan di `src/workers/markdownWorker.ts`; sanitasi DOMPurify
  dan transform heading/callout/code-block tetap di main thread via `parseHtml`.
- **Overlay alignment** — `scrollbar-gutter: stable` + inset backdrop yang sama menjaga highlight
  sejajar dengan wrap teks textarea.

---

## Stack

- **Electron 33** — main process, native dialog, menu, file association.
- **React 19 + TypeScript 5.7** — renderer.
- **Vite 6 + electron-vite 3** — build main/preload/renderer.
- **Zustand** — state management.
- **i18next + react-i18next** — terjemahan ID/EN.
- **marked + DOMPurify** — parsing dan sanitasi Markdown.
- **pdf-lib, docx, html2canvas, jsPDF** — export.
- **zod** — validasi IPC, settings, session.
- **Vitest** — unit test.
- **electron-builder** — NSIS installer, portable, AppImage, deb, auto-update.

---

## Kebutuhan

- **Node.js >= 20.18** dan npm.
- Windows 10/11 (utama) atau Linux x64.

---

## Mulai cepat

```bash
# install dependency
npm install

# jalankan mode development (HMR untuk renderer)
npm run dev

# typecheck + build production ke folder out/
npm run build

# jalankan hasil build
npm start

# unit test
npm test

# verifikasi keamanan hasil build
npm run verify
```

### Script npm

| Script | Fungsi |
| --- | --- |
| `npm run dev` | Development dengan electron-vite dan HMR. |
| `npm run build` | Typecheck lalu build main, preload, dan renderer. |
| `npm start` | Preview aplikasi hasil build. |
| `npm run typecheck` | Typecheck renderer dan main/preload/test. |
| `npm test` | Jalankan seluruh unit test sekali. |
| `npm run test:watch` | Unit test mode watch. |
| `npm run verify` | Cek CSP, sandbox, dan tidak ada referensi dev server di output. |
| `npm run lint` | ESLint (`react-hooks/rules-of-hooks: error`) + typescript-eslint. |
| `npm run package` | Build + verify + installer Windows x64 (NSIS & portable) + SHA-256 checksums. |
| `npm run package:linux` | Build + verify + AppImage & deb Linux x64 + SHA-256 checksums. |
| `npm run checksums` | Buat `release/SHA256SUMS` dari artifact yang ada. |
| `npm run icons` | Regenerasi `build/icon.png` dan `build/icon.ico`. |
| `npm run gen:update-manifest` | Hasilkan manifest update `release/latest.yml` untuk auto-update. |
| `npm run release` | Full release pipeline: build → verify → package → checksums → manifest. |

---

## Struktur proyek

```text
electron/
  main.ts                 bootstrap, single-instance, CSP, lifecycle
  window.ts               BrowserWindow, close guard, bounds persistence
  preload.ts              contextBridge API
  menu.ts                 native application menu
  ipc/                    channel handlers + zod schemas
  services/
    FileProvider.ts       kontrak provider plug-and-play
    LocalFsProvider.ts    implementasi filesystem lokal
    FileService.ts        read/write/conflict/info
    FileWatcher.ts        fs.watchFile + debounce + suppression
    DialogService.ts      native open/save/message dialogs
    RecentFilesService.ts recent files + pin + TTL
    SettingsService.ts    settings + migration + debounce persist
    SessionService.ts     session v5 + draft recovery + migration v4
    OpenFileRouter.ts     file dari argv/second-instance
  utils/                  atomic write, encoding, logger, paths, config
src/
  App.tsx                 orkestrasi aplikasi
  components/             editor, viewer, TOC, modal, toast, status bar, tab bar, find bar
  hooks/                  useTabManager, useFindReplace, useFindInFiles, useUpdate,
                          useI18n, useTray, useMultiWindow, useTabPersistence, ...
  store/                  Zustand store (tabStore, searchStore, updateStore, appSettingsStore, ...)
  utils/                  markdown, stats, export (vector PDF), editor actions, searchRegex
  styles/, types/         tema dan tipe renderer
tests/unit/               unit test service, hook, dan utility
scripts/                  verify-build, icon generator, update manifest
build/                    icon dan installer include
out/                      output build (generated)
release/                  output packaging & update manifest (generated)
```

---

## Lokasi data

Data aplikasi disimpan di folder `userData` Electron (biasanya
`%APPDATA%\DocFlow Studio` pada build terpasang; mode development dapat memakai nama lain):

| File | Isi |
| --- | --- |
| `settings.json` | Tema, tipografi, page setup, window bounds, last directory, app preferences. |
| `recent.json` | Recent files, pin, timestamp, ukuran. |
| `session.json` | Session window (schema v5) + draft pemulihan (hanya saat dokumen dirty). |
| `logs/main-YYYY-MM-DD.log` | Log rotasi (tanpa isi dokumen). |
| `cache/` | Cache aplikasi. |

Gunakan `DOCFLOW_USER_DATA_DIR` untuk memisahkan data saat testing.

---

## Konfigurasi environment

Salin `.env.example` ke `.env` bila perlu. Semua variabel opsional.

| Variabel | Default | Keterangan |
| --- | --- | --- |
| `DOCFLOW_USER_DATA_DIR` | OS default | Override folder userData (testing). |
| `DOCFLOW_LOG_LEVEL` | `info` | `trace`/`debug`/`info`/`warn`/`error`. |
| `DOCFLOW_LOG_MAX_FILES` | `10` | Jumlah file log yang disimpan. |
| `DOCFLOW_LOG_MAX_SIZE_MB` | `20` | Ukuran maksimum sebelum rotasi. |
| `DOCFLOW_MAX_FILE_SIZE_MB` | `50` | Batas ukuran file yang dibuka. |
| `DOCFLOW_MAX_WINDOWS` | `5` | Maksimum window aktif. |
| `DOCFLOW_ENCODING` | `utf-8` | Encoding default saat menulis file baru. |
| `DOCFLOW_WATCH_DEBOUNCE_MS` | `250` | Debounce watcher perubahan eksternal. |
| `DOCFLOW_AUTOSAVE_DEBOUNCE_MS` | `1500` | Debounce draft recovery. |
| `DOCFLOW_RECOVERY_INTERVAL_MS` | `5000` | Interval draft recovery. |
| `DOCFLOW_RECENT_MAX` | `20` | Maksimum recent file unpinned. |
| `DOCFLOW_RECENT_TTL_DAYS` | `90` | TTL recent file unpinned. |
| `DOCFLOW_CSP_ENABLED` | `false`* | Aktifkan CSP response header. |
| `DOCFLOW_ALLOWED_EXTERNAL` | `github.com,...` | Comma-separated host yang boleh dibuka. |
| `DOCFLOW_DEVTOOLS_ENABLED` | `false` | DevTools pada build production. |
| `DOCFLOW_E2E_MODE` | `false` | Dialog otomatis memakai `DOCFLOW_E2E_SAVE_PATH`. |
| `DOCFLOW_E2E_SAVE_PATH` | — | Path tetap untuk mode E2E. |
| `DOCFLOW_UPDATE_REQUIRE_SIGNATURE` | `true` | Wajibkan signature update (produksi). |

\* CSP berbasis meta selalu ada di HTML production; `DOCFLOW_CSP_ENABLED` mengatur header CSP tambahan
dari main process.

---

## Keamanan

- Renderer tidak memiliki akses `require`, `process`, atau filesystem.
- Hanya channel yang terdaftar di preload yang dapat dipanggil.
- Input IPC divalidasi dua lapis: skema zod dan pengecekan path di service.
- Absolute path diizinkan (dibutuhkan desktop), tetapi segmen `..`, null byte, dan path relatif ditolak.
- External link hanya `http(s)` dan host harus ada di allow-list.
- CSP production melarang `unsafe-eval`, object, frame, dan koneksi keluar.
- File ditulis atomik dengan permission `0600` pada file sementara.
- Log hanya mencatat nama file dan ukuran, bukan isi dokumen.

---

## Testing

```bash
npm test
```

Terdapat **132 unit test** yang mencakup:

- `FileService`, `RecentFilesService`, `SettingsService`, `SessionService`, `FileSearchService`, `UpdateService` — layanan backend.
- `searchRegex` — mode normal/regex/extended, unicode escapes, match options.
- `tabStore` — open/pin/hydrate/dirty derivation.
- `markdownParser`, `documentStats` — parsing & statistik.
- `pdfVector` — generate PDF vector via `pdf-lib`, validasi glyph WinAnsi.
- Hooks discipline — `react-hooks/rules-of-hooks` regression via render test.

`npm run verify` memeriksa output build: CSP meta, tidak ada URL dev server, dan tidak ada
`nodeIntegration: true`/`unsafe-eval`.

---

## Packaging

```bash
# Windows x64: NSIS installer + portable
npm run package

# Linux x64: AppImage + deb
npm run package:linux
```

Output ada di `release/`. Konfigurasi ada di `electron-builder.yml`, termasuk file association
`.md`, `.markdown`, dan `.txt`, serta auto-update publish settings.

> Build Linux sebaiknya dijalankan di Linux. Build Windows dari Linux/macOS memerlukan Wine.

---

## Batasan tahap awal

- Paged preview adalah kartu halaman visual, bukan pagination CSS penuh per halaman.
- DOCX dibuat dari parser Markdown internal; markup yang sangat kompleks dapat disederhanakan.
- Provider file bersifat lokal. Kontrak `FileProvider` sudah plug-and-play, tetapi provider cloud belum
  diimplementasikan.
- Auto-update memakai feed GitHub; feed custom `releases.docflow.app` perlu diarahkan DNS/CDN.
- Migrasi state lintas versi besar belum diperlukan pada versi 1.x.

---

## Lisensi

MIT © 2026 DocFlow. Lihat [LICENSE](LICENSE).

Dokumentasi panduan pengguna lengkap ada di [docs/USER_GUIDE.md](docs/USER_GUIDE.md) dan
[docs/UPDATE_GUIDE.md](docs/UPDATE_GUIDE.md).
