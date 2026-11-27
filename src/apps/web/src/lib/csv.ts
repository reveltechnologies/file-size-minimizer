export function parseDelimited(text: string, delimiter: string, maxRows = 200): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false
  let i = 0

  while (i < text.length) {
    const ch = text[i]

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"'
          i += 2
          continue
        }
        inQuotes = false
        i += 1
        continue
      }
      cell += ch
      i += 1
      continue
    }

    if (ch === '"' && cell.length === 0) {
      inQuotes = true
      i += 1
      continue
    }

    if (ch === delimiter) {
      row.push(cell)
      cell = ''
      i += 1
      continue
    }

    if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1
      row.push(cell)
      cell = ''
      if (row.some((c) => c.length > 0)) {
        rows.push(row)
        if (rows.length >= maxRows) return rows
      }
      row = []
      i += 1
      continue
    }

    cell += ch
    i += 1
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell)
    if (row.some((c) => c.length > 0)) rows.push(row)
  }

  return rows
}
