import { existsSync } from 'node:fs'
import { isAbsolute, resolve } from 'node:path'
import { isProbablyPath } from '../utils/paths'

export class OpenFileRouter {
  private pending: string | null = null

  ingestArgv(argv: string[]): string | null {
    const path = this.extractPathFromArgv(argv)
    if (path) this.pending = path
    return path
  }

  extractPathFromArgv(argv: string[]): string | null {
    const candidates = argv.slice(1)
    for (const candidate of candidates) {
      if (!candidate || candidate.startsWith('--')) continue
      if (!isProbablyPath(candidate)) continue
      const absolute = isAbsolute(candidate) ? candidate : resolve(candidate)
      if (existsSync(absolute)) return absolute
    }
    return null
  }

  setPending(path: string): void {
    this.pending = path
  }

  consume(): string | null {
    const path = this.pending
    this.pending = null
    return path
  }
}
