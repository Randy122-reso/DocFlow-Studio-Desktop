import { useEffect, useMemo, useState } from 'react'
import { Check, Clipboard, Code2, Download, Loader2, X } from 'lucide-react'
import type { CodeBlockItem } from '../types/document'
import {
  LANGUAGES,
  downloadNameFor,
  findLanguage,
  guessLanguageFromCode
} from '../utils/languageScripts'
import { copyText } from '../utils/clipboard'
import { useFileStore } from '../store/fileStore'
import { describeError } from '../utils/errors'

interface CodeScriptModalProps {
  open: boolean
  onClose(): void
  blocks: CodeBlockItem[]
}

export function CodeScriptModal({ open, onClose, blocks }: CodeScriptModalProps) {
  const [selected, setSelected] = useState(0)
  const [languageId, setLanguageId] = useState('text')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const block = blocks[selected]

  useEffect(() => {
    if (!open) return
    if (blocks.length === 0) {
      setSelected(0)
      return
    }
    const safeIndex = Math.min(selected, blocks.length - 1)
    setSelected(safeIndex)
    const current = blocks[safeIndex]
    if (current) {
      const language = current.language === 'text' ? guessLanguageFromCode(current.code) : findLanguage(current.language)
      setLanguageId(language.id)
    }
  }, [open, blocks, selected])

  useEffect(() => {
    if (!open) return
    const listener = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [open, onClose])

  const language = useMemo(() => findLanguage(languageId), [languageId])

  if (!open) return null

  const handleCopy = async () => {
    if (!block) return
    const ok = await copyText(block.code)
    setCopied(ok)
    window.setTimeout(() => setCopied(false), 1500)
  }

  const handleDownload = async () => {
    if (!block) return
    setBusy(true)
    try {
      const data = new TextEncoder().encode(block.code)
      let binary = ''
      for (const byte of data) binary += String.fromCharCode(byte)
      const result = await window.docflow.file.writeBinary({
        dataBase64: btoa(binary),
        defaultName: downloadNameFor(language, block.index),
        filters: [{ name: language.name, extensions: [language.extension] }, { name: 'All Files', extensions: ['*'] }]
      })
      if (!result.cancelled && result.ok) {
        useFileStore.getState().showToast('success', 'Code block downloaded', result.path)
      }
    } catch (error) {
      const described = describeError(error)
      useFileStore.getState().showToast(described.kind, described.message, described.detail)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="modal code-modal" role="dialog" aria-modal="true" aria-label="Code scripts">
        <header className="modal-head">
          <div>
            <h2>Code scripts</h2>
            <p>Extract fenced code blocks and save them as source files.</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </header>

        {blocks.length === 0 ? (
          <div className="modal-body code-empty">
            <Code2 size={30} />
            <h3>No code blocks found</h3>
            <p>Add a fenced block with three backticks to your document, then open this panel again.</p>
          </div>
        ) : (
          <div className="modal-body code-body">
            <aside className="code-list">
              {blocks.map((item, index) => {
                const detected = item.language === 'text' ? guessLanguageFromCode(item.code) : findLanguage(item.language)
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`code-list-item ${index === selected ? 'active' : ''}`}
                    onClick={() => setSelected(index)}
                  >
                    <span className="code-list-index">{String(index + 1).padStart(2, '0')}</span>
                    <span className="code-list-copy">
                      <strong>{detected.name}</strong>
                      <span>{item.code.split('\n')[0]?.slice(0, 46) || 'Empty block'}</span>
                    </span>
                  </button>
                )
              })}
            </aside>

            <section className="code-preview">
              <div className="code-preview-head">
                <label className="field inline-field">
                  <span>Language</span>
                  <select value={languageId} onChange={(event) => setLanguageId(event.target.value)}>
                    {LANGUAGES.map((item) => (
                      <option key={item.id} value={item.id}>{item.name} (.{item.extension})</option>
                    ))}
                  </select>
                </label>
                <div className="code-actions">
                  <button type="button" className="ghost-button" onClick={() => void handleCopy()}>
                    {copied ? <Check size={14} /> : <Clipboard size={14} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <button type="button" className="primary-button" onClick={() => void handleDownload()} disabled={busy}>
                    {busy ? <Loader2 size={14} className="spin" /> : <Download size={14} />}
                    Download
                  </button>
                </div>
              </div>
              <pre className="code-preview-body"><code>{block?.code}</code></pre>
              <div className="code-preview-foot">
                <span>{block?.code.split('\n').length ?? 0} lines</span>
                <span>{downloadNameFor(language, block?.index ?? 0)}</span>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
