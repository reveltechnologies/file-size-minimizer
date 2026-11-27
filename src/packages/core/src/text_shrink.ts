export type TextSubtype = 'json' | 'markup' | 'css' | 'python' | 'cstyle' | 'plain'

export interface TextMinifyOptions {
  stripComments?: boolean
  removeBlankLines?: boolean
  compactIndent?: boolean
}

const MARKUP_EXTS = new Set(['xml', 'svg', 'html', 'htm'])
const CSS_EXTS = new Set(['css', 'scss', 'less'])
const CSTYLE_EXTS = new Set([
  'js',
  'mjs',
  'cjs',
  'jsx',
  'ts',
  'tsx',
  'c',
  'h',
  'cpp',
  'hpp',
  'java',
  'kt',
  'go',
  'rs',
  'cs',
  'swift',
  'php',
  'sql',
])

export function detectTextSubtype(fileName: string): TextSubtype {
  const dot = fileName.lastIndexOf('.')
  const ext = dot >= 0 ? fileName.slice(dot + 1).toLowerCase() : ''
  if (ext === 'json') return 'json'
  if (MARKUP_EXTS.has(ext)) return 'markup'
  if (CSS_EXTS.has(ext)) return 'css'
  if (ext === 'py') return 'python'
  if (CSTYLE_EXTS.has(ext)) return 'cstyle'
  return 'plain'
}

export function minifyText(
  content: string,
  fileName: string,
  options: TextMinifyOptions = {},
): string {
  const stripComments = options.stripComments !== false
  const removeBlankLines = options.removeBlankLines !== false
  const compactIndent = options.compactIndent !== false
  const subtype = detectTextSubtype(fileName)

  switch (subtype) {
    case 'json':
      return minifyJson(content, removeBlankLines)
    case 'markup':
      return minifyMarkup(content, { stripComments, removeBlankLines })
    case 'css':
      return minifyCss(content, { stripComments, removeBlankLines })
    case 'python':
      return minifyPython(content, { stripComments, removeBlankLines, compactIndent })
    case 'cstyle':
      return minifyCStyle(content, fileName, { stripComments, removeBlankLines, compactIndent })
    case 'plain':
      return minifyPlain(content, { removeBlankLines })
  }
}

function minifyJson(content: string, removeBlankLines: boolean): string {
  try {
    return JSON.stringify(JSON.parse(content))
  } catch {
    return minifyPlain(content, { removeBlankLines })
  }
}

function minifyMarkup(
  content: string,
  { stripComments, removeBlankLines }: { stripComments: boolean; removeBlankLines: boolean },
): string {
  let out = content.replace(/\r\n?/g, '\n')
  if (stripComments) {
    out = out.replace(/<!--[\s\S]*?-->/g, '')
  }
  out = out.replace(/>\s+</g, '><')
  const lines = out.split('\n').map((line) => line.trim())
  return (removeBlankLines ? lines.filter((line) => line.length > 0) : lines).join('\n')
}

function minifyCss(
  content: string,
  { stripComments, removeBlankLines }: { stripComments: boolean; removeBlankLines: boolean },
): string {
  let out = content.replace(/\r\n?/g, '\n')
  if (stripComments) {
    out = out.replace(/\/\*[\s\S]*?\*\//g, '')
  }
  out = out
    .replace(/\s*([{};:,])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim()
  if (!removeBlankLines) return out
  return out
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('')
}

function minifyPython(
  content: string,
  {
    stripComments,
    removeBlankLines,
    compactIndent,
  }: { stripComments: boolean; removeBlankLines: boolean; compactIndent: boolean },
): string {
  const normalized = content.replace(/\r\n?/g, '\n')
  const lines = normalized.split('\n')
  const processed: { text: string; inMultiline: boolean }[] = []

  let quote: "'''" | '"""' | "'" | '"' | null = null
  let isTriple = false

  for (const rawLine of lines) {
    const startedInTriple = isTriple
    let out = ''
    let i = 0

    while (i < rawLine.length) {
      const ch = rawLine[i]

      if (quote) {
        if (ch === '\\' && i + 1 < rawLine.length) {
          out += rawLine.slice(i, i + 2)
          i += 2
          continue
        }
        if (isTriple) {
          if (rawLine.startsWith(quote, i)) {
            out += quote
            i += 3
            quote = null
            isTriple = false
            continue
          }
        } else if (ch === quote) {
          out += ch
          i += 1
          quote = null
          continue
        }
        out += ch
        i += 1
        continue
      }

      if (ch === '#' && stripComments) {
        break
      }

      if (rawLine.startsWith("'''", i) || rawLine.startsWith('"""', i)) {
        const triple = rawLine.slice(i, i + 3) as "'''" | '"""'
        quote = triple
        isTriple = true
        out += triple
        i += 3
        continue
      }

      if (ch === "'" || ch === '"') {
        quote = ch
        isTriple = false
        out += ch
        i += 1
        continue
      }

      out += ch
      i += 1
    }

    if (!isTriple) {
      quote = null
    }

    const trimmed = startedInTriple ? out : out.replace(/[ \t]+$/, '')
    processed.push({ text: trimmed, inMultiline: startedInTriple })
  }

  let filtered = processed
  if (removeBlankLines) {
    filtered = processed.filter((entry) => entry.inMultiline || entry.text.trim().length > 0)
  }

  if (!compactIndent) {
    return filtered.map((e) => e.text).join('\n')
  }

  const spaceIndents: number[] = []
  for (const entry of filtered) {
    if (entry.inMultiline) continue
    const match = /^( +)/.exec(entry.text)
    if (match && !entry.text.startsWith(' \t')) {
      spaceIndents.push(match[1].length)
    }
  }
  const unit = gcdList(spaceIndents)
  if (unit <= 1) {
    return filtered.map((e) => e.text).join('\n')
  }

  return filtered
    .map((entry) => {
      if (entry.inMultiline) return entry.text
      const match = /^( +)(.*)$/.exec(entry.text)
      if (!match) return entry.text
      const level = Math.max(1, Math.floor(match[1].length / unit))
      return ' '.repeat(level) + match[2]
    })
    .join('\n')
}

function minifyCStyle(
  content: string,
  fileName: string,
  {
    stripComments,
    removeBlankLines,
    compactIndent,
  }: { stripComments: boolean; removeBlankLines: boolean; compactIndent: boolean },
): string {
  const isSql = fileName.toLowerCase().endsWith('.sql')
  const lineComment = isSql ? '--' : '//'
  const normalized = content.replace(/\r\n?/g, '\n')

  let stripped = ''
  if (stripComments) {
    let quote: "'" | '"' | '`' | null = null
    let inBlockComment = false
    let i = 0
    while (i < normalized.length) {
      const ch = normalized[i]
      if (inBlockComment) {
        if (ch === '*' && normalized[i + 1] === '/') {
          inBlockComment = false
          i += 2
          continue
        }
        if (ch === '\n') stripped += '\n'
        i += 1
        continue
      }

      if (quote) {
        if (ch === '\\' && i + 1 < normalized.length) {
          stripped += normalized.slice(i, i + 2)
          i += 2
          continue
        }
        if (ch === quote) quote = null
        stripped += ch
        i += 1
        continue
      }

      if (ch === '/' && normalized[i + 1] === '*') {
        inBlockComment = true
        i += 2
        continue
      }

      if (normalized.startsWith(lineComment, i)) {
        while (i < normalized.length && normalized[i] !== '\n') i += 1
        continue
      }

      if (ch === "'" || ch === '"' || ch === '`') {
        quote = ch
        stripped += ch
        i += 1
        continue
      }

      stripped += ch
      i += 1
    }
  } else {
    stripped = normalized
  }

  const lines = stripped.split('\n').map((line) => line.replace(/[ \t]+$/, ''))
  const nonEmpty = removeBlankLines ? lines.filter((line) => line.trim().length > 0) : lines
  if (!compactIndent) return nonEmpty.join('\n')
  return nonEmpty.map((line) => line.replace(/^[ \t]+/, '')).join('\n')
}

function minifyPlain(content: string, { removeBlankLines }: { removeBlankLines: boolean }): string {
  const lines = content.replace(/\r\n?/g, '\n').split('\n').map((line) => line.replace(/[ \t]+$/, ''))
  return (removeBlankLines ? lines.filter((line) => line.length > 0) : lines).join('\n')
}

function gcdList(nums: number[]): number {
  let result = 0
  for (const n of nums) {
    result = gcd(result, n)
    if (result === 1) return 1
  }
  return result
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a)
  let y = Math.abs(b)
  while (y !== 0) {
    const t = y
    y = x % y
    x = t
  }
  return x
}
