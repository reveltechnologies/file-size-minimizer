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

/**
 * Loaded from a CDN because the ~32 MB .wasm is over Cloudflare Pages'
 * 25 MiB per-file limit. Only the engine is downloaded; the user's files
 * never leave the device.
 */
const CORE_BASE_URL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm'
/**
 * Unpacked size of that ffmpeg-core.wasm. The CDN sends it compressed
 * (~9 MB), so Content-Length can't be used as the progress total.
 */
const WASM_BYTES = 32_232_419
const MAX_ATTEMPTS = 3

let ffmpegPromise: Promise<FFmpeg> | null = null
let jobCounter = 0

export async function compressVideo(job: CompressJob): Promise<CompressResult> {
  const { files: [file], maxBytes, options, allowBlurry, onStep, onProgress, onStatus, signal } = job

  onStatus('Getting the video tool ready (first time only)…')
  const ffmpeg = await loadFFmpeg(onProgress)
  signal.throwIfAborted()
  // ffmpeg.wasm can't stop mid-encode; killing its worker is the only way.
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
    // WORKERFS reads the File in place instead of copying it into wasm memory.
    await ffmpeg.createDir(dir)
    await ffmpeg.mount(FFFSType.WORKERFS, { files: [file] }, dir)

    onStatus('Looking at your video…')
    onProgress(0)
    // `ffmpeg -i` with no output exits with an error; only its log matters.
    const probe = await run(ffmpeg, ['-hide_banner', '-i', input])
    const info = parseFfmpegInfo(probe.log)
    if (!info) {
      console.error(probe.log)
      throw new Error("Couldn't read this video. It may be damaged or use an unsupported codec.")
    }
    const durationSec = info.durationSec ?? (await scanDuration(ffmpeg, input))
    if (!durationSec) throw new Error("Couldn't work out how long this video is.")

    const audioKbps = options.muteAudio || !info.hasAudio ? 0 : DEFAULT_AUDIO_KBPS
    let plan = calculateBitrate({ maxBytes, durationSec, audioKbps })
    const tip = audioKbps > 0 ? 'Try Mute audio or a bigger target.' : 'Try a bigger target.'
    if (!plan.possible) {
      throw new Error(`This video is too long to fit under ${formatBytes(maxBytes)}, even blurry. ${tip}`)
    }
    if (!plan.feasible && !allowBlurry) {
      throw new BlurryVideoError(`This video will look very blurry under ${formatBytes(maxBytes)}. ${tip}`)
    }

    onStep('shrink')
    for (let attempt = 1; ; attempt++) {
      // A retry isn't a problem for the user, so it shouldn't sound like one.
      onStatus(attempt === 1 ? 'Squeezing it under the limit…' : 'Fine-tuning the size…')
      onProgress(0)
      const args = buildVideoArgs({ inputPath: input, outputPath: output, videoKbps: plan.videoKbps, audioKbps, options })
      const { exitCode, log } = await run(ffmpeg, args, (line) => {
        const seconds = parseFfmpegTime(line)
        if (seconds !== null) onProgress(Math.min(1, seconds / durationSec))
      })
      if (exitCode !== 0) {
        console.error(log)
        throw new Error('Shrinking failed. This video format may not be supported yet.')
      }

      const data = await ffmpeg.readFile(output)
      if (typeof data === 'string') throw new Error('Unexpected text output from the video engine.')

      // A retry may dip a little under the blur warning; that's fine. If it can't
      // work at all, keep this attempt and let the receipt say it's over.
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
    // After a cancel the worker is gone, and its files with it.
    if (!signal.aborted) {
      await ffmpeg.deleteFile(output).catch(() => {})
      await ffmpeg.unmount(dir).catch(() => {})
      await ffmpeg.deleteDir(dir).catch(() => {})
    }
  }
}

/** For files whose header has no duration: read them through and keep the last time=. */
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
    // Let the next attempt retry after a network error.
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

/**
 * Replaces @ffmpeg/util's toBlobURL, whose progress mode crashes on
 * compressed responses ("body stream already read").
 */
async function downloadAsBlobURL(
  url: string,
  type: string,
  onReceived?: (bytes: number) => void,
): Promise<string> {
  const response = await fetch(url)
  if (!response.ok || !response.body) {
    throw new Error(`Couldn't download the video engine (HTTP ${response.status}). Check your connection.`)
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
