import { useEffect, useState } from 'react'
import { hasTransparency } from './hasTransparency'

/** Null while checking or when no file is given. */
export function useTransparency(file: File | null): boolean | null {
  const [check, setCheck] = useState<{ file: File; transparent: boolean } | null>(null)

  useEffect(() => {
    if (!file) return
    let cancelled = false
    void hasTransparency(file)
      .catch(() => false)
      .then((transparent) => {
        if (!cancelled) setCheck({ file, transparent })
      })
    return () => {
      cancelled = true
    }
  }, [file])

  return check && check.file === file ? check.transparent : null
}
