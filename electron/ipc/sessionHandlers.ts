import type { Logger } from '../utils/logger'
import { DEFAULT_FIND_OPTIONS, type SessionService } from '../services/SessionService'
import type { FindOptions, SessionState, SessionWindow } from '../types/ipc'
import { registerHandler } from './handle'
import { z } from 'zod'
import { findOptionsSchema, sessionStateSchema } from './schemas'

export interface SessionHandlerDeps {
  service: SessionService
  logger: Logger
  onSaved?: (state: SessionState) => void
}

const windowSchema = sessionStateSchema.shape.windows.element

const saveWindowSchema = z.object({
  window: windowSchema,
  findHistory: z.array(z.string().max(2048)).max(100).optional(),
  findOptions: findOptionsSchema.optional(),
  activeWindowId: z.string().nullable().optional()
})

export function registerSessionHandlers(deps: SessionHandlerDeps): void {
  registerHandler('session:save', saveWindowSchema, deps.logger, async (input) => {
    const current = (await deps.service.readSession()) ?? {
      schemaVersion: 5 as const,
      windows: [],
      activeWindowId: null,
      findHistory: [],
      findOptions: { ...DEFAULT_FIND_OPTIONS }
    }
    const window = input.window as SessionWindow
    const index = current.windows.findIndex((item) => item.id === window.id)
    if (index >= 0) current.windows[index] = window
    else current.windows.push(window)
    if (input.findHistory) current.findHistory = input.findHistory
    if (input.findOptions) current.findOptions = input.findOptions as FindOptions
    if (input.activeWindowId !== undefined) current.activeWindowId = input.activeWindowId
    await deps.service.writeSession(current)
    deps.onSaved?.(current)
    return { ok: true }
  })

  registerHandler('session:load', null, deps.logger, async () => deps.service.readSession())

  registerHandler('session:clear', null, deps.logger, async () => {
    await deps.service.clear()
    return { ok: true }
  })
}
