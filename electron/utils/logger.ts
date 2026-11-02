import { createWriteStream, existsSync, mkdirSync, readdirSync, renameSync, statSync, unlinkSync, WriteStream } from 'node:fs'
import { basename, join } from 'node:path'

type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error'

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50
}

export interface LoggerOptions {
  dir: string
  level?: LogLevel
  maxFiles?: number
  maxSizeMb?: number
}

export class Logger {
  private readonly dir: string
  private readonly level: LogLevel
  private readonly maxFiles: number
  private readonly maxBytes: number
  private stream: WriteStream | null = null
  private currentDate = ''

  constructor(options: LoggerOptions) {
    this.dir = options.dir
    this.level = options.level ?? 'info'
    this.maxFiles = options.maxFiles ?? 10
    this.maxBytes = (options.maxSizeMb ?? 20) * 1024 * 1024
    mkdirSync(this.dir, { recursive: true })
    this.open()
  }

  private open(): void {
    const date = new Date().toISOString().slice(0, 10)
    this.currentDate = date
    const file = join(this.dir, `main-${date}.log`)
    if (existsSync(file)) this.rotateIfNeeded(file)
    this.stream = createWriteStream(file, { flags: 'a' })
  }

  private rotateIfNeeded(file: string): void {
    try {
      if (statSync(file).size < this.maxBytes) return
      for (let index = this.maxFiles - 1; index >= 1; index -= 1) {
        const from = `${file}.${index}`
        const to = `${file}.${index + 1}`
        if (existsSync(from)) {
          if (index + 1 > this.maxFiles) unlinkSync(from)
          else renameSync(from, to)
        }
      }
      renameSync(file, `${file}.1`)
      this.prune()
    } catch {
      // Logging must never take the app down.
    }
  }

  private prune(): void {
    try {
      const files = readdirSync(this.dir)
        .filter((name) => /^main-\d{4}-\d{2}-\d{2}\.log(\.\d+)?$/.test(name))
        .map((name) => ({ name, at: statSync(join(this.dir, name)).mtimeMs }))
        .sort((a, b) => b.at - a.at)
      for (const file of files.slice(this.maxFiles)) {
        unlinkSync(join(this.dir, file.name))
      }
    } catch {
      // ignore
    }
  }

  private ensureDailyFile(): void {
    const date = new Date().toISOString().slice(0, 10)
    if (date === this.currentDate && this.stream) return
    this.stream?.end()
    this.open()
  }

  private write(level: LogLevel, message: string, meta?: unknown): void {
    if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[this.level]) return
    try {
      this.ensureDailyFile()
      const line = JSON.stringify({
        time: new Date().toISOString(),
        level,
        message,
        ...(meta === undefined ? {} : { meta })
      })
      this.stream?.write(`${line}\n`)
    } catch {
      // ignore
    }
  }

  trace(message: string, meta?: unknown): void {
    this.write('trace', message, meta)
  }

  debug(message: string, meta?: unknown): void {
    this.write('debug', message, meta)
  }

  info(message: string, meta?: unknown): void {
    this.write('info', message, meta)
  }

  warn(message: string, meta?: unknown): void {
    this.write('warn', message, meta)
  }

  error(message: string, meta?: unknown): void {
    this.write('error', message, meta)
  }

  /** Only basename + size are ever logged for files, never markdown content. */
  fileEvent(event: string, path: string, size?: number): void {
    this.info(event, { file: basename(path), ...(size === undefined ? {} : { size }) })
  }

  close(): void {
    this.stream?.end()
    this.stream = null
  }
}
