/* CHG-001 · M7 反例：环境说明——本文件同时覆盖 Windows 与 POSIX 两种口径（跨盘归属、反斜杠键、CRLF 哈希）。
   路径一律用 node:path 组合，不写死盘符/家目录；Windows 专属断言按 process.platform 条件执行，
   所以本机（Windows）与 CI（Linux/macOS）都能跑。夹具一律放 os.tmpdir()，跑完自动清理。 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { join, resolve } from 'node:path'
import { within, toPosix, sha256Of, isBinaryPath, normalizeEol } from '../scripts/lib/portability.mjs'

const sha = (b) => createHash('sha256').update(b).digest('hex')

test('within：跨盘/无关目录不算"在 parent 内"，子目录与自身算', () => {
  const parent = resolve('starter-root')
  assert.equal(within(parent, parent), true)
  assert.equal(within(parent, join(parent, 'proj')), true)
  assert.equal(within(parent, resolve('proj')), false)

  /* 关键回归：Windows 上 path.relative 跨盘会返回绝对路径，旧实现因此把 C: 目标判成
     「在 E: 盘脚手架内」，init 直接拒绝生成。 */
  if (process.platform === 'win32') {
    assert.equal(within('E:\\Development\\xyb-workbench-starter', 'C:\\Users\\someone\\proj'), false)
    assert.equal(within('C:\\Users\\someone\\proj', 'E:\\Development\\xyb-workbench-starter'), false)
  }
})

test('toPosix：join 产出的 Windows 键必须能按 / 字面量回查', () => {
  assert.equal(toPosix(join('assets', 'manifest.json')), 'assets/manifest.json')
  assert.equal(toPosix(join('docs', 'nested', 'a.md')), 'docs/nested/a.md')
})

test('sha256Of：文本按 LF 归一化，二进制按原始字节', () => {
  const lf = Buffer.from('{"a":1}\n')
  const crlf = Buffer.from('{"a":1}\r\n')
  assert.equal(sha256Of(crlf, 'assets/manifest.json'), sha(lf))
  assert.equal(sha256Of(crlf, 'icons/clover.svg'), sha(lf))
  assert.equal(sha256Of(lf, 'assets/manifest.json'), sha(lf))

  const bin = Buffer.from([0x89, 0x50, 0x0d, 0x0a, 0x00])
  assert.equal(sha256Of(bin, 'brand/xyb-logo.png'), sha(bin))
  assert.equal(isBinaryPath('brand/xyb-logo.PNG'), true)
  assert.equal(isBinaryPath('docs/01-WORKFLOW.md'), false)
})

test('normalizeEol：非 UTF-8 与含 NUL 的内容原样返回', () => {
  const latin1 = Buffer.from([0xe9, 0x0d, 0x0a, 0xff]) // 非法 UTF-8
  assert.equal(normalizeEol(latin1), latin1)
  const nul = Buffer.from([0x41, 0x00, 0x0d, 0x0a])
  assert.equal(normalizeEol(nul), nul)
})
