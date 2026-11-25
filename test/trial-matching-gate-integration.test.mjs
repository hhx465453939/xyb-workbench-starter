import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { audit } from '../templates/check-trial-matching.mjs'

/* URL#pathname 在 Windows 上给出 `/E:/...`，交给 node 会解析成 E:\E:\... —— 用 fileURLToPath 取真实路径 */
const scriptPath = (rel) => fileURLToPath(new URL(rel, import.meta.url))

test('new projects generate and run the trial matching contract by default', () => {
  const init = readFileSync(new URL('../scripts/init.mjs', import.meta.url), 'utf8')
  assert.match(init, /plan\.set\('scripts\/check-trial-matching\.mjs'/)
  assert.match(init, /node scripts\/check-trial-matching\.mjs \./)
  assert.match(init, /'check-route-prefix\.mjs'/)
  assert.match(init, /node scripts\/check-route-prefix\.mjs/)
  const output = execFileSync(process.execPath, [scriptPath('../templates/check-trial-matching.mjs'), '--self-test'], { encoding: 'utf8' })
  assert.match(output, /self-test 14\/14/)
})

test('trial-matching audit rejects trial-match.js missing pct/<2 guard or missing denominator line (T2c)', () => {
  const missingPct = audit([
    {
      f: 'public/trial-match.js',
      s: "const evaluate = () => ({ tier: '部分对得上', note: '待确认，需核方案原文 · 未核实 · 快照 2026-11-23' })",
    },
  ])
  assert.ok(missingPct.some((p) => p.startsWith('T2c')), String(missingPct))

  const missingDenom = audit([
    {
      f: 'public/trial-match.js',
      s: "const evaluate = (items) => { const pct = items.length < 2 ? null : 50; return { pct, band: '部分对得上', label: '登记字段符合度', note: '不是入组资格 · 待确认，需核方案原文 · 未核实 · 快照 2026-11-23' } }",
    },
  ])
  assert.ok(missingDenom.some((p) => p.startsWith('T2c')), String(missingDenom))
})

test('primer L13 only accepts source-order display with a cited rationale', () => {
  const output = execFileSync(process.execPath, [scriptPath('../templates/check-primer-links.mjs'), '--self-test'], { encoding: 'utf8' })
  assert.match(output, /来源支持的 source-order 显式口径/)
  assert.match(output, /source-order 缺少匹配来源/)
  /* 断言"条数 == 通过数"而不是写死 14：夹具会随规则增加而增长（2026-11-25 加 L8 二次来源两夹具后 14→16），
     写死数字会让新增夹具变成"测试失败"而不是"覆盖变多"。 */
  const m = output.match(/self-test：(\d+) 条，(\d+) 通过/)
  assert.ok(m, `未找到自测汇总行：\n${output}`)
  assert.equal(m[1], m[2], `自测条数与通过数不一致：${m[0]}`)
  assert.doesNotMatch(output, /^FAIL/m, `存在 FAIL 夹具：\n${output}`)
})
