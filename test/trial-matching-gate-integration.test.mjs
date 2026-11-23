import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { audit } from '../templates/check-trial-matching.mjs'

test('new projects generate and run the trial matching contract by default', () => {
  const init = readFileSync(new URL('../scripts/init.mjs', import.meta.url), 'utf8')
  assert.match(init, /plan\.set\('scripts\/check-trial-matching\.mjs'/)
  assert.match(init, /node scripts\/check-trial-matching\.mjs \./)
  assert.match(init, /'check-route-prefix\.mjs'/)
  assert.match(init, /node scripts\/check-route-prefix\.mjs/)
  const output = execFileSync(process.execPath, [new URL('../templates/check-trial-matching.mjs', import.meta.url).pathname, '--self-test'], { encoding: 'utf8' })
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
  const output = execFileSync(process.execPath, [new URL('../templates/check-primer-links.mjs', import.meta.url).pathname, '--self-test'], { encoding: 'utf8' })
  assert.match(output, /来源支持的 source-order 显式口径/)
  assert.match(output, /source-order 缺少匹配来源/)
  assert.match(output, /self-test：14 条，14 通过/)
})
