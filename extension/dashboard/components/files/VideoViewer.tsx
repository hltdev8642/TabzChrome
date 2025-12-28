import React from 'react'
import { Download, MoreVertical } from 'lucide-react'

export interface VideoViewerFile {
  name: string
  path: string
  mediaDataUri?: string
}

export interface VideoViewerProps {
  file: VideoViewerFile
  onOpenActions: (e: React.MouseEvent) => void
}

export function VideoViewer({ file, onOpenActions }: VideoViewerProps) {
  return (
    <div className="h-full flex flex-col">
      {/* Video Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b border-border bg-card/50">
        <a
          href={file.mediaDataUri}
          download={file.name}
          className="flex items-center gap-1 px-2 py-1 text-sm hover:bg-muted rounded"
          title="Download video"
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
        <span className="ml-auto text-xs text-muted-foreground">{file.path}</span>
      </div>
      {/* Video Player */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-[#1a1a1a]">
        <video
          src={file.mediaDataUri}
          controls
          className="max-w-full max-h-full"
          style={{ maxHeight: 'calc(100vh - 200px)' }}
        >
          Your browser does not support video playback.
        </video>
      </div>
    </div>
  )
}
