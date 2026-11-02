import { promises as fs } from 'node:fs'
import type { FileHandle } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { randomBytes } from 'node:crypto'

function tempPathFor(filePath: string): string {
  const suffix = `${process.pid}-${Date.now()}-${randomBytes(4).toString('hex')}`
  return join(dirname(filePath), `.${randomBytes(3).toString('hex')}-${suffix}.tmp`)
}

async function fsyncDirectory(dir: string): Promise<void> {
  if (process.platform === 'win32') return
  let handle: FileHandle | undefined
  try {
    handle = await fs.open(dir, 'r')
    await handle.sync()
  } catch {
    // Directory fsync is best-effort; some filesystems reject it.
  } finally {
    await handle?.close().catch(() => undefined)
  }
}

export async function atomicWriteFile(filePath: string, data: Uint8Array): Promise<void> {
  await fs.mkdir(dirname(filePath), { recursive: true })
  const temporary = tempPathFor(filePath)
  let handle: FileHandle | undefined
  try {
    handle = await fs.open(temporary, 'wx', 0o600)
    await handle.writeFile(data)
    await handle.sync()
    await handle.close()
    handle = undefined
    await fs.rename(temporary, filePath)
    await fsyncDirectory(dirname(filePath))
  } catch (error) {
    await fs.unlink(temporary).catch(() => undefined)
    throw error
  } finally {
    await handle?.close().catch(() => undefined)
  }
}

export async function atomicWriteText(filePath: string, text: string): Promise<void> {
  await atomicWriteFile(filePath, Buffer.from(text, 'utf8'))
}

export async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, 'utf8')
    if (!raw.trim()) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export async function writeJsonAtomic(filePath: string, value: unknown): Promise<void> {
  await atomicWriteText(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

export async function ensureDirectory(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true })
}
