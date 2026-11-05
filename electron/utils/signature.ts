import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { promises as fs } from 'node:fs'

export async function sha512FileBase64(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha512')
    const stream = createReadStream(filePath)
    stream.on('error', reject)
    stream.on('data', (chunk: Buffer | string) => hash.update(chunk))
    stream.on('end', () => resolve(hash.digest('base64')))
  })
}

export async function sha256FileHex(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    const stream = createReadStream(filePath)
    stream.on('error', reject)
    stream.on('data', (chunk: Buffer | string) => hash.update(chunk))
    stream.on('end', () => resolve(hash.digest('hex')))
  })
}

/**
 * Verify the artifact digest advertised in latest.yml. electron-builder uses
 * base64-encoded SHA-512 values. When no digest is available and signature
 * verification is mandatory, the update is rejected.
 */
export async function verifyArtifactDigest(
  filePath: string,
  expectedBase64: string | undefined,
  required: boolean
): Promise<{ ok: boolean; reason?: string }> {
  try {
    await fs.access(filePath)
  } catch {
    return { ok: false, reason: 'UPDATE_ARTIFACT_MISSING' }
  }
  if (!expectedBase64) {
    return required
      ? { ok: false, reason: 'UPDATE_SIGNATURE_MISSING' }
      : { ok: true }
  }
  const actual = await sha512FileBase64(filePath)
  if (actual !== expectedBase64) {
    return { ok: false, reason: 'UPDATE_SIGNATURE_INVALID' }
  }
  return { ok: true }
}

/** Compare dotted versions without pulling in a semver dependency. */
export function isNewerVersion(candidate: string, current: string): boolean {
  const normalize = (value: string) => value.split('-')[0].split('.').map((part) => Number.parseInt(part, 10) || 0)
  const a = normalize(candidate)
  const b = normalize(current)
  const length = Math.max(a.length, b.length)
  for (let index = 0; index < length; index += 1) {
    if ((a[index] ?? 0) > (b[index] ?? 0)) return true
    if ((a[index] ?? 0) < (b[index] ?? 0)) return false
  }
  return false
}
