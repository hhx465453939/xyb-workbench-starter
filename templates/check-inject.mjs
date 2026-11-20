#!/usr/bin/env node
/**
 * check-inject.mjs — 客户端 INJECT 服务声明断言
 *
 * 来源：2026-11-20 cancer-policy-workbench 装机实测。INJECT 只声明 desktopWorkbenches，
 * Panel 渲染时 currentSession() 回退路径读 ctx.sessions —— Cordis 守卫对未声明服务直接抛错，
 * 表现为 "web boot: 1 entry did not activate"（且无插件名归属行，难以定位）。
 * 家族基线：INJECT = ['desktopWorkbenches', 'sessions']（cervical/takayasu/cidp 一致）。 // leftover-allow：家族基线沿革引用仓名，非底本残留
 *
 * 用法：
 *   node scripts/check-inject.mjs [项目根]
 *   node scripts/check-inject.mjs --self-test
 * 退出码：0 通过 / 1 失败 / 2 环境（self-test 失败）
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

const SELF_TEST = process.argv.includes('--self-test')
const ROOT = resolve(process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : '.')

export function audit({ inject, reads }) {
  const fails = []
  const oks = []
  const set = new Set(inject || [])
  if (!set.has('desktopWorkbenches')) fails.push('INJECT 缺 desktopWorkbenches（register 无法调用）')
  const wanted = [...new Set(reads || [])].filter((k) => !NON_SERVICE.has(k))
  for (const key of wanted) {
    if (!set.has(key)) {
      fails.push(`客户端读了 ctx.${key} / host.${key}，但 INJECT 未声明 ${key}：Cordis 守卫在 apply() 构建期抛 "cannot get property without inject" → 条目激活失败、宿主报 "1 entry did not activate"`)
    }
  }
  if (!fails.length) oks.push(`INJECT 覆盖全部客户端服务读取（${wanted.join(', ') || '无服务读取'}）`)
  return { fails, oks }
}

/** ctx 上不是「服务」的成员：访问它们不需要 inject 声明。 */
const NON_SERVICE = new Set(['effect', 'on', 'logger', 'config', 'root', 'get', 'fiber', 'emit', 'plugin', 'scope', 'registry', 'inject'])

function extract(src) {
  const injectMatch = src.match(/INJECT\s*=\s*\[([^\]]*)\]/)
  const inject = injectMatch ? [...injectMatch[1].matchAll(/['"]([a-zA-Z0-9-]+)['"]/g)].map((m) => m[1]) : []
  const stripped = src.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => (/^\s*(\/\/|\*)/.test(l) ? '' : l)).join('\n')
  const reads = []
  for (const m of stripped.matchAll(/(?:host|ctx|bridge)\s*(?:\?\.|\.)\s*([A-Za-z_$][\w$]*)/g)) reads.push(m[1])
  return { inject, reads }
}

const GOOD = "export const INJECT = ['desktopWorkbenches', 'sessions', 'uiWorkspace']\nconst a = host?.uiWorkspace\nconst b = host?.sessions.scope(1)"
const BAD_SESSIONS = "export const INJECT = ['desktopWorkbenches', 'uiWorkspace']\nconst s = ctx.sessions.list"
const BAD_UI = "export const INJECT = ['desktopWorkbenches', 'sessions']\nconst a = host?.uiWorkspace"

if (SELF_TEST) {
  const good = audit(extract(GOOD))
  const bad1 = audit(extract(BAD_SESSIONS))
  const bad2 = audit(extract(BAD_UI))
  const ok = good.fails.length === 0 && bad1.fails.some((f) => f.includes('sessions')) && bad2.fails.some((f) => f.includes('uiWorkspace'))
  console.log(`${ok ? 'PASS' : 'FAIL'}  self-test：正例通过；反例分别抓到未声明 sessions 与 uiWorkspace`)
  if (!ok) console.log(JSON.stringify({ good, bad1, bad2 }, null, 2))
  process.exit(ok ? 0 : 2)
}

const clientPath = (() => {
  if (existsSync(join(ROOT, 'src/client.js'))) return join(ROOT, 'src/client.js')
  if (existsSync(join(ROOT, 'lib/client.js'))) return join(ROOT, 'lib/client.js')
  const pd = join(ROOT, 'prototypes')
  return null
})()

if (!clientPath) {
  console.log(JSON.stringify({ pass: true, skipped: true, reason: '没有 src/client.js / lib/client.js（骨架阶段），本检查暂不启用。' }, null, 2))
  process.exit(0)
}

const src = readFileSync(clientPath, 'utf8')
const result = audit(extract(src))
for (const o of result.oks) console.log(`✓ ${o}`)
for (const f of result.fails) console.error(`✗ ${f}`)
if (result.fails.length) {
  console.error(`\n✗ INJECT 服务声明不一致：${clientPath.replace(ROOT + '/', '')}`)
  process.exit(1)
}
console.log(`\n✓ INJECT 服务声明检查通过（${clientPath.replace(ROOT + '/', '')}）`)
