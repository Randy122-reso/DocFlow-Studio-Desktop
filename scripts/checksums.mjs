import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const releaseDir = join(process.cwd(), 'release')
let entries
try {
  entries = await readdir(releaseDir, { withFileTypes: true })
} catch {
  console.error('No release directory found. Run npm run package first.')
  process.exit(1)
}

const artifacts = entries
  .filter((entry) => entry.isFile() && /\.(exe|AppImage|deb)$/i.test(entry.name))
  .map((entry) => entry.name)
  .sort()

if (artifacts.length === 0) {
  console.error('No packaged artifacts found in release/.')
  process.exit(1)
}

async function sha256(file) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(file)) hash.update(chunk)
  return hash.digest('hex')
}

const lines = []
for (const name of artifacts) {
  const digest = await sha256(join(releaseDir, name))
  lines.push(`${digest}  ${name}`)
  console.log(`${digest}  ${name}`)
}

await writeFile(join(releaseDir, 'SHA256SUMS'), `${lines.join('\n')}\n`, 'utf8')
console.log(`\nWrote release/SHA256SUMS (${artifacts.length} artifact${artifacts.length === 1 ? '' : 's'}).`)
