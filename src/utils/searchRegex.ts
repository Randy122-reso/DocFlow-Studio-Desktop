export type SearchMode = 'normal' | 'extended' | 'regex'

export interface SearchOptions {
  matchCase?: boolean
  matchWholeWord?: boolean
  mode?: SearchMode
  dotMatchesNewline?: boolean
  extendedUnicode?: boolean
  inSelection?: boolean
  backward?: boolean
  wrapAround?: boolean
}

const REGEX_META = /[.*+?^${}()|[\]\\]/g

export function escapeRegExp(value: string): string {
  return value.replace(REGEX_META, '\\$&')
}

function codepointToString(value: number): string {
  if (!Number.isInteger(value) || value < 0 || value > 0x10ffff) {
    throw new Error(`INVALID_UNICODE_ESCAPE: code point 0x${value.toString(16)} is out of range`)
  }
  return String.fromCodePoint(value)
}

/**
 * Decode Notepad++ style extended escapes. Supports \\n, \\t, \\r, \\0,
 * \\xNN (byte), \\x{...}, \\u{...} and \\U{...} (Unicode code points).
 */
export function decodeExtendedEscapes(input: string, extendedUnicode = true, depth = 0): string {
  if (depth > 4) throw new Error('INVALID_ESCAPE: recursive escape sequence')
  let output = ''
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]
    if (char !== '\\') {
      output += char
      continue
    }
    const next = input[index + 1]
    if (next === undefined) {
      output += '\\'
      break
    }
    index += 1
    if (next === 'n') output += '\n'
    else if (next === 't') output += '\t'
    else if (next === 'r') output += '\r'
    else if (next === '0') output += '\0'
    else if (next === '\\') output += '\\'
    else if (next === 'x') {
      const brace = input[index + 1] === '{'
      if (brace) {
        const end = input.indexOf('}', index + 2)
        if (end === -1) throw new Error('INVALID_ESCAPE: missing closing brace')
        if (!extendedUnicode) {
          output += 'x{' + input.slice(index + 2, end) + '}'
          index = end
          continue
        }
        const hex = input.slice(index + 2, end)
        if (!/^[0-9a-fA-F]{1,8}$/.test(hex)) throw new Error('INVALID_ESCAPE: invalid code point')
        output += codepointToString(Number.parseInt(hex, 16))
        index = end
      } else {
        const hex = input.slice(index + 1, index + 3)
        if (!/^[0-9a-fA-F]{2}$/.test(hex)) throw new Error('INVALID_ESCAPE: \\x requires two hex digits')
        output += String.fromCharCode(Number.parseInt(hex, 16))
        index += 2
      }
    } else if (next === 'u' || next === 'U') {
      const brace = input[index + 1] === '{'
      if (brace) {
        const end = input.indexOf('}', index + 2)
        if (end === -1) throw new Error('INVALID_ESCAPE: missing closing brace')
        if (!extendedUnicode) {
          output += `${next}{${input.slice(index + 2, end)}}`
          index = end
          continue
        }
        const hex = input.slice(index + 2, end)
        if (!/^[0-9a-fA-F]{1,8}$/.test(hex)) throw new Error('INVALID_ESCAPE: invalid code point')
        output += codepointToString(Number.parseInt(hex, 16))
        index = end
      } else {
        const length = next === 'u' ? 4 : 8
        const hex = input.slice(index + 1, index + 1 + length)
        if (hex.length !== length || !/^[0-9a-fA-F]+$/.test(hex)) {
          throw new Error(`INVALID_ESCAPE: \\${next} requires ${length} hex digits`)
        }
        output += codepointToString(Number.parseInt(hex, 16))
        index += length
      }
    } else {
      output += next
    }
  }
  return output
}

/**
 * Build a JavaScript RegExp from the Find bar query.
 * Normal mode escapes regex metacharacters; extended mode decodes escapes
 * first; regex mode passes the query through untouched.
 */
export function buildRegExp(query: string, options: SearchOptions = {}): RegExp {
  if (query.length === 0) throw new Error('EMPTY_QUERY: enter a search term')
  const mode = options.mode ?? 'normal'
  let source: string

  if (mode === 'regex') {
    source = query
  } else if (mode === 'extended') {
    source = escapeRegExp(decodeExtendedEscapes(query, options.extendedUnicode !== false))
  } else {
    source = escapeRegExp(query)
  }

  if (options.matchWholeWord) {
    source = `\\b(?:${source})\\b`
  }

  const flags = ['g', 'm']
  if (!options.matchCase) flags.push('i')
  if (options.dotMatchesNewline) flags.push('s')
  flags.push('u')

  try {
    return new RegExp(source, flags.join(''))
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(`INVALID_REGEX: ${detail}`)
  }
}

export interface SimpleMatch {
  index: number
  length: number
  value: string
}

export function findAll(text: string, regex: RegExp): SimpleMatch[] {
  const matches: SimpleMatch[] = []
  regex.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    matches.push({ index: match.index, length: match[0].length, value: match[0] })
    if (match[0].length === 0) regex.lastIndex += 1
    if (matches.length >= 100_000) break
  }
  return matches
}

export function lineColumnAt(text: string, index: number): { lineNumber: number; columnStart: number } {
  let lineNumber = 1
  let lastLineStart = 0
  for (let cursor = 0; cursor < index && cursor < text.length; cursor += 1) {
    if (text.charCodeAt(cursor) === 10) {
      lineNumber += 1
      lastLineStart = cursor + 1
    }
  }
  return { lineNumber, columnStart: index - lastLineStart + 1 }
}

export function lineTextAt(text: string, index: number): string {
  const start = text.lastIndexOf('\n', Math.max(0, index - 1)) + 1
  const end = text.indexOf('\n', index)
  return text.slice(start, end === -1 ? text.length : end).slice(0, 240)
}
