'use client'

import { useRef, useState } from 'react'
import { Camera, Trash2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { PhotoCropperDialog } from './photo-cropper-dialog'
import { readFileAsDataUrl } from '@/lib/crop-image'
import { getInitials } from '@/lib/initials'

interface PhotoPickerProps {
  value: string | null
  name: string
  onChange: (dataUrl: string | null) => void
}

export function PhotoPicker({ value, name, onChange }: PhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [pendingSrc, setPendingSrc] = useState<string | null>(null)

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    const dataUrl = await readFileAsDataUrl(file)
    setPendingSrc(dataUrl)
  }

  return (
    <>
      <div className="flex flex-col items-center gap-3">
        <Avatar className="size-24">
          {value ? <AvatarImage src={value} alt="" /> : null}
          <AvatarFallback className="text-2xl font-medium">{getInitials(name || '?')}</AvatarFallback>
        </Avatar>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            <Camera className="mr-1" />
            {value ? 'Change photo' : 'Upload photo'}
          </Button>
          {value ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(null)}
              aria-label="Remove photo"
            >
              <Trash2 />
            </Button>
          ) : null}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            void handleFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </div>
      <PhotoCropperDialog
        src={pendingSrc}
        onCancel={() => setPendingSrc(null)}
        onCrop={(dataUrl) => {
          onChange(dataUrl)
          setPendingSrc(null)
        }}
      />
    </>
  )
}
