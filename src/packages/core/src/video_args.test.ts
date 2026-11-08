import { describe, expect, it } from 'vitest'
import { DEFAULT_OPTIONS } from './options'
import { buildVideoArgs } from './video_args'

const base = { inputPath: '/in/a.mov', outputPath: '/out.mp4', videoKbps: 1125, audioKbps: 128 }

function valueOf(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag)
  return i === -1 ? undefined : args[i + 1]
}

describe('buildVideoArgs', () => {
  it('builds H.264 args with default options', () => {
    const args = buildVideoArgs({ ...base, options: DEFAULT_OPTIONS })

    expect(args.slice(0, 3)).toEqual(['-hide_banner', '-i', '/in/a.mov'])
    expect(args.at(-1)).toBe('/out.mp4')
    expect(valueOf(args, '-c:v')).toBe('libx264')
    expect(valueOf(args, '-b:v')).toBe('1125k')
    expect(valueOf(args, '-b:a')).toBe('128k')
    expect(valueOf(args, '-fpsmax')).toBe('30')
    expect(valueOf(args, '-map_metadata')).toBe('-1')
  })

  it('drops audio when muted', () => {
    const args = buildVideoArgs({ ...base, audioKbps: 0, options: { ...DEFAULT_OPTIONS, muteAudio: true } })
    expect(args).toContain('-an')
    expect(args).not.toContain('-c:a')
  })

  it('preserves resolution, fps and metadata when options are disabled', () => {
    const args = buildVideoArgs({
      ...base,
      options: { stripHiddenData: false, smartOptimize: false, muteAudio: false },
    })

    expect(valueOf(args, '-vf')).toBe('scale=trunc(iw/2)*2:trunc(ih/2)*2')
    expect(args).not.toContain('-fpsmax')
    expect(valueOf(args, '-movflags')).toBe('+faststart+use_metadata_tags')
  })
})
