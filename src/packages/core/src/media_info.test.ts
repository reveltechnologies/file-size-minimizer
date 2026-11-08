import { describe, expect, it } from 'vitest'
import { parseFfmpegInfo, parseFfmpegTime } from './media_info'

const LANDSCAPE_MP4 = `Input #0, mov,mp4,m4a,3gp,3g2,mj2, from '/job-1/clip.mp4':
  Metadata:
    major_brand     : isom
  Duration: 00:01:15.43, start: 0.000000, bitrate: 6843 kb/s
  Stream #0:0[0x1](und): Video: h264 (High) (avc1 / 0x31637661), yuv420p(tv, bt709, progressive), 1920x1080 [SAR 1:1 DAR 16:9], 6712 kb/s, 59.94 fps, 59.94 tbr, 60k tbn (default)
  Stream #0:1[0x2](und): Audio: aac (LC) (mp4a / 0x6134706D), 48000 Hz, stereo, fltp, 128 kb/s (default)
At least one output file must be specified`

const IPHONE_PORTRAIT_MOV = `Input #0, mov,mp4,m4a,3gp,3g2,mj2, from '/job-2/IMG_1234.MOV':
  Duration: 00:00:12.05, start: 0.000000, bitrate: 15201 kb/s
  Stream #0:0[0x1](und): Video: hevc (Main 10) (hvc1 / 0x31637668), yuv420p10le(tv, bt2020nc/bt2020/arib-std-b67), 1920x1080, 14980 kb/s, 30 fps, 30 tbr, 600 tbn (default)
    Side data:
      displaymatrix: rotation of -90.00 degrees
  Stream #0:1[0x2](und): Audio: aac (LC) (mp4a / 0x6134706D), 44100 Hz, mono, fltp, 96 kb/s (default)
  Stream #0:2[0x3](und): Data: none (mebx / 0x7862656D), 0 kb/s (default)`

const SILENT_GIF = `Input #0, gif, from '/job-3/funny.gif':
  Duration: 00:00:02.50, start: 0.000000, bitrate: 3277 kb/s
  Stream #0:0: Video: gif, bgra, 480x270, 10 fps, 10 tbr, 100 tbn`

describe('parseFfmpegInfo', () => {
  it('reads a landscape MP4', () => {
    expect(parseFfmpegInfo(LANDSCAPE_MP4)).toEqual({
      durationSec: 75.43,
      width: 1920,
      height: 1080,
      fps: 59.94,
      hasAudio: true,
    })
  })

  it('swaps width and height for rotated iPhone video', () => {
    expect(parseFfmpegInfo(IPHONE_PORTRAIT_MOV)).toMatchObject({ width: 1080, height: 1920, fps: 30 })
  })

  it('reads a silent GIF', () => {
    expect(parseFfmpegInfo(SILENT_GIF)).toEqual({
      durationSec: 2.5,
      width: 480,
      height: 270,
      fps: 10,
      hasAudio: false,
    })
  })

  it('returns null for files without a video stream', () => {
    expect(parseFfmpegInfo('Invalid data found when processing input')).toBeNull()
    expect(parseFfmpegInfo('  Duration: 00:03:00.00\n  Stream #0:0: Audio: mp3, 44100 Hz')).toBeNull()
  })

  it('leaves the duration null when the container lacks one', () => {
    const browserRecording = `Input #0, matroska,webm, from '/job-4/rec.webm':
  Duration: N/A, start: 0.000000, bitrate: N/A
  Stream #0:0(eng): Video: vp8, yuv420p(progressive), 1920x1080, SAR 1:1 DAR 16:9, 1k tbr, 1k tbn (default)
  Stream #0:1(eng): Audio: opus, 48000 Hz, mono, fltp (default)`

    expect(parseFfmpegInfo(browserRecording)).toEqual({
      durationSec: null,
      width: 1920,
      height: 1080,
      fps: null,
      hasAudio: true,
    })
  })

  it('stays fast on a crafted log line', () => {
    const crafted = `    title           : ${'Stream #0:0'.repeat(200_000)}\n${SILENT_GIF}`
    const start = Date.now()
    expect(parseFfmpegInfo(crafted)).toMatchObject({ width: 480, hasAudio: false })
    expect(Date.now() - start).toBeLessThan(500)
  })
})

describe('parseFfmpegTime', () => {
  it('reads the time from a progress line', () => {
    expect(parseFfmpegTime('frame=  300 fps= 12 q=28.0 size=1024kB time=00:01:02.50 bitrate=134.2kbits/s')).toBe(62.5)
    expect(parseFfmpegTime('Press [q] to stop')).toBeNull()
  })
})
