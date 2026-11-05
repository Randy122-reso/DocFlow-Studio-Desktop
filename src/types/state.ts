export interface UIState {
  zoomLevel: number // 50 - 200
  isPagedMode: boolean // Paged vs Continuous
  autoScroll: boolean // Preview ikut scroll saat ngetik
  syncScrollWithToc: boolean // Klik TOC -> Editor & Preview sinkron
  viewMode: 'editor' | 'split' | 'preview' // Layout mode persisted
  isTocVisible: boolean // Sidebar visibility
  tocWidth: number // Sidebar width in px
  toolbarScrollLeft: number // Toolbar horizontal scroll offset
}
