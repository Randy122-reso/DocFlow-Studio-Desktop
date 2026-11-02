# DocFlow Studio Desktop — Panduan Pengguna

Panduan ini menjelaskan cara memakai DocFlow Studio Desktop sehari-hari: menulis, mengatur
tampilan, mengekspor, dan menangani file. Tidak diperlukan pengetahuan teknis.

---

## 1. Membuka aplikasi

Jalankan **DocFlow Studio** dari Start Menu / desktop shortcut (Windows) atau aplikasi menu
(Linux). Untuk development:

```bash
npm install
npm run dev
```

Saat pertama dibuka, aplikasi menampilkan dokumen contoh. Anda bisa langsung menulis atau
membuka file sendiri.

### Membuka dokumen

Ada beberapa cara:

- **Ctrl + O** atau menu **File → Open…**.
- Klik **Open** di toolbar.
- **Drag & drop** file `.md`, `.markdown`, atau `.txt` ke jendela aplikasi.
- Double-click file Markdown di file manager (setelah aplikasi dipasang dan file association aktif).
- Pilih dari **Open Recent** di menu File atau daftar recent di toolbar.

Jika dokumen yang sedang terbuka belum disimpan, aplikasi akan menanyakan
**Save / Discard / Cancel** sebelum berpindah dokumen.

---

## 2. Menulis

Editor berada di kiri (mode split) atau memenuhi jendela (mode editor). Preview di kanan
diperbarui saat Anda mengetik.

### Mode tampilan

Gunakan tombol tampilan di toolbar:

- **Editor** — hanya editor, cocok untuk menulis cepat.
- **Split** — editor dan preview berdampingan (default).
- **Preview** — hanya hasil render, cocok untuk memeriksa tampilan akhir.

### Toolbar format

| Tombol | Markdown | Fungsi |
| --- | --- | --- |
| B | `**teks**` | Bold |
| I | `_teks_` | Italic |
| S | `~~teks~~` | Strikethrough |
| `<>` | `` `kode` `` | Inline code |
| Code block | ` ``` ` | Blok kode (default TypeScript) |
| H1/H2/H3 | `#` / `##` / `###` | Heading |
| Quote | `>` | Blockquote |
| Bullet | `-` | Unordered list |
| Numbered | `1.` | Ordered list |
| Task | `- [ ]` | Checklist |
| Link | `[teks](url)` | Hyperlink |
| Image | `![alt](url)` | Gambar |
| Table | pipe table | Tabel 2×2 |
| HR | `---` | Garis horizontal |

Seleksi teks terlebih dahulu untuk membungkus teks yang ada; jika tidak ada seleksi,
placeholder akan disisipkan dan bisa langsung diganti.

### Callout

Gunakan blockquote dengan label khusus:

```markdown
> [!NOTE]
> Informasi tambahan yang berguna.

> [!WARNING]
> Peringatan penting.
```

Label yang didukung: `NOTE`, `TIP`, `IMPORTANT`, `WARNING`, `CAUTION`.

### Code block

````markdown
```typescript
const answer = 42
```
````

Preview menampilkan toolbar bahasa dan tombol **Copy**. Klik ikon **Code** di toolbar untuk
membuka **Code Script**:

- Pilih blok kode yang ingin diambil.
- Ganti atau deteksi bahasa.
- **Copy** isi blok.
- **Download** sebagai file source dengan ekstensi sesuai bahasa.

---

## 3. Table of contents & statistik

Panel kiri menampilkan:

- Daftar heading (H1–H6) yang bisa diklik untuk scroll ke bagian tersebut.
- Statistik dokumen: kata, karakter, kalimat, paragraf, heading, code block, link, gambar,
  dan estimasi waktu baca.

Sembunyikan/tampilkan panel dengan **Ctrl + \\** atau tombol TOC di toolbar. ID heading dibuat
unik otomatis, termasuk saat ada judul yang sama.

---

## 4. Mengatur tampilan dokumen

Buka **Document Settings** dari toolbar atau menu **View → Document Settings**.

### Theme

| Tema | Karakter |
| --- | --- |
| **Modern** | Bersih, kontemporer, aksen amber. |
| **Academic** | Serif, terstruktur, formal. |
| **Minimal** | Tipografi tenang, banyak ruang. |
| **Editorial** | Gaya majalah dengan display type. |
| **Legal** | Padat, bernomor, berwibawa. |

### Tipografi & halaman

- **Font size**: Small / Medium / Large.
- **Font family**: Sans / Serif / Display / Mono.
- **Page size**: A4 atau Letter.
- **Margins**: Compact / Normal / Spacious.
- **Paper tone**: White / Cream / Dark.

### Opsi

- **Header & footer** — judul dokumen dan tanggal di atas, tanggal di bawah.
- **Page numbers** — nomor halaman di footer.
- **Number headings** — penomoran hierarkis otomatis untuk H2 ke bawah.
- **Justify text** — rata kiri-kanan.

Pengaturan langsung diterapkan ke preview dan disimpan otomatis. Tombol **Reset defaults**
mengembalikan pengaturan dokumen ke default tanpa mengubah ukuran/posisi window.

> Pengaturan ini bersifat global untuk aplikasi, bukan per file.

---

## 5. Menyimpan

### Save (Ctrl + S)

- Jika dokumen sudah punya path, **Save** menulis langsung ke file tersebut.
- Jika belum, dialog **Save As** terbuka.
- Encoding dan line ending file asli dipertahankan (UTF-8, UTF-8 BOM, UTF-16LE; LF/CRLF/CR).

### Save As (Ctrl + Shift + S)

Selalu membuka native save dialog dan memindahkan sesi ke path baru. File lama tidak dihapus.

### Indikator perubahan

- Titik **•** pada judul window menandakan ada perubahan belum disimpan.
- Status bar menunjukkan path, encoding, line ending, posisi kursor, dan statistik.
- Menutup window dengan perubahan belum disimpan akan memunculkan pilihan
  **Save / Discard / Cancel**.

### Recent files

Daftar recent tersedia di toolbar dan menu **File → Open Recent**.

- Klik item untuk membuka.
- **Pin** untuk mempertahankan item saat daftar dibersihkan atau kedaluwarsa.
- **Remove** untuk menghapus satu item.
- **Clear** menghapus item tidak di-pin; item pin tetap ada.

Recent file unpinned lebih lama dari 90 hari (default) akan dipangkas otomatis.

---

## 6. Recovery & konflik

### Draft recovery

Saat ada perubahan belum disimpan, aplikasi menyimpan draft pemulihan secara berkala
(debounce 1,5 detik dan interval 5 detik). Jika aplikasi crash atau tertutup paksa, draft
akan ditawarkan saat aplikasi dibuka kembali:

- **Restore draft** — lanjutkan dari draft.
- **Open original** — buka versi terakhir di disk.
- **Discard** — hapus draft.

Draft dihapus otomatis setelah dokumen berhasil disimpan atau saat pengguna memilih discard.

### File berubah di luar aplikasi

Jika file diubah oleh editor lain, muncul banner:

- **Reload from disk** — muat ulang isi file (perubahan lokal yang belum disimpan akan
  dikonfirmasi lebih dulu).
- **Keep editing** — abaikan perubahan eksternal dan lanjut menulis.

Saat menyimpan, aplikasi membandingkan mtime file. Jika file berubah sejak terakhir dibaca,
muncul dialog konflik:

- **Overwrite** — tulis versi Anda dan timpa perubahan di disk.
- **Reload** — buang perubahan lokal dan muat versi disk.
- **Save As** — simpan versi Anda ke file baru.
- **Cancel** — kembali tanpa menyimpan.

---

## 7. Export

Buka **Ctrl + E**, toolbar **Export**, atau menu **File → Export…**.

| Format | Kapan dipakai |
| --- | --- |
| **Word Document (.docx)** | Dokumen kantor yang perlu diedit di Word; mendukung style, tabel, header/footer, page number. |
| **PDF via Print** | PDF teks selectable; memakai dialog print Chromium (bisa pilih printer virtual "Save as PDF"). |
| **Direct PDF** | PDF cepat berupa snapshot halaman; cocok untuk preview/share, teks tidak selectable. |
| **Word HTML (.doc)** | Kompatibilitas lama Word/LibreOffice tanpa library DOCX. |
| **Standalone HTML (.html)** | Publikasi web satu file dengan style tertanam. |
| **Markdown (.md)** | Source Markdown apa adanya. |

Setelah selesai, dialog menampilkan path hasil dan tombol **Show in folder**.

### Tips kualitas export

- Pilih **PDF via Print** jika dokumen berisi banyak teks dan perlu bisa dicari/di-copy.
- **Direct PDF** merender elemen preview; pastikan mode **Split** atau **Preview** aktif agar
  preview tersedia. Jika preview belum tampil, aplikasi otomatis beralih ke split.
- Untuk DOCX, gunakan Markdown yang relatif sederhana (heading, paragraf, list, tabel, code,
  blockquote, link, gambar). HTML mentah yang kompleks bisa disederhanakan.
- Nama file hasil dibersihkan dari karakter terlarang dan dibatasi 80 karakter.

---

## 8. Zen Review

Tekan **F11** atau klik **Zen** untuk membaca dokumen tanpa toolbar dan panel. Di dalam Zen
Review Anda dapat mengganti tema. Tekan **Esc** untuk keluar.

---

## 9. Keyboard shortcuts

| Shortcut | Fungsi |
| --- | --- |
| `Ctrl + N` | Dokumen baru |
| `Ctrl + O` | Buka dokumen |
| `Ctrl + S` | Simpan di tempat |
| `Ctrl + Shift + S` | Save As |
| `Ctrl + E` | Dialog export |
| `Ctrl + F` | Fokus ke editor |
| `Ctrl + \\` | Toggle table of contents |
| `Ctrl + /` | Daftar shortcut |
| `F11` | Zen Review |
| `Esc` | Tutup modal / keluar Zen |
| `Tab` | Sisipkan dua spasi di editor |

Pada macOS, gunakan `Cmd` sebagai pengganti `Ctrl`.

---

## 10. File association & single instance

Setelah dipasang dengan installer Windows:

- File `.md`, `.markdown`, dan `.txt` dapat dibuka dengan DocFlow Studio dari file manager.
- Jika aplikasi sudah berjalan, file yang di-double-click akan dibuka di window yang sama.
- Argumen path dari command line juga didukung:

```bash
"DocFlow Studio.exe" "C:\Documents\catatan.md"
```

Di Linux, file association tersedia melalui MIME type `text/markdown` dan `text/plain` pada
paket AppImage/deb (tergantung desktop environment).

---

## 11. Troubleshooting

### File tidak bisa dibuka

- Pastikan ekstensinya didukung dan ukurannya di bawah batas (default 50 MB).
- File harus berupa file biasa, bukan folder, device, atau symlink yang tidak valid.
- Coba buka lewat **File → Open…** untuk memastikan path valid.

### Save gagal / konflik terus muncul

- Tutup aplikasi lain yang mungkin menulis file yang sama.
- Gunakan **Reload** untuk mengambil versi terbaru, atau **Save As** ke path baru.
- Periksa izin tulis folder tujuan.

### Draft tidak muncul setelah crash

- Draft hanya disimpan jika dokumen berstatus dirty (ada perubahan belum disimpan).
- Folder `userData` harus bisa ditulis. Jalankan dengan `DOCFLOW_USER_DATA_DIR` ke folder
  yang pasti dapat ditulis saat testing.
- Draft dapat dihapus jika aplikasi sempat menyimpan dokumen dengan sukses.

### Direct PDF gagal atau tampak aneh

- Gunakan **PDF via Print** sebagai alternatif yang lebih stabil.
- Pastikan mode preview aktif dan dokumen tidak sedang di tengah render besar.
- Tema gelap menghasilkan background gelap pada PDF direct; pilih paper tone white/cream
  untuk dokumen cetak.

### Log

Log ada di `<userData>/logs/main-YYYY-MM-DD.log`. Log hanya mencatat event file (nama dan
ukuran), bukan isi dokumen. Sertakan log terbaru saat melaporkan bug.

---

## 12. Privasi

DocFlow Studio bekerja sepenuhnya offline:

- Tidak ada telemetry, akun, atau sinkronisasi cloud.
- Dokumen tidak pernah dikirim ke jaringan.
- External link hanya dibuka di browser setelah host ada di allow-list.
- Recovery, settings, dan recent files disimpan lokal di folder `userData`.

---

## 13. Untuk developer

Lihat [README.md](../README.md) untuk arsitektur, script build, konfigurasi environment,
dan cara menjalankan test. Kontrak `FileProvider` memungkinkan penambahan provider baru
(mis. cloud storage) tanpa mengubah renderer.
