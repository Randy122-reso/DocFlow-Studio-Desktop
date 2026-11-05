import { z } from 'zod'
import { settingsSchema } from '../services/SettingsService'

const pathString = z.string().min(1).max(8192)
const fileName = z.string().min(1).max(255)

export const pathInputSchema = z.object({ path: pathString })

export const saveSchema = z.object({
  path: pathString,
  content: z.string(),
  expectedMtime: z.number().nullable().optional(),
  createBackup: z.boolean().optional()
})

export const saveAsSchema = z.object({
  content: z.string(),
  defaultName: fileName,
  filters: z
    .array(z.object({ name: z.string().min(1).max(80), extensions: z.array(z.string().min(1).max(16)).min(1) }))
    .optional()
})

export const saveDialogSchema = z.object({
  defaultName: fileName,
  filters: z
    .array(z.object({ name: z.string().min(1).max(80), extensions: z.array(z.string().min(1).max(16)).min(1) }))
    .optional()
})

export const binarySchema = z.object({
  dataBase64: z.string().min(1).max(140_000_000),
  defaultName: fileName,
  filters: z
    .array(z.object({ name: z.string().min(1).max(80), extensions: z.array(z.string().min(1).max(16)).min(1) }))
    .optional()
})

export const binaryPathSchema = binarySchema.extend({
  path: pathString.optional()
})

export const recentAddSchema = z.object({
  path: pathString,
  displayName: z.string().max(255).optional(),
  size: z.number().int().min(0).optional()
})

export const recentRemoveSchema = z.object({ path: pathString })
export const recentClearSchema = z.object({ keepPinned: z.boolean().optional() }).optional()
export const recentPinSchema = z.object({ path: pathString })

export const settingsGetSchema = z.object({ key: z.string().min(1).max(64) })
export const settingsSetSchema = settingsSchema.partial()

export const sessionSaveSchema = z.object({
  filePath: z.string().nullable(),
  fileName: z.string().max(512),
  fileContent: z.string(),
  savedContent: z.string(),
  diskMtime: z.number().nullable(),
  encoding: z.enum(['utf-8', 'utf-8-bom', 'utf-16le']),
  lineEnding: z.enum(['lf', 'crlf', 'cr']),
  dirty: z.boolean(),
  timestamp: z.number()
})

export const dirtySchema = z.object({
  dirty: z.boolean(),
  filePath: z.string().nullable(),
  fileName: z.string().max(512)
})

export const titleSchema = z.object({ title: z.string().max(512) })

export const confirmUnsavedSchema = z.object({ fileName: z.string().max(512) })

export const messageSchema = z.object({
  type: z.enum(['none', 'info', 'error', 'question', 'warning']).optional(),
  title: z.string().max(512).optional(),
  message: z.string().max(4096),
  detail: z.string().max(8192).optional(),
  buttons: z.array(z.string().max(80)).max(6).optional(),
  defaultId: z.number().int().min(0).max(5).optional(),
  cancelId: z.number().int().min(0).max(5).optional()
})

export const externalSchema = z.object({ url: z.string().min(1).max(4096) })
export const folderSchema = z.object({ path: pathString })

/* ── v1.6 additions ───────────────────────────────────────────── */

const tabSnapshotSchema = z.object({
  id: z.string().min(1).max(128),
  filePath: z.string().nullable(),
  displayName: z.string().max(512),
  fileContent: z.string(),
  savedContent: z.string(),
  diskMtime: z.number().nullable(),
  encoding: z.enum(['utf-8', 'utf-8-bom', 'utf-16le']),
  lineEnding: z.enum(['lf', 'crlf', 'cr']),
  isPinned: z.boolean(),
  editorScrollTop: z.number().min(0),
  previewScrollTop: z.number().min(0),
  cursorOffset: z.number().int().min(0),
  selectionEnd: z.number().int().min(0)
})

const sessionWindowSchema = z.object({
  id: z.string().min(1).max(128),
  bounds: z.object({
    width: z.number().int().min(400).max(7680),
    height: z.number().int().min(300).max(4320),
    x: z.number().int().nullable(),
    y: z.number().int().nullable()
  }),
  tabs: z.array(tabSnapshotSchema).max(100),
  activeTabId: z.string().nullable()
})

export const findOptionsSchema = z.object({
  matchCase: z.boolean(),
  matchWholeWord: z.boolean(),
  mode: z.enum(['normal', 'extended', 'regex']),
  dotMatchesNewline: z.boolean(),
  wrapAround: z.boolean(),
  inSelection: z.boolean(),
  backward: z.boolean(),
  extendedUnicode: z.boolean()
})

export const sessionStateSchema = z.object({
  schemaVersion: z.literal(5),
  windows: z.array(sessionWindowSchema).max(20),
  activeWindowId: z.string().nullable(),
  findHistory: z.array(z.string().max(2048)).max(100),
  findOptions: findOptionsSchema
})

export const findInFilesSchema = z.object({
  rootDir: pathString,
  glob: z.string().min(1).max(1024),
  query: z.string().min(1).max(4096),
  replaceWith: z.string().max(4096).optional(),
  options: findOptionsSchema,
  maxResults: z.number().int().min(1).max(100000).optional(),
  dryRun: z.boolean().optional()
})

export const updateChannelSchema = z.object({ channel: z.enum(['stable', 'beta']) })
export const updateInstallSchema = z.object({ restart: z.boolean().optional() }).optional()
export const localeSchema = z.object({ locale: z.enum(['auto', 'id', 'en']) })
export const trayTooltipSchema = z.object({ text: z.string().max(256) })

export const contextMenuSchema = z.object({
  type: z.enum(['editor', 'preview', 'tab']),
  tabId: z.string().max(128).optional(),
  hasSelection: z.boolean().optional(),
  isEditable: z.boolean().optional(),
  isPinned: z.boolean().optional(),
  filePath: z.string().max(8192).nullable().optional()
})

export const detachTabSchema = z.object({
  sourceWindowId: z.string().min(1).max(128),
  tab: tabSnapshotSchema
})

export const tabActionSchema = z.object({
  action: z.string().min(1).max(64),
  tabId: z.string().min(1).max(128)
})

