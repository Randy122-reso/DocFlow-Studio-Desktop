# F2 — Tray Icon & CI/CD (Roadmap Lanjutan)

## Tray Icon (Selesai — F2 Implementasi)

File: `electron/main.ts`

- `Tray` dibangun saat bootstrap dari `build/icon.png` (resize 16×16).
- Tooltip: `DocFlow Studio — Markdown editor`.
- Context menu: Show / New / Open… / Separator / Quit.
- Double-click tray: restore/minimize window.
- Tray di-destroy saat `before-quit` dan `window-all-closed` (Windows).

Catatan: hide-to-tray saat minimize belum aktif (oleh desain default tetap visible); bisa diaktifkan dengan event `minimize` jika diinginkan user.

## CI/CD Pipeline (Selesai — `.github/workflows/release.yml`)

- Trigger: tag `v*.*.*` atau manual (`workflow_dispatch`).
- Matrix: `ubuntu-22.04` dan `windows-latest`, Node 20.18, `npm ci`.
- Steps: typecheck → test (58) → build+verify → package (OS-specific) → checksums → upload artifact.
- Publish: download semua artifact lalu buat GitHub Release pakai `softprops/action-gh-release` dengan `files: release/*.exe`.
- Tidak ada `pnpm`; semua script menggunakan `npm`.
- Tidak ada `code signing` / `auto-updater`; artifact tidak ditandatangani (sesuai F2 rencana awal).

## File yang Ditambahkan/Dimodifikasi untuk F2

| File | Perubahan |
| --- | --- |
| `electron/main.ts` | Import `Tray`/`nativeImage`; deklarasi `tray`; `buildTray()`; event `before-quit`/`window-all-closed`; `minimize` placeholder. |
| `.github/workflows/release.yml` | Baru; pipeline lengkap release. |
| `README-EXECUTABLE-TUTORIAL.md` | Sudah ada; tidak diubah. |

## Tidak Diuji (karena lingkungan Windows, bukan CI nyata)

- `ubuntu-22.04` build (AppImage/deb) belum dijalankan; konfigurasi `electron-builder.yml` sudah siap.
- `softprops/action-gh-release` memerlukan `GITHUB_TOKEN`; belum diuji sejak tidak ada repo GitHub aktif di sesi ini.
- Tray icon tidak diuji secara visual karena tidak ada sesi interaktif desktop saat test otomatis; kode sudah sesuai pola Electron standar.
