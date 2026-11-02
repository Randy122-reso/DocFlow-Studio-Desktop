# DocFlow Studio Desktop

**Markdown authoring & publication-grade export — native on Windows and Linux.**

DocFlow Studio Desktop adalah aplikasi desktop untuk menulis dokumen Markdown dengan preview
langsung, mengatur tata letak halaman, dan mengekspor ke DOCX, PDF, DOC, HTML, atau Markdown.

![Status](https://img.shields.io/badge/status-0.1.0%20initial-b45309)
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
- Statistik dokumen: kata, karakter, kalimat, paragraf, heading, code block, link, gambar,
  dan estimasi waktu baca.
- Formatting toolbar: bold, italic, strikethrough, inline code, code block, heading, quote,
  bullet/numbered/task list, link, gambar, tabel, dan horizontal rule.
- Zen Review untuk membaca dokumen tanpa distraksi.

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
| **Direct PDF** | `html2canvas` + `jsPDF` | Snapshot halaman, cocok untuk distribusi cepat; teks tidak selectable. |
| **DOC** | Word-compatible HTML | File `.doc` yang dapat dibuka Word/LibreOffice. |
| **HTML** | Standalone HTML | Satu file mandiri dengan style tertanam. |
| **Markdown** | Source | Sumber Markdown apa adanya. |

Semua dialog penyimpanan menggunakan native save dialog. Ekspor biner ditulis secara atomik.

### Code block & script extraction

- Deteksi bahasa dari fenced code block (30+ bahasa: TypeScript, JavaScript, Python, Java, C#,
  C/C++, Go, Rust, Ruby, PHP, Swift, Kotlin, Scala, Dart, Lua, Perl, R, Julia, Haskell, Elixir,
  Erlang, Clojure, Bash, PowerShell, SQL, HTML, CSS, SCSS, JSON, YAML, XML, Markdown, Dockerfile,
  dan lainnya).
- Modal Code Script: pilih blok, ganti/deteksi bahasa, copy, atau download sebagai file source.

### File & sesi

- Open/save-in-place, Save As, dan file association `.md`, `.markdown`, `.txt`.
- Recent files dengan pin, hapus satu entri, dan clear (pin dipertahankan).
- Dirty tracking pada judul window dan close guard dengan pilihan Save / Discard / Cancel.
- Auto-recovery draft setiap 1,5 detik saat mengetik (debounce) dan setiap 5 detik.
- Deteksi perubahan file oleh program lain, dengan opsi reload atau tetap menulis.
- Konflik mtime saat save: overwrite, reload, atau Save As.
- Drag & drop file dari file manager.
- Restore draft setelah crash/exit tak terduga.
- Encoding UTF-8, UTF-8 BOM, dan UTF-16LE; line ending LF/CRLF/CR dipertahankan.

### Desktop & keamanan

- Native menu (File/Edit/View/Window/Help), recent files, dan keyboard shortcuts.
- Single-instance; file yang dibuka dari OS diteruskan ke window yang sudah ada.
- Renderer **sandboxed**: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
- Preload API minimal melalui `contextBridge`; tidak ada akses Node langsung dari renderer.
- Semua IPC divalidasi dengan **zod**, termasuk path dan ukuran file.
- Path traversal/null-byte ditolak; file ditulis atomik (temp file + rename + fsync).
- CSP ketat di production; external link hanya untuk host yang di-allow-list.
- Log rotasi tanpa pernah menulis isi dokumen.

---

## Stack

- **Electron 33** — main process, native dialog, menu, file association.
- **React 19 + TypeScript 5.7** — renderer.
- **Vite 6 + electron-vite 3** — build main/preload/renderer.
- **Zustand** — state management.
- **marked + DOMPurify** — parsing dan sanitasi Markdown.
- **docx, html2canvas, jsPDF** — export.
- **zod** — validasi IPC, settings, session.
- **Vitest** — unit test.
- **electron-builder** — NSIS installer, portable, AppImage, deb.

---

## Kebutuhan

- **Node.js >= 20.18** dan npm.
- Windows 10/11 (utama) atau Linux x64.
- Untuk packaging Windows dari Linux/macOS dibutuhkan Wine; Linux packaging sebaiknya dijalankan di Linux.

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
| `npm run package` | Build + verify + installer Windows x64 (NSIS & portable) + SHA-256 checksums. |
| `npm run package:linux` | Build + verify + AppImage & deb Linux x64 + SHA-256 checksums. |
| `npm run checksums` | Buat `release/SHA256SUMS` dari artifact yang ada. |
| `npm run icons` | Regenerasi `build/icon.png` dan `build/icon.ico`. |

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
    SessionService.ts     draft recovery
    OpenFileRouter.ts     file dari argv/second-instance
  utils/                  atomic write, encoding, logger, paths, config
src/
  App.tsx                 orkestrasi aplikasi
  components/             editor, viewer, TOC, modal, toast, status bar
  hooks/                  file session, settings sync, shortcuts, title
  store/                  Zustand store
  utils/                  markdown, stats, export, editor actions
  styles/, types/         tema dan tipe renderer
tests/unit/               unit test service & utility
scripts/                  verify-build, icon generator
build/                    icon dan installer include
out/                      output build (generated)
release/                  output packaging (generated)
```

---

## Lokasi data

Data aplikasi disimpan di folder `userData` Electron (biasanya
`%APPDATA%\DocFlow Studio` pada build terpasang; mode development dapat memakai nama lain):

| File | Isi |
| --- | --- |
| `settings.json` | Tema, tipografi, page setup, window bounds, last directory. |
| `recent.json` | Recent files, pin, timestamp, ukuran. |
| `session.json` | Draft pemulihan (hanya saat dokumen dirty). |
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

\* CSP berbasis meta selalu ada di HTML production; `DOCFLOW_CSP_ENABLED` mengatur header CSP
tambahan dari main process. Isi `.env.example` memakai `true` secara eksplisit.

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

Saat ini terdapat **58 unit test** yang mencakup:

- `FileService` — read/write, konflik mtime, callback, binary read, path traversal.
- `RecentFilesService` — dedupe, cap unpinned, pin, TTL, persistence, listener.
- `SettingsService` — default, migrasi v0, validasi, merge bounds, reset, persistence.
- `SessionService` — round-trip, clear, malformed draft.
- `markdownParser` — heading ID unik, sanitasi XSS, callout, code block, ekstraksi fence.
- `documentStats` — hitungan kata/kalimat/paragraf/heading/link/gambar, format bytes/waktu.

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
`.md`, `.markdown`, dan `.txt`. `npm run package` juga menghasilkan `release/SHA256SUMS`.

> Build Linux sebaiknya dijalankan di Linux. Build Windows dari Linux/macOS memerlukan Wine.
> Code signing dan auto-update belum dikonfigurasi pada tahap awal ini.

---

## Batasan tahap awal

- **Direct PDF** adalah raster (html2canvas). Gunakan **PDF via Print** untuk teks selectable.
- Paged preview adalah kartu halaman visual, bukan pagination CSS penuh per halaman.
- DOCX dibuat dari parser Markdown internal; markup yang sangat kompleks (mis. HTML mentah,
  nested table ekstrem) dapat disederhanakan.
- Provider file bersifat lokal. Kontrak `FileProvider` sudah plug-and-play, tetapi provider cloud
  belum diimplementasikan.
- Auto-update, code signing, dan CI/CD release pipeline belum disertakan.
- Build Linux belum diuji dari lingkungan Windows ini.
- Migrasi database/state lintas versi besar belum diperlukan pada versi 0.1.0.

---

## Lisensi

MIT © 2026 DocFlow. Lihat [LICENSE](LICENSE).

Dokumen panduan pengguna lengkap ada di [docs/USER_GUIDE.md](docs/USER_GUIDE.md).
