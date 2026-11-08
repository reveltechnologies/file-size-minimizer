import type { CompressJob, CompressResult } from './types'

export type { CompressJob, CompressResult, ProgressStep } from './types'
export { BlurryVideoError } from './types'

/** Each engine is downloaded only the first time someone needs it. */
export async function compress(job: CompressJob): Promise<CompressResult> {
  switch (job.category) {
    case 'video':
      return (await import('./video')).compressVideo(job)
    case 'image':
      return (await import('./image')).compressImage(job)
    case 'pdf':
      return job.files.length > 1
        ? (await import('./photosToPdf')).photosToPdf(job)
        : (await import('./pdf')).compressPdf(job)
  }
}
