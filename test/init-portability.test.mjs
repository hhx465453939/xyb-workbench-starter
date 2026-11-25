/* CHG-001 · M2/M7 端到端反例：init 的跨平台行为。
   环境说明：夹具一律建在 os.tmpdir()（Windows 上常与仓库不同盘，正是曾经拒跑/崩掉的场景）；
   断言只看"生成成功 + 文件存在 + 脚本一致"，不写死任何盘符或开发者家目录。 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, readFile, rm, access } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const initScript = join(root, 'scripts/init.mjs')

const CONFIG = {
  packageName: '@xyb/portability-probe',
  title: '跨平台生成探针',
  repository: 'https://github.com/example/portability-probe',
  description: '验证 init 在 Windows 与 POSIX 上都能生成可开跑的项目',
  slug: 'portability-probe',
  layoutMode: 'business-first',
  businessWidth: 0.65,
  targetUsers: '开发者',
  scenario: '新机器上第一次生成工作台',
  coreFlow: ['打开工作台', '点开模块', '回到首页'],
  completion: '生成后默认检查链当天就是绿的'
}

function runInit(configPath, target) {
  return spawnSync(process.execPath, [initScript, '--config', configPath, '--target', target], {
    encoding: 'utf8', timeout: 60000
  })
}

test('init 能把项目生成到临时目录（含与仓库不同盘：Windows 跨盘曾被拒）', async (t) => {
  const tmp = await mkdtemp(join(tmpdir(), 'init-portability-'))
  t.after(() => rm(tmp, { recursive: true, force: true }))
  const configPath = join(tmp, 'project.config.json')
  await writeFile(configPath, JSON.stringify(CONFIG, null, 2), 'utf8')
  const target = join(tmp, 'proj')

  const result = runInit(configPath, target)
  assert.equal(result.status, 0, 'init 失败：' + result.stdout + result.stderr)

  /* 曾经在 Windows 上崩在 plan.get('assets/manifest.json').toString()：
     plan 的键是 join() 产出的反斜杠，回查用的是正斜杠字面量。 */
  for (const rel of ['assets/manifest.json', 'cordis.patch.yml', 'dsh/index.js', 'lib/client.js', 'VERSION']) {
    await access(join(target, rel))
  }

  const pkgRaw = await readFile(join(target, 'package.json'), 'utf8')
  const pkg = JSON.parse(pkgRaw)
  assert.equal(pkg.version, '0.1.0')
  assert.equal(pkg.dsh.bundle.patch, './cordis.patch.yml')
  /* 重复的 npm script 键会被 JSON.stringify 静默折叠，写两份等于漏一份 */
  assert.equal((pkgRaw.match(/"check:version-literal"/g) || []).length, 1)

  /* 默认检查链不许引用没有下发的脚本：全新项目 `npm run check` 必须当天可跑 */
  const referenced = [...pkg.scripts.check.matchAll(/node (scripts\/[\w.-]+\.m?js)/g)].map((m) => m[1])
  assert.ok(referenced.length > 10)
  const missing = referenced.filter((rel) => !existsSync(join(target, rel)))
  assert.deepEqual(missing, [], '默认检查链引用了未下发的脚本：' + missing.join(', '))
})

test('init 拒绝把项目生成到脚手架目录内（安全边界两个方向都要对）', async (t) => {
  const tmp = await mkdtemp(join(tmpdir(), 'init-inside-'))
  t.after(() => rm(tmp, { recursive: true, force: true }))
  const configPath = join(tmp, 'project.config.json')
  await writeFile(configPath, JSON.stringify(CONFIG, null, 2), 'utf8')
  const target = join(root, '.inside-probe')
  const result = runInit(configPath, target)
  assert.equal(result.status, 1, '应当拒绝：' + result.stdout + result.stderr)
  assert.match(result.stderr + result.stdout, /outside the starter/i)
  assert.equal(existsSync(target), false, '拒绝时不能留下任何文件')
})
