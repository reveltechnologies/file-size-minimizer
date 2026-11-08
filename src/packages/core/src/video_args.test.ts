import { describe, expect, it } from 'vitest'
import { DEFAULT_OPTIONS } from './options'
import { buildVideoArgs } from './video_args'

const base = { inputPath: '/in/a.mov', outputPath: '/out.mp4', videoKbps: 1125, audioKbps: 128 }

/** Value that follows a flag, e.g. valueOf(args, '-b:v') → '1125k'. */
function valueOf(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag)
  return i === -1 ? undefined : args[i + 1]
}

describe('buildVideoArgs', () => {
  it('encodes H.264 at the planned bitrates with all three defaults', () => {
    const args = buildVideoArgs({ ...base, options: DEFAULT_OPTIONS })

    expect(args.slice(0, 3)).toEqual(['-hide_banner', '-i', '/in/a.mov'])
    expect(args.at(-1)).toBe('/out.mp4')
    expect(valueOf(args, '-c:v')).toBe('libx264')
    expect(valueOf(args, '-b:v')).toBe('1125k')
    expect(valueOf(args, '-b:a')).toBe('128k')
    expect(valueOf(args, '-pix_fmt')).toBe('yuv420p')
    expect(valueOf(args, '-fpsmax')).toBe('30')
    expect(valueOf(args, '-map_metadata')).toBe('-1')
    expect(args).toEqual(expect.arrayContaining(['-dn', '-sn']))
  })

  it('scales to 720p on the short side at 1125 kbps', () => {
    const args = buildVideoArgs({ ...base, options: DEFAULT_OPTIONS })

    expect(valueOf(args, '-vf')).toBe(
      "scale=w='if(gte(iw,ih),-2,trunc(min(720,iw)/2)*2)':h='if(gte(iw,ih),trunc(min(720,ih)/2)*2,-2)'",
    )
  })

  it('drops audio when muted', () => {
    const args = buildVideoArgs({ ...base, audioKbps: 0, options: { ...DEFAULT_OPTIONS, muteAudio: true } })

    expect(args).toContain('-an')
    expect(args).not.toContain('0:a:0?')
    expect(args).not.toContain('-c:a')
  })

  it('keeps resolution, frame rate and metadata when those options are off', () => {
    const args = buildVideoArgs({
      ...base,
      options: { stripHiddenData: false, smartOptimize: false, muteAudio: false },
    })

    expect(valueOf(args, '-vf')).toBe('scale=trunc(iw/2)*2:trunc(ih/2)*2')
    expect(args).not.toContain('-fpsmax')
    expect(args).not.toContain('-map_metadata')
    expect(valueOf(args, '-movflags')).toBe('+faststart+use_metadata_tags')
  })
})
