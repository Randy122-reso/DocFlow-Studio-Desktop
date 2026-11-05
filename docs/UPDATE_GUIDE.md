# DocFlow Studio — Update & Auto-Update Guide

Dokumen ini menjelaskan cara memperbarui DocFlow Studio Desktop ke versi terbaru, baik melalui
proses **manual** maupun **auto-update** built-in.

---

## 1. Auto-Update (built-in)

DocFlow Studio terintegrasi dengan [`electron-updater`](https://www.electron.build/app/updater) melalui
provider **GitHub Releases**. Saat aplikasi berjalan, DocFlow akan:

1. Mencari update di feed stable: `https://releases.docflow.app/updates/latest.yml`.
2. Jika tersedia update, menampilkan **UpdateBanner** di bagian atas editor.
3. User dapat memilih **Download** atau **Install** (atau **Skip** / **Dismiss** untuk sementara).

Jalur update (channel):

| Channel | Feed | Keterangan |
| --- | --- | --- |
| **Stable** | `https://releases.docflow.app/updates/latest.yml` | Rilis utama. |
| **Beta** | `https://releases.docflow.app/updates/beta/latest.yml` | Rilis pre-release. |

### Persyaratan

- Build produksi memakai konfigurasi signing dengan algoritma **SHA-256**
  (`signingHashAlgorithms` di `electron-builder.yml`).
- `DOCFLOW_UPDATE_REQUIRE_SIGNATURE=true` pada environment produksi; update dengan signature yang tidak
  valid akan ditolak.
- Auto-check update dijadwalkan **30 detik** setelah aplikasi mulai.

### Perilaku

- Update hanya berjalan dari **stable** channel oleh default.
- Saat update berhasil diunduh, aplikasi akan menawarkan **Restart & Install**.
- Jika pembaruan gagal, error akan ditampilkan melalui toast/panel **Update** dan dapat dicoba ulang.

---

## 2. Pembaruan Manual (Offline)

Jika auto-update tidak tersedia atau network tidak mendukung:

1. Buka **Help → Check for Updates** (atau paket installer baru dari GitHub Releases).
2. Unduh installer yang sesuai:
   - Windows: `DocFlowStudio-<version>-Setup-<arch>.exe` (NSIS) atau `...-Portable-<arch>.exe`.
   - Linux: `DocFlowStudio-<version>-AppImage-<arch>.AppImage` atau `...-<arch>.deb`.
3. Tutup aplikasi, lalu jalankan installer baru.
4. Aplikasi akan mengimpor **session** lama (jika ada) setelah startup.

---

## 3. Checklist pembaruan

- [ ] Backup `settings.json`, `recent.json`, dan `session.json` (sudah ada di folder `userData`).
- [ ] Pastikan `session.json` migrasi ke schema v5 berjalan aman.
- [ ] Setelah update, cek **Document Settings → Update** untuk memastikan preferensi tersimpan.
- [ ] Jalankan `npm run verify` saat build baru.

---

## 4. Troubleshooting

| Gejala | Penyelesaian |
| --- | --- |
| Update tidak muncul | Pastikan feed `releases.docflow.app` dapat diakses; cek koneksi proxy. |
| Update gagal download/install | Hapus cache updater (`%LOCALAPPDATA%/DocFlowStudioUpdater`), lalu coba ulang. |
| Signature mismatch | Pasang ulang sertifikat code signing yang valid; jangan lanjut pakai update tidak tanda tangan. |
| Rollback | Hapus file `session.json`/`settings.json` hanya bila diperlukan; draft lama tidak kompatibel. |

---

Dokumentasi utama: [README.md](../README.md) · [USER_GUIDE.md](USER_GUIDE.md)
