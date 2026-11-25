#!/usr/bin/env node
/**
 * capture-shots.mjs — 33 号规范 10 张 1280×860 真实渲染截图生成模版
 *
 * 作用：从 prototypes/v0.2/ 真实渲染并捕获 10 张高分屏（2x）截图至 docs/screenshots/
 * 供 README.md 展示与 M2/V1 验收审计。
 *
 * 用法：node scripts/capture-shots.mjs [--port 8143]
 */
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PORT = Number(process.env.PORT || 8143)
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png'
}

const server = createServer(async (req, rsp) => {
  const path = decodeURIComponent((req.url || '/').split('?')[0])
  if (path === '/favicon.ico') { rsp.writeHead(204).end(); return }
  const file = join(ROOT, normalize(path).replace(/^([/\\])+/, ''))
  try {
    const b = await readFile(file)
    rsp.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' }).end(b)
  } catch { rsp.writeHead(404).end() }
})

/* 浏览器候选按平台分派：只列 macOS 的 .app 路径，等于在 Windows/Linux 上恒找不到。
   CHROME_PATH 优先级最高（非常规安装位置不必装进 PATH）；Windows 末位用 Edge 兜底，
   同是 Chromium 内核，puppeteer-core 的 CDP 协议一样能用。 */
function chromeCandidates() {
  const cands = []
  if (process.env.CHROME_PATH) cands.push(process.env.CHROME_PATH)
  if (process.platform === 'win32') {
    const roots = [process.env.ProgramFiles, process.env['ProgramFiles(x86)'], process.env.LOCALAPPDATA].filter(Boolean)
    for (const base of roots) cands.push(join(base, 'Google', 'Chrome', 'Application', 'chrome.exe'))
    if (process.env['ProgramFiles(x86)']) cands.push(join(process.env['ProgramFiles(x86)'], 'Microsoft', 'Edge', 'Application', 'msedge.exe'))
  } else if (process.platform === 'darwin') {
    cands.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium'
    )
  } else {
    cands.push('/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser')
  }
  return [...new Set(cands)]
}

function findChrome() {
  return chromeCandidates().find((p) => existsSync(p)) || null
}

const chrome = findChrome()
if (!chrome) {
  console.error('未找到 Chrome（可用 CHROME_PATH 指定）。已探测：')
  for (const p of chromeCandidates()) console.error(`  - ${p}`)
  process.exit(2)
}
let puppeteer
try {
  puppeteer = createRequire(import.meta.url)('puppeteer-core')
} catch (error) {
  console.error(`缺少 puppeteer-core（按本仓 node_modules 解析失败）：${error?.message || error}`)
  console.error('  先 npm i -D puppeteer-core；缺依赖就跑不了截图，不能当完成。')
  process.exit(2)
}

await new Promise((r) => server.listen(PORT, '127.0.0.1', r))
const browser = await puppeteer.launch({ executablePath: chrome, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] })
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 860, deviceScaleFactor: 2 })
const base = `http://127.0.0.1:${PORT}/prototypes/v0.2/index.html`
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
mkdirSync(join(ROOT, 'docs', 'screenshots'), { recursive: true })
const shot = async (name) => { await page.screenshot({ path: join(ROOT, 'docs', 'screenshots', name) }); console.log('saved', name) }

await page.goto(base, { waitUntil: 'networkidle0' })
await sleep(400)
// 1. Dashboard A
await shot('v0.1-01-dashboard-A.png')

// 2. AI Pane
await page.evaluate(() => {
  const btn = document.querySelector('[data-action="agent-toggle"]') || document.querySelector('button.status')
  if (btn) btn.click()
})
await sleep(350)
await shot('v0.1-02-agent-pane.png')
await page.evaluate(() => {
  const hide = document.querySelector('[data-action="agent-hide"]')
  if (hide) hide.click()
})
await sleep(200)

// Switch to Profile B
await page.evaluate(() => {
  const b = document.querySelector('[data-action="profiles"]')
  if (b) b.click()
})
await sleep(200)
await page.evaluate(() => {
  const pick = document.querySelectorAll('[data-action="pick-profile"]')
  if (pick && pick.length > 1) pick[1].click()
})
await sleep(350)

// 3. Onechart B
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('#nav button')].find(x => x.getAttribute('data-page') === 'labs')
  if (btn) btn.click()
})
await sleep(200)
await page.evaluate(() => {
  const sub = [...document.querySelectorAll('[data-action="sub"]')].find(x => x.getAttribute('data-sub') === 'chart')
  if (sub) sub.click()
})
await sleep(400)
await shot('v0.1-03-onechart-B.png')

// 4. Timeline B
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('#nav button')].find(x => x.getAttribute('data-page') === 'events' || x.getAttribute('data-page') === 'pmt' || x.getAttribute('data-page') === 'flares')
  if (btn) btn.click()
})
await sleep(300)
await shot('v0.1-04-timeline-B.png')

// 5. Metric card flipped
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('#nav button')].find(x => x.getAttribute('data-page') === 'labs')
  if (btn) btn.click()
})
await sleep(200)
await page.evaluate(() => {
  const sub = [...document.querySelectorAll('[data-action="sub"]')].find(x => x.getAttribute('data-sub') === 'list')
  if (sub) sub.click()
})
await sleep(200)
await page.evaluate(() => {
  const card = document.querySelector('.mcard') || document.querySelector('.mcard-inner')
  if (card) card.click()
})
await sleep(400)
await shot('v0.1-05-metric-flipped.png')

// 6. Fold collapsed & 7. Fold expanded
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('#nav button')].find(x => x.getAttribute('data-page') === 'treatment')
  if (btn) btn.click()
})
await sleep(250)
await shot('v0.1-06-fold-collapsed.png')
await page.evaluate(() => {
  const det = document.querySelector('details')
  if (det) det.setAttribute('open', '')
})
await sleep(250)
await shot('v0.1-07-fold-expanded.png')

// 8. Disease primer
await page.evaluate(() => {
  const btn = document.querySelector('[data-action="primer"]') || [...document.querySelectorAll('button')].find(x => x.textContent.trim() === '?')
  if (btn) btn.click()
})
await sleep(450)
await shot('v0.1-08-disease-primer.png')
await page.evaluate(() => {
  const close = document.querySelector('#dp-close') || document.querySelector('[data-action="primer-close"]')
  if (close) close.click()
})
await sleep(250)

// 9. Page view
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('#nav button')].find(x => x.getAttribute('data-page') === 'records')
  if (btn) btn.click()
})
await sleep(200)
await page.evaluate(() => {
  const preview = document.querySelector('[data-action="export-preview"]') || document.querySelector('[data-action="preview-report"]') || document.querySelector('button[data-id]')
  if (preview) preview.click()
})
await sleep(350)
await shot('v0.1-09-page-view.png')
await page.evaluate(() => {
  const close = document.querySelector('.pv-close') || document.querySelector('[data-action="pv-close"]')
  if (close) close.click()
})
await sleep(200)

// 10. Clinical search
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('#nav button')].find(x => x.getAttribute('data-page') === 'clinical')
  if (btn) btn.click()
})
await sleep(200)
await page.evaluate(() => {
  const sub = [...document.querySelectorAll('[data-action="sub"]')].find(x => x.getAttribute('data-sub') === 'search')
  if (sub) sub.click()
})
await sleep(350)
await shot('v0.1-10-clinical-search.png')

await browser.close()
server.close()
console.log('All 10 screenshots captured successfully!')
