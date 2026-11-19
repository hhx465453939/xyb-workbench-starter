#!/usr/bin/env node
/**
 * check-route-map.mjs — 一级页“六处同步”断言（NAV / ROUTES / VIEW_META / render map / probe 覆盖）
 *
 * 来源：2026-11-20 cancer-policy-workbench。新增「费用与报销」页时 NAV/ROUTES/VIEW_META/探针都同步了，
 * 但 render map 漏了 `expenses: renderExpenses` —— 结果 `check-probe-coverage` 全绿、逐路由探针也全绿：
 * 路由映射错误时 `#view=expenses` 渲染的是 home 的内容，而逐路由断言只查“有 h1 / 内容够长”，于是假绿。
 * 本检查器把四处键集合强制对齐，并要求 probe ROUTES 覆盖全部一级页。
 *
 * 用法：
 *   node scripts/check-route-map.mjs [项目根]
 *   node scripts/check-route-map.mjs --self-test
 * 退出码：0 通过 / 1 失败 / 2 环境（self-test 失败）
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

const SELF_TEST = process.argv.includes('--self-test')
const ROOT = resolve(process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : '.')

/** 纯断言：四处键集合必须一致；probe 路由必须覆盖全部一级页。 */
export function audit({ nav, routes, meta, map, probes }) {
  const fails = []
  const oks = []
  const navSet = new Set(nav)
  const routeSet = new Set(routes)
  const metaSet = new Set(meta)
  const mapSet = new Set(map)
  const probeSet = new Set([].concat(...probes))
  for (const r of routeSet) {
    if (!navSet.has(r)) fails.push(`NAV 缺一级页：${r}`)
    if (!metaSet.has(r)) fails.push(`VIEW_META 缺：${r}`)
    if (!mapSet.has(r)) fails.push(`render map 缺：${r}（会渲染成别的页，假绿）`)
  }
  for (const k of navSet) if (!routeSet.has(k)) fails.push(`ROUTES 缺：${k}`)
  for (const k of metaSet) if (!routeSet.has(k)) fails.push(`VIEW_META 多出未挂路由：${k}`)
  for (const k of mapSet) if (!routeSet.has(k)) fails.push(`render map 多出未挂路由：${k}`)
  if (probeSet.size) {
    const missing = [...routeSet].filter((r) => !probeSet.has(r))
    if (missing.length) fails.push(`probe ROUTES 未覆盖：${missing.join(', ')}`)
    else oks.push(`probe 覆盖全部 ${routeSet.size} 条一级页`)
  } else {
    oks.push('未发现 probe ROUTES（新建仓阶段不强制）')
  }
  if (!fails.length) oks.push(`NAV / ROUTES / VIEW_META / render map 同键（${routeSet.size} 条一级页）`)
  return { fails, oks }
}

function extract(src) {
  const nav = []
  const navStart = src.indexOf('const NAV = [')
  const navEnd = src.indexOf('const VIEW_META', navStart)
  if (navStart >= 0 && navEnd > navStart) {
    for (const m of src.slice(navStart, navEnd).matchAll(/\bkey:\s*['"]([a-z0-9-]+)['"]/g)) nav.push(m[1])
  }
  const routes = []
  const routeMatch = src.match(/const\s+ROUTES\s*=\s*\[([^\]]*)\]/)
  if (routeMatch) {
    for (const m of routeMatch[1].matchAll(/['"]([a-z0-9-]+)['"]/g)) routes.push(m[1])
  }
  const meta = []
  const metaStart = src.indexOf('const VIEW_META = {')
  if (metaStart >= 0) {
    const metaEnd = src.indexOf('\n  }\n', metaStart)
    const block = src.slice(metaStart, metaEnd > metaStart ? metaEnd : undefined)
    for (const m of block.matchAll(/([a-zA-Z0-9-]+):\s*\{\s*title:/g)) meta.push(m[1])
  }
  const map = []
  const mapStart = src.indexOf('const map = {')
  if (mapStart >= 0) {
    const mapEnd = src.indexOf('\n    }', mapStart)
    const block = src.slice(mapStart, mapEnd > mapStart ? mapEnd : undefined)
    for (const m of block.matchAll(/([a-zA-Z0-9]+):\s*render[A-Z]/g)) map.push(m[1])
  }
  return { nav, routes, meta, map }
}

function probeRoutes(root) {
  const dir = join(root, 'scripts')
  if (!existsSync(dir)) return []
  const out = []
  for (const name of readdirSync(dir)) {
    if (!/^probe-.*\.mjs$/.test(name)) continue
    const src = readFileSync(join(dir, name), 'utf8')
    const m = src.match(/const\s+ROUTES\s*=\s*\[([^\]]*)\]/)
    if (m) out.push([...m[1].matchAll(/['"]([a-z0-9-]+)['"]/g)].map((x) => x[1]))
  }
  return out
}

const GOOD_APP = `
const NAV = [
  { key: 'home', label: 'A' },
  { key: 'match', label: 'B' },
  { group: 'x' },
]
const ROUTES = ['home', 'match'];
const VIEW_META = {
  home: { title: 'A' },
  match: { title: 'B' },
}
const map = {
  home: renderHome, match: renderMatch,
}
`
const BAD_APP = GOOD_APP.replace('match: renderMatch,', '')

if (SELF_TEST) {
  const good = audit({ nav: ['home', 'match'], routes: ['home', 'match'], meta: ['home', 'match'], map: ['home', 'match'], probes: [['home', 'match']] })
  const bad = audit({ nav: ['home', 'match'], routes: ['home', 'match'], meta: ['home', 'match'], map: ['home'], probes: [['home', 'match']] })
  const ok = good.fails.length === 0 && bad.fails.some((f) => f.includes('render map 缺：match'))
  console.log(`${ok ? 'PASS' : 'FAIL'}  self-test：正例零报错，反例抓到 render map 漏键`)
  if (!ok) console.log(JSON.stringify({ good, bad }, null, 2))
  process.exit(ok ? 0 : 2)
}

const appPath = (() => {
  const pd = join(ROOT, 'prototypes')
  if (!existsSync(pd)) return null
  const dirs = readdirSync(pd).filter((d) => existsSync(join(pd, d, 'app.js'))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  return dirs.length ? join(pd, dirs[dirs.length - 1], 'app.js') : null
})()

if (!appPath) {
  console.log(JSON.stringify({ pass: true, skipped: true, reason: '没有 prototypes/*/app.js（原型未开始），本检查暂不启用。' }, null, 2))
  process.exit(0)
}

const src = readFileSync(appPath, 'utf8')
const { nav, routes, meta, map } = extract(src)
if (!routes.length) {
  console.error('✗ 在 app.js 里找不到 ROUTES 数组（`const ROUTES = [...]`）——一级页清单没有唯一来源')
  process.exit(1)
}
const result = audit({ nav, routes, meta, map, probes: probeRoutes(ROOT) })
for (const o of result.oks) console.log(`✓ ${o}`)
for (const f of result.fails) console.error(`✗ ${f}`)
if (result.fails.length) {
  console.error(`\n✗ 一级页六处同步失败：${result.fails.length} 处（来源：${appPath.replace(ROOT + '/', '')}）`)
  process.exit(1)
}
console.log(`\n✓ 一级页六处同步通过（${result.oks[0] || ''}）`)
