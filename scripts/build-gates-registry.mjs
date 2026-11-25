#!/usr/bin/env node
/**
 * CHG-002 · M1：生成 `gates.registry.json`。
 *
 * 为什么要有注册表：默认检查链是 `package.json` 里一行 23 段 `&&` 拼接，
 * 人看不出"现在跑到哪、哪条是跳过、跳过为什么"，Agent 也拿不到可机读的门禁集合。
 * 注册表是门禁集合的**唯一声明源**，`scripts/audit-loop.mjs` 只按它执行。
 *
 * 用法：
 *   node scripts/build-gates-registry.mjs            # 写 gates.registry.json（幂等）
 *   node scripts/build-gates-registry.mjs --check    # 只校验：与磁盘内容不一致就 exit 1
 *
 * 门禁表在 `scripts/lib/gates-table.mjs`（与 `check-starter` 共用同一份，防漂移）。
 * 阶段语义（`stage`）：门禁**首次生效**的里程碑；`audit-loop --stage MN` 跑
 * `rank(首生效) <= rank(MN)` 的门禁；`[]` = 未知阶段，一律执行（保守，不漏跑）。
 * 排序：按 `id` 字典序，保证 diff 稳定（幂等的另一半）。
 */
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expectedRegistry, validateGates } from './lib/gates-table.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'gates.registry.json')

const errors = validateGates(ROOT)
if (errors.length) {
  console.error(JSON.stringify({ pass: false, errors }, null, 2))
  process.exit(1)
}

const registry = expectedRegistry()
const text = JSON.stringify(registry, null, 2) + '\n'

if (process.argv.includes('--check')) {
  const onDisk = await readFile(OUT, 'utf8').catch(() => '')
  if (onDisk !== text) {
    console.error('gates.registry.json 与策展表不一致：请运行 node scripts/build-gates-registry.mjs')
    process.exit(1)
  }
  console.log(JSON.stringify({ pass: true, gates: registry.gates.length, mode: 'check' }, null, 2))
  process.exit(0)
}

await writeFile(OUT, text, 'utf8')
console.log(JSON.stringify({ pass: true, gates: registry.gates.length, out: 'gates.registry.json' }, null, 2))
