import { useCallback, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ImagePlus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  businessQueryKeys,
  deleteImage,
  uploadImages,
} from '@/services/business.service.js'

/** Keeps previews optimistic-free by refetching canonical documents after CDN mutations */
export default function ImageUploader({ business }) {
  const qc = useQueryClient()
  const inputRef = useRef(null)
  const [dragActive, setDragActive] = useState(false)

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: businessQueryKeys.mine })
    qc.invalidateQueries({ queryKey: ['businesses', 'list'] })
    if (business?._id) {
      qc.invalidateQueries({ queryKey: businessQueryKeys.detail(business._id) })
    }
  }

  const uploadMutation = useMutation({
    mutationFn: (files) => {
      const fd = new FormData()
      files.forEach((f) => fd.append('images', f))
      return uploadImages(fd)
    },
    onSuccess: () => {
      toast.success('Images uploaded')
      invalidateAll()
    },
    onError: (err) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (url) => deleteImage(url),
    onSuccess: () => {
      toast.success('Image removed')
      invalidateAll()
    },
    onError: (err) => toast.error(err.message),
  })

  const handleFiles = useCallback(
    (fileList) => {
      const arr = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'))
      if (!arr.length) return
      const maxBatch = Math.min(5, arr.length)
      uploadMutation.mutate(arr.slice(0, maxBatch))
    },
    [uploadMutation]
  )

  const onInputChange = (e) => {
    handleFiles(e.target.files)
    e.target.value = ''
  }

  const images = business?.images ?? []

  return (
    <div className="space-y-4">
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
        }}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(e) => {
          e.preventDefault()
          setDragActive(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          setDragActive(false)
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          setDragActive(false)
          handleFiles(e.dataTransfer.files)
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-muted-foreground/40 bg-muted/20 px-6 py-10 text-center text-sm transition-colors',
          dragActive && 'border-primary bg-primary/5 text-primary'
        )}
      >
        <ImagePlus className="size-8 opacity-70" aria-hidden />
        <p className="font-medium">Drop images here or click to browse</p>
        <p className="text-muted-foreground">Up to 5 files per upload · JPEG / PNG / WebP / GIF · max 5MB each</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={onInputChange}
        />
      </div>

      {uploadMutation.isPending ? (
        <p className="text-sm text-muted-foreground">Uploading…</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((url) => (
          <div key={url} className="group relative overflow-hidden rounded-lg ring-1 ring-border">
            <img src={url} alt="" className="aspect-video w-full object-cover" />
            <Button
              type="button"
              variant="destructive"
              size="icon-xs"
              className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (window.confirm('Remove this image from your business profile?')) {
                  deleteMutation.mutate(url)
                }
              }}
            >
              <Trash2 className="size-3.5" aria-hidden />
              <span className="sr-only">Delete image</span>
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
