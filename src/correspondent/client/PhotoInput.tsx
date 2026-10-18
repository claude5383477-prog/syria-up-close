'use client'

import { useState } from 'react'
import { PHOTO_QUALITIES, PHOTO_TARGET_BYTES, fitWithin, formatBytes } from '../logic'

async function compress(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file)
  const { width, height } = fitWithin(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  const toBlob = (type: string, q: number) => new Promise<Blob | null>((r) => canvas.toBlob(r, type, q))
  // WebP where supported; browsers that can't encode it return PNG, so fall back to JPEG.
  const probe = await toBlob('image/webp', PHOTO_QUALITIES[0])
  const type = probe?.type === 'image/webp' ? 'image/webp' : 'image/jpeg'
  // Step quality down until the photo fits the target; busy scenes need more compression.
  let blob: Blob | null = type === 'image/webp' ? probe : null // the probe is already the first WebP try
  for (const q of PHOTO_QUALITIES) {
    if (q !== PHOTO_QUALITIES[0] || !blob) blob = await toBlob(type, q)
    if (blob && blob.size <= PHOTO_TARGET_BYTES) break
  }
  if (!blob) return file
  const ext = blob.type === 'image/webp' ? 'webp' : 'jpg'
  return new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'photo'}.${ext}`, { type: blob.type })
}

/**
 * Photo field that compresses in the browser before the form is submitted (≤ 2000px, ≤ 600KB),
 * replacing the input's file. Without JavaScript the original file is sent and the server enforces 3MB.
 */
export function PhotoInput({ name = 'photo' }: { name?: string }) {
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget
    const original = input.files?.[0]
    if (!original) return setHint(null)
    setBusy(true)
    try {
      const small = await compress(original)
      const dt = new DataTransfer()
      dt.items.add(small)
      input.files = dt.files
      setHint(`جاهزة للرفع: ${formatBytes(small.size)} (كانت ${formatBytes(original.size)})`)
    } catch {
      setHint('تعذّر ضغط الصورة على هذا الجهاز؛ ستُرفع كما هي.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <label>
      الصورة
      <input name={name} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={onChange} data-photo-input />
      <span className="hint" aria-live="polite">
        {busy ? 'جارٍ ضغط الصورة…' : hint ?? 'تُضغط الصورة على جهازك قبل الرفع.'}
      </span>
    </label>
  )
}
