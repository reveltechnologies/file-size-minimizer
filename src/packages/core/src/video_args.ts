import { MAX_SMART_FPS, shortSideCap } from './bitrate_calculator'
import type { CompressOptions } from './options'

export interface VideoArgsInput {
  inputPath: string
  outputPath: string
  videoKbps: number
  audioKbps: number
  options: CompressOptions
}

export function buildVideoArgs({
  inputPath,
  outputPath,
  videoKbps,
  audioKbps,
  options,
}: VideoArgsInput): string[] {
  const args = ['-hide_banner', '-i', inputPath, '-map', '0:v:0']
  if (audioKbps > 0) args.push('-map', '0:a:0?')

  args.push('-c:v', 'libx264', '-preset', 'veryfast', '-b:v', `${videoKbps}k`)
  args.push('-pix_fmt', 'yuv420p', '-vf', scaleFilter(options.smartOptimize ? shortSideCap(videoKbps) : null))
  if (options.smartOptimize) args.push('-fpsmax', String(MAX_SMART_FPS))

  if (audioKbps > 0) args.push('-c:a', 'aac', '-b:a', `${audioKbps}k`)
  else args.push('-an')

  if (options.stripHiddenData) {
    args.push('-map_metadata', '-1', '-map_chapters', '-1', '-dn', '-sn', '-movflags', '+faststart')
  } else {
    args.push('-movflags', '+faststart+use_metadata_tags')
  }

  args.push(outputPath)
  return args
}

function scaleFilter(cap: number | null): string {
  if (cap === null) return 'scale=trunc(iw/2)*2:trunc(ih/2)*2'
  const w = `if(gte(iw,ih),-2,trunc(min(${cap},iw)/2)*2)`
  const h = `if(gte(iw,ih),trunc(min(${cap},ih)/2)*2,-2)`
  return `scale=w='${w}':h='${h}'`
}
