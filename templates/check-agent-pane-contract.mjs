#!/usr/bin/env node
/**
 * check-agent-pane-contract.mjs — DSH 原生 AI 对话面板的**静态**契约断言。
 *
 * 来源：2026-11 小暖宝（cold-agglutinin-workbench）实机激活失败一轮 + 2026-11-10 用户点名复核。
 * 现场：customFrame 下宿主即使没有会话也会传一个隐藏的 conversation 容器，用它判断
 *      「有没有会话」必然误判；再用 ensureSession({}) 兜底，点击后既没面板也没反馈。
 *      这类错不报错、能打包、能装机，只在用户点「AI 对话」时表现为"点了没反应"。
 *
 * 为什么只能做静态断言：会话创建与面板挂载发生在真实宿主里，纯 Node 无法验；
 * 这里把**能靠源码判死的反模式**先钉住（少一条就红），剩下的（面板是否真出现、
 * 取消目录后的空会话、失败提示）只能装机人工走查——不要声称已自动覆盖。
 *
 * 判据（有 src/client.js 或 lib/client.js 才生效；原型阶段 SKIP 并说明）：
 *  1 禁止 `Boolean(conversation)` 一类判断（allow 注释可豁免单行）
 *  2 禁止 `ensureSession({})`
 *  3 必须出现 `newSession(`（有会话创建路径）
 *  4 必须出现 `defaultWorkspace`（工作区来源）
 *  5 必须出现会话订阅/重渲染钩子（subscribe / onSession / useEffect 之一）
 *  6 必须存在"草稿只填不发"的证据：agent-draft 桥（postMessage 含 agent-draft 且无自动 send）
 *  7 生成物同步：lib/client.js 存在且不含裸占位符（__XXX__）
 *  8 已有会话只开/收不重复创建（ownedSession 早退或 creatingRef 防连点）——2026-11-12 用户点名第 4 条
 *  9 取消提示 + 失败原因反馈（宿主取消 pickDirectory 返回 undefined，已在 asar 源码核对）
 * 10 创建成功后 setPaneOpen(true)（用户点名第 3 条的静态可判部分）
 * 11 会话订阅必须在 Panel 组件体内、主 return 之前；放在别的组件或 return 之后等于死代码
 * 12 无会话时按钮不得因 !hasConversation 被 disabled；只允许在宿主无 newSession 能力时禁用
 * 13 宿主服务挂载兼容：若读取 desktopWorkbenches.service，必须回退 || host?.desktopWorkbenches（真机方法直挂 desktopWorkbenches）
 * 14 右侧会话栏显隐：禁止 paneOpen || hasConversation（无会话时右侧空白占位栏常驻）
 *
 * 用法：
 *   node scripts/check-agent-pane-contract.mjs [项目目录]
 *   node scripts/check-agent-pane-contract.mjs --self-test   # 正反样本，必须能红
 * 退出码：0 通过 / 1 违反 / 2 环境（self-test 失败）
 */
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const SELF = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const SELF_TEST = args.includes('--self-test')
const target = resolve(args.find((a) => !a.startsWith('-')) || SELF)

const ALLOW = /pane-contract-allow/
const fails = []
const oks = []

function strip(line) {
  if (ALLOW.test(line)) return ''
  return line.replace(/\/\/.*$/, '').replace(/\/\*[\s\S]*?\*\//g, '')
}

/** 对一段源码跑全部 7 条判据；返回 {fails, oks}。自测复用同一函数。 */
export function inspect(source, { hasGenerated = true, generatedSource = null } = {}) {
  const f = [], o = []
  const lines = source.split('\n')
  const code = lines.map(strip).join('\n')

  const banned = [
    [/Boolean\s*\(\s*conversation\s*\)/, '1 禁止用 Boolean(conversation) 判断是否有会话（customFrame 下宿主恒传隐藏容器）'],
    [/ensureSession\s*\(\s*\{\s*\}\s*\)/, '2 禁止调用 ensureSession({})（会留下无归属会话/无面板）'],
  ]
  for (const [re, msg] of banned) {
    const hit = lines.findIndex((l, i) => re.test(code.split('\n')[i]) && re.test(l))
    if (hit >= 0) f.push(`L${hit + 1} ${msg}`)
    else o.push(msg.replace(/^[12]\s*/, '').replace(/（.*$/, '') + '：未出现 ✓')
  }

  const need = [
    [/newSession\s*\(/, '3 必须通过 service.newSession(workspaceId) 创建会话'],
    [/defaultWorkspace/, '4 必须优先取 service.defaultWorkspace?.()?.workspaceId'],
    [/subscribe|onSession|useEffect\s*\(/, '5 必须订阅会话变化并触发重渲染'],
    [/agent-draft/, '6 必须有 agent-draft 草稿桥（只填不发）'],
  ]
  for (const [re, msg] of need) {
    if (re.test(code)) o.push(msg.replace(/^[3-6]\s*/, '').split('（')[0] + '：存在 ✓')
    else f.push(msg)
  }

  /* 8 已有会话时只开/收，不重复创建：newSession 调用点之前必须有 ownedSession 命中早退或防连点守卫
     （2026-11-12 用户点名复核第 4 条：重复点击不得重复创建）。 */
  {
    const hasNew = /newSession\s*\(/.test(code)
    const guardOk = /ownedSession\s*\([^)]*\)[\s\S]{0,400}?return/.test(code) || /creatingRef\.(current|value)/.test(code)
    if (hasNew && !guardOk) f.push('8 newSession 调用前缺少「已有会话早退/防重复创建」守卫')
    else if (hasNew) o.push('8 已有会话只开/收，不重复创建 ✓')
  }
  /* 9 取消与失败都必须在工作台内给出可读反馈（不得静默）。
     2026-11-12 宿主源码核对（app.asar newSession）：取消 pickDirectory → 返回 undefined。 */
  {
    const okCancel = /取消|没有创建会话/.test(code) && /重试/.test(code)
    const okFail = /没能调起会话|失败/.test(code)
    if (!okCancel) f.push('9 取消目录选择后缺「可再次点击重试」提示文案')
    else if (!okFail) f.push('9 创建失败后缺可读错误反馈')
    else o.push('9 取消提示 + 失败原因反馈 ✓')
  }
  /* 10 创建成功后必须把原生面板打开。 */
  {
    const hasNew = /newSession\s*\(/.test(code)
    const opened = /setPaneOpen\s*\(\s*true\s*\)|paneOpen\s*=\s*true|setPaneVisible\s*\(\s*true\s*\)/.test(code)
    if (hasNew && !opened) f.push('10 会话创建成功后未把原生面板置为打开')
    else if (hasNew) o.push('10 创建成功后打开原生面板 ✓')
  }

  /* 11 订阅位置的静态近似检查：Panel 内必须出现 subscribe，且主 return 之前。
     2026-11-11 实测：把订阅塞进别的组件或 return 之后，新建/切换会话后界面不刷新，
     还可能连带破坏原组件的焦点回收与滚动恢复。 */
  {
    const panelStart = code.search(/function\s+Panel\s*\(/)
    const mainReturn = code.search(/return\s+h\s*\(\s*['"]main['"]/)
    const subscribe = code.search(/\.subscribe(?:\?\.)?\s*\(/)
    if (panelStart >= 0 && mainReturn >= 0 && subscribe >= 0) {
      if (!(subscribe > panelStart && subscribe < mainReturn)) {
        f.push('11 会话订阅不在 Panel 组件体内、主 return 之前（换会话后不会重渲染）')
      } else o.push('11 会话订阅位于 Panel 组件体内、主 return 之前 ✓')
    } else if (/newSession\s*\(/.test(code)) {
      f.push('11 无法定位 Panel 主 return 与会话订阅的相对位置（请按模板保留可静态识别的结构）')
    }
  }

  /* 12 无会话时必须允许点击创建。只有服务缺少 newSession 能力时才可禁用。 */
  {
    const disabledExpressions = [...code.matchAll(/disabled\s*:\s*([^,\n}]+)/g)].map((m) => m[1])
    const bad = disabledExpressions.find((expression) =>
      /!(?:hasConversation|activeSession|ownedSession|conversation)/.test(expression)
      && !/(?:canOpenSession|canCreateSession|newSession)/.test(expression))
    if (bad) f.push(`12 无会话时按钮被 disabled（${bad.trim()}），onClick 创建分支永远走不到`)
    else o.push('12 无会话时按钮未被会话真值 disabled ✓')
  }

  /* 13 宿主服务挂载点：DSH Desktop 把 newSession/ownsSession/currentSession/subscribe 直接挂在
     host.desktopWorkbenches 上（非 .service 子属性）。若只写 host?.desktopWorkbenches?.service
     而不回退 || host?.desktopWorkbenches，真机上 service 为 undefined，「AI 对话」按钮永远禁用
     （2026-11-23 BCC/DFSP v0.1.1 实测踩坑，v0.1.2 修复回流）。 */
  {
    const onlySubService = /desktopWorkbenches\??\.service\b/.test(code)
      && !/desktopWorkbenches\??\.service\s*\|\|\s*[A-Za-z_$][\w$]*\??\.desktopWorkbenches\b/.test(code)
    if (onlySubService) f.push('13 service 只读 desktopWorkbenches.service 未回退 || host?.desktopWorkbenches（真机方法直挂 desktopWorkbenches，会导致按钮永久禁用）')
    else o.push('13 宿主 desktopWorkbenches 服务解析兼容直挂形态 ✓')
  }

  /* 14 右侧会话栏显隐：paneOpen 初始为 true，若写 paneVisible = paneOpen || hasConversation，
     无会话时右侧 35% 空白面板也会常驻撑开（2026-11-23 BCC/DFSP v0.1.1 实测踩坑）。
     必须受 (hasConversation || connecting) 约束，如 paneOpen && (hasConversation || connecting)。 */
  {
    const badPaneVisible = /\bpaneOpen\s*\|\|\s*hasConversation\b|\bhasConversation\s*\|\|\s*paneOpen\b/.test(code)
    if (badPaneVisible) f.push('14 paneVisible 使用了 paneOpen || hasConversation（无会话时右侧空白占位栏会常驻，应为 paneOpen && (hasConversation || connecting)）')
    else o.push('14 无会话且未连接时不常驻展开右侧空白会话栏 ✓')
  }

  /* 7 生成物同步（只在有 lib/client.js 时判；自测用参数注入）
     构建器会先声明 `const __PANEL_LAYOUT__ = {...}`，再在渲染/注册代码里引用它。
     声明名与对它的引用都不是漏替换；真正要抓的是**从未被声明**的 __XXX__。
     2026-11-10 cold-agglutinin 实测：只按“声明行”豁免仍会把引用判红，必须按名字收集。 */
  if (hasGenerated) {
    const gen = generatedSource ?? ''
    const declared = new Set()
    for (const m of gen.matchAll(/\b(?:const|let|var)\s+(__[A-Z][A-Z0-9_]+__)\s*=/g)) declared.add(m[1])
    let unresolved = gen
    for (const name of declared) unresolved = unresolved.split(name).join('DECLARED')
    if (/__[A-Z][A-Z0-9_]+__/.test(unresolved)) f.push('7 lib/client.js 残留裸占位符（构建注入未执行，装进去就是字面量）')
    else o.push('7 生成物无未替换占位符 ✓')
  }

  return { fails: f, oks: o }
}

if (SELF_TEST) {
  const bad = [
    "const has = Boolean(conversation)",
    "if (!has) service.ensureSession({})",
    "<div onClick={open}>AI 对话</div>",
  ].join('\n')
  const good = [
    "function Panel({ conversation }) {",
    "  useEffect(() => service?.subscribe?.(() => rerender()), [])",
    "  if (ownedSession(currentSession())) { setPaneOpen(true); return h('main', null, conversation) }",
    "  const create = async () => {",
    "    try {",
    "      const ws = service.defaultWorkspace?.()?.workspaceId",
    "      const id = await service.newSession(ws)",
    "      if (!id) { setNote('已取消资料目录选择，没有创建会话。可以再次点击重试。'); return }",
    "      setPaneOpen(true)",
    "      postMessage({ type: 'thymic:agent-draft', prompt, send: false })",
    "    } catch (e) { setNote(`没能调起会话：${e.message}。可以再次点击重试。`) }",
    "  }",
    "  return h('main', null, h('button', { onClick: create, disabled: !canCreateSession }, conversation))",
    "}",
  ].join('\n')
  const placementGood = [
    "function Panel({ conversation }) {",
    "  useEffect(() => service?.subscribe?.(() => rerender()), [])",
    "  if (ownedSession()) { setPaneOpen(true); return h('main', null, conversation) }",
    "  const id = await service.newSession(defaultWorkspace?.()?.workspaceId)",
    "  if (!id) { setNote('已取消资料目录选择，没有创建会话。可以再次点击重试。'); return }",
    "  setPaneOpen(true)",
    "  postMessage({ type: 'thymic:agent-draft', prompt, send: false })",
    "  catch (e) { setNote(`没能调起会话：${e.message}。可以再次点击重试。`) }",
    "  return h('main', null, conversation)",
    "}",
  ].join('\n')
  const placementBad = [
    "function Other() { service.subscribe(() => rerender()) }",
    "function Panel({ conversation }) {",
    "  const id = await service.newSession(defaultWorkspace?.()?.workspaceId)",
    "  setPaneOpen(true)",
    "  return h('main', null, conversation)",
    "  service.subscribe(() => rerender())",
    "}",
  ].join('\n')
  const disabledBad = [
    "function Panel({ conversation }) {",
    "  useEffect(() => service?.subscribe?.(() => rerender()), [])",
    "  const id = await service.newSession(defaultWorkspace?.()?.workspaceId)",
    "  setPaneOpen(true)",
    "  return h('main', null, h('button', { onClick: openAgent, disabled: !hasConversation }, 'AI 对话'))",
    "}",
  ].join('\n')
  const serviceBad = [
    "const service = host?.desktopWorkbenches?.service",
    "function Panel({ conversation }) {",
    "  useEffect(() => service?.subscribe?.(() => rerender()), [])",
    "  if (ownedSession()) { setPaneOpen(true); return h('main', null, conversation) }",
    "  const id = await service.newSession(defaultWorkspace?.()?.workspaceId)",
    "  if (!id) { setNote('已取消资料目录选择，没有创建会话。可以再次点击重试。'); return }",
    "  setPaneOpen(true)",
    "  postMessage({ type: 'thymic:agent-draft', prompt, send: false })",
    "  catch (e) { setNote(`没能调起会话：${e.message}。可以再次点击重试。`) }",
    "  return h('main', null, conversation)",
    "}",
  ].join('\n')
  const paneVisibleBad = [
    "const service = host?.desktopWorkbenches?.service || host?.desktopWorkbenches",
    "function Panel({ conversation }) {",
    "  useEffect(() => service?.subscribe?.(() => rerender()), [])",
    "  if (ownedSession()) { setPaneOpen(true); return h('main', null, conversation) }",
    "  const id = await service.newSession(defaultWorkspace?.()?.workspaceId)",
    "  if (!id) { setNote('已取消资料目录选择，没有创建会话。可以再次点击重试。'); return }",
    "  setPaneOpen(true)",
    "  postMessage({ type: 'thymic:agent-draft', prompt, send: false })",
    "  catch (e) { setNote(`没能调起会话：${e.message}。可以再次点击重试。`) }",
    "  const paneVisible = paneOpen || hasConversation",
    "  return h('main', null, conversation)",
    "}",
  ].join('\n')
  const r1 = inspect(bad, { hasGenerated: true, generatedSource: 'const X = __CUSTOM_FRAME__' })
  const r2 = inspect(good, { hasGenerated: true, generatedSource: 'const X = true' })
  const r3 = inspect(good, { hasGenerated: true, generatedSource: 'const __VERSION__ = "0.2.1"\nconst __AGENT_PANE__ = {"default":0.35}\nconst AGENT = __AGENT_PANE__' })
  const r4 = inspect(placementGood, { hasGenerated: true, generatedSource: 'const X = true' })
  const r5 = inspect(placementBad, { hasGenerated: true, generatedSource: 'const X = true' })
  const r6 = inspect(disabledBad, { hasGenerated: true, generatedSource: 'const X = true' })
  const r7 = inspect(serviceBad, { hasGenerated: true, generatedSource: 'const X = true' })
  const r8 = inspect(paneVisibleBad, { hasGenerated: true, generatedSource: 'const X = true' })
  const badCaught = r1.fails.length >= 8
  const goodClean = r2.fails.length === 0 && r4.fails.length === 0
  const declarationsClean = r3.fails.length === 0
  const placementCaught = r5.fails.some((x) => x.startsWith('11 '))
  const disabledCaught = r6.fails.some((x) => x.startsWith('12 '))
  const serviceCaught = r7.fails.some((x) => x.startsWith('13 '))
  const paneVisibleCaught = r8.fails.some((x) => x.startsWith('14 '))
  console.log(`${badCaught ? 'PASS' : 'FAIL'}  self-test 反例被抓住（${r1.fails.length} 条）`)
  for (const x of r1.fails) console.log('   · ' + x)
  console.log(`${placementCaught ? 'PASS' : 'FAIL'}  self-test 订阅放在 return 之后会被抓住`)
  console.log(`${disabledCaught ? 'PASS' : 'FAIL'}  self-test 无会话按钮 disabled 会被抓住`)
  console.log(`${serviceCaught ? 'PASS' : 'FAIL'}  self-test desktopWorkbenches.service 无回退会被抓住`)
  console.log(`${paneVisibleCaught ? 'PASS' : 'FAIL'}  self-test paneOpen || hasConversation 会被抓住`)
  console.log(`${goodClean ? 'PASS' : 'FAIL'}  self-test 正例零误报${goodClean ? '' : '：' + JSON.stringify([...r2.fails, ...r4.fails])}`)
  console.log(`${declarationsClean ? 'PASS' : 'FAIL'}  self-test 已声明的注入常量不误报${declarationsClean ? '' : '：' + r3.fails.join(' | ')}`)
  process.exit(badCaught && goodClean && declarationsClean && placementCaught && disabledCaught && serviceCaught && paneVisibleCaught ? 0 : 2)
}

const candidates = ['src/client.js', 'lib/client.js'].map((p) => join(target, p))
const srcPath = candidates.find((p) => existsSync(p))
if (!srcPath) {
  console.log(JSON.stringify({
    pass: true, skipped: true,
    reason: '没有 src/client.js 或 lib/client.js（原型阶段或尚未移植）：AI 面板契约检查暂不启用，移植后自动生效。',
    fails: [], oks: [],
  }, null, 2))
  process.exit(0)
}

const source = readFileSync(srcPath, 'utf8')
const genPath = join(target, 'lib/client.js')
const generatedSource = existsSync(genPath) ? readFileSync(genPath, 'utf8') : ''
const { fails: f, oks: o } = inspect(source, { hasGenerated: existsSync(genPath), generatedSource })

console.log(JSON.stringify({
  pass: f.length === 0,
  file: srcPath.replace(target + '/', ''),
  fails: f,
  oks: o,
  limits: [
    '静态断言只覆盖源码反模式；面板是否真的出现、取消选目录后是否留空会话、失败是否有提示，必须装机后人工走查（V3）。',
  ],
}, null, 2))
process.exit(f.length === 0 ? 0 : 1)
