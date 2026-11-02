import type { Logger } from '../utils/logger'
import type { DialogService } from '../services/DialogService'
import { registerHandler } from './handle'
import { confirmUnsavedSchema, messageSchema } from './schemas'

export interface DialogHandlerDeps {
  dialogs: DialogService
  logger: Logger
  getWindow: () => Electron.BrowserWindow | null
}

export function registerDialogHandlers(deps: DialogHandlerDeps): void {
  registerHandler('dialog:confirmUnsaved', confirmUnsavedSchema, deps.logger, async ({ fileName }) => {
    return deps.dialogs.confirmUnsaved(deps.getWindow(), fileName)
  })

  registerHandler('dialog:message', messageSchema, deps.logger, async (input) => {
    return deps.dialogs.message(deps.getWindow(), input)
  })
}
