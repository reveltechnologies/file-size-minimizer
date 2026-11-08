export interface MediaInfo {
  /** Null when the container doesn't store it (e.g. browser-recorded WebM). */
  durationSec: number | null
  /** As displayed, i.e. after applying phone rotation metadata. */
  width: number
  height: number
  fps: number | null
  hasAudio: boolean
}

/**
 * Parses the stream summary that `ffmpeg -i <file>` prints. Works for both
 * ffmpeg.wasm (web) and ffmpeg-kit (Android), which print the same text.
 */
export function parseFfmpegInfo(log: string): MediaInfo | null {
  const duration = /Duration: (\d+):(\d{2}):(\d{2}(?:\.\d+)?)/.exec(log)
  // Checked line by line with an anchored regex: an unanchored `Stream #.*?: Video:`
  // over the whole log is quadratic on crafted input (e.g. in a metadata title).
  const streams = log.split('\n').filter((line) => /^\s*Stream #\d+:\d+/.test(line))
  const videoLine = streams.find((line) => line.includes(': Video: '))
  const size = videoLine && /, (\d+)x(\d+)/.exec(videoLine)
  if (!size) return null

  const seconds = duration && Number(duration[1]) * 3600 + Number(duration[2]) * 60 + Number(duration[3])
  const durationSec = seconds && seconds > 0 ? seconds : null

  let width = Number(size[1])
  let height = Number(size[2])
  // iPhone portrait videos are stored landscape with a ±90° rotation flag.
  const rotation = /rotation of (-?\d+(?:\.\d+)?) degrees/.exec(log)
  if (rotation && Math.abs(Number(rotation[1])) % 180 === 90) [width, height] = [height, width]

  const fps = /, (\d+(?:\.\d+)?) fps/.exec(videoLine)
  return {
    durationSec,
    width,
    height,
    fps: fps ? Number(fps[1]) : null,
    hasAudio: streams.some((line) => line.includes(': Audio: ')),
  }
}

/**
 * Args that read the whole file without re-encoding. Its last progress
 * line's time= is the true duration, for files whose header lacks one.
 */
export function buildDurationScanArgs(inputPath: string): string[] {
  return ['-hide_banner', '-i', inputPath, '-map', '0:v:0', '-c', 'copy', '-f', 'null', '-']
}

/** Reads "time=00:01:02.50" from an ffmpeg progress line, in seconds. */
export function parseFfmpegTime(line: string): number | null {
  const time = /time=(\d+):(\d{2}):(\d{2}(?:\.\d+)?)/.exec(line)
  return time ? Number(time[1]) * 3600 + Number(time[2]) * 60 + Number(time[3]) : null
}
