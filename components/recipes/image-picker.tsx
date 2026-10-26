'use client'

import { useRef, useState } from 'react'
import { Camera, X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  value: string
  onChange: (url: string) => void
  aspectRatio?: 'video' | 'square'
  compact?: boolean
}

export function ImagePicker({ value, onChange, aspectRatio = 'video', compact = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upload = async (file: File) => {
    setUploading(true)
    setError(null)

    const supabase = createClient()
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('recipe-images')
      .upload(path, file, { upsert: false })

    if (uploadError) {
      setError('Erreur lors du téléchargement.')
      setUploading(false)
      return
    }

    const { data } = supabase.storage.from('recipe-images').getPublicUrl(path)
    onChange(data.publicUrl)
    setUploading(false)
  }

  const aspectClass = aspectRatio === 'video' ? 'aspect-video' : 'aspect-square'

  if (compact) {
    return (
      <div className="space-y-1">
        <input ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const file = e.target.files?.[0]; if (file) upload(file); e.target.value = '' }} />
        {value ? (
          <div className="relative w-full h-24 rounded-xl overflow-hidden bg-muted">
            <img src={value} alt="" className="w-full h-full object-cover" />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Loader2 className="h-5 w-5 text-white animate-spin" />
              </div>
            )}
            {!uploading && (
              <div className="absolute inset-0 flex items-center justify-end pr-2 gap-2">
                <button type="button" onClick={() => inputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-full bg-black/55 backdrop-blur-sm px-3 py-1.5 text-white text-xs font-medium">
                  <Camera className="h-3.5 w-3.5" /> Changer
                </button>
                <button type="button" onClick={() => onChange('')}
                  className="flex items-center justify-center h-7 w-7 rounded-full bg-black/55 backdrop-blur-sm text-white">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
            className="w-full h-24 rounded-xl border-2 border-dashed border-muted-foreground/25 flex items-center justify-center gap-2 hover:bg-muted/50 transition-colors disabled:opacity-60">
            {uploading ? <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" /> : <Camera className="h-5 w-5 text-muted-foreground" />}
            <span className="text-sm text-muted-foreground">{uploading ? 'Téléchargement…' : 'Ajouter une photo'}</span>
          </button>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) upload(file)
          e.target.value = ''
        }}
      />

      {value ? (
        <div className={`relative rounded-xl overflow-hidden ${aspectClass} bg-muted`}>
          <img src={value} alt="" className="w-full h-full object-cover" />

          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
          )}

          {!uploading && (
            <div className="absolute inset-0 flex items-end justify-end p-2 gap-2">
              <button type="button" onClick={() => inputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-full bg-black/55 backdrop-blur-sm px-3 py-1.5 text-white text-xs font-medium">
                <Camera className="h-3.5 w-3.5" />
                Changer
              </button>
              <button type="button" onClick={() => onChange('')}
                className="flex items-center justify-center h-7 w-7 rounded-full bg-black/55 backdrop-blur-sm text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
          className={`w-full rounded-xl border-2 border-dashed border-muted-foreground/25 ${aspectClass} flex flex-col items-center justify-center gap-2 hover:bg-muted/50 active:bg-muted transition-colors disabled:opacity-60 disabled:cursor-not-allowed`}>
          {uploading ? (
            <>
              <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
              <span className="text-sm text-muted-foreground">Téléchargement…</span>
            </>
          ) : (
            <>
              <Camera className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Ajouter une photo</span>
              <span className="text-xs text-muted-foreground/60">Galerie ou appareil photo</span>
            </>
          )}
        </button>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
