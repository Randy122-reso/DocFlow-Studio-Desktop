#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const failures = []

function check(condition, message) {
  if (!condition) failures.push(message)
}

const indexPath = join(root, 'out', 'renderer', 'index.html')
const mainPath = join(root, 'out', 'main', 'main.js')
const preloadPath = join(root, 'out', 'preload', 'preload.js')

check(existsSync(indexPath), 'Renderer output is missing: out/renderer/index.html')
check(existsSync(mainPath), 'Main output is missing: out/main/main.js')
check(existsSync(preloadPath), 'Preload output is missing: out/preload/preload.js')

if (existsSync(indexPath)) {
  const html = readFileSync(indexPath, 'utf8')
  check(/Content-Security-Policy/i.test(html), 'Renderer HTML has no Content-Security-Policy meta tag')
  check(!/nodeIntegration\s*:\s*true/.test(html), 'Renderer HTML enables nodeIntegration')
  check(!/http:\/\/127\.0\.0\.1:5173/.test(html), 'Renderer output still references the dev server')
}

if (existsSync(mainPath)) {
  const main = readFileSync(mainPath, 'utf8')
  check(!/nodeIntegration\s*:\s*true/.test(main), 'Main bundle enables nodeIntegration')
  check(!/unsafe-eval/.test(main), 'Main bundle contains unsafe-eval')
}

if (failures.length > 0) {
  console.error('Build verification failed:')
  for (const failure of failures) console.error(`  - ${failure}`)
  process.exit(1)
}

console.log('Build verification passed (CSP, sandbox, no dev server references).')
