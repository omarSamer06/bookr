import { useEffect, useRef, useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getInitials } from '@/lib/profileUtils'

const MAX_BYTES = 2 * 1024 * 1024

/** Avatar picker with preview and upload callback */
export default function AvatarUploader({ currentAvatar, userName, onUpload, isUploading }) {
  const inputRef = useRef(null)
  const [preview, setPreview] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [fileError, setFileError] = useState('')

  const displaySrc = preview || currentAvatar
  const initials = getInitials(userName)

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  const onFileChange = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (file.size > MAX_BYTES) {
      setFileError('Image must be under 2MB')
      setSelectedFile(null)
      if (preview) URL.revokeObjectURL(preview)
      setPreview(null)
      return
    }

    if (!file.type.startsWith('image/')) {
      setFileError('Please select an image file')
      return
    }

    setFileError('')
    if (preview) URL.revokeObjectURL(preview)
    setSelectedFile(file)
    setPreview(URL.createObjectURL(file))
  }

  const onSave = async () => {
    if (!selectedFile || !onUpload) return
    const fd = new FormData()
    fd.append('image', selectedFile)
    await onUpload(fd)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setSelectedFile(null)
  }

  const onCancelPreview = () => {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setSelectedFile(null)
    setFileError('')
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <div className="relative">
        {displaySrc ? (
          <img
            src={displaySrc}
            alt=""
            className="size-28 rounded-full object-cover shadow-md ring-4 ring-indigo-50"
          />
        ) : (
          <span
            className="flex size-28 items-center justify-center rounded-full bg-linear-to-br from-indigo-500 to-purple-600 text-3xl font-bold text-white shadow-md ring-4 ring-indigo-50"
            aria-hidden
          >
            {initials}
          </span>
        )}
        <button
          type="button"
          className="absolute right-0 bottom-0 flex size-9 items-center justify-center rounded-full border-2 border-white bg-indigo-600 text-white shadow-md transition hover:bg-indigo-700"
          aria-label="Change photo"
          onClick={() => inputRef.current?.click()}
        >
          <Camera className="size-4" aria-hidden />
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFileChange}
        />
      </div>

      <div className="flex flex-col items-center gap-2 sm:items-start">
        <Button
          type="button"
          variant="outline"
          className="rounded-xl"
          onClick={() => inputRef.current?.click()}
        >
          Change Photo
        </Button>
        {fileError ? <p className="text-xs font-medium text-red-600">{fileError}</p> : null}
        {selectedFile ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="rounded-xl bg-linear-to-r from-indigo-600 via-violet-600 to-purple-600 text-white"
              disabled={isUploading}
              onClick={onSave}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                'Save Photo'
              )}
            </Button>
            <Button type="button" variant="ghost" className="rounded-xl" disabled={isUploading} onClick={onCancelPreview}>
              Cancel
            </Button>
          </div>
        ) : (
          <p className="text-xs text-bookr-muted">JPEG, PNG, WebP or GIF · max 2MB</p>
        )}
      </div>
    </div>
  )
}
