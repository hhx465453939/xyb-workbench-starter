# TRACEABILITY · CHG-001

> 追溯口径：每条验收项 → 实现位置 → 实测命令 → 实测输出（原文关键行）。
> 本表是"证据索引"，不替代人工复核。

| # | 验收项 | 实现位置 | 实测命令 | 实测输出（关键行） | 状态 |
|---|---|---|---|---|---|
| T1 | 跨盘目标不被误判为"在脚手架内" | `scripts/lib/portability.mjs` `within()`；`scripts/init.mjs` import | `node scripts/init.mjs --config <cfg> --target %TEMP%\wb-cross-proj` | `{"generated":"…\\wb-cross-proj","files":276,…}` / `cross_exit=0` | 通过 |
| T2 | plan 键归一（不再 `undefined.toString()` 崩） | `scripts/init.mjs` `collect()` + `toPosix` | 同上 + `test/init-portability.test.mjs` | 生成成功、`assets/manifest.json` 存在 | 通过 |
| T3 | 文本哈希按 LF 归一、二进制按原字节 | `portability.sha256Of`；`check-starter`、`check-trial-snapshot`、`check-schema`、`check-schema-words` | `node scripts/check-starter.mjs` | `{"files":265,"pass":true,"errors":[]}` | 通过 |
| T4 | `reference/` 豁免在 Windows 生效（不再 4 条断链） | `scripts/check-starter.mjs` | 同上 | `errors: []`（修复前 4 条 `Broken local link … ../data/categories.json`） | 通过 |
| T5 | 换行口径由版本库定死 | `.gitattributes` + `check-starter` 断言 | 同上 | 断言存在 `* text=auto eol=lf` | 通过 |
| T6 | 下发副本不漂移 | `templates/lib/portability.mjs` + `check-starter` `a.equals(b)` | 同上 | 无 `下发副本漂移` 错误 | 通过 |
| T7 | 首日检查链全绿 | 四道门禁阶段感知 | 生成项目内 `npm run check` | `check_exit=0`；`SKIP 资料目录闸门…`／`SKIP 临床试验闸门…`／`SKIP 患者档案闸门…`／`SKIP ui-parity…` 各 1 行 | 通过 |
| T8 | 跳过不冒充通过 | 同上（`--self-test` 在前） | `node templates/check-data-dir.mjs --self-test` 等 | `"selfTest": "PASS"` ×3 | 通过 |
| T9 | 单测全绿（含新反例） | `test/portability.test.mjs`、`test/init-portability.test.mjs`、4 处测试侧修正 | `npm test` | `tests 82 / pass 82 / fail 0`（基线 `58/76`） | 通过 |
| T10 | 装机副本缺失时拒绝冒充 | `project-template/scripts/serve-artifact.mjs` | 代码级：无显式包目录且 `!existsSync(installed)` → `exit 2` | 未在装有 Desktop 的机器上跑（本机无 Desktop）→ 只做到静态断言 | 未验证 |
| T11 | `verify:desktop` 不再因 `HOME` 为空恒失败 | `templates/verify-desktop-load.mjs` | `node scripts/verify-desktop-load.mjs`（生成项目内） | 改为 `HOME\|\|USERPROFILE` + 平台分派；真实装机仍待 Windows 实机 | 部分验证 |
| T12 | 探针不再依赖 macOS 路径 | `probe-page-view`、`probe-disease-primer`、`capture-shots` | `node --check` + 全仓扫描 | 三种平台家目录模式命中 0 | 部分验证（未实跑浏览器） |
| T13 | 脱敏 | 全仓改动 | 大小写敏感扫描 | 0 命中（`qinxiaoqiang` 断言已改为通用正则） | 通过 |

## 未覆盖（必须写在交付里）

- **Windows 实机装机与 Desktop 加载**：本机未安装 DSH Desktop，`check-install.mjs`/`verify-desktop-load.mjs` 只验证了"路径口径与失败行为正确"，未验证"装进去能打开"。
- **浏览器探针**（`probe:page-view`、`probe:primer`、`probe:tabs`）：本机无 `puppeteer-core`/`playwright`，只验证到"找不到依赖时明确 exit 2 并给出候选清单"，未跑通页面断言。
- **`probe-all-routes`**：仓内缺 `templates/cdp.mjs`，已改为明确报错；探针本身未跑通。
