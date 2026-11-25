/**
 * CHG-002 · M1：门禁表（唯一人工策展源）。
 *
 * 为什么单独成模块而不是写在生成器里：`check-starter` 要能不 spawn 地断言
 * "`gates.registry.json` 与策展表一致"（防止注册表漂移），两边都 import 这一份即可。
 *
 * 字段纪律：
 *   id        kebab-case，全局唯一
 *   script    项目内相对路径（生成项目与脚手架同名脚本）
 *   args      传给门禁的参数（项目根 `.` 必须显式写，避免门禁按 cwd 猜）
 *   stage     门禁**首次生效**的里程碑；[] = 未知（一律执行）
 *   skipWhen  什么情况下它会 SKIP（描述门禁自身行为，不是"什么时候该忽略"）
 *   docs      判据来源，供 Agent 追问"为什么有这条"
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'

export const GATES = [
  { id: 'agent-pane-contract', title: '原生 AI 面板静态契约', script: 'scripts/check-agent-pane-contract.mjs', args: ['.'], stage: ['M0'], skipWhen: '无 lib/client.js 或 src/client.js（壳层尚未接宿主）', docs: ['prompts/DSH-AGENT-PANE-INTEGRATION.md'] },
  { id: 'assertion-strength', title: '断言强度（不许只写存在不写判据）', script: 'scripts/check-assertion-strength.mjs', args: [], stage: ['M0'], skipWhen: '无 public/ 下的 JS', docs: ['docs/06-VALIDATION-AND-RELEASE.md'] },
  { id: 'choice-limit', title: '选择上限一致性', script: 'scripts/check-choice-limit.mjs', args: [], stage: ['M0'], skipWhen: '无 public/ 下的 JS（原型阶段）', docs: ['docs/19-PROTOTYPE-CRAFT.md'] },
  { id: 'data-dir', title: '资料目录闸门', script: 'scripts/check-data-dir.mjs', args: ['.'], stage: ['M5'], skipWhen: '无 pickDirectory / showDirectoryPicker / webkitdirectory / setDataRoot / /root 写入端点', docs: ['docs/09-WORKBENCH-STATUS.md'] },
  { id: 'derivative-leftovers', title: '底本残留扫描', script: 'scripts/check-derivative-leftovers.mjs', args: ['.'], stage: ['M0'], skipWhen: '—（总会执行）', docs: ['docs/LESSONS.md'] },
  { id: 'host-contract', title: '宿主合同（businessWidth 0.25–0.7 硬上限）', script: 'scripts/check-host-contract.mjs', args: [], stage: ['M0'], skipWhen: '无 lib/client.js', docs: ['docs/40-A-FAMILY-PANEL-STANDARD.md'] },
  { id: 'patient-create', title: '患者档案闸门', script: 'scripts/check-patient-create.mjs', args: ['.'], stage: ['M5'], skipWhen: '无患者/档案功能面（patients|subjects|profiles 词表皆无）', docs: ['docs/14-HTML-AND-DATA-CONTRACT.md'] },
  { id: 'placeholder-free', title: '占位符自由（发布包不许留未替换占位符）', script: 'scripts/check-placeholder-free.mjs', args: ['.'], stage: ['M0'], skipWhen: '—（总会执行）', docs: ['docs/06-VALIDATION-AND-RELEASE.md'] },
  { id: 'primer-links', title: '疾病概要指南原件链接', script: 'scripts/check-primer-links.mjs', args: [], stage: ['M5'], skipWhen: '无 prototypes/*/primer-data.js（尚未引入 36 号疾病概要）', docs: ['docs/36-DISEASE-PRIMER.md', 'docs/38-GUIDELINE-SOURCES.md'] },
  { id: 'probe-coverage', title: '探针覆盖（每条判据都要有探针）', script: 'scripts/check-probe-coverage.mjs', args: [], stage: ['M0'], skipWhen: '—（总会执行）', docs: ['docs/06-VALIDATION-AND-RELEASE.md'] },
  { id: 'route-prefix', title: 'UI 路由前缀同源', script: 'scripts/check-route-prefix.mjs', args: [], stage: ['M0'], skipWhen: 'M0 骨架（尚未拆分 lib/identity.js / src/client.js）', docs: ['docs/LESSONS.md'] },
  { id: 'schema-words', title: '判读列禁词 + 冻结 sha256 账本', script: 'scripts/check-schema-words.mjs', args: ['.'], stage: ['M3'], skipWhen: '无 schema/ 目录（M3 未开始）', docs: ['docs/14-HTML-AND-DATA-CONTRACT.md'] },
  { id: 'smoke-activate', title: '激活烟测（apply() + 宿主 7 条校验）', script: 'scripts/smoke-activate.mjs', args: [], stage: ['M0'], skipWhen: '无 cordis.patch.yml / lib/client.js', docs: ['docs/40-A-FAMILY-PANEL-STANDARD.md'] },
  { id: 'static-refs', title: '静态引用完整性', script: 'scripts/check-static-refs.mjs', args: [], stage: ['M0'], skipWhen: '无 public/ 下的 HTML/JS', docs: ['docs/LESSONS.md'] },
  { id: 'trial-chain', title: '临床试验四段 / 裁剪证据', script: 'scripts/check-trial-chain.mjs', args: ['.'], stage: ['M5'], skipWhen: '无临床试验功能面且 research/ 无试验快照', docs: ['docs/35-TRIAL-MATCHING.md'] },
  { id: 'trial-matching', title: '35 号试验匹配（分母行 + pct 守卫）', script: 'scripts/check-trial-matching.mjs', args: ['.'], stage: ['M5'], skipWhen: '无 trial-match.js', docs: ['docs/35-TRIAL-MATCHING.md'] },
  { id: 'trial-snapshot', title: '临床快照 JSONL/SQLite 一致性', script: 'scripts/check-trial-snapshot.mjs', args: ['.', '--if-present'], stage: ['M4'], skipWhen: '无 clinical snapshot（--if-present 显式跳过）', docs: ['docs/04-DATA.md'] },
  { id: 'ui-parity', title: 'ui-parity（public/ 与原型定点移植）', script: 'scripts/check-ui-parity.mjs', args: [], stage: ['M5'], skipWhen: '无 prototypes/v0.2 或 public/', docs: ['docs/14-HTML-AND-DATA-CONTRACT.md'] },
  { id: 'version-literal', title: '页面版本字面量与服务端同源', script: 'scripts/check-version-literal.mjs', args: [], stage: ['M0'], skipWhen: '无 public/index.html', docs: ['docs/06-VALIDATION-AND-RELEASE.md'] },
  { id: 'wording', title: '患者可见文案红线', script: 'scripts/check-wording.mjs', args: ['.'], stage: ['M0'], skipWhen: '无 public/ 或 lib/client.js', docs: ['docs/23-METRIC-GRADING-AND-ALERTS.md'] },
  { id: 'workbench-package', title: '装包合同（能否装进宿主）', script: 'scripts/check-workbench-package.mjs', args: ['.'], stage: ['M0'], skipWhen: '—（总会执行）', docs: ['docs/14-HTML-AND-DATA-CONTRACT.md'] },
]

/** 脚本可能出现在三处：templates/（源）、project-template/scripts/（下发副本）、scripts/（脚手架自带） */
export function scriptExists(root, script) {
  const name = script.replace(/^scripts\//, '')
  return existsSync(join(root, 'templates', name))
    || existsSync(join(root, 'project-template', 'scripts', name))
    || existsSync(join(root, 'scripts', name))
}

/** 策展表自身校验；返回错误数组（空 = 合规） */
export function validateGates(root) {
  const errors = []
  const ids = GATES.map((g) => g.id)
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i)
  if (dup.length) errors.push('id 重复：' + [...new Set(dup)].join(', '))
  for (const gate of GATES) {
    if (!/^[a-z][a-z0-9-]*$/.test(gate.id)) errors.push(`id 不合规（kebab-case）：${gate.id}`)
    if (!scriptExists(root, gate.script)) errors.push(`脚本不存在：${gate.id} → ${gate.script}`)
    if (!Array.isArray(gate.stage) || gate.stage.some((s) => !/^M[0-9]$/.test(s))) errors.push(`stage 不合规：${gate.id}`)
    if (typeof gate.skipWhen !== 'string' || !gate.skipWhen) errors.push(`skipWhen 缺失：${gate.id}`)
    if (!Array.isArray(gate.docs) || gate.docs.length === 0) errors.push(`docs 缺失（判据来源）：${gate.id}`)
  }
  return errors
}

/** 期望的注册表对象（排序稳定） */
export function expectedRegistry() {
  return {
    schemaVersion: 1,
    note: '门禁集合的唯一声明源。由 scripts/build-gates-registry.mjs 生成；新增门禁必须在此登记，否则 check-starter 判红。',
    gates: [...GATES].sort((a, b) => a.id.localeCompare(b.id)),
  }
}
