/* CHG-002 · M5 反例：audit-loop 的契约（干净绿 / 注入红 / skip 带 reason / 未知 id exit 2 / 幂等）。
   环境说明：夹具只建在 os.tmpdir()，不碰仓内文件；假门禁用极小的 .mjs，便于在任意平台复现；
   断言不写死盘符或家目录（Windows / macOS / Linux 同一条命令）。 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const loop = join(root, 'scripts', 'audit-loop.mjs')

const REGISTRY = {
  schemaVersion: 1,
  note: 'test fixture',
  gates: [
    { id: 'alpha-pass', title: '总是通过', script: 'scripts/pass.mjs', args: [], stage: ['M0'], skipWhen: '—', docs: ['docs/06-VALIDATION-AND-RELEASE.md'] },
    { id: 'beta-skip', title: '能力未实现时跳过', script: 'scripts/skip.mjs', args: [], stage: ['M5'], skipWhen: '无能力', docs: ['docs/06-VALIDATION-AND-RELEASE.md'] },
    { id: 'gamma-fail', title: '可注入失败', script: 'scripts/fail.mjs', args: [], stage: ['M0'], skipWhen: '—', docs: ['docs/06-VALIDATION-AND-RELEASE.md'] },
  ],
}

const SCRIPTS = {
  'pass.mjs': "console.log('✓ pass fixture')\n",
  'skip.mjs': "console.log('SKIP 资料目录闸门：无 pickDirectory 能力（M0 骨架阶段）')\n",
  'fail.mjs': "console.error('✗ 注入缺陷：businessWidth 0.72 越界（scripts/pass.mjs:1）')\nprocess.exit(1)\n",
}

async function fixture(t, { failGate = false } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'audit-loop-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  await mkdir(join(dir, 'scripts'), { recursive: true })
  const registry = JSON.parse(JSON.stringify(REGISTRY))
  if (!failGate) registry.gates = registry.gates.filter((g) => g.id !== 'gamma-fail')
  await writeFile(join(dir, 'gates.registry.json'), JSON.stringify(registry, null, 2) + '\n', 'utf8')
  for (const [name, body] of Object.entries(SCRIPTS)) await writeFile(join(dir, 'scripts', name), body, 'utf8')
  return dir
}

function run(dir, args = []) {
  return spawnSync(process.execPath, [loop, dir, ...args], { encoding: 'utf8', timeout: 60000 })
}

test('干净夹具：退出码 0，JSON 可解析，skip 带 reason，pass 计数正确', async (t) => {
  const dir = await fixture(t)
  const r = run(dir, ['--json'])
  assert.equal(r.status, 0, r.stdout + r.stderr)
  const report = JSON.parse(r.stdout)
  assert.equal(report.schemaVersion, 1)
  assert.equal(report.summary.total, 2)
  assert.equal(report.summary.pass, 1)
  assert.equal(report.summary.skip, 1)
  assert.equal(report.summary.fail, 0)
  const skip = report.checks.find((c) => c.id === 'beta-skip')
  assert.equal(skip.status, 'skip')
  assert.ok(skip.reason && skip.reason.length > 0, 'skip 必须带 reason')
})

test('注入失败：退出码 1，fail 带 evidence 且指向文件', async (t) => {
  const dir = await fixture(t, { failGate: true })
  const r = run(dir, ['--json'])
  assert.equal(r.status, 1, r.stdout + r.stderr)
  const report = JSON.parse(r.stdout)
  const fail = report.checks.find((c) => c.id === 'gamma-fail')
  assert.equal(fail.status, 'fail')
  assert.match(fail.evidence, /scripts\/pass\.mjs:1/)
})

test('幂等：去掉 meta 后两次运行完全一致', async (t) => {
  const dir = await fixture(t)
  const a = JSON.parse(run(dir, ['--json']).stdout)
  const b = JSON.parse(run(dir, ['--json']).stdout)
  delete a.meta
  delete b.meta
  assert.deepEqual(a, b)
})

test('--only 与 --stage 生效；未知 id 一律 exit 2（不静默忽略）', async (t) => {
  const dir = await fixture(t)
  const only = JSON.parse(run(dir, ['--json', '--only', 'alpha-pass']).stdout)
  assert.deepEqual(only.checks.map((c) => c.id), ['alpha-pass'])

  // stage M0：M5 才生效的 beta-skip 不该被执行
  const m0 = JSON.parse(run(dir, ['--json', '--stage', 'M0']).stdout)
  assert.deepEqual(m0.checks.map((c) => c.id), ['alpha-pass'])

  const unknown = run(dir, ['--json', '--only', 'nope'])
  assert.equal(unknown.status, 2)
  assert.match(unknown.stderr, /未登记的门禁 id/)
})

test('--out 只允许写进项目根之内', async (t) => {
  const dir = await fixture(t)
  const ok = run(dir, ['--json', '--out', 'report.json'])
  assert.equal(ok.status, 0, ok.stdout + ok.stderr)
  const written = JSON.parse(await readFile(join(dir, 'report.json'), 'utf8'))
  assert.equal(written.schemaVersion, 1)

  const outside = run(dir, ['--json', '--out', '../escape.json'])
  assert.equal(outside.status, 2)
  assert.match(outside.stderr, /只能写进项目根/)
})

test('缺注册表时 exit 2 并说明「不降级成跑一遍 check」', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'audit-loop-empty-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  const r = run(dir, ['--json'])
  assert.equal(r.status, 2)
  assert.match(r.stderr, /找不到门禁注册表/)
})
