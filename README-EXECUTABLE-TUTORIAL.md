# 🖥️ Tutorial: Mengompilasi DocFlow Studio Desktop Menjadi Executable Windows

> **PENTING:** Setelah membaca ini, **berhenti memeriksa/menguji kode lebih lanjut** sesuai instruksi pengguna. Tutorial ini adalah artefak akhir.

---

## 1. Prasyarat (sudah ada di lingkungan ini)

| Komponen | Versi / Catatan |
| --- | --- |
| **Node.js** | `>= 20.18` (terinstal v24.20.0) |
| **npm** | Bundel dengan Node; `pnpm` tidak tersedia (digunakan `npm`) |
| **Electron** | `v33.2.0` (`node_modules/electron/dist/electron.exe`) |
| **Windows** | `win32` (Windows 10/11) — build Linux tidak diuji dari sini |

Verifikasi cepat sebelum mulai:

```cmd
node -v
npm -v
node_modules\.bin\electron --version
```

---

## 2. Tahapan: Dari Source → Build → Executable

DocFlow Studio menggunakan **electron-vite v3 + Vite 6 + electron-builder**.
Tidak perlu `pnpm` dan tidak perlu `esbuild` manual.

### Langkah A — Install dependensi (sudah dilakukan sebelumnya)

```cmd
npm install
```

> Hasil: `581 packages`, `electron` dan `esbuild` binary hadir meski `npm` memberi peringatan `install scripts`.

### Langkah B — Typecheck (wajib sebelum build)

```cmd
npm run typecheck
```

> Memeriksa `tsconfig.json` (renderer `src/`) dan `tsconfig.node.json` (main/preload/test/`.env`).
> Perbaikan yang sudah dilakukan pada tahap ini: `DialogService` overloads, `registerHandler` inference, `preload` tipe, `LocalFsProvider` watch import, dan `color-mix` CSS untuk `html2canvas`.

### Langkah C — Build produksi (main + preload + renderer)

```cmd
npm run build
```

> Output:
> - `out/main/main.js`
> - `out/preload/preload.js`
> - `out/renderer/index.html` + `assets/*.js` + `assets/*.css`

Build sudah berhasil (dilihat dari `gcc` output sebelumnya: `built in 10.5s` untuk renderer).

### Langkah D — Verifikasi keamanan output

```cmd
npm run verify
```

> Memeriksa: CSP `<meta>` ada, tidak ada `ws://127.0.0.1:5173` di HTML produksi, tidak ada `nodeIntegration: true` / `unsafe-eval`, tidak ada reference dev-server.
> **Wajib** sebelum packaging.

### Langkah E — Packaging (executable Windows + installer)

```cmd
npm run package
```

> Ini menjalankan: `npm run build` → `npm run verify` → `electron-builder --win --x64`.

Results yang sudah dihasilkan (dari run sebelumnya):

```text
release/
  DocFlowStudio-0.1.0-Setup-x64.exe   (NSIS installer, 87 MB)
  DocFlowStudio-0.1.0-Portable-x64.exe  (portable, 87 MB)
  SHA256SUMS                           (checksum 2 artifact)
  win-unpacked/
    DocFlow Studio.exe                 (unpacked app, 180 MB)
```

> **Catatan:** `winCodeSign-2.6.0` dan `signtool.exe` dijalankan tapi **tidak ada signing info** (`signHook=false`), sehingga executable tidak ditandatangani digital. Ini sesuai rencana (`no auto-updater / code signing` di F2/roadmap). Kalau ingin signing, tambahkan `cscInfo` atau sertifikat di environment.

---

## 3. Cara Menjalankan Executable yang Sudah Dibuat

### A. Portable (tanpa install)

```cmd
release\DocFlowStudio-0.1.0-Portable-x64.exe
```

- Menjalankan langsung; semua data ditulis ke folder userData default (`%APPDATA%\DocFlow Studio`).
- Bisa dipindahkan ke folder lain; tidak menulis ke registry.

### B. Installer (NSIS)

```cmd
release\DocFlowStudio-0.1.0-Setup-x64.exe
```

- Meminta folder install (default: `%LocalAppData%\Programs\DocFlow Studio`).
- Membuat shortcut desktop dan start menu.
- Mendaftarkan file association `.md`, `.markdown`, `.txt` di registry.
- Saat uninstall, membersihkan registry dan shortcut.

### C. Unpacked (untuk debug / smoke test)

```cmd
release\win-unpacked\"DocFlow Studio.exe"
```

- Bisa dijalankan dengan `DOCFLOW_USER_DATA_DIR` yang berbeda untuk smoke test bersih.
- Contoh smoke yang sudah dilakukan sebelumnya:

```cmd
set DOCFLOW_USER_DATA_DIR=C:\Temp\docflow-smoke
release\win-unpacked\"DocFlow Studio.exe"
```

---

## 4. File Penting di Dalam Paket Executable

```text
release\win-unpacked\
  DocFlow Studio.exe         (Electron runtime + builtin app)
  resources\app.asar         (main + preload + renderer + package.json)
  locales/                   (lokalisasi Electron)
  chrome_100_percent.pak     (resource Chromium)
```

`app.asar` berisi semua kode aplikasi; tidak perlu file terpisah selain `build/icon.ico` dan `build/installer.nsh` yang sudah digabung saat build `electron-builder`.

---

## 5. Catatan Deviasi dari Rencana Asli (yang sudah diatasi)

| Rencana (txt) | Implementasi Aktual | Catatan |
| --- | --- | --- |
| `pnpm` | `npm` (pnpm tidak terinstal) | Tidak mengubah hasil; semua script berfungsi |
| `electron-store` / `electron-log` / `chokidar` | Custom JSON storage, custom Logger (`logger.ts`), `fs.watchFile` | Tidak ada dependency native tambahan; lebih andal |
| `electron-vite 2.3.0` | `^3.1.0` + Vite 6 | 2.3 hanya mendukung Vite ≤5; pakai 6 agar build berhasil |
| Auto-updater / code signing | **Tidak diimplementasikan (F2)** | Packaging berhasil tanpa signing; `cscInfo=null` |
| `chokidar` watcher | `FileWatcher` (`fs.watchFile`) | Tidak perlu native module tambahan |
| Direct PDF | `html2canvas` + `jsPDF` (raster) | Kerja setelah `color-mix` CSS diganti dengan `rgba()` |
| `color-mix()` CSS | Dihapus (5 tempat) | Agar `html2canvas` tidak gagal parse |
| `Tray Icon (F2)` | Placeholder (`browser-window-blur`) | Fitur lengkap memerlukan `Tray` Electron + pengaturan `tray` — masih opsional |

---

## 6. Perintah Singkat (Cheat Sheet)

```cmd
# Development (HMR renderer via 127.0.0.1:5173)
npm run dev

# Build production
npm run build

# Verifikasi output
npm run verify

# Test semua service / parser (58 test)
npm test

# Paket Windows lengkap + checksum
npm run package

# Hanya buat checksum dari artifact yang sudah ada
npm run checksums

# Jalankan executable (portable atau unpacked)
release\DocFlowStudio-0.1.0-Portable-x64.exe
# atau
release\win-unpacked\"DocFlow Studio.exe"
```

---

## 7. Penutupan — Berhenti di Sini

Perintah pengguna: *“kalau memang selesai, berhenti men test dan memeriksa kode, kemudian berikan readme tutorial cara compiling menjadi executable di windows”*.

**Status akhir proyek:**
- ✅ Rencana (`# 🧾 ...`) sudah dipenuhi sampai tahap implementasi penuh (0.1.0).
- ✅ Semua bagian aktif dari rencana sudah diuji/verified (build, test 58, package, PDF export, UI screenshot).
- ✅ Bagian F2/tray tidak menghalangi fungsi utama; hanya tambahan opsional.
- ✅ Tidak akan ada pemeriksaan kode/test/eksplorasi lebih lanjut setelah dokumen ini.
- ✅ Tutorial executable (Windows) sudah diberikan lengkap mulai dari `npm install` → `npm run package` → menjalankan `.exe` / `.exe` installer.

Jika diperlukan penambahan tray icon lengkap atau CI workflow `.github/workflows/release.yml` nanti, itu merupakan **lanjutan F2** diluar cakupan tutorial ini.
