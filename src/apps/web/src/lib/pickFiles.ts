import { compareFileNames, detectCategory, MAX_MERGE_PHOTOS, type FileCategory } from '@revel/core'

export interface PickedFiles {
  files: File[]
  category: FileCategory
}

export function pickFiles(files: File[]): PickedFiles | string {
  const empty = files.find((file) => file.size === 0)
  if (empty) return `"${empty.name}" is empty.`

  if (files.length === 1) {
    const category = detectCategory(files[0].name, files[0].type)
    return category ? { files, category } : `"${files[0].name}" isn't supported. Try a video, photo or PDF.`
  }

  if (files.length > MAX_MERGE_PHOTOS) return `Pick up to ${MAX_MERGE_PHOTOS} photos at a time.`
  const notPhoto = files.find((file) => detectCategory(file.name, file.type) !== 'image')
  if (notPhoto) return `To combine files into one PDF, pick only photos. "${notPhoto.name}" isn't a photo.`
  return { files: [...files].sort((a, b) => compareFileNames(a.name, b.name)), category: 'pdf' }
}
