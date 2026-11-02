export interface LanguageDefinition {
  id: string
  name: string
  extension: string
  aliases: string[]
  comment: string
}

export const LANGUAGES: LanguageDefinition[] = [
  { id: 'typescript', name: 'TypeScript', extension: 'ts', aliases: ['ts'], comment: '//' },
  { id: 'javascript', name: 'JavaScript', extension: 'js', aliases: ['js', 'node'], comment: '//' },
  { id: 'python', name: 'Python', extension: 'py', aliases: ['py', 'python3'], comment: '#' },
  { id: 'java', name: 'Java', extension: 'java', aliases: [], comment: '//' },
  { id: 'csharp', name: 'C#', extension: 'cs', aliases: ['cs', 'dotnet'], comment: '//' },
  { id: 'cpp', name: 'C++', extension: 'cpp', aliases: ['c++', 'cc', 'cxx'], comment: '//' },
  { id: 'c', name: 'C', extension: 'c', aliases: [], comment: '//' },
  { id: 'go', name: 'Go', extension: 'go', aliases: ['golang'], comment: '//' },
  { id: 'rust', name: 'Rust', extension: 'rs', aliases: ['rs'], comment: '//' },
  { id: 'ruby', name: 'Ruby', extension: 'rb', aliases: ['rb'], comment: '#' },
  { id: 'php', name: 'PHP', extension: 'php', aliases: [], comment: '//' },
  { id: 'swift', name: 'Swift', extension: 'swift', aliases: [], comment: '//' },
  { id: 'kotlin', name: 'Kotlin', extension: 'kt', aliases: ['kt'], comment: '//' },
  { id: 'scala', name: 'Scala', extension: 'scala', aliases: [], comment: '//' },
  { id: 'dart', name: 'Dart', extension: 'dart', aliases: [], comment: '//' },
  { id: 'lua', name: 'Lua', extension: 'lua', aliases: [], comment: '--' },
  { id: 'perl', name: 'Perl', extension: 'pl', aliases: ['pl'], comment: '#' },
  { id: 'r', name: 'R', extension: 'r', aliases: ['rscript'], comment: '#' },
  { id: 'julia', name: 'Julia', extension: 'jl', aliases: [], comment: '#' },
  { id: 'haskell', name: 'Haskell', extension: 'hs', aliases: [], comment: '--' },
  { id: 'elixir', name: 'Elixir', extension: 'ex', aliases: ['ex', 'exs'], comment: '#' },
  { id: 'erlang', name: 'Erlang', extension: 'erl', aliases: [], comment: '%' },
  { id: 'clojure', name: 'Clojure', extension: 'clj', aliases: [], comment: ';' },
  { id: 'bash', name: 'Bash', extension: 'sh', aliases: ['sh', 'shell', 'zsh'], comment: '#' },
  { id: 'powershell', name: 'PowerShell', extension: 'ps1', aliases: ['ps1', 'pwsh'], comment: '#' },
  { id: 'sql', name: 'SQL', extension: 'sql', aliases: ['postgres', 'mysql'], comment: '--' },
  { id: 'html', name: 'HTML', extension: 'html', aliases: ['htm'], comment: '<!--' },
  { id: 'css', name: 'CSS', extension: 'css', aliases: [], comment: '/*' },
  { id: 'scss', name: 'SCSS', extension: 'scss', aliases: ['sass'], comment: '//' },
  { id: 'json', name: 'JSON', extension: 'json', aliases: ['jsonc'], comment: '//' },
  { id: 'yaml', name: 'YAML', extension: 'yml', aliases: ['yml'], comment: '#' },
  { id: 'toml', name: 'TOML', extension: 'toml', aliases: [], comment: '#' },
  { id: 'xml', name: 'XML', extension: 'xml', aliases: [], comment: '<!--' },
  { id: 'markdown', name: 'Markdown', extension: 'md', aliases: ['md'], comment: '<!--' },
  { id: 'dockerfile', name: 'Dockerfile', extension: 'Dockerfile', aliases: ['docker'], comment: '#' },
  { id: 'graphql', name: 'GraphQL', extension: 'graphql', aliases: ['gql'], comment: '#' },
  { id: 'vue', name: 'Vue', extension: 'vue', aliases: [], comment: '//' },
  { id: 'svelte', name: 'Svelte', extension: 'svelte', aliases: [], comment: '//' },
  { id: 'zig', name: 'Zig', extension: 'zig', aliases: [], comment: '//' },
  { id: 'nim', name: 'Nim', extension: 'nim', aliases: [], comment: '#' },
  { id: 'text', name: 'Plain Text', extension: 'txt', aliases: ['plain', 'txt'], comment: '' }
]

const BY_ALIAS = new Map<string, LanguageDefinition>()
for (const language of LANGUAGES) {
  BY_ALIAS.set(language.id, language)
  for (const alias of language.aliases) BY_ALIAS.set(alias, language)
}

export function findLanguage(value: string): LanguageDefinition {
  return BY_ALIAS.get(value.toLowerCase()) ?? LANGUAGES[LANGUAGES.length - 1]
}

export function guessLanguageFromCode(code: string): LanguageDefinition {
  if (/^\s*(import|export|const|interface|type)\b/m.test(code)) return findLanguage('typescript')
  if (/^\s*(def|class)\s+\w+.*:/m.test(code)) return findLanguage('python')
  if (/^\s*package\s+main\b/m.test(code)) return findLanguage('go')
  if (/^\s*(fn|use|impl)\b/m.test(code)) return findLanguage('rust')
  if (/^\s*<\?php/m.test(code)) return findLanguage('php')
  if (/^\s*<(!doctype|html|div)/im.test(code)) return findLanguage('html')
  if (/^\s*SELECT\b/im.test(code)) return findLanguage('sql')
  if (/^\s*[{[]/.test(code)) return findLanguage('json')
  return findLanguage('text')
}

export function downloadNameFor(language: LanguageDefinition, index: number): string {
  const safe = language.extension.replace(/[^a-zA-Z0-9._-]/g, '') || 'txt'
  return `snippet-${String(index + 1).padStart(2, '0')}.${safe}`
}
