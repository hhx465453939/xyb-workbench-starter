<!-- 生成物：勿手改。来源 gates.registry.json，重渲染：node scripts/render-gates-doc.mjs -->

# 门禁视图（自动生成）

共 **21** 条门禁。本页由注册表生成，是"有哪些门禁、各自何时生效、什么情况会跳过"的唯一视图；
判据细节去对应门禁脚本与"判据来源"文档看，本页不复制正文。

> 查当前项目实际结论：`npm run audit:loop`（人类摘要）或 `node scripts/audit-loop.mjs . --json`（机读）。
> 阶段语义：`首次生效` 是该门禁开始有意义的里程碑；`audit-loop --stage MN` 跑 `首生效 <= MN` 的门禁。

| id | 门禁 | 首次生效 | 何时 SKIP | 命令 | 判据来源 |
|---|---|---|---|---|---|
| `agent-pane-contract` | 原生 AI 面板静态契约 | M0 | 无 lib/client.js 或 src/client.js（壳层尚未接宿主） | `node scripts/check-agent-pane-contract.mjs .` | [prompts/DSH-AGENT-PANE-INTEGRATION.md](../../prompts/DSH-AGENT-PANE-INTEGRATION.md) |
| `assertion-strength` | 断言强度（不许只写存在不写判据） | M0 | 无 public/ 下的 JS | `node scripts/check-assertion-strength.mjs` | [06-VALIDATION-AND-RELEASE.md](../06-VALIDATION-AND-RELEASE.md) |
| `choice-limit` | 选择上限一致性 | M0 | 无 public/ 下的 JS（原型阶段） | `node scripts/check-choice-limit.mjs` | [19-PROTOTYPE-CRAFT.md](../19-PROTOTYPE-CRAFT.md) |
| `data-dir` | 资料目录闸门 | M5 | 无 pickDirectory / showDirectoryPicker / webkitdirectory / setDataRoot / /root 写入端点 | `node scripts/check-data-dir.mjs .` | [09-WORKBENCH-STATUS.md](../09-WORKBENCH-STATUS.md) |
| `derivative-leftovers` | 底本残留扫描 | M0 | —（总会执行） | `node scripts/check-derivative-leftovers.mjs .` | [LESSONS.md](../LESSONS.md) |
| `host-contract` | 宿主合同（businessWidth 0.25–0.7 硬上限） | M0 | 无 lib/client.js | `node scripts/check-host-contract.mjs` | [40-A-FAMILY-PANEL-STANDARD.md](../40-A-FAMILY-PANEL-STANDARD.md) |
| `patient-create` | 患者档案闸门 | M5 | 无患者/档案功能面（patients|subjects|profiles 词表皆无） | `node scripts/check-patient-create.mjs .` | [14-HTML-AND-DATA-CONTRACT.md](../14-HTML-AND-DATA-CONTRACT.md) |
| `placeholder-free` | 占位符自由（发布包不许留未替换占位符） | M0 | —（总会执行） | `node scripts/check-placeholder-free.mjs .` | [06-VALIDATION-AND-RELEASE.md](../06-VALIDATION-AND-RELEASE.md) |
| `primer-links` | 疾病概要指南原件链接 | M5 | 无 prototypes/*/primer-data.js（尚未引入 36 号疾病概要） | `node scripts/check-primer-links.mjs` | [36-DISEASE-PRIMER.md](../36-DISEASE-PRIMER.md)<br>[38-GUIDELINE-SOURCES.md](../38-GUIDELINE-SOURCES.md) |
| `probe-coverage` | 探针覆盖（每条判据都要有探针） | M0 | —（总会执行） | `node scripts/check-probe-coverage.mjs` | [06-VALIDATION-AND-RELEASE.md](../06-VALIDATION-AND-RELEASE.md) |
| `route-prefix` | UI 路由前缀同源 | M0 | M0 骨架（尚未拆分 lib/identity.js / src/client.js） | `node scripts/check-route-prefix.mjs` | [LESSONS.md](../LESSONS.md) |
| `schema-words` | 判读列禁词 + 冻结 sha256 账本 | M3 | 无 schema/ 目录（M3 未开始） | `node scripts/check-schema-words.mjs .` | [14-HTML-AND-DATA-CONTRACT.md](../14-HTML-AND-DATA-CONTRACT.md) |
| `smoke-activate` | 激活烟测（apply() + 宿主 7 条校验） | M0 | 无 cordis.patch.yml / lib/client.js | `node scripts/smoke-activate.mjs` | [40-A-FAMILY-PANEL-STANDARD.md](../40-A-FAMILY-PANEL-STANDARD.md) |
| `static-refs` | 静态引用完整性 | M0 | 无 public/ 下的 HTML/JS | `node scripts/check-static-refs.mjs` | [LESSONS.md](../LESSONS.md) |
| `trial-chain` | 临床试验四段 / 裁剪证据 | M5 | 无临床试验功能面且 research/ 无试验快照 | `node scripts/check-trial-chain.mjs .` | [35-TRIAL-MATCHING.md](../35-TRIAL-MATCHING.md) |
| `trial-matching` | 35 号试验匹配（分母行 + pct 守卫） | M5 | 无 trial-match.js | `node scripts/check-trial-matching.mjs .` | [35-TRIAL-MATCHING.md](../35-TRIAL-MATCHING.md) |
| `trial-snapshot` | 临床快照 JSONL/SQLite 一致性 | M4 | 无 clinical snapshot（--if-present 显式跳过） | `node scripts/check-trial-snapshot.mjs . --if-present` | [04-DATA.md](../04-DATA.md) |
| `ui-parity` | ui-parity（public/ 与原型定点移植） | M5 | 无 prototypes/v0.2 或 public/ | `node scripts/check-ui-parity.mjs` | [14-HTML-AND-DATA-CONTRACT.md](../14-HTML-AND-DATA-CONTRACT.md) |
| `version-literal` | 页面版本字面量与服务端同源 | M0 | 无 public/index.html | `node scripts/check-version-literal.mjs` | [06-VALIDATION-AND-RELEASE.md](../06-VALIDATION-AND-RELEASE.md) |
| `wording` | 患者可见文案红线 | M0 | 无 public/ 或 lib/client.js | `node scripts/check-wording.mjs .` | [23-METRIC-GRADING-AND-ALERTS.md](../23-METRIC-GRADING-AND-ALERTS.md) |
| `workbench-package` | 装包合同（能否装进宿主） | M0 | —（总会执行） | `node scripts/check-workbench-package.mjs .` | [14-HTML-AND-DATA-CONTRACT.md](../14-HTML-AND-DATA-CONTRACT.md) |

## 维护规则

1. 新增门禁只改 `scripts/lib/gates-table.mjs`，然后 `npm run gates:build && npm run standards:render`。
2. `check-starter` 会断言"注册表 == 策展表"，`--check` 会断言"本页 == 注册表"；两处漂移都会判红。
3. `skipWhen` 描述的是**门禁自身的跳过行为**，不是"什么时候可以忽略这条"。
