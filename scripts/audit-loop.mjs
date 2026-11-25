#!/usr/bin/env node
/**
 * CHG-002 · M2：闭环审计入口（标准 IO 契约 v1）。
 *
 * 解决的问题：默认检查链是 `package.json` 里一行 23 段 `&&` 拼接 ——
 *   ① 一条断链后面全不跑；② 输出格式各异，Agent 没法据此判断；③ 看不出"哪条是跳过、为什么"。
 * 本脚本按 `gates.registry.json` 逐条**独立**执行门禁，输出契约化 JSON，跳过必带原因、失败必带证据。
 *
 * 用法：
 *   node scripts/audit-loop.mjs [项目根] [--stage M5] [--only data-dir,trial-chain] [--json] [--out <file>] [--quiet]
 *
 * 退出码：0 = 无 fail（skip 不算 fail）；1 = 有 fail；2 = 用法/注册表/环境错误。
 *
 * 契约要点（改这里之前先读 tasks/CHG-002-agent-audit-loop/SPEC.md §4）：
 *   - `--json` 时 stdout **只**有 JSON（可 JSON.parse）；
 *   - `status` 只允许 pass|fail|skip；skip 必带 reason；fail 必带 evidence（尾部 20 行）；
 *   - `checks[].id/status` 必须可重复（幂等）：不把耗时/时间戳写进 checks；
 *   - `--out` 只允许写进项目根之内（防越界写）。
 *
 * 环境：Windows / macOS / Linux 同一条命令；路径判断走 scripts/lib/portability.mjs，不写死盘符或家目录。
 */
import { readFile } from 'node:fs/promises'
import { writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { within } from './lib/portability.mjs'

const SELF_DIR = dirname(fileURLToPath(import.meta.url))
const EVIDENCE_TAIL_LINES = 20
const STAGE_RANK = { M0: 0, M1: 1, M2: 2, M3: 3, M4: 4, M5: 5, M6: 6, M7: 7, M8: 8, M9: 9 }

function parseArgs(argv) {
  const opts = { json: false, quiet: false, stage: null, only: null, out: null, root: null }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--json') { opts.json = true; continue }
    if (arg === '--quiet') { opts.quiet = true; continue }
    if (arg === '--stage') { opts.stage = argv[++i]; continue }
    if (arg === '--only') { opts.only = argv[++i]; continue }
    if (arg === '--out') { opts.out = argv[++i]; continue }
    if (arg.startsWith('--')) throw new Error('未知参数：' + arg)
    if (opts.root) throw new Error('只指定一个项目根')
    opts.root = arg
  }
  return opts
}

function tailLines(text, count = EVIDENCE_TAIL_LINES) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n').filter((l) => l.length > 0)
  return lines.slice(-count).join('\n')
}

function stageMatches(stageList, selected) {
  if (!selected) return true
  if (!Array.isArray(stageList) || stageList.length === 0) return true // 未知阶段：一律执行（保守）
  const selectedRank = STAGE_RANK[selected]
  return stageList.some((s) => (STAGE_RANK[s] ?? 99) <= selectedRank)
}

async function main() {
  let opts
  try { opts = parseArgs(process.argv.slice(2)) } catch (error) {
    console.error('✗ ' + error.message)
    console.error('用法：node scripts/audit-loop.mjs [项目根] [--stage M5] [--only id1,id2] [--json] [--out <file>] [--quiet]')
    process.exit(2)
  }
  if (opts.stage && !(opts.stage in STAGE_RANK)) {
    console.error(`✗ --stage 只接受 M0–M9（收到 ${opts.stage}）`)
    process.exit(2)
  }

  const root = resolve(opts.root || process.cwd())
  const registryPath = join(root, 'gates.registry.json')
  if (!existsSync(registryPath)) {
    console.error(`✗ 找不到门禁注册表：${registryPath}`)
    console.error('  新项目请先 node scripts/init.mjs 生成；已生成的项目请确认 gates.registry.json 随包下发。')
    console.error('  缺注册表就没法给出契约化结论 —— 不降级成"跑一遍 check 就算审计"。')
    process.exit(2)
  }

  let registry
  try { registry = JSON.parse(await readFile(registryPath, 'utf8')) } catch (error) {
    console.error('✗ gates.registry.json 不是合法 JSON：' + error.message)
    process.exit(2)
  }
  if (registry.schemaVersion !== 1 || !Array.isArray(registry.gates)) {
    console.error('✗ 注册表 schemaVersion 必须是 1 且含 gates 数组')
    process.exit(2)
  }

  const byId = new Map(registry.gates.map((g) => [g.id, g]))

  /* 脚手架仓本身不是工作台项目：注册表里的门禁脚本只存在于生成项目。
     此时给明确指引，而不是把 21 条都报成"脚本不存在"（那会让人误判项目坏了）。 */
  const existing = registry.gates.filter((g) => existsSync(join(root, g.script)))
  if (existing.length === 0) {
    console.error(`✗ ${root} 里没有任何注册表中的门禁脚本 —— 这里不是工作台项目。`)
    console.error('  audit-loop 面向「init 生成的项目」；脚手架仓自身请用 npm run check。')
    console.error('  若在项目里跑：请确认 scripts/ 与 gates.registry.json 同源（重新 init 或更新注册表）。')
    process.exit(2)
  }

  let selected = [...registry.gates]
  if (opts.only) {
    const wanted = opts.only.split(',').map((s) => s.trim()).filter(Boolean)
    const unknown = wanted.filter((id) => !byId.has(id))
    if (unknown.length) {
      console.error('✗ --only 里有未登记的门禁 id：' + unknown.join(', '))
      console.error('  可用 id：' + [...byId.keys()].sort().join(', '))
      process.exit(2)
    }
    selected = wanted.map((id) => byId.get(id))
  }
  selected = selected.filter((g) => stageMatches(g.stage, opts.stage)).sort((a, b) => a.id.localeCompare(b.id))

  const checks = []
  for (const gate of selected) {
    const scriptPath = join(root, gate.script)
    if (!existsSync(scriptPath)) {
      checks.push({
        id: gate.id, title: gate.title, stage: gate.stage || [], status: 'fail', exit: null,
        evidence: `门禁脚本不存在：${gate.script}（注册表与项目不一致）`,
        hint: '确认 gates.registry.json 与本项目 scripts/ 同源（重新 init 或更新注册表）',
      })
      continue
    }
    const result = spawnSync(process.execPath, [scriptPath, ...(gate.args || [])], {
      cwd: root, encoding: 'utf8', timeout: 180000, maxBuffer: 8 * 1024 * 1024,
    })
    const out = `${result.stdout || ''}${result.stderr || ''}`
    const skipLine = out.split(/\r?\n/).find((line) => /^SKIP\b/.test(line.trim()))
    if (result.error) {
      checks.push({
        id: gate.id, title: gate.title, stage: gate.stage || [], status: 'fail', exit: null,
        evidence: `无法执行：${result.error.message}`,
      })
      continue
    }
    if (result.status === 0 && skipLine) {
      checks.push({
        id: gate.id, title: gate.title, stage: gate.stage || [], status: 'skip', exit: 0,
        reason: skipLine.trim().replace(/^SKIP\s*/, ''),
        hint: gate.skipWhen || '',
      })
      continue
    }
    if (result.status === 0) {
      checks.push({ id: gate.id, title: gate.title, stage: gate.stage || [], status: 'pass', exit: 0 })
      continue
    }
    checks.push({
      id: gate.id, title: gate.title, stage: gate.stage || [], status: 'fail', exit: result.status ?? null,
      evidence: tailLines(out),
      hint: gate.docs?.[0] ? `判据来源：${gate.docs[0]}` : '',
    })
  }

  const summary = {
    pass: checks.filter((c) => c.status === 'pass').length,
    fail: checks.filter((c) => c.status === 'fail').length,
    skip: checks.filter((c) => c.status === 'skip').length,
    total: checks.length,
  }
  const report = {
    schemaVersion: 1,
    meta: {
      generatedAt: new Date().toISOString(),
      project: root,
      stage: opts.stage,
      node: process.version,
      platform: process.platform,
      registrySchemaVersion: registry.schemaVersion,
    },
    summary,
    checks,
  }

  if (opts.out) {
    const outPath = resolve(root, opts.out)
    if (!within(root, outPath)) {
      console.error(`✗ --out 只能写进项目根之内（收到 ${outPath}）`)
      process.exit(2)
    }
    await writeFile(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8')
  }

  if (opts.json) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n')
  } else if (!opts.quiet) {
    for (const c of checks) {
      const mark = c.status === 'pass' ? '✓' : c.status === 'skip' ? '·' : '✗'
      const extra = c.status === 'skip' ? `（${c.reason}）` : ''
      console.log(`${mark} ${c.id.padEnd(22)} ${c.title}${extra}`)
      if (c.status === 'fail') {
        console.log(c.evidence.split('\n').map((l) => '    ' + l).join('\n'))
      }
    }
    console.log(`\n${summary.pass} pass / ${summary.skip} skip / ${summary.fail} fail（共 ${summary.total}）`)
    if (summary.fail) console.log('结论：有 fail —— 逐条看上面 ✗ 的 evidence，修完重跑；skip 不算通过。')
    else console.log('结论：无 fail。skip 项按各自 reason 判定（缺能力/未到阶段），不是"已通过"。')
  }

  process.exit(summary.fail > 0 ? 1 : 0)
}

main().catch((error) => {
  console.error('✗ audit-loop 异常：' + (error?.stack || error?.message || error))
  process.exit(2)
})
