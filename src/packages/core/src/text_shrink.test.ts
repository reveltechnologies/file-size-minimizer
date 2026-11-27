import { describe, expect, it } from 'vitest'
import { detectTextSubtype, minifyText } from './text_shrink'

describe('detectTextSubtype', () => {
  it('routes extensions to the right text minifier', () => {
    expect(detectTextSubtype('config.json')).toBe('json')
    expect(detectTextSubtype('data.xml')).toBe('markup')
    expect(detectTextSubtype('icon.svg')).toBe('markup')
    expect(detectTextSubtype('main.py')).toBe('python')
    expect(detectTextSubtype('app.ts')).toBe('cstyle')
    expect(detectTextSubtype('notes.txt')).toBe('plain')
  })
})

describe('minifyText', () => {
  it('minifies JSON cleanly', () => {
    const input = '{\n  "name": "test",\n  "items": [1, 2, 3]\n}\n'
    expect(minifyText(input, 'data.json')).toBe('{"name":"test","items":[1,2,3]}')
  })

  it('minifies XML/SVG markup and strips comments', () => {
    const input = '<root>\n  <!-- comment -->\n  <item id="1">  hello  </item>\n</root>\n'
    expect(minifyText(input, 'data.xml')).toBe('<root><item id="1">  hello  </item></root>')
  })

  it('minifies Python while preserving indentation levels and # inside strings', () => {
    const input = [
      '# top comment',
      'def greet(name):',
      '    # indented comment',
      '    msg = "hello # world"  ',
      '',
      '    if name:',
      '        return msg + name',
      '',
    ].join('\n')

    expect(minifyText(input, 'script.py')).toBe(
      [
        'def greet(name):',
        ' msg = "hello # world"',
        ' if name:',
        '  return msg + name',
      ].join('\n'),
    )
  })

  it('strips comments and blank lines in C-style code while preserving strings', () => {
    const input = [
      '// header',
      'const url = "https://example.com//path";',
      '/* block',
      '   comment */',
      '',
      '  console.log(url);',
    ].join('\n')

    expect(minifyText(input, 'index.js')).toBe(
      'const url = "https://example.com//path";\nconsole.log(url);',
    )
  })

  it('trims trailing spaces and blank lines in plain text', () => {
    expect(minifyText('line 1   \r\n\r\nline 2\t\n', 'notes.txt')).toBe('line 1\nline 2')
  })
})
