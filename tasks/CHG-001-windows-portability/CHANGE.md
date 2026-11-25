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

# CHANGE · 脚手架 Windows 可移植性修复与首日检查链恢复

> 说明：本契约是**回溯型（retrofit）**——缺陷由 Windows 真机审计发现、修复与实测已完成，
> 因此 `status: draft` 表示「等社区评审」，不是「尚未实现」。合并前需人工复核证据表。

## 1. 背景与问题

干净 clone（`cc620a5`，Windows 11 + Git for Windows 默认 `core.autocrlf=true`）接手本仓时的可复现状态：

| 入口 | 实测结果 | 性质 |
|---|---|---|
| `npm run check` | **fail**：13 条 `Asset hash mismatch` + 4 条 `Official snapshot hash mismatch` + 4 条 `Broken local link` | 假红（仓库内容全对） |
| `node scripts/init.mjs --config … --target C:\…\proj` | **拒跑**：`Target must be outside the starter directory and not its ancestor` | 假红 + 真阻断 |
| 同上但目标在 E: 盘 | **崩**：`Cannot read properties of undefined (reading 'toString')`，生成 0 个文件 | 真缺陷 |
| 全新生成项目的 `npm run check` | **4 道门禁红**（`check-data-dir`/`check-trial-chain`/`check-patient-create`/`check-ui-parity`） | 承诺失守（"第一天就该绿"） |
| `npm test` | **58 pass / 18 fail** | 一半是测试自身 POSIX 假设，一半是产品缺陷 |
| `npm run verify:desktop` / `smoke:activate` | 恒 `exit 2`（`HOME` 在 Windows 为空 → 路径退化为相对路径） | 闸门形同虚设 |
| `npm run probe:artifact` | 静默服务**源码树**并打印"产物服务/PASS" | **假绿（最危险）** |

## 2. 目标与非目标

**目标**
1. 上述每个入口在 Windows 干净 clone 上都给出**正确**结论：没缺陷就绿，有缺陷就红。
2. 消除"假红"（换行口径）与"假绿"（源码树冒充装机产物、跳过不说明）。
3. 全新 `init` 项目当天 `npm run check` 全绿，且每一条跳过都写明原因。
4. 回归测试覆盖上述每一类缺陷，防再犯。

**非目标**
- 不改业务工作台的领域规则（35/36 号等文档判据不动）。
- 不引入第三方依赖、不改包分发面（`files` 白名单不加新入口）。
- 不在本 CHG 内重写 `check-ui-parity` 的"逐字节"判据（用 `.gitattributes` 固定 LF 口径即可，见 §6 风险）。

## 3. 决策（ADR 摘要）

| 决策 | 选项 | 选择与理由 | 可逆性 |
|---|---|---|---|
| 换行口径 | ①只加 `.gitattributes` ②只做哈希归一化 ③两者都做 | **③**：①救不了已克隆工作区（现有 CRLF 仍红），②在二进制上会误判；两层合起来才既治新克隆又治存量 | 高（删文件/换函数即可） |
| 跨平台工具函数放哪 | ①写在 `init.mjs` 内 ②独立可测模块 | **②** `scripts/lib/portability.mjs`：每条都有对应真机缺陷，必须能写反例单测 | 高 |
| 下发副本 | ①让模板 import 脚手架路径 ②`templates/lib/` 逐字节副本 + 断言 | **②**：`templates/*.mjs` 会被复制成项目的 `scripts/*.mjs`，相对 import 必须是 `./lib/…`；副本用 `check-starter` 逐字节断言防漂移 | 高 |
| M0 门禁行为 | ①一律放行 ②一律红 ③"功能面不存在"才跳过并打印原因 | **③**：保留"声称有但做坏"仍判红的能力；`--self-test` 必须排在跳过之前 | 高 |
| 装机产物 | ①找不到就回落源码树 ②直接失败 | **②**：源码树冒充产物是本仓历史上最贵的一类假绿 | 高 |

## 4. 变更清单（均已实现）

- 新增 `scripts/lib/portability.mjs`（`within` / `toPosix` / `normalizeEol` / `sha256Of` / `isBinaryPath`）+ `templates/lib/` 逐字节副本。
- `.gitattributes`：`* text=auto eol=lf` + 二进制白名单。
- `scripts/init.mjs`：`within` 换用跨盘安全实现、plan 键统一 `toPosix`、删掉重复的 `check:version-literal` 脚本键、下发 `scripts/lib/portability.mjs`。
- `scripts/check-starter.mjs`：哈希走 `sha256Of`、`reference/` 豁免先归一、失败信息带文件名、新增 `.gitattributes` 与副本一致性断言。
- 四道门禁加阶段感知跳过：`check-data-dir` / `check-trial-chain` / `check-patient-create` / `check-ui-parity`。
- 装机链：`verify-desktop-load` / `smoke-activate` 的 `HOME||USERPROFILE` + 平台分派；`serve-artifact` 装机副本缺失即 `exit 2`、默认库改 `tmpdir()`；`check-install` Windows tgz 绝对路径；`verify-tabs-on-artifact.py` 不再硬编码 slug。
- 探针/工具链：Chrome 候选按平台分派、`createRequire(import.meta.url)`；`apply-theme` 用 `pathToFileURL` 判直接执行；`fix-data-dir` 用 `basename`；`probe-all-routes` 用 `pathToFileURL` 且缺 `cdp.mjs` 时明确 `exit 2`；`test-pack-contents` 的 npm 调用走 `shell`/`npm.cmd`。
- 测试：新增 `test/portability.test.mjs`、`test/init-portability.test.mjs`；修正 4 处测试侧 POSIX 假设；`.gitignore` 补测试产物规则。

## 5. 验收与证据

| 验收项 | 判据 | 证据 |
|---|---|---|
| 脚手架自检 | `npm run check` 退出码 0 | `{ files: 265, pass: true, errors: [] }` |
| 全量单测 | `npm test` 0 fail | `tests 82 / pass 82 / fail 0`（基线 58/76） |
| 跨盘生成 | 目标在另一盘也成功 | `init` 输出 `files: 276`，`cross_exit=0` |
| 同盘生成 | 成功且不崩 | `files: 276`，`same_exit=0` |
| 首日检查链 | 生成项目 `npm run check` 退出码 0 | 23 条命令全 0；7 条 SKIP 均带原因 |
| 反例仍会红 | 门禁 `--self-test` 全 PASS | `check-data-dir` / `check-trial-chain` / `check-patient-create` / `check-trial-matching` 14/14 等 |
| 不泄露本机路径 | 新增/改动文件无开发者绝对路径 | 大小写敏感扫描：Windows / macOS / Linux 三种家目录模式 0 命中 |

## 6. 风险与回滚

- **风险**：哈希归一化对"故意含 CRLF 的文本"会放宽判据。缓解：二进制白名单 + `.gitattributes` 固定 LF；`check-starter` 断言口径文件存在。
- **风险**：M0 跳过可能被误用成"功能没做也绿"。缓解：只在"功能面完全不存在"时跳；跳过必打印原因；`--self-test` 优先。
- **回滚**：逐文件 revert；`.gitattributes` 删除后行为回到本次修复前（Windows 上重新出现假红），业务项目不受影响。

## 7. 未做（如实记录）

- 未在 Windows 实机验证 **DSH Desktop 真装机**与浏览器探针（本机无 Desktop、无 puppeteer-core），相关闸门只做到"诚实报未验证"。
- `templates/probe-all-routes.mjs` 依赖的 `cdp.mjs` 不在仓内，已改为明确报错，未补齐该依赖。
- `check-data-dir` 的"拒绝主目录/桌面/下载根/tmp"判据仍是 POSIX 形态，Windows 写法（`path.parse(dir).root`、`%TEMP%`）未纳入，已记入 CHG-002 待办。
