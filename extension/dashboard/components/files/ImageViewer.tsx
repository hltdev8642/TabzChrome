import React from 'react'
import { ZoomIn, ZoomOut, Maximize, Download, MoreVertical } from 'lucide-react'

export interface ImageViewerFile {
  name: string
  path: string
  mediaDataUri?: string
}

export interface ImageViewerProps {
  file: ImageViewerFile
  imageZoom: 'fit' | number
  setImageZoom: React.Dispatch<React.SetStateAction<'fit' | number>>
  imageDimensions: { width: number; height: number } | null
  setImageDimensions: React.Dispatch<React.SetStateAction<{ width: number; height: number } | null>>
  onOpenActions: (e: React.MouseEvent) => void
}

export function ImageViewer({
  file,
  imageZoom,
  setImageZoom,
  imageDimensions,
  setImageDimensions,
  onOpenActions,
}: ImageViewerProps) {
  return (
    <div className="h-full flex flex-col">
      {/* Image Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b border-border bg-card/50">
        <div className="flex items-center gap-1 border-r border-border pr-2">
          <button
            onClick={() => setImageZoom('fit')}
            className={`flex items-center gap-1 px-2 py-1 text-sm rounded ${imageZoom === 'fit' ? 'bg-primary/20 text-primary' : 'hover:bg-muted'}`}
            title="Fit to view"
          >
            <Maximize className="w-4 h-4" /> Fit
          </button>
          <button
            onClick={() => setImageZoom(100)}
            className={`flex items-center gap-1 px-2 py-1 text-sm rounded ${imageZoom === 100 ? 'bg-primary/20 text-primary' : 'hover:bg-muted'}`}
            title="Actual size"
          >
            100%
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setImageZoom(prev => Math.max(25, (typeof prev === 'number' ? prev : 100) - 25))}
            className="p-1.5 hover:bg-muted rounded"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-sm text-muted-foreground w-12 text-center">
            {imageZoom === 'fit' ? 'Fit' : `${imageZoom}%`}
          </span>
          <button
            onClick={() => setImageZoom(prev => Math.min(400, (typeof prev === 'number' ? prev : 100) + 25))}
            className="p-1.5 hover:bg-muted rounded"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
        <a
          href={file.mediaDataUri}
          download={file.name}
          className="flex items-center gap-1 px-2 py-1 text-sm hover:bg-muted rounded ml-2"
          title="Download image"
        >
          <Download className="w-4 h-4" /> Download
        </a>
        <button
          onClick={onOpenActions}
          className="p-1.5 hover:bg-muted rounded"
          title="More actions"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
        <span className="ml-auto text-xs text-muted-foreground">
          {imageDimensions && `${imageDimensions.width} × ${imageDimensions.height}`}
          {file.path && <span className="ml-2">{file.path}</span>}
        </span>
      </div>
      {/* Image Display */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-[#1a1a1a]">
        <img
          src={file.mediaDataUri}
          alt={file.name}
          onLoad={(e) => {
            const img = e.target as HTMLImageElement
            setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight })
          }}
          style={imageZoom === 'fit' ? {
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain'
          } : {
            width: `${(imageDimensions?.width || 100) * (imageZoom / 100)}px`,
            height: 'auto'
          }}
        />
      </div>
    </div>
  )
}
