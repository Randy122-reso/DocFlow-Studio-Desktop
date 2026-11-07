### 🎯 4 Penyebab Utama Scroll Patah-Patah (Stuttering)

#### 1. "Bom Waktu" di Virtual Gutter (`DocumentEditor.tsx`)
Di changelog Anda menulis *"editor scroll paint is throttled with requestAnimationFrame"*. Sayangnya, `requestAnimationFrame` (rAF) **tidak akan menolong** jika di dalamnya Anda tetap memanggil `setState` React.

Jika Anda masih melakukan ini saat scroll:
```tsx
const handleScroll = (event) => {
  const st = event.currentTarget.scrollTop;
  setScrollTop(st); // ❌ INI PENYEBAB UTAMA SCROLL PATAH-PATAH
}
```
**Kenapa?** Setiap kali `setScrollTop` terpanggil, React akan melakukan re-render pada seluruh komponen `DocumentEditor`. React harus menghitung ulang `visibleStart`, `visibleEnd`, dan melakukan `.map()` ulang pada `visibleLines`. Proses pembuatan dan penghancuran DOM node untuk nomor baris (gutter) puluhan kali per detik ini memakan CPU yang sangat besar, sehingga frame drop dan scroll terasa tersendat.

**Solusi Mutlak (Imperative Scrolling):**
Jangan gunakan `useState` untuk scroll. Gunakan `useRef` dan manipulasi DOM secara langsung (imperative).
```tsx
// Di DocumentEditor.tsx
const gutterInnerRef = useRef<HTMLDivElement>(null);

const handleScroll = (event: React.UIEvent<HTMLTextAreaElement>) => {
  const st = event.currentTarget.scrollTop;
  
  // Sinkronisasi scroll langsung ke DOM (0 re-render React)
  if (gutterInnerRef.current) {
    gutterInnerRef.current.style.transform = `translateY(-${st}px)`;
  }
  if (backdropRef.current) {
    backdropRef.current.scrollTop = st;
  }
};

// Di dalam JSX, render SEMUA line numbers sekali saja, jangan dipotong (slice)
<div className="editor-gutter" style={{ overflow: 'hidden' }}>
  <div ref={gutterInnerRef}>
    {Array.from({ length: lineCount }).map((_, i) => (
       <div key={i} className="gutter-line">{i + 1}</div>
    ))}
  </div>
</div>
```
*(Catatan: Jika dokumen sangat besar, Anda bisa tetap menggunakan virtualisasi, tapi update posisi `translateY`-nya via DOM, bukan via React state).*

#### 2. CSS `transform: scale()` di `DocumentViewer.tsx`
Di changelog Anda tidak menyinggung perubahan pada `DocumentViewer`. Padahal di kode asli, Anda memiliki:
```tsx
<article style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top left' }}>
```
**Kenapa ini bermasalah?** Menerapkan `transform: scale` pada `<article>` yang berisi ribuan node DOM (seluruh dokumen Markdown) memaksa Chromium untuk merasterisasi ulang seluruh layer gambar (repaint) setiap kali Anda scroll. Browser harus menghitung ulang resolusi teks, yang sangat membebani GPU/CPU.

**Solusi Mutlak:**
Jangan gunakan `transform: scale`. Gunakan **CSS Variables** untuk mengubah ukuran font dan layout secara proporsional, atau jika terpaksa menggunakan scale, tambahkan `will-change: transform` dan bungkus di dalam container yang terisolasi.
```css
/* index.css */
.preview-pane {
  overflow: auto;
  contain: strict; /* Memaksa browser mengisolasi layout scroll agar tidak bocor ke luar */
}
.document-page {
  will-change: transform; /* Beritahu browser untuk optimasi layer */
}
```

#### 3. State Persistence ke Zustand (`App.tsx`)
Di `App.tsx`, Anda memiliki:
```tsx
onScrollTop={(top) => {
  const id = useTabStore.getState().activeTabId
  if (id) useTabStore.getState().updateTab(id, { previewScrollTop: top })
}}
```
Meskipun Anda sudah menambahkan *debounce* 150ms, memanggil `updateTab` di Zustand akan memicu `.map()` pada seluruh array `tabs` di `tabStore.ts`, menciptakan objek baru, dan memicu re-render pada `App.tsx` (karena `activeTab` berubah referensinya). Re-render `App.tsx` akan memicu re-render `DocumentViewer` dan `DocumentEditor`.

**Solusi Mutlak:**
Jangan simpan posisi scroll ke Zustand saat user sedang scroll. Simpan ke `useRef` lokal. Hanya simpan ke Zustand saat user **berpindah tab**, **menutup tab**, atau saat komponen **unmount**.
```tsx
// Di App.tsx
const previewScrollRef = useRef(0);

// Saat scroll, cukup simpan ke ref (tidak memicu re-render)
onScrollTop={(top) => { previewScrollRef.current = top }}

// Simpan ke Zustand hanya saat pindah tab (di useEffect yang memantau activeTabId)
useEffect(() => {
  return () => {
    // Cleanup function: saat tab berubah, simpan posisi scroll tab sebelumnya
    const id = useTabStore.getState().activeTabId;
    if (id) useTabStore.getState().updateTab(id, { previewScrollTop: previewScrollRef.current });
  }
}, [activeTabId]);
```

#### 4. `dangerouslySetInnerHTML` Tanpa `content-visibility`
Di `DocumentViewer.tsx`, Anda merender seluruh HTML Markdown sekaligus:
```tsx
<div className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />
```
Jika dokumen memiliki 100 paragraf, browser harus menghitung layout (reflow) untuk 100 paragraf tersebut, meskipun hanya 5 paragraf yang terlihat di layar. Saat scroll, browser harus melukis (paint) bagian yang sebelumnya tidak terlihat. Ini yang membuat scroll berat.

**Solusi Mutlak (CSS `content-visibility`):**
Tambahkan CSS ini ke `index.css` untuk memberi tahu browser agar melewati rendering elemen yang berada di luar layar.
```css
.markdown-body > * {
  content-visibility: auto;
  contain-intrinsic-size: auto 500px; /* Estimasi tinggi elemen agar scrollbar tidak melompat */
}
```

---

### 🚀 Ringkasan Prioritas Perbaikan untuk v1.6.2

Jika Anda hanya punya waktu untuk memperbaiki satu hal agar scroll langsung terasa *butter-smooth*, **perbaiki `DocumentEditor.tsx` (Hapus `setScrollTop` di event onScroll)**. 

1.  **Ganti `useState` menjadi `useRef` + `translateY` untuk Gutter Editor.** (Dampak: Sangat Besar)
2.  **Hapus `transform: scale()` dan ganti dengan CSS Variables (font-size/margin).** (Dampak: Besar untuk Preview)
3.  **Tambahkan `content-visibility: auto` di CSS Markdown body.** (Dampak: Besar untuk dokumen panjang)
4.  **Hentikan penyimpanan `scrollTop` ke Zustand saat event scroll berlangsung.** (Dampak: Menengah)