import { useCallback, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  businessQueryKeys,
  addImageByUrl,
  deleteImage,
  uploadImages,
} from '@/services/business.service.js'

/** Keeps previews optimistic-free by refetching canonical documents after CDN mutations */
export default function ImageUploader({ business }) {
  const qc = useQueryClient()
  const inputRef = useRef(null)
  const [dragActive, setDragActive] = useState(false)
  const [urlValue, setUrlValue] = useState('')
  const [urlError, setUrlError] = useState('')

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

  const addUrlMutation = useMutation({
    mutationFn: (url) => addImageByUrl(url),
    onSuccess: () => {
      toast.success('Image added successfully')
      setUrlValue('')
      setUrlError('')
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

  const submitUrl = () => {
    const url = String(urlValue || '').trim()
    if (!url) {
      setUrlError('Please paste an image URL.')
      return
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setUrlError('URL must start with http:// or https://')
      return
    }
    setUrlError('')
    addUrlMutation.mutate(url)
  }

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
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-300 bg-linear-to-br from-indigo-50/50 to-purple-50/40 px-6 py-10 text-center text-sm transition-colors',
          dragActive && 'border-indigo-400 bg-indigo-50 text-indigo-800'
        )}
      >
        <ImagePlus className="size-8 opacity-70" aria-hidden />
        <p className="font-medium">Drop images here or click to browse</p>
        <p className="text-bookr-muted">Up to 5 files per upload · JPEG / PNG / WebP / GIF · max 5MB each</p>
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
        <p className="text-sm font-medium text-indigo-700">Uploading…</p>
      ) : null}

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-100" />
        <span className="text-xs font-semibold uppercase tracking-wide text-bookr-muted">or</span>
        <div className="h-px flex-1 bg-gray-100" />
      </div>

      <div className="space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={urlValue}
            onChange={(e) => {
              setUrlValue(e.target.value)
              if (urlError) setUrlError('')
            }}
            placeholder="Paste image URL here..."
            className={cn('rounded-xl', urlError && 'border-red-300 focus-visible:border-red-400 focus-visible:ring-red-200')}
          />
          <Button
            type="button"
            onClick={submitUrl}
            disabled={addUrlMutation.isPending}
            className="rounded-xl bg-linear-to-r from-indigo-600 via-violet-600 to-purple-600 text-white"
          >
            {addUrlMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Adding…
              </>
            ) : (
              'Add'
            )}
          </Button>
        </div>
        {urlError ? <p className="text-xs font-medium text-red-600">{urlError}</p> : null}
      </div>

      <div className="columns-2 gap-4 space-y-0 sm:columns-3">
        {images.map((url) => (
          <div key={url} className="group relative mb-4 break-inside-avoid overflow-hidden rounded-2xl shadow-sm ring-1 ring-gray-100">
            <img src={url} alt="" className="w-full object-cover" />
            <Button
              type="button"
              variant="destructive"
              size="icon-xs"
              className="absolute top-3 right-3 rounded-full opacity-0 shadow-md transition-opacity group-hover:opacity-100"
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
