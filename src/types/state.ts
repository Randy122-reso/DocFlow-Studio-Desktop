export interface UIState {
  zoomLevel: number // 50 - 200
  isPagedMode: boolean // Paged vs Continuous
  autoScroll: boolean // Preview ikut scroll saat ngetik
  syncScrollWithToc: boolean // Klik TOC -> Editor & Preview sinkron
}
