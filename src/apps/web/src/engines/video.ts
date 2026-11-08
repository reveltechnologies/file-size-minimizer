import { FFFSType, FFmpeg, type LogEvent } from '@ffmpeg/ffmpeg'
import {
  buildDurationScanArgs,
  buildVideoArgs,
  calculateBitrate,
  correctForOvershoot,
  DEFAULT_AUDIO_KBPS,
  formatBytes,
  outputFileName,
  outputMimeType,
  parseFfmpegInfo,
  parseFfmpegTime,
} from '@revel/core'
import { BlurryVideoError, type CompressJob, type CompressResult } from './types'

const CORE_BASE_URL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm'
const WASM_BYTES = 32_232_419
const MAX_ATTEMPTS = 3

let ffmpegPromise: Promise<FFmpeg> | null = null
let jobCounter = 0

export async function compressVideo(job: CompressJob): Promise<CompressResult> {
  const { files: [file], maxBytes, options, allowBlurry, onStep, onProgress, onStatus, signal } = job

  onStatus('Loading video engine…')
  const ffmpeg = await loadFFmpeg(onProgress)
  signal.throwIfAborted()
  const cancel = () => {
    ffmpeg.terminate()
    ffmpegPromise = null
  }
  signal.addEventListener('abort', cancel, { once: true })

  const id = ++jobCounter
  const dir = `/job-${id}`
  const input = `${dir}/${file.name}`
  const output = `/out-${id}.mp4`

  try {
    await ffmpeg.createDir(dir)
    await ffmpeg.mount(FFFSType.WORKERFS, { files: [file] }, dir)

    onStatus('Reading video…')
    onProgress(0)
    const probe = await run(ffmpeg, ['-hide_banner', '-i', input])
    const info = parseFfmpegInfo(probe.log)
    if (!info) {
      console.error(probe.log)
      throw new Error("Couldn't read video.")
    }
    const durationSec = info.durationSec ?? (await scanDuration(ffmpeg, input))
    if (!durationSec) throw new Error("Couldn't determine video duration.")

    const audioKbps = options.muteAudio || !info.hasAudio ? 0 : DEFAULT_AUDIO_KBPS
    let plan = calculateBitrate({ maxBytes, durationSec, audioKbps })
    const tip = audioKbps > 0 ? 'Try Mute audio or a bigger target.' : 'Try a bigger target.'
    if (!plan.possible) {
      throw new Error(`Video is too long to fit under ${formatBytes(maxBytes)}. ${tip}`)
    }
    if (!plan.feasible && !allowBlurry) {
      throw new BlurryVideoError(`Video will be low quality under ${formatBytes(maxBytes)}. ${tip}`)
    }

    onStep('shrink')
    for (let attempt = 1; ; attempt++) {
      onStatus(attempt === 1 ? 'Encoding video…' : 'Adjusting bitrate…')
      onProgress(0)
      const args = buildVideoArgs({ inputPath: input, outputPath: output, videoKbps: plan.videoKbps, audioKbps, options })
      const { exitCode, log } = await run(ffmpeg, args, (line) => {
        const seconds = parseFfmpegTime(line)
        if (seconds !== null) onProgress(Math.min(1, seconds / durationSec))
      })
      if (exitCode !== 0) {
        console.error(log)
        throw new Error('Encoding failed.')
      }

      const data = await ffmpeg.readFile(output)
      if (typeof data === 'string') throw new Error('Unexpected encoder output.')

      const retry = attempt < MAX_ATTEMPTS ? correctForOvershoot(plan, durationSec, data.byteLength, maxBytes) : null
      if (data.byteLength <= maxBytes || !retry?.possible) {
        return {
          blob: new Blob([data.slice()], { type: outputMimeType('video') }),
          fileName: outputFileName(file.name, 'video'),
        }
      }
      plan = retry
    }
  } finally {
    signal.removeEventListener('abort', cancel)
    if (!signal.aborted) {
      await ffmpeg.deleteFile(output).catch(() => {})
      await ffmpeg.unmount(dir).catch(() => {})
      await ffmpeg.deleteDir(dir).catch(() => {})
    }
  }
}

async function scanDuration(ffmpeg: FFmpeg, input: string): Promise<number | null> {
  let lastSeconds: number | null = null
  await run(ffmpeg, buildDurationScanArgs(input), (line) => {
    lastSeconds = parseFfmpegTime(line) ?? lastSeconds
  })
  return lastSeconds
}

function loadFFmpeg(onProgress: (ratio: number) => void): Promise<FFmpeg> {
  if (!ffmpegPromise) {
    ffmpegPromise = createFFmpeg(onProgress)
    ffmpegPromise.catch(() => {
      ffmpegPromise = null
    })
  }
  return ffmpegPromise
}

async function createFFmpeg(onProgress: (ratio: number) => void): Promise<FFmpeg> {
  const ffmpeg = new FFmpeg()
  await ffmpeg.load({
    coreURL: await downloadAsBlobURL(`${CORE_BASE_URL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await downloadAsBlobURL(`${CORE_BASE_URL}/ffmpeg-core.wasm`, 'application/wasm', (received) =>
      onProgress(Math.min(1, received / WASM_BYTES)),
    ),
  })
  return ffmpeg
}

async function downloadAsBlobURL(
  url: string,
  type: string,
  onReceived?: (bytes: number) => void,
): Promise<string> {
  const response = await fetch(url)
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download video engine (HTTP ${response.status}).`)
  }
  const chunks: Uint8Array<ArrayBuffer>[] = []
  let received = 0
  const reader = response.body.getReader()
  for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
    chunks.push(chunk.value)
    received += chunk.value.byteLength
    onReceived?.(received)
  }
  return URL.createObjectURL(new Blob(chunks, { type }))
}

async function run(
  ffmpeg: FFmpeg,
  args: string[],
  onLine?: (line: string) => void,
): Promise<{ exitCode: number; log: string }> {
  const lines: string[] = []
  const onLog = ({ message }: LogEvent) => {
    lines.push(message)
    onLine?.(message)
  }
  ffmpeg.on('log', onLog)
  try {
    const exitCode = await ffmpeg.exec(args)
    return { exitCode, log: lines.join('\n') }
  } finally {
    ffmpeg.off('log', onLog)
  }
}
