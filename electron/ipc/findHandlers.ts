import type { Logger } from '../utils/logger'
import type { FileSearchService } from '../services/FileSearchService'
import type { FindInFilesInput } from '../types/ipc'
import { registerHandler } from './handle'
import { findInFilesSchema } from './schemas'

export interface FindHandlerDeps {
  service: FileSearchService
  logger: Logger
}

export function registerFindHandlers(deps: FindHandlerDeps): void {
  registerHandler('find:inFiles', findInFilesSchema, deps.logger, async (input) => {
    return deps.service.search(input as FindInFilesInput)
  })

  registerHandler('find:replaceInFiles', findInFilesSchema, deps.logger, async (input) => {
    if (input.dryRun === undefined) {
      throw new Error('DRY_RUN_REQUIRED: preview changes before writing')
    }
    return deps.service.replaceAll(input as FindInFilesInput)
  })

  registerHandler('find:cancel', null, deps.logger, async () => {
    deps.service.cancel()
    return { ok: true }
  })
}
