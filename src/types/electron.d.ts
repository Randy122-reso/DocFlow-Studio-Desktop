import type { DocFlowApi } from '../../electron/types/api'

declare global {
  interface Window {
    docflow: DocFlowApi
  }
}

export {}
