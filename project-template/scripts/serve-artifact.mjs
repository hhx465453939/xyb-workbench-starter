#!/usr/bin/env node
/**
 * 把**装机副本**（或任意解包目录）的 UI + API 挂到本地端口，供真浏览器验收。
 *
 * 为什么需要它：`scripts/dev-server.mjs` 之类服务的是**源码树**，
 * 而装机出问题恰恰是「源码树好好的、装进去少文件/少路由」。
 * 要对**装进去的那一份**点，才叫装机验收。
 *
 * 与 dev-server 的分工：
 *   dev-server   → 改代码时看效果（源码树，允许热改）
 *   serve-artifact → 交付前证明「装进去的能干活」（产物，只读）
 *
 * 只监听 127.0.0.1，仅用于本机验收，**不能当装机证据**（装机证据是装进 profile 后能跑）。
 *
 * 用法：
 *   node scripts/serve-artifact.mjs [--port 5188] [--db <临时目录>/artifact.db] [包目录]
 *   包目录省略时，按 package.json 的 name 去 Desktop profile 的 node_modules 里找；
 *   **找不到装机副本时直接报错退出（退出码 2），不会退回源码树**——源码树冒充产物是假绿。
 */
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir, tmpdir } from 'node:os'

const HERE = dirname(fileURLToPath(import.meta.url))
const PROJECT = resolve(HERE, '..')
const argv = process.argv.slice(2)
const opt = (name, dflt) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 ? argv[i + 1] : dflt
}
const positional = []
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) { i++; continue }
  positional.push(argv[i])
}

const pkg = JSON.parse(await readFile(join(PROJECT, 'package.json'), 'utf8'))
/* harness 位置按平台分派（原实现只写 macOS 段：Windows 上 existsSync 恒假，于是静默服务源码树 = 假绿）。
   可用 DSH_HARNESS / HN_HARNESS 覆盖；profile 名以宿主实际加载的为准，这里取约定值 web。 */
const HARNESS = process.env.DSH_HARNESS || process.env.HN_HARNESS || (process.platform === 'win32'
  ? join(process.env.APPDATA || join(homedir(), 'AppData', 'Roaming'), 'dsh-desktop', 'harness')
  : process.platform === 'darwin'
    ? join(homedir(), 'Library/Application Support/dsh-desktop/harness')
    : join(process.env.XDG_CONFIG_HOME || join(homedir(), '.config'), 'dsh-desktop', 'harness'))
const profileNodeModules = join(HARNESS, 'profiles/web/node_modules')
const installed = join(profileNodeModules, pkg.name)
const explicitDir = positional[0] ? resolve(positional[0]) : null
if (!explicitDir && !existsSync(installed)) {
  console.error(`✗ 没找到装机副本：${installed}`)
  console.error('  产物级验收必须指向「装进去的那一份」：源码树全绿不代表产物完整，不许拿源码树冒充。')
  console.error('  先按 scripts/check-install.mjs 打印的判定基准完成装机；临时验收可显式传包目录：')
  console.error('  node scripts/serve-artifact.mjs <tgz 解出的或任意解包目录>')
  process.exit(2)
}
const pkgDir = explicitDir || installed

if (!existsSync(join(pkgDir, 'dsh/server.js'))) {
  console.error(`✗ ${pkgDir} 里没有 dsh/server.js`)
  console.error('  这个脚本服务的是「已经做出读写闭环」的产物；骨架阶段还没有 server.js 是正常的。')
  process.exit(1)
}

const port = Number(opt('port', 5188))
/* 默认库放系统临时目录：`/tmp` 在 Windows 上解析成当前盘根的 C:\tmp\，目录不存在就是 SQLITE_CANTOPEN */
const db = opt('db', join(tmpdir(), 'workbench-artifact.db'))

const { createHandler, API_PREFIX } = await import(join(pkgDir, 'dsh/server.js'))
const storeModule = await import(join(pkgDir, 'dsh/store.js'))
const openStore = storeModule.openStore || storeModule.default
if (typeof openStore !== 'function') {
  console.error('✗ dsh/store.js 没有导出 openStore，无法开库')
  process.exit(1)
}

const store = openStore({ path: db })
const seeded = typeof store.seedIfEmpty === 'function' ? store.seedIfEmpty() : { seeded: false }
const handler = createHandler(store, {
  version: pkg.version,
  uiPrefix: `${API_PREFIX}/ui`,
})

const server = createServer((req, res) => {
  Promise.resolve(handler(req, res)).catch((err) => {
    res.writeHead(500, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ error: 'handler_threw', message: String(err?.message) }))
  })
})
server.listen(port, '127.0.0.1', () => {
  console.log(`产物服务：http://127.0.0.1:${port}${API_PREFIX}/ui/`)
  console.log(`包目录：${pkgDir}`)
  console.log(`数据库：${db}${seeded?.seeded ? '（已灌演示数据）' : '（已有数据）'}`)
})
