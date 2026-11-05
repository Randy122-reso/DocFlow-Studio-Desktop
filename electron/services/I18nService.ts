import type { Locale, ResolvedLocale } from '../types/ipc'

type Dictionary = Record<string, string>

const EN: Dictionary = {
  'menu.file': 'File',
  'menu.new': 'New',
  'menu.newTab': 'New Tab',
  'menu.open': 'Open…',
  'menu.openRecent': 'Open Recent',
  'menu.noRecent': 'No recent documents',
  'menu.clearRecent': 'Clear Recent',
  'menu.save': 'Save',
  'menu.saveAs': 'Save As…',
  'menu.export': 'Export…',
  'menu.reveal': 'Reveal in File Explorer',
  'menu.closeTab': 'Close Tab',
  'menu.closeOthers': 'Close Other Tabs',
  'menu.closeRight': 'Close Tabs to the Right',
  'menu.closeLeft': 'Close Tabs to the Left',
  'menu.pin': 'Pin Tab',
  'menu.unpin': 'Unpin Tab',
  'menu.copyPath': 'Copy Full Path',
  'menu.moveNewWindow': 'Move to New Window',
  'menu.exit': 'Exit',
  'menu.edit': 'Edit',
  'menu.undo': 'Undo',
  'menu.redo': 'Redo',
  'menu.cut': 'Cut',
  'menu.copy': 'Copy',
  'menu.paste': 'Paste',
  'menu.selectAll': 'Select All',
  'menu.find': 'Find',
  'menu.findInFiles': 'Find in Files',
  'menu.replace': 'Replace',
  'menu.view': 'View',
  'menu.toggleToc': 'Toggle Table of Contents',
  'menu.zen': 'Zen Review',
  'menu.settings': 'Document Settings',
  'menu.language': 'Language',
  'menu.languageAuto': 'Automatic',
  'menu.languageEn': 'English',
  'menu.languageId': 'Bahasa Indonesia',
  'menu.resetZoom': 'Actual Size',
  'menu.zoomIn': 'Zoom In',
  'menu.zoomOut': 'Zoom Out',
  'menu.window': 'Window',
  'menu.minimize': 'Minimize',
  'menu.newWindow': 'New Window',
  'menu.help': 'Help',
  'menu.shortcuts': 'Keyboard Shortcuts',
  'menu.userGuide': 'User Guide',
  'menu.checkUpdates': 'Check for Updates…',
  'menu.about': 'About DocFlow Studio',
  'tray.show': 'Show DocFlow Studio',
  'tray.hide': 'Hide DocFlow Studio',
  'tray.newTab': 'New Tab',
  'tray.recent': 'Recent Files',
  'tray.checkUpdates': 'Check for Updates…',
  'tray.quit': 'Quit DocFlow Studio',
  'tray.tooltip': 'DocFlow Studio — Markdown editor',
  'tray.updateAvailable': 'DocFlow Studio — update available',
  'context.cut': 'Cut',
  'context.copy': 'Copy',
  'context.paste': 'Paste',
  'context.selectAll': 'Select All',
  'dialog.unsavedTitle': 'Unsaved changes',
  'dialog.unsavedMessage': 'Save changes to "{{name}}"?',
  'dialog.unsavedDetail': 'Your changes will be lost if you close without saving.',
  'dialog.save': 'Save',
  'dialog.discard': 'Discard',
  'dialog.cancel': 'Cancel',
  'dialog.pinnedTitle': 'Pinned tab',
  'dialog.pinnedMessage': '"{{name}}" is pinned. Unpin and close it?',
  'dialog.unpinAndClose': 'Unpin and Close',
  'update.checking': 'Checking for updates…',
  'update.available': 'Update v{{version}} is available',
  'update.downloading': 'Downloading update… {{progress}}%',
  'update.ready': 'Update v{{version}} is ready',
  'update.later': 'Later',
  'update.restart': 'Restart to Update',
  'update.skip': 'Skip this version',
  'update.download': 'Download',
  'update.error': 'Update check failed',
  'common.ok': 'OK',
  'common.cancel': 'Cancel',
  'common.close': 'Close'
}

const ID: Dictionary = {
  'menu.file': 'Berkas',
  'menu.new': 'Baru',
  'menu.newTab': 'Tab Baru',
  'menu.open': 'Buka…',
  'menu.openRecent': 'Buka Terbaru',
  'menu.noRecent': 'Belum ada dokumen terbaru',
  'menu.clearRecent': 'Hapus Daftar Terbaru',
  'menu.save': 'Simpan',
  'menu.saveAs': 'Simpan Sebagai…',
  'menu.export': 'Ekspor…',
  'menu.reveal': 'Tampilkan di File Explorer',
  'menu.closeTab': 'Tutup Tab',
  'menu.closeOthers': 'Tutup Tab Lain',
  'menu.closeRight': 'Tutup Tab di Kanan',
  'menu.closeLeft': 'Tutup Tab di Kiri',
  'menu.pin': 'Sematkan Tab',
  'menu.unpin': 'Lepas Sematan Tab',
  'menu.copyPath': 'Salin Path Lengkap',
  'menu.moveNewWindow': 'Pindahkan ke Jendela Baru',
  'menu.exit': 'Keluar',
  'menu.edit': 'Edit',
  'menu.undo': 'Urungkan',
  'menu.redo': 'Ulangi',
  'menu.cut': 'Potong',
  'menu.copy': 'Salin',
  'menu.paste': 'Tempel',
  'menu.selectAll': 'Pilih Semua',
  'menu.find': 'Cari',
  'menu.findInFiles': 'Cari di Berkas',
  'menu.replace': 'Ganti',
  'menu.view': 'Tampilan',
  'menu.toggleToc': 'Tampilkan/Sembunyikan Daftar Isi',
  'menu.zen': 'Mode Zen',
  'menu.settings': 'Pengaturan Dokumen',
  'menu.language': 'Bahasa',
  'menu.languageAuto': 'Otomatis',
  'menu.languageEn': 'English',
  'menu.languageId': 'Bahasa Indonesia',
  'menu.resetZoom': 'Ukuran Asli',
  'menu.zoomIn': 'Perbesar',
  'menu.zoomOut': 'Perkecil',
  'menu.window': 'Jendela',
  'menu.minimize': 'Minimalkan',
  'menu.newWindow': 'Jendela Baru',
  'menu.help': 'Bantuan',
  'menu.shortcuts': 'Pintasan Keyboard',
  'menu.userGuide': 'Panduan Pengguna',
  'menu.checkUpdates': 'Periksa Pembaruan…',
  'menu.about': 'Tentang DocFlow Studio',
  'tray.show': 'Tampilkan DocFlow Studio',
  'tray.hide': 'Sembunyikan DocFlow Studio',
  'tray.newTab': 'Tab Baru',
  'tray.recent': 'Berkas Terbaru',
  'tray.checkUpdates': 'Periksa Pembaruan…',
  'tray.quit': 'Keluar dari DocFlow Studio',
  'tray.tooltip': 'DocFlow Studio — editor Markdown',
  'tray.updateAvailable': 'DocFlow Studio — pembaruan tersedia',
  'context.cut': 'Potong',
  'context.copy': 'Salin',
  'context.paste': 'Tempel',
  'context.selectAll': 'Pilih Semua',
  'dialog.unsavedTitle': 'Perubahan belum disimpan',
  'dialog.unsavedMessage': 'Simpan perubahan pada "{{name}}"?',
  'dialog.unsavedDetail': 'Perubahan Anda akan hilang jika ditutup tanpa menyimpan.',
  'dialog.save': 'Simpan',
  'dialog.discard': 'Buang',
  'dialog.cancel': 'Batal',
  'dialog.pinnedTitle': 'Tab tersemat',
  'dialog.pinnedMessage': '"{{name}}" tersemat. Lepas sematan dan tutup?',
  'dialog.unpinAndClose': 'Lepas Sematan dan Tutup',
  'update.checking': 'Memeriksa pembaruan…',
  'update.available': 'Pembaruan v{{version}} tersedia',
  'update.downloading': 'Mengunduh pembaruan… {{progress}}%',
  'update.ready': 'Pembaruan v{{version}} siap',
  'update.later': 'Nanti',
  'update.restart': 'Mulai Ulang untuk Memperbarui',
  'update.skip': 'Lewati versi ini',
  'update.download': 'Unduh',
  'update.error': 'Pemeriksaan pembaruan gagal',
  'common.ok': 'OK',
  'common.cancel': 'Batal',
  'common.close': 'Tutup'
}

export interface I18nServiceOptions {
  locale: Locale
  systemLocale: string
  dictionaries?: { en: Dictionary; id: Dictionary }
}

export class I18nService {
  private preference: Locale
  private systemLocale: string
  private resolved: ResolvedLocale
  private readonly dictionaries: { en: Dictionary; id: Dictionary }

  constructor(options: I18nServiceOptions) {
    this.preference = options.locale
    this.systemLocale = options.systemLocale
    this.resolved = this.resolve(options.locale)
    this.dictionaries = options.dictionaries ?? { en: EN, id: ID }
  }

  getLocale(): Locale {
    return this.preference
  }

  getResolvedLocale(): ResolvedLocale {
    return this.resolved
  }

  setLocale(locale: Locale): ResolvedLocale {
    this.preference = locale
    this.resolved = this.resolve(locale)
    return this.resolved
  }

  t(key: string, variables: Record<string, string | number> = {}): string {
    const dictionary = this.resolved === 'id' ? this.dictionaries.id : this.dictionaries.en
    const fallback = this.dictionaries.en[key] ?? key
    let value = dictionary[key] ?? fallback
    for (const [name, replacement] of Object.entries(variables)) {
      value = value.replaceAll(`{{${name}}}`, String(replacement))
    }
    return value
  }

  private resolve(locale: Locale): ResolvedLocale {
    if (locale === 'id' || locale === 'en') return locale
    return this.systemLocale.toLowerCase().startsWith('id') ? 'id' : 'en'
  }
}
