import { AlignLeft, Clock3, Hash, Type } from 'lucide-react'
import type { DocumentStats, HeadingItem } from '../types/document'
import { THEME_LABELS } from '../styles/themes'
import type { ThemeName } from '../../electron/types/ipc'

interface TableOfContentsProps {
  headings: HeadingItem[]
  stats: DocumentStats
  theme: ThemeName
  onSelect(id: string): void
}

export function TableOfContents({ headings, stats, theme, onSelect }: TableOfContentsProps) {
  return (
    <aside className="toc-sidebar">
      <div className="toc-head">
        <span>Outline</span>
        <span className="toc-count">{headings.length}</span>
      </div>
      {headings.length === 0 ? (
        <div className="toc-empty">
          <Hash size={18} />
          <p>No headings yet</p>
          <span>Add <code># Heading</code> to build an outline.</span>
        </div>
      ) : (
        <nav className="toc-list" aria-label="Table of contents">
          {headings.map((heading) => (
            <button
              key={heading.id}
              type="button"
              className={`toc-item level-${heading.level}`}
              onClick={() => onSelect(heading.id)}
              title={heading.text}
            >
              <span className="toc-dash" />
              <span className="toc-text">{heading.text}</span>
            </button>
          ))}
        </nav>
      )}

      <div className="doc-stats-card">
        <div className="doc-stats-head">
          <span>Document</span>
          <span className="theme-pill">{THEME_LABELS[theme]}</span>
        </div>
        <div className="stat-row">
          <span><Type size={13} /> Words</span>
          <strong>{stats.words.toLocaleString()}</strong>
        </div>
        <div className="stat-row">
          <span><Hash size={13} /> Headings</span>
          <strong>{stats.headings}</strong>
        </div>
        <div className="stat-row">
          <span><AlignLeft size={13} /> Paragraphs</span>
          <strong>{stats.paragraphs}</strong>
        </div>
        <div className="stat-row">
          <span><Clock3 size={13} /> Read time</span>
          <strong>{stats.readingTimeMinutes} min</strong>
        </div>
      </div>
    </aside>
  )
}
