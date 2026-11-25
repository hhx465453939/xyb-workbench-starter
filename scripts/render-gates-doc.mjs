#!/usr/bin/env node
/**
 * CHG-002 · M3：把 `gates.registry.json` 渲染成人类可读的门禁视图。
 *
 * 定位：**生成物**。手改会被 `--check` 判红；内容以注册表为准（注册表又以
 * `scripts/lib/gates-table.mjs` 为准），整条链只有一个真源。
 *
 * 用法：
 *   node scripts/render-gates-doc.mjs           # 写 docs/STANDARDS/20-GATES.md
 *   node scripts/render-gates-doc.mjs --check   # 与磁盘不一致就 exit 1
 */
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const REGISTRY = join(ROOT, 'gates.registry.json')
const OUT = join(ROOT, 'docs/STANDARDS/20-GATES.md')

function render(registry) {
  const rows = registry.gates.map((g) => {
    const stage = g.stage && g.stage.length ? g.stage.join(' / ') : '未声明（一律执行）'
    const docs = (g.docs || [])
      .map((d) => {
        // 生成物在 docs/STANDARDS/ 下：docs/xxx → ../xxx；prompts/xxx → ../../prompts/xxx
        const href = d.startsWith('docs/') ? '../' + d.slice('docs/'.length) : '../../' + d
        return `[${d.replace(/^docs\//, '')}](${href})`
      })
      .join('<br>')
    const cmd = ['node', g.script, ...(g.args || [])].join(' ')
    return `| \`${g.id}\` | ${g.title} | ${stage} | ${g.skipWhen} | \`${cmd}\` | ${docs} |`
  })
  return [
    '<!-- 生成物：勿手改。来源 gates.registry.json，重渲染：node scripts/render-gates-doc.mjs -->',
    '',
    '# 门禁视图（自动生成）',
    '',
    `共 **${registry.gates.length}** 条门禁。本页由注册表生成，是"有哪些门禁、各自何时生效、什么情况会跳过"的唯一视图；`,
    '判据细节去对应门禁脚本与"判据来源"文档看，本页不复制正文。',
    '',
    '> 查当前项目实际结论：`npm run audit:loop`（人类摘要）或 `node scripts/audit-loop.mjs . --json`（机读）。',
    '> 阶段语义：`首次生效` 是该门禁开始有意义的里程碑；`audit-loop --stage MN` 跑 `首生效 <= MN` 的门禁。',
    '',
    '| id | 门禁 | 首次生效 | 何时 SKIP | 命令 | 判据来源 |',
    '|---|---|---|---|---|---|',
    ...rows,
    '',
    '## 维护规则',
    '',
    '1. 新增门禁只改 `scripts/lib/gates-table.mjs`，然后 `npm run gates:build && npm run standards:render`。',
    '2. `check-starter` 会断言"注册表 == 策展表"，`--check` 会断言"本页 == 注册表"；两处漂移都会判红。',
    '3. `skipWhen` 描述的是**门禁自身的跳过行为**，不是"什么时候可以忽略这条"。',
    '',
  ].join('\n')
}

const registry = JSON.parse(await readFile(REGISTRY, 'utf8'))
const text = render(registry)

if (process.argv.includes('--check')) {
  const onDisk = await readFile(OUT, 'utf8').catch(() => '')
  if (onDisk !== text) {
    console.error('docs/STANDARDS/20-GATES.md 与注册表不一致：请运行 node scripts/render-gates-doc.mjs')
    process.exit(1)
  }
  console.log(JSON.stringify({ pass: true, gates: registry.gates.length, mode: 'check' }, null, 2))
  process.exit(0)
}

await writeFile(OUT, text, 'utf8')
console.log(JSON.stringify({ pass: true, gates: registry.gates.length, out: 'docs/STANDARDS/20-GATES.md' }, null, 2))
