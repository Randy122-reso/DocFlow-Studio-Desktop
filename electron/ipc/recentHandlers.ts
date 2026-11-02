import type { Logger } from '../utils/logger'
import type { RecentFilesService } from '../services/RecentFilesService'
import type { RecentFile } from '../types/ipc'
import { registerHandler } from './handle'
import {
  recentAddSchema,
  recentClearSchema,
  recentPinSchema,
  recentRemoveSchema
} from './schemas'

export interface RecentHandlerDeps {
  service: RecentFilesService
  logger: Logger
  onChange: (files: RecentFile[]) => void
}

export function registerRecentHandlers(deps: RecentHandlerDeps): void {
  registerHandler('recent:list', null, deps.logger, async () => deps.service.list())

  registerHandler('recent:add', recentAddSchema, deps.logger, async (input) => {
    const files = await deps.service.add(input)
    deps.onChange(files)
    return files
  })

  registerHandler('recent:remove', recentRemoveSchema, deps.logger, async ({ path }) => {
    const files = await deps.service.remove(path)
    deps.onChange(files)
    return files
  })

  registerHandler('recent:clear', recentClearSchema, deps.logger, async (input) => {
    const files = await deps.service.clear(input?.keepPinned ?? true)
    deps.onChange(files)
    return files
  })

  registerHandler('recent:pin', recentPinSchema, deps.logger, async ({ path }) => {
    const files = await deps.service.togglePin(path)
    deps.onChange(files)
    return files
  })
}
