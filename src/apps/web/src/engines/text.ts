import {
  detectTextSubtype,
  minifyText,
  textOutputFileName,
  textOutputMimeType,
  type CompressOptions,
} from '@revel/core'
import type { Shrinkability } from './image'
import type { CompressJob, CompressResult } from './types'

export interface TextEstimate {
  estimatedBytes: number
  mode: 'minify' | 'gzip'
  subtype: string
  canShrink: boolean
  shrinkability: Shrinkability
}

export async function runTextShrink(
  file: File,
  options: CompressOptions,
): Promise<{
  bytes: Uint8Array<ArrayBuffer>
  fileName: string
  mimeType: string
  mode: 'minify' | 'gzip'
}> {
  const mode = options.textMode ?? 'minify'
  if (mode === 'gzip' && typeof CompressionStream !== 'undefined') {
    const stream = file.stream().pipeThrough(new CompressionStream('gzip'))
    const buffer = await new Response(stream).arrayBuffer()
    return {
      bytes: new Uint8Array(buffer),
      fileName: textOutputFileName(file.name, 'gzip'),
      mimeType: textOutputMimeType(file.name, 'gzip'),
      mode: 'gzip',
    }
  }

  const raw = await file.text()
  const minified = minifyText(raw, file.name, {
    stripComments: options.textStripComments,
    removeBlankLines: options.textRemoveBlankLines,
    compactIndent: options.textCompactIndent,
  })
  const encoded = new TextEncoder().encode(minified)
  return {
    bytes: encoded,
    fileName: textOutputFileName(file.name, 'minify'),
    mimeType: textOutputMimeType(file.name, 'minify'),
    mode: 'minify',
  }
}

export async function estimateTextShrink(
  file: File,
  options: CompressOptions,
): Promise<TextEstimate> {
  const result = await runTextShrink(file, options)
  const canShrink = result.bytes.byteLength < file.size
  let shrinkability: Shrinkability = 'ok'

  if (!canShrink) {
    const altMode = result.mode === 'gzip' ? 'minify' : 'gzip'
    const altResult = await runTextShrink(file, {
      ...options,
      textMode: altMode,
      textStripComments: true,
      textRemoveBlankLines: true,
      textCompactIndent: true,
    })
    shrinkability = altResult.bytes.byteLength < file.size ? 'with-settings' : 'never'
  }

  return {
    estimatedBytes: result.bytes.byteLength,
    mode: result.mode,
    subtype: detectTextSubtype(file.name),
    canShrink,
    shrinkability,
  }
}

export async function compressText(job: CompressJob): Promise<CompressResult> {
  const { files: [file], options, onStep, onProgress, onStatus, signal } = job
  onStatus('Reading file…')
  onStep('shrink')
  onProgress(0.35)
  signal.throwIfAborted()

  const output = await runTextShrink(file, options)
  signal.throwIfAborted()
  onProgress(1)

  if (output.bytes.byteLength >= file.size) {
    return {
      blob: file,
      fileName: textOutputFileName(file.name, 'minify'),
    }
  }

  return {
    blob: new Blob([output.bytes], { type: output.mimeType }),
    fileName: output.fileName,
  }
}
