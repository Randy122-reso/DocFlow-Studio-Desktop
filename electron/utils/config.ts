import { z } from 'zod'

const booleanFromEnv = z
  .string()
  .optional()
  .transform((value, ctx) => {
    if (value === undefined || value === '') return false
    if (['1', 'true', 'yes', 'on'].includes(value.toLowerCase())) return true
    if (['0', 'false', 'no', 'off'].includes(value.toLowerCase())) return false
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Invalid boolean: ${value}` })
    return z.NEVER
  })

const numberFromEnv = (fallback: number, min = 0, max = Number.MAX_SAFE_INTEGER) =>
  z
    .string()
    .optional()
    .transform((value, ctx) => {
      if (value === undefined || value === '') return fallback
      const parsed = Number(value)
      if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Invalid number: ${value}` })
        return z.NEVER
      }
      return parsed
    })

const envSchema = z.object({
  DOCFLOW_USER_DATA_DIR: z.string().optional(),
  DOCFLOW_LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),
  DOCFLOW_LOG_MAX_FILES: numberFromEnv(10, 1, 100),
  DOCFLOW_LOG_MAX_SIZE_MB: numberFromEnv(20, 1, 1000),
  DOCFLOW_MAX_FILE_SIZE_MB: numberFromEnv(50, 1, 2048),
  DOCFLOW_ENCODING: z.enum(['utf-8', 'utf-8-bom', 'utf-16le']).default('utf-8'),
  DOCFLOW_WATCH_DEBOUNCE_MS: numberFromEnv(250, 50, 10000),
  DOCFLOW_AUTOSAVE_DEBOUNCE_MS: numberFromEnv(1500, 100, 60000),
  DOCFLOW_RECOVERY_INTERVAL_MS: numberFromEnv(5000, 500, 120000),
  DOCFLOW_RECENT_MAX: numberFromEnv(20, 1, 200),
  DOCFLOW_RECENT_TTL_DAYS: numberFromEnv(90, 1, 3650),
  DOCFLOW_MAX_TABS: numberFromEnv(30, 1, 100),
  DOCFLOW_MAX_WINDOWS: numberFromEnv(5, 1, 20),
  DOCFLOW_FIND_HISTORY_MAX: numberFromEnv(20, 1, 100),
  DOCFLOW_FIND_MAX_RESULTS: numberFromEnv(10000, 1, 100000),
  DOCFLOW_FIND_IN_FILES_MAX_FILE_SIZE_MB: numberFromEnv(5, 1, 100),
  DOCFLOW_FIND_IN_FILES_TIMEOUT_MS: numberFromEnv(5000, 100, 60000),
  DOCFLOW_FIND_GLOB_DEFAULT: z.string().default('**/*.{md,markdown,txt}'),
  DOCFLOW_DEFAULT_LOCALE: z.enum(['auto', 'id', 'en']).default('auto'),
  DOCFLOW_UPDATE_CHANNEL: z.enum(['stable', 'beta']).default('stable'),
  DOCFLOW_UPDATE_FEED_URL: z.string().default('https://releases.docflow.app/updates'),
  DOCFLOW_UPDATE_CHECK_DELAY_MS: numberFromEnv(30000, 0, 3600000),
  DOCFLOW_UPDATE_CHECK_INTERVAL_MS: numberFromEnv(3600000, 60000, 86400000),
  DOCFLOW_UPDATE_REQUIRE_SIGNATURE: z.string().optional(),
  DOCFLOW_TRAY_ENABLED: z.string().optional(),
  DOCFLOW_TRAY_MINIMIZE_ON_CLOSE: z.string().optional(),
  DOCFLOW_TRAY_START_MINIMIZED: z.string().optional(),
  DOCFLOW_CSP_ENABLED: booleanFromEnv,
  DOCFLOW_ALLOWED_EXTERNAL: z.string().default('github.com,www.github.com,wikipedia.org,www.wikipedia.org'),
  DOCFLOW_DEVTOOLS_ENABLED: booleanFromEnv,
  DOCFLOW_E2E_MODE: booleanFromEnv,
  DOCFLOW_E2E_SAVE_PATH: z.string().optional()
})

export interface AppConfig {
  userDataDir?: string
  logLevel: 'trace' | 'debug' | 'info' | 'warn' | 'error'
  logMaxFiles: number
  logMaxSizeMb: number
  maxFileSizeMb: number
  encoding: 'utf-8' | 'utf-8-bom' | 'utf-16le'
  watchDebounceMs: number
  autosaveDebounceMs: number
  recoveryIntervalMs: number
  recentMax: number
  recentTtlDays: number
  maxTabs: number
  maxWindows: number
  findHistoryMax: number
  findMaxResults: number
  findInFilesMaxFileSizeMb: number
  findInFilesTimeoutMs: number
  findGlobDefault: string
  locale: 'auto' | 'id' | 'en'
  updateChannel: 'stable' | 'beta'
  updateFeedUrl: string
  updateCheckDelayMs: number
  updateCheckIntervalMs: number
  updateRequireSignature: boolean
  trayEnabled: boolean
  trayMinimizeOnClose: boolean
  trayStartMinimized: boolean
  cspEnabled: boolean
  allowedExternal: string[]
  devtoolsEnabled: boolean
  e2eMode: boolean
  e2eSavePath?: string
}

function optionalBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env)
  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('\n')
    throw new Error(`Invalid environment configuration:\n${message}`)
  }
  const value = parsed.data
  return {
    userDataDir: value.DOCFLOW_USER_DATA_DIR || undefined,
    logLevel: value.DOCFLOW_LOG_LEVEL,
    logMaxFiles: value.DOCFLOW_LOG_MAX_FILES,
    logMaxSizeMb: value.DOCFLOW_LOG_MAX_SIZE_MB,
    maxFileSizeMb: value.DOCFLOW_MAX_FILE_SIZE_MB,
    encoding: value.DOCFLOW_ENCODING,
    watchDebounceMs: value.DOCFLOW_WATCH_DEBOUNCE_MS,
    autosaveDebounceMs: value.DOCFLOW_AUTOSAVE_DEBOUNCE_MS,
    recoveryIntervalMs: value.DOCFLOW_RECOVERY_INTERVAL_MS,
    recentMax: value.DOCFLOW_RECENT_MAX,
    recentTtlDays: value.DOCFLOW_RECENT_TTL_DAYS,
    maxTabs: value.DOCFLOW_MAX_TABS,
    maxWindows: value.DOCFLOW_MAX_WINDOWS,
    findHistoryMax: value.DOCFLOW_FIND_HISTORY_MAX,
    findMaxResults: value.DOCFLOW_FIND_MAX_RESULTS,
    findInFilesMaxFileSizeMb: value.DOCFLOW_FIND_IN_FILES_MAX_FILE_SIZE_MB,
    findInFilesTimeoutMs: value.DOCFLOW_FIND_IN_FILES_TIMEOUT_MS,
    findGlobDefault: value.DOCFLOW_FIND_GLOB_DEFAULT,
    locale: value.DOCFLOW_DEFAULT_LOCALE,
    updateChannel: value.DOCFLOW_UPDATE_CHANNEL,
    updateFeedUrl: value.DOCFLOW_UPDATE_FEED_URL,
    updateCheckDelayMs: value.DOCFLOW_UPDATE_CHECK_DELAY_MS,
    updateCheckIntervalMs: value.DOCFLOW_UPDATE_CHECK_INTERVAL_MS,
    updateRequireSignature: optionalBoolean(value.DOCFLOW_UPDATE_REQUIRE_SIGNATURE, true),
    trayEnabled: optionalBoolean(value.DOCFLOW_TRAY_ENABLED, true),
    trayMinimizeOnClose: optionalBoolean(value.DOCFLOW_TRAY_MINIMIZE_ON_CLOSE, false),
    trayStartMinimized: optionalBoolean(value.DOCFLOW_TRAY_START_MINIMIZED, false),
    cspEnabled: value.DOCFLOW_CSP_ENABLED,
    allowedExternal: value.DOCFLOW_ALLOWED_EXTERNAL.split(',').map((host) => host.trim()).filter(Boolean),
    devtoolsEnabled: value.DOCFLOW_DEVTOOLS_ENABLED,
    e2eMode: value.DOCFLOW_E2E_MODE,
    e2eSavePath: value.DOCFLOW_E2E_SAVE_PATH || undefined
  }
}
