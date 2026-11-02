export const WELCOME_DOCUMENT = `# Selamat datang di DocFlow Studio

> **Markdown authoring & publication-grade export, now native.**
> Tulis di kiri, lihat hasil cetaknya di kanan, lalu ekspor ke DOCX, PDF, HTML, atau Markdown.

DocFlow Studio Desktop adalah aplikasi **offline-first**. Tidak ada akun, tidak ada cloud, dan tidak ada data yang dikirim keluar dari komputer Anda.

## Mulai dari sini

1. Tekan **Ctrl+O** untuk membuka file \`.md\` dari disk.
2. Ketik di editor; panel kanan diperbarui otomatis.
3. Tekan **Ctrl+S** untuk menyimpan langsung ke file asli.
4. Buka **Export** untuk menghasilkan dokumen siap kirim.

> [!TIP]
> Seret file Markdown ke jendela ini untuk membukanya. Double-click file \`.md\` di Explorer juga akan membuka DocFlow Studio setelah aplikasi di-install.

## Format yang didukung

| Fitur | Contoh | Status |
| :--- | :--- | :--- |
| Heading | \`# Judul\` | Selesai |
| Tabel | GFM tables | Selesai |
| Task list | \`- [x] Selesai\` | Selesai |
| Code block | pagar tiga backtick | Selesai |
| Callout | \`> [!NOTE]\` | Selesai |
| Ekspor DOCX | native Word | Selesai |

### Checklist penulisan

- [x] Judul dan ringkasan
- [x] Struktur heading yang jelas
- [ ] Tambahkan data pendukung
- [ ] Minta review

## Cuplikan kode

\`\`\`typescript
type DocumentStatus = 'draft' | 'review' | 'published'

interface Document {
  title: string
  status: DocumentStatus
  updatedAt: number
}

export function publish(document: Document): Document {
  return { ...document, status: 'published', updatedAt: Date.now() }
}
\`\`\`

## Kutipan

> Desain yang baik terasa seperti tidak ada desain sama sekali.
> — Jan Tschichold

## Callout

> [!IMPORTANT]
> Simpan dokumen secara berkala. DocFlow juga menulis draft pemulihan otomatis setiap lima detik saat ada perubahan yang belum disimpan.

## Tabel data

| Bahasa | Ekstensi | Paradigma |
| :--- | :--- | :--- |
| TypeScript | \`.ts\` | Multi-paradigma |
| Python | \`.py\` | Prosedural, OOP |
| Rust | \`.rs\` | Sistem, aman |
| Go | \`.go\` | Konkuren |

## Langkah berikutnya

- Coba ganti **tema dokumen** (Modern, Academic, Minimal, Editorial, Legal).
- Atur ukuran halaman, margin, dan nada kertas dari panel **Document Settings**.
- Buka **Zen Review** untuk membaca tanpa gangguan.
- Ekstrak semua code block dari menu **Code Scripts**.

---

*Dibuat dengan DocFlow Studio Desktop — offline, fokus, dan siap cetak.*
`

export const SAMPLE_DOCUMENTS: Array<{ name: string; content: string }> = [
  {
    name: 'Release Notes',
    content: `# Release Notes — v0.1.0

## Highlights

- Native save-in-place dengan atomic write
- File association \`.md\` untuk Windows dan Linux
- Recent files dengan pin dan pembersihan otomatis
- Crash recovery draft setiap 5 detik

## Perbaikan

- Preview kini mempertahankan ID heading yang stabil
- Tabel lebar tidak lagi memotong halaman
- Dialog konflik eksternal mendeteksi perubahan mtime

## Catatan

> [!WARNING]
> Build v0.1.0 belum ditandatangani secara digital. Verifikasi checksum sebelum menjalankan installer.
`
  },
  {
    name: 'Meeting Notes',
    content: `# Catatan Rapat — Product Review

**Tanggal:** 2 November 2026  
**Peserta:** Product, Design, Engineering

## Agenda

1. Review milestone F1
2. Prioritas bug
3. Rencana beta

## Keputusan

- [x] Beta dirilis tanpa code signing
- [x] Linux AppImage masuk artefak rilis
- [ ] Auto-update ditunda ke F2

## Action items

| Owner | Item | Deadline |
| :--- | :--- | :--- |
| Rani | Uji file association di Windows 11 | 8 Nov |
| Bima | Audit CSP production | 9 Nov |
| Sari | Tulis user guide | 10 Nov |
`
  }
]
