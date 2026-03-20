import { useRef, useState } from 'react'

interface AttachmentPreview {
  file:           File
  attachmentUrl:  string
  attachmentType: 'IMAGE' | 'VIDEO' | 'FILE'
}

interface MessageInputProps {
  onSend:    (content: string, attachment?: AttachmentPreview) => void
  sending:   boolean
  // roomId:    string
}

const CHAT_SERVICE_URL = import.meta.env.VITE_CHAT_SERVICE_URL ?? 'http://localhost:3002'

export function MessageInput({ onSend, sending }: MessageInputProps) {
  const [text, setText]           = useState('')
  const [attachment, setAttachment] = useState<AttachmentPreview | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const token = localStorage.getItem('access_token')
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`${CHAT_SERVICE_URL}/upload`, {
        method: 'POST',
        headers: token ? { authorization: `Bearer ${token}` } : {},
        body: formData,
      })

      if (!res.ok) throw new Error('Upload failed')

      const data = await res.json()
      setAttachment({ file, ...data })
    } catch (err) {
      alert('Upload failed: ' + err)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if ((!text.trim() && !attachment) || sending || uploading) return
    onSend(text.trim(), attachment ?? undefined)
    setText('')
    setAttachment(null)
  }

  return (
    <div className="border-t border-zinc-800 px-4 py-4 shrink-0">
      {/* Attachment preview */}
      {attachment && (
        <div className="mb-2 flex items-center gap-2 bg-surface-overlay border border-zinc-700 rounded-lg px-3 py-2">
          {attachment.attachmentType === 'IMAGE' && (
            <img src={`${CHAT_SERVICE_URL}${attachment.attachmentUrl}`}
              className="w-10 h-10 rounded object-cover" alt="preview" />
          )}
          {attachment.attachmentType === 'VIDEO' && (
            <div className="w-10 h-10 rounded bg-zinc-700 flex items-center justify-center">
              <svg className="w-4 h-4 text-ink-muted" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
          )}
          {attachment.attachmentType === 'FILE' && (
            <div className="w-10 h-10 rounded bg-zinc-700 flex items-center justify-center">
              <svg className="w-4 h-4 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          )}
          <span className="text-xs text-ink-muted truncate flex-1">{attachment.file.name}</span>
          <button onClick={() => setAttachment(null)} className="text-ink-faint hover:text-ink transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-3">
        {/* File picker */}
        <input ref={fileRef} type="file" className="hidden"
          accept="image/*,video/mp4,video/webm,application/pdf,text/plain"
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="shrink-0 w-10 h-10 rounded-xl border border-zinc-700 text-ink-muted flex items-center justify-center
                     hover:border-zinc-600 hover:text-ink transition-colors disabled:opacity-40"
        >
          {uploading ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          )}
        </button>

        <div className="flex-1">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e as unknown as React.FormEvent)
              }
            }}
            placeholder={attachment ? 'Add a caption… (optional)' : 'Type a message… (Enter to send)'}
            rows={1}
            className="input-base resize-none overflow-hidden"
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />
        </div>

        <button
          type="submit"
          disabled={(!text.trim() && !attachment) || sending || uploading}
          className="shrink-0 w-10 h-10 rounded-xl bg-accent text-surface flex items-center justify-center
                     hover:bg-accent-dim active:scale-95 transition-all duration-150
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </form>
    </div>
  )
}