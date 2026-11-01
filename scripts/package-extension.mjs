import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const dist = resolve(root, 'dist')
const manifestPath = resolve(dist, 'manifest.json')

if (!existsSync(dist) || !existsSync(manifestPath)) throw new Error('dist/manifest.json is missing; run the build first')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
if (typeof manifest.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(manifest.version)) throw new Error('dist/manifest.json has no valid version')
const output = resolve(root, 'store', `minimal-new-tab-${manifest.version}.zip`)
mkdirSync(dirname(output), { recursive: true })
rmSync(output, { force: true })

if (process.platform === 'win32') {
  const source = `${dist}\\*`
  execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `Compress-Archive -Path '${source}' -DestinationPath '${output}' -Force`], { stdio: 'inherit' })
} else {
  execFileSync('zip', ['-qr', output, '.'], { cwd: dist, stdio: 'inherit' })
}

console.log(`Created ${output}`)
