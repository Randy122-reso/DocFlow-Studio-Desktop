# Changelog

All notable changes to DocFlow Studio Desktop are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — 2026-11-02

Initial implementation of the desktop application from the product plan.

### Added

- Electron + React + Vite + TypeScript application shell with sandboxed renderer,
  context isolation, and a minimal `contextBridge` API.
- Markdown editor with editor/split/preview modes, formatting toolbar, live preview,
  GitHub-flavored Markdown, tables, task lists, callouts, and sanitized HTML.
- Five document themes (Modern, Academic, Minimal, Editorial, Legal) with typography,
  A4/Letter page size, margins, paper tones, header/footer, page numbers, automatic
  heading numbering, and justified text.
- Automatic table of contents with unique heading IDs and document statistics
  (words, characters, sentences, paragraphs, headings, code blocks, links, images,
  reading time).
- Export to DOCX, PDF via system print, direct raster PDF, Word-compatible DOC,
  standalone HTML, and Markdown.
- Code block extraction for 30+ languages with copy and download actions.
- Native menu, recent files with pinning and TTL, drag & drop, file associations
  (`.md`, `.markdown`, `.txt`), and single-instance file routing.
- Save-in-place, Save As, dirty tracking, close guard, mtime conflict resolution,
  atomic writes, encoding detection/preservation, and external file watching.
- Draft auto-recovery and restore/discard/original prompts.
- Rotating local logger, zod-validated IPC, path traversal checks, CSP, and
  external link allow-list.
- Windows NSIS/portable and Linux AppImage/deb packaging configuration with
  generated application icons and SHA-256 checksum generation.
- 58 unit tests covering file/recent/settings/session services, Markdown parsing,
  sanitization, and document statistics.
- Build verification script for CSP, sandbox settings, and production output.

### Known limitations

- Direct PDF export is raster-based; use PDF via Print for selectable text.
- Paged preview is a visual page card, not full CSS pagination.
- File providers are local only; the provider contract is ready for future backends.
- Code signing, auto-update, and CI release workflows are not configured yet.
- Linux packaging has not been exercised from the Windows development environment.

[0.1.0]: https://github.com/docflow/studio-desktop/releases/tag/v0.1.0
