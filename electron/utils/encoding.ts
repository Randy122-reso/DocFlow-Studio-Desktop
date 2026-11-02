import type { LineEnding, TextEncoding } from '../types/ipc'

export interface DecodedText {
  content: string
  encoding: TextEncoding
  lineEnding: LineEnding
}

export function detectLineEnding(content: string): LineEnding {
  if (content.includes('\r\n')) return 'crlf'
  if (content.includes('\r')) return 'cr'
  return 'lf'
}

export function decodeText(buffer: Buffer): DecodedText {
  let encoding: TextEncoding = 'utf-8'
  let body = buffer

  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    encoding = 'utf-8-bom'
    body = buffer.subarray(3)
  } else if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    encoding = 'utf-16le'
    body = buffer.subarray(2)
  }

  const content = body.toString(encoding === 'utf-16le' ? 'utf16le' : 'utf8')
  return { content, encoding, lineEnding: detectLineEnding(content) }
}

export function encodeText(content: string, encoding: TextEncoding): Buffer {
  if (encoding === 'utf-16le') {
    return Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(content, 'utf16le')])
  }
  if (encoding === 'utf-8-bom') {
    return Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(content, 'utf8')])
  }
  return Buffer.from(content, 'utf8')
}

export function normalizeLineEndings(content: string, lineEnding: LineEnding): string {
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  if (lineEnding === 'crlf') return normalized.replace(/\n/g, '\r\n')
  if (lineEnding === 'cr') return normalized.replace(/\n/g, '\r')
  return normalized
}
