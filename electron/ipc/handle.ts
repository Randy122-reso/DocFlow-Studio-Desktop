import { ipcMain } from 'electron'
import type { z } from 'zod'
import type { Logger } from '../utils/logger'
import { serializeError, toIpcError } from '../utils/errors'

export function registerHandler<Input, Output>(
  channel: string,
  schema: z.ZodType<Input, z.ZodTypeDef, unknown> | null,
  logger: Logger,
  handler: (input: Input) => Output | Promise<Output>
): void {
  ipcMain.handle(channel, async (_event, payload: unknown) => {
    try {
      const input = schema ? schema.parse(payload) : (payload as Input)
      return await handler(input)
    } catch (error) {
      const serialized = serializeError(error)
      logger.error(`IPC ${channel} failed`, serialized)
      throw toIpcError(error)
    }
  })
}

export function broadcast(sender: Electron.WebContents | null, channel: string, payload: unknown): void {
  if (!sender || sender.isDestroyed()) return
  sender.send(channel, payload)
}
