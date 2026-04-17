'use client'

import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import { X, ZoomIn, ZoomOut, Check, RotateCcw } from 'lucide-react'
import BookMockup from './BookMockup'

interface CoverCropperProps {
  imageSrc: string
  onConfirm: (croppedBlob: Blob, previewUrl: string) => void
  onCancel: () => void
}

// Utility: ritaglia il canvas dalla selezione
async function getCroppedImg(imageSrc: string, crop: Area): Promise<{ blob: Blob; url: string }> {
  const image = new Image()
  image.crossOrigin = 'anonymous'
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = reject
    image.src = imageSrc
  })

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

  // Output fisso: 600x900 (2:3)
  canvas.width = 600
  canvas.height = 900

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    600,
    900,
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) { reject(new Error('Canvas is empty')); return }
        const url = URL.createObjectURL(blob)
        resolve({ blob, url })
      },
      'image/jpeg',
      0.92,
    )
  })
}

export default function CoverCropper({ imageSrc, onConfirm, onCancel }: CoverCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedArea, setCroppedArea] = useState<Area | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedArea(croppedAreaPixels)
  }, [])

  const handleConfirm = async () => {
    if (!croppedArea) return
    setSaving(true)
    try {
      const { blob, url } = await getCroppedImg(imageSrc, croppedArea)
      onConfirm(blob, url)
    } catch (err) {
      console.error('Crop error:', err)
    } finally {
      setSaving(false)
    }
  }

  // Genera anteprima live debounced
  const handlePreview = useCallback(async () => {
    if (!croppedArea) return
    try {
      const { url } = await getCroppedImg(imageSrc, croppedArea)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(url)
    } catch { /* noop */ }
  }, [croppedArea, imageSrc, previewUrl])

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-3xl mx-4 bg-white dark:bg-[#1e221c] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-sage-100 dark:border-sage-800 shrink-0">
          <h3 className="text-sm font-bold text-sage-900 dark:text-sage-100">Ritaglia la copertina</h3>
          <button onClick={onCancel} className="p-1.5 rounded-full hover:bg-sage-100 dark:hover:bg-sage-800 transition-colors">
            <X className="w-4 h-4 text-bark-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col sm:flex-row flex-1 min-h-0">
          {/* Cropper area */}
          <div className="relative flex-1 min-h-[300px] sm:min-h-[400px] bg-black">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={2 / 3}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              showGrid={false}
              cropShape="rect"
              style={{
                cropAreaStyle: {
                  border: '2px solid rgba(255,255,255,0.8)',
                  borderRadius: '4px',
                },
              }}
            />

            {/* Zoom controls */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 bg-black/60 backdrop-blur-sm rounded-full">
              <button onClick={() => setZoom(z => Math.max(1, z - 0.2))} className="p-1 text-white/80 hover:text-white">
                <ZoomOut className="w-4 h-4" />
              </button>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-28 accent-white"
              />
              <button onClick={() => setZoom(z => Math.min(3, z + 0.2))} className="p-1 text-white/80 hover:text-white">
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Preview — mockup libro */}
          <div className="sm:w-52 flex flex-col items-center justify-center py-6 px-4 bg-sage-50 dark:bg-[#161a14] border-t sm:border-t-0 sm:border-l border-sage-100 dark:border-sage-800 shrink-0">
            <p className="text-[10px] uppercase tracking-wide text-bark-400 font-semibold mb-4">Anteprima</p>
            <BookMockup
              src={previewUrl || imageSrc}
              alt="Anteprima copertina"
              size="lg"
              hover={false}
            />
            <button
              onClick={handlePreview}
              className="mt-4 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sage-600 hover:bg-sage-100 dark:hover:bg-sage-800 rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Aggiorna anteprima
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-sage-100 dark:border-sage-800 shrink-0">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-bark-500 hover:bg-sage-50 dark:hover:bg-sage-800 rounded-lg transition-colors"
          >
            Annulla
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium bg-sage-500 text-white rounded-lg hover:bg-sage-600 transition-colors disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            {saving ? 'Ritaglio...' : 'Conferma'}
          </button>
        </div>
      </div>
    </div>
  )
}
