---
change_id: CHG-001
version: 1
status: draft
prd_ref: null
health_ref: null
supersedes: null
approved_by: null
approved_at: null
---

# SPEC · 跨平台口径与首日检查链（实现契约）

## 1. 上下文与约束

本仓是社区脚手架：开发者 clone 后用 `init.mjs` 生成业务工作台，随后在该项目里跑 `npm run check`（23 条门禁）。因此**同一套脚本要在 macOS / Windows / Linux 上给出同一结论**；任何"平台相关的红/绿"都会直接变成社区返工。约束：

- 只用 Node 内置模块（`engines: node >= 22`），不新增依赖。
- `templates/*.mjs` 会被复制成生成项目的 `scripts/*.mjs`，其相对 import 只能指向会被一并下发的位置。
- 门禁一律"失败即非 0"，不许把 FAIL 改 SKIP 来变绿；跳过必须打印原因。
- 本机实测环境：Windows 11 + Git for Windows（`core.autocrlf=true`）+ Node v24.22.1 + npm 11.18.0。

## 2. 现状与债务影响

见 [CHANGE.md](CHANGE.md) §1 的实测表。三类债务：

1. **平台口径债**：换行（LF/CRLF）、路径分隔符（`/` vs `\`）、家目录变量（`HOME` vs `USERPROFILE`）、解释器名（`python3` vs `py`）、浏览器/宿主位置写死 macOS 路径。
2. **判据自洽债**：同一文件里"解析容忍 CRLF、哈希不容忍"；"链接豁免按 `/reference/` 判但路径是反斜杠"。
3. **验收口径债**：找不到装机副本时静默回落源码树；门禁在 M0 阶段把"未实现"判成缺陷。

## 3. 选定设计与权衡（ADR）

**D1 口径收敛到单一模块**：`scripts/lib/portability.mjs` 导出 `within` / `toPosix` / `normalizeEol` / `sha256Of` / `isBinaryPath`。
弃选：把逻辑散在 `init.mjs` 与各门禁（无法写反例单测，无法防漂移）。

**D2 双轨换行治理**：`.gitattributes`（`* text=auto eol=lf`）负责"新克隆统一 LF"；`sha256Of` 负责"存量 CRLF 检出仍能正确判定"。
弃选：只做其一（见 CHANGE §3）。

**D3 下发副本 + 逐字节断言**：`templates/lib/portability.mjs` 是 `scripts/lib/portability.mjs` 的副本，`check-starter` 断言 `a.equals(b)`，并断言 `.gitattributes` 含 `eol=lf`。
弃选：`templates` 通过 `../scripts/lib` 引用（生成后路径不存在）。

**D4 阶段感知门禁**：跳过条件 = "功能面完全不存在"，写法：

```js
/* --self-test 必须先执行（否则脚手架里跑自测会输出"跳过"并 exit 0） */
if (SELF_TEST) { … process.exit(ok ? 0 : 1) }
const surface = /pickDirectory|showDirectoryPicker|webkitdirectory|setDataRoot/  // 该门禁的能力信号
if (!surface) { console.log('SKIP <闸门名>：<缺什么能力>（M0 阶段）；<何时自动生效>'); process.exit(0) }
```
判据要**能力信号**而非文案信号（骨架里出现"资料目录"字样属别的上下文，不能据此判定能力存在）。

**D5 产物级验收禁止回落**：`serve-artifact` 无装机副本且未显式传包目录 → `exit 2`；装机位置按平台分派，保留 `DSH_HARNESS`/`HN_HARNESS` 覆盖。

## 4. 接口与数据契约

| 模块 | 契约 |
|---|---|
| `portability.within(parent,target)` | `true` 当且仅当 target 在 parent 内（跨盘必 `false`） |
| `portability.toPosix(p)` | 反斜杠路径 → 正斜杠键（POSIX 上恒等） |
| `portability.sha256Of(bytes,file)` | 文本扩展名按 LF 归一化后哈希；二进制扩展名按原始字节；非 UTF-8/含 NUL 视为二进制 |
| `portability.normalizeEol(bytes)` | 返回 `Buffer` |
| `init.mjs --config/--target` | 目标不得在脚手架内/为其祖先；跨盘允许；冲突零写入；失败不留半成品 |
| `check-starter.mjs` | 输出 `{files, pass, errors[]}`，`pass=false` 时退出码 1 |
| `serve-artifact.mjs` | 无显式包目录且无装机副本 → `exit 2`，stderr 说明"拒绝用源码树冒充" |

## 5. 里程碑

| # | 内容 | 文件 | 验收 |
|---|---|---|---|
| M1 | 口径模块 + 副本 + `.gitattributes` | `scripts/lib/portability.mjs`、`templates/lib/`、`.gitattributes` | 单测 4 条通过；`check-starter` 副本断言生效 |
| M2 | `init` 跨盘/键归一/重复键 | `scripts/init.mjs` | 跨盘与同盘各生成 276 文件；重复键只剩 1 处 |
| M3 | 自检哈希与链接口径 | `scripts/check-starter.mjs` | `npm run check` 0 error（265 文件） |
| M4 | 四道门禁阶段感知 | `templates/check-data-dir|trial-chain|patient-create|ui-parity.mjs` | 生成项目 23 条命令全 0；`--self-test` 仍 PASS |
| M5 | 装机/产物链平台化 | `verify-desktop-load`、`smoke-activate`、`serve-artifact`、`check-install`、`verify-tabs-on-artifact.py` | 缺装机副本 `exit 2`；win 提示为绝对路径 |
| M6 | 探针与工具链平台化 | `probe-page-view`、`probe-disease-primer`、`capture-shots`、`apply-theme`、`fix-data-dir`、`probe-all-routes`、`pack-contents` | `node --check` 全 0；无 `/Users/` 硬编码 |
| M7 | 测试侧去 POSIX 假设 + 新反例 | `test/*.test.mjs` | `npm test` 82/82 |

## 6. DoR / DoD

**DoR**：缺陷可复现（给出命令 + 实际输出）；根因已判（不是"看起来像"）；改动面在脚手架而非业务项目。
**DoD**：`npm run check` 0；`npm test` 0 fail；全新生成项目 `npm run check` 0 红；反例能证明门禁仍会红；无本机绝对路径泄漏；CHANGELOG/LESSONS/VALIDATION 已更新。

## 7. 评审与交付闸口

- 评审：社区维护者按 CHANGE §5 证据表逐条复核。
- commit / push 是**独立授权闸口**；本 CHG 的提交物必须脱敏（无开发者本机家目录路径、无 token、无测试临时产物）。
- 安装到 DSH Desktop 与浏览器探针属于"未验证"层，不得用本 CHG 的绿结论替代。

## 8. 追溯与证据

见 [TRACEABILITY.md](TRACEABILITY.md)。
