import { describe, expect, it } from 'vitest'
import {
  buildRegExp,
  decodeExtendedEscapes,
  findAll,
  lineColumnAt,
  lineTextAt
} from '../../src/utils/searchRegex'

describe('searchRegex', () => {
  it('escapes regex metacharacters in normal mode', () => {
    const regex = buildRegExp('a+b (c)')
    expect(regex.test('xx a+b (c) yy')).toBe(true)
    expect(regex.test('aaab c')).toBe(false)
  })

  it('is case-insensitive unless matchCase is set', () => {
    expect(buildRegExp('foo').test('FOO')).toBe(true)
    expect(buildRegExp('foo', { matchCase: true }).test('FOO')).toBe(false)
  })

  it('decodes newline, tab and null escapes in extended mode', () => {
    expect(decodeExtendedEscapes('a\\nb\\tc')).toBe('a\nb\tc')
    const regex = buildRegExp('a\\nb', { mode: 'extended' })
    expect(regex.test('a\nb')).toBe(true)
  })

  it('decodes Unicode code point escapes in extended mode', () => {
    expect(decodeExtendedEscapes('\\x{1F600}')).toBe('😀')
    expect(decodeExtendedEscapes('\\u{0041}')).toBe('A')
    expect(decodeExtendedEscapes('\\U{0001F600}')).toBe('😀')
    expect(buildRegExp('\\x{1F600}', { mode: 'extended' }).test('hi 😀!')).toBe(true)
  })

  it('treats escaped Unicode braces literally when extendedUnicode is off', () => {
    expect(decodeExtendedEscapes('\\x{1F600}', false)).toBe('x{1F600}')
  })

  it('rejects malformed Unicode escapes', () => {
    expect(() => decodeExtendedEscapes('\\x{110000}')).toThrow(/INVALID_UNICODE_ESCAPE/)
    expect(() => decodeExtendedEscapes('\\u{XYZ}')).toThrow(/INVALID_ESCAPE/)
    expect(() => decodeExtendedEscapes('\\x{123')).toThrow(/missing closing brace/)
  })

  it('passes regex through untouched and reports invalid patterns', () => {
    expect(buildRegExp('^#{1,3}\\s+.+$', { mode: 'regex' }).test('## Heading')).toBe(true)
    expect(() => buildRegExp('(abc', { mode: 'regex' })).toThrow(/INVALID_REGEX/)
  })

  it('applies whole-word matching', () => {
    const regex = buildRegExp('it', { matchWholeWord: true })
    expect(regex.test('it works')).toBe(true)
    expect(regex.test('hitch')).toBe(false)
  })

  it('rejects an empty query', () => {
    expect(() => buildRegExp('')).toThrow(/EMPTY_QUERY/)
  })

  it('findAll returns every match and handles zero-length matches', () => {
    expect(findAll('foo foo', buildRegExp('foo')).map((match) => match.index)).toEqual([0, 4])
    expect(findAll('ab', buildRegExp('^', { mode: 'regex', dotMatchesNewline: true })).length).toBe(1)
  })

  it('reports 1-based line and column positions', () => {
    const text = 'one\ntwo\nthree'
    expect(lineColumnAt(text, 0)).toEqual({ lineNumber: 1, columnStart: 1 })
    expect(lineColumnAt(text, 4)).toEqual({ lineNumber: 2, columnStart: 1 })
    expect(lineColumnAt(text, 6)).toEqual({ lineNumber: 2, columnStart: 3 })
    expect(lineTextAt(text, 5)).toBe('two')
  })
})
