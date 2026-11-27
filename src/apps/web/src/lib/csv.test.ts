import { describe, expect, it } from 'vitest'
import { parseDelimited } from './csv'

describe('parseDelimited', () => {
  it('parses quoted commas and escaped quotes per RFC 4180', () => {
    const input = 'name,note,price\n"Smith, John","Says ""hi""\nline2",12.50\nplain,ok,5'
    expect(parseDelimited(input, ',')).toEqual([
      ['name', 'note', 'price'],
      ['Smith, John', 'Says "hi"\nline2', '12.50'],
      ['plain', 'ok', '5'],
    ])
  })

  it('parses TSV rows and skips blank lines', () => {
    expect(parseDelimited('a\tb\r\n\r\n1\t2\r\n', '\t')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })
})
