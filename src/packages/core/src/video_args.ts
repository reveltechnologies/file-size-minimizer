import { MAX_SMART_FPS, shortSideCap } from './bitrate_calculator'
import type { CompressOptions } from './options'

export interface VideoArgsInput {
  inputPath: string
  outputPath: string
  videoKbps: number
  /** 0 drops the audio track. */
  audioKbps: number
  options: CompressOptions
}

/** The ffmpeg command for one encode, as an argument list (no shell quoting needed). */
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
  // yuv420p is the only pixel format every phone, Discord and WhatsApp can play.
  args.push('-pix_fmt', 'yuv420p', '-vf', scaleFilter(options.smartOptimize ? shortSideCap(videoKbps) : null))
  if (options.smartOptimize) args.push('-fpsmax', String(MAX_SMART_FPS))

  if (audioKbps > 0) args.push('-c:a', 'aac', '-b:a', `${audioKbps}k`)
  else args.push('-an')

  // faststart lets Discord/WhatsApp start playing before the whole file has loaded.
  if (options.stripHiddenData) {
    args.push('-map_metadata', '-1', '-map_chapters', '-1', '-dn', '-sn', '-movflags', '+faststart')
  } else {
    // The MP4 muxer silently drops custom tags such as GPS unless told to keep them.
    args.push('-movflags', '+faststart+use_metadata_tags')
  }

  args.push(outputPath)
  return args
}

/**
 * Caps the short side (never upscaling) and keeps both sides even. Uses
 * ffmpeg expressions so it works on the frame after auto-rotation.
 */
function scaleFilter(cap: number | null): string {
  if (cap === null) return 'scale=trunc(iw/2)*2:trunc(ih/2)*2'
  const w = `if(gte(iw,ih),-2,trunc(min(${cap},iw)/2)*2)`
  const h = `if(gte(iw,ih),trunc(min(${cap},ih)/2)*2,-2)`
  return `scale=w='${w}':h='${h}'`
}
