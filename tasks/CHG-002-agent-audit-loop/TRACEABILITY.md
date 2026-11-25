# TRACEABILITY · CHG-002

> 状态：**已实现，实测已回填**（2026-11-25）。证据均为本机（Windows 11 / Node v24.22.1）实跑输出。
> 追溯口径：PRD 目标（G1–G6）→ 里程碑 → 验收断言 → 证据命令。

| PRD 目标 | 里程碑 | 验收断言 | 证据命令 | 实测输出（关键行） | 状态 |
|---|---|---|---|---|---|
| G1 一条命令拿整仓结论 | M2 | M0 项目 `audit:loop` 退出码 0，输出可 `JSON.parse` | 生成项目内 `npm run audit:loop` / `node scripts/audit-loop.mjs . --json` | `14 pass / 7 skip / 0 fail（共 21）`、`loop_exit=0`、`json_exit=0` | 通过 |
| G2 幂等 + schemaVersion | M2 | 连跑两次去 `meta` 后一致；`schemaVersion === 1` | 同上 ×2 + 脚本比对 | `schemaVersion=1`、`idempotent=true`、`summary={"pass":14,"fail":0,"skip":7,"total":21}` | 通过 |
| G3 阶段元数据 | M1 | 注册表覆盖 100% 门禁；漂移即红 | `node scripts/build-gates-registry.mjs --check` + `npm run check` | `{"pass":true,"gates":21,"mode":"check"}`；`check_exit=0` | 通过 |
| G4 标准可最小阅读 | M3 | 链接全可达；视图与注册表一致 | `node scripts/render-gates-doc.mjs --check` + `npm run check` | `render_check_exit=0`；链接检查无 `Broken local link` | 通过 |
| G5 Agent 自闭环 | M4 | 提示词引用路径存在 | `npm run check`（含链接/静态引用检查） | `check_exit=0` | 通过 |
| G6 缺陷不回流 | M5 | 干净绿 / 注入红 / skip 带 reason / 未知 id exit 2 | `npm test` | `tests 88 / pass 88 / fail 0`（新增 6 条 audit-loop 反例） | 通过 |
| 不回归 | 全程 | `npm run check` 0；`npm test` 0 fail | 两条命令 | `check_exit=0`、`test_exit=0` | 通过 |
| `--only` / `--stage` | M2 | 过滤生效 | `--only data-dir`、`--stage M0` | `only_ids=data-dir status=skip`、`M0_total=13` | 通过 |
| `--out` 边界 | M2 | 只允许写进项目根 | `--out ../escape.json` | `exit 2` + `只能写进项目根` | 通过 |
| 脱敏 | 交付 | 无本机家目录路径/token；夹具在 `os.tmpdir()` | 大小写敏感扫描 | 新增/改动文件 0 命中 | 通过 |

## 未覆盖（如实记录）

- **未在 macOS / Linux 实跑** `audit-loop`：逻辑只依赖 `node:path` 与 `portability.mjs`，且测试夹具用 `os.tmpdir()`，但本机只有 Windows，其他平台属"未实测"。
- **未对真实业务工作台（乳腺癌/AML 等存量大仓）跑 `audit:loop`**：只对 `init` 生成的 M0 项目与测试夹具实跑；存量项目里注册表可能比脚本旧（脚本会明确报"门禁脚本不存在/注册表不一致"，不静默）。
- **`20-GATES.md` 为生成物**：人改了会被 `--check` 判红，这是设计而非缺陷；但社区若习惯手改文档，需要习惯"改策展表→重建"。

## 计划期已确定的边界（防止实现期跑偏）

- 不改 `npm run check` 链路（PRD §10.1）。
- 不合并 `docs/` 正文（PRD §10.2）。
- 新增脚本一律走 `scripts/lib/portability.mjs`，禁止 bash/`python3`/`/tmp`（PRD §10.5）。
- `stage` 缺省时**一律执行**（宁可多跑，不漏跑）。
