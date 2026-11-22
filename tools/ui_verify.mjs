#!/usr/bin/env node
// Screenshots the pages a branch's changes can reach and fails on visible breakage, so an agent
// sees its UI change before anyone reviews it. Runs locally: no CI minutes.
// Configured by ui-verify.config.json at the repo root.
//
//   node tools/ui_verify.mjs            pages reached by changes since the base branch
//   node tools/ui_verify.mjs --all      every configured page
//   node tools/ui_verify.mjs / /#safe   just these paths
//
// Exit 0: no UI change, or every page passed. Exit 1: a page broke (details printed and in
// <outDir>/report.json). Screenshots go to <outDir> (default .artifacts/ui-verify/).
import { execFileSync, spawn } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { chromium } from '@playwright/test'

const config = JSON.parse(fs.readFileSync('ui-verify.config.json', 'utf8'))
const {
  serve,
  baseUrl = 'http://127.0.0.1:4480',
  base = 'origin/main',
  outDir = '.artifacts/ui-verify',
  routes = [],
  always = [],
  ignoreConsole = [],
  viewports = [
    { name: 'desktop', width: 1366, height: 900 },
    { name: 'mobile', width: 390, height: 844, isMobile: true },
  ],
} = config

const args = process.argv.slice(2)
const git = (...gitArgs) => execFileSync('git', gitArgs, { encoding: 'utf8' }).split('\n').filter(Boolean)

// "**" any depth, "*" within one segment.
const globRegex = glob =>
  new RegExp(
    '^' +
      glob
        .split('**')
        .map(part =>
          part
            .split('*')
            .map(text => text.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
            .join('[^/]*'),
        )
        .join('.*') +
      '$',
  )

function pickPaths() {
  if (args.includes('--all')) return [...new Set([...always, ...routes.flatMap(route => route.paths)])]
  const explicit = args.filter(arg => arg.startsWith('/'))
  if (explicit.length) return explicit
  const changed = [...new Set([...git('diff', '--name-only', `${base}...HEAD`), ...git('diff', '--name-only', 'HEAD')])]
  const hit = routes.filter(route => route.files.some(glob => changed.some(file => globRegex(glob).test(file))))
  if (!hit.length) return []
  return [...new Set([...always, ...hit.flatMap(route => route.paths)])]
}

const up = url =>
  new Promise(resolve => {
    const { hostname, port } = new URL(url)
    const socket = net.connect(Number(port) || 80, hostname, () => {
      socket.destroy()
      resolve(true)
    })
    socket.on('error', () => resolve(false))
  })

const paths = pickPaths()
if (!paths.length) {
  console.log('ui-verify: no UI change since', base, '- nothing to check.')
  process.exit(0)
}

let server
if (!(await up(baseUrl))) {
  if (!serve) throw new Error(`ui-verify: nothing on ${baseUrl} and no "serve" command configured`)
  server = spawn(serve, { shell: true, stdio: 'ignore', detached: true })
  for (let waited = 0; !(await up(baseUrl)); waited += 250) {
    if (waited > 60_000) throw new Error(`ui-verify: "${serve}" did not open ${baseUrl} within 60 s`)
    await new Promise(resolve => setTimeout(resolve, 250))
  }
}

fs.rmSync(outDir, { recursive: true, force: true })
fs.mkdirSync(outDir, { recursive: true })
const ignored = ignoreConsole.map(pattern => new RegExp(pattern))
const origin = new URL(baseUrl).origin
const browser = await chromium.launch()
const report = []
try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: Boolean(viewport.isMobile),
      hasTouch: Boolean(viewport.isMobile),
    })
    for (const pagePath of paths) {
      const page = await context.newPage()
      const problems = []
      page.on('console', message => {
        if (message.type() === 'error' && !ignored.some(pattern => pattern.test(message.text()))) {
          problems.push(`console error: ${message.text().slice(0, 200)}`)
        }
      })
      page.on('pageerror', error => problems.push(`uncaught: ${String(error.message).slice(0, 200)}`))
      page.on('response', response => {
        if (response.status() >= 400 && response.url().startsWith(origin)) {
          problems.push(`HTTP ${response.status()}: ${response.url().slice(origin.length)}`)
        }
      })
      const response = await page
        .goto(new URL(pagePath, baseUrl).toString(), { waitUntil: 'networkidle', timeout: 30_000 })
        .catch(error => problems.push(`load failed: ${error.message.split('\n')[0]}`))
      if (response && typeof response === 'object' && response.status() >= 400) {
        problems.push(`page returned HTTP ${response.status()}`)
      }
      const layout = await page
        .evaluate(() => {
          const width = document.documentElement.clientWidth
          const wide = [...document.querySelectorAll('body *')]
            .filter(el => {
              const box = el.getBoundingClientRect()
              return box.width > 0 && box.right > width + 1 && getComputedStyle(el).position !== 'fixed'
            })
            .slice(0, 3)
            .map(
              el =>
                el.tagName.toLowerCase() +
                (el.id ? `#${el.id}` : '') +
                (el.className && typeof el.className === 'string'
                  ? '.' + el.className.trim().split(/\s+/).join('.')
                  : ''),
            )
          return {
            overflow: document.documentElement.scrollWidth > width + 1,
            wide,
            empty: !document.body || document.body.innerText.trim().length < 20,
          }
        })
        .catch(() => ({ overflow: false, wide: [], empty: true }))
      if (layout.overflow) problems.push(`horizontal overflow (${layout.wide.join(', ') || 'unknown element'})`)
      if (layout.empty) problems.push('page body is (almost) empty')
      const file = path.join(
        outDir,
        `${pagePath.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'root'}-${viewport.name}.png`,
      )
      await page.screenshot({ path: file }).catch(() => {})
      report.push({ path: pagePath, viewport: viewport.name, screenshot: file, problems })
      await page.close()
    }
    await context.close()
  }
} finally {
  await browser.close()
  if (server?.pid) {
    try {
      process.kill(-server.pid)
    } catch {
      // Preview process already exited.
    }
  }
}

fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2) + '\n')
const failed = report.filter(row => row.problems.length)
for (const row of report) {
  console.log(
    `${row.problems.length ? '✗' : '✓'} ${row.path} [${row.viewport}] ${row.screenshot}${row.problems.map(problem => `\n    ${problem}`).join('')}`,
  )
}
console.log(
  `\nui-verify: ${report.length - failed.length}/${report.length} passed. Screenshots in ${outDir}/. Look at them: passing checks do not mean the change looks right.`,
)
process.exit(failed.length ? 1 : 0)
