#!/usr/bin/env node
/**
 * Generates the electron-updater manifest (latest.yml) consumed by the
 * auto-update pipeline. The file is written to release/latest.yml and is
 * expected at the stable update feed:
 *   https://releases.docflow.app/updates/latest.yml
 * Beta channel feed:
 *   https://releases.docflow.app/updates/beta/latest.yml
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(fileURLToPath(import.meta.url), '..', '..')
const { version } = JSON.parse(join(root, 'package.json').readFileSync('utf8', 'utf8'))

const releaseBase = `https://github.com/docflow/studio-desktop/releases/download/v${version}`
const arch = process.env.ARCH ?? 'x64'
const ext = process.env.EXT ?? 'exe'
const assets = [
  `${releaseBase}/DocFlowStudio-${version}-Setup-${arch}.${ext}`,
  `${releaseBase}/DocFlowStudio-${version}-Setup-${arch}.Portable.${ext}`,
  `${releaseBase}/DocFlowStudio-${version}-Portable-${arch}.${ext}`,
  `${releaseBase}/DocFlowStudio-${version}-AppImage-${arch}.${ext}`
]

const manifest = [
  `version: ${version}`,
  'provider: github',
  `releaseDate: ${new Date().toISOString()}`,
  'files:',
  ...assets.map((url) => `  - '${url}'`),
  'checksums:',
  `  - ${assets[0]}`
].join('\n')

mkdirSync(join(root, 'release'), { recursive: true })
writeFileSync(join(root, 'release', 'latest.yml'), `${manifest}\n`)

console.log(`Update manifest written to release/latest.yml (version ${version}).`)
