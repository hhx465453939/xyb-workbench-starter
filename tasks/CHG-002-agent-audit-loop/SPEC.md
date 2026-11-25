---
change_id: CHG-002
version: 1
status: approved
prd_ref: PRD.md
health_ref: null
supersedes: null
approved_by: project-owner
approved_at: 2026-11-25
---

# SPEC · 脚手架内建「审计—测试」闭环与标准 IO

> 来源：PRD v1.0（2026-11-25 已批准）。本 SPEC 于 **2026-11-25 批准**，按 M1→M5 实现。
> 范围收窄说明：PRD §6 M3 原写"STANDARDS 五件"，按 PRD §10.2 裁决收窄为 **索引 + 生成式门禁视图**（见 §5 M3），其余 M1/M2/M4/M5 不变。
> §10 三个未决项按批准时的默认冻结：注册表**随 init 下发**；`evidence` 取尾部 **20 行**；审计报告**默认只返回 stdout**，落盘仅在显式 `--out`（默认路径 `os.tmpdir()`，不写进仓）。

## 1. 目标与非目标

**目标（与 PRD §3 G1–G6 一一对应）**
1. G1 一条命令拿整仓审计结论，且结论机读。
2. G2 幂等、`schemaVersion` 稳定。
3. G3 门禁带阶段元数据，未登记/未声明即红。
4. G4 角色→3 跳内找到"该读什么"，不重复正文。
5. G5 Agent 能自闭环（固定动作序列 + 引用路径必须存在）。
6. G6 ≥3 条反例测试。

**非目标**
- 不改 `npm run check` 现有 23 条链路（PRD §10.1：并存）。
- 不改任何业务判据语义；不引入依赖；不做 UI。
- 不合并/重写 `docs/` 原文（PRD §10.2）。

## 2. 架构与债务影响

新增三层，全部建立在 CHG-001 的 `scripts/lib/portability.mjs` 之上：

```
gates.registry.json ──(被读)──> scripts/audit-loop.mjs ──(写出)──> docs/AUDIT-REPORT.json
        ▲                                 │
        │(生成/校验)                       └──(执行)──> npm script 里的门禁命令
scripts/build-gates-registry.mjs              │
                                              └──(渲染)──> docs/STANDARDS/20-GATES.md
```

债务影响：注册表成为"门禁集合"的**唯一声明源**，消除"`package.json` 一行 `&&` 拼接看不出边界"的问题；但引入"注册表与仓内门禁漂移"的新风险，用 `check-starter` 硬断言抵消（§5 M1）。

## 3. 设计决策（ADR）

**D1 注册表自动生成 + 人工 stage**：`scripts/build-gates-registry.mjs` 从 `package.json.scripts.check` 反解 `node <script> <args>` 段，再扫描 `templates/check-*.mjs` 与 `project-template/scripts/*`，输出 `gates.registry.json`（排序稳定、字段固定）。人工只补 `stage[]` / `title` / `docs`。
弃选：纯手写（必然漏），纯运行时扫描（每次跑都要解析字符串，且无法声明 stage）。

**D2 `audit-loop` 顺序执行、逐条隔离**：每条门禁独立 `spawnSync`，捕获 `stdout+stderr`；非 0 记为 `fail`（不中断后续），退出码统一在末尾决定。理由：现有 `&&` 链"一条断链后面全不跑"，正是 PRD §1 的痛点。
弃选：并发（门禁有写副作用，如 `migrate-public`；并发会互相踩）。

**D3 标准 IO 契约 v1**：JSON 只走 stdout（`--json`）或落盘（`--out`），人类摘要走 stderr/stdout 非 JSON 模式；`status` 只允许 `pass|fail|skip`；`skip` 必带 `reason`；`fail` 必带 `evidence`（尾部 20 行）。
弃选：让各门禁自报 JSON（27 个脚本要全改，回归风险大）。

**D4 跳过语义外置**：`audit-loop` 只认门禁的**实际行为**（退出码 0 + 输出含 `^SKIP` 视为 `skip`，并从该行提取 `reason`）；不在 loop 里重写"何时该跳"的判断。
理由：CHG-001 已把阶段判断放进各门禁，重复实现会分叉。

**D5 STANDARDS 只做索引 + 裁决**：`docs/STANDARDS/00-INDEX.md` 手写（角色→入口→必读→可跳过），`20-GATES.md` 由注册表渲染（头部标注"生成物，勿手改"）。
弃选：合并 40+ docs（改动面过大、社区引用路径失效）。

**D6 Agent 接线是文件而非模型**：`prompts/AGENT-AUDIT-LOOP.md` 给固定动作序列（顺序执行、必须看 `evidence`、不许把 skip 当 pass），`AGENTS.md` 只加一段指针。

## 4. 接口与数据契约

### 4.1 `gates.registry.json`（随包下发）

```json
{
  "schemaVersion": 1,
  "generatedFrom": { "packageJson": "1.10.0-rc.69", "scannedAt": "builder-only" },
  "gates": [
    {
      "id": "data-dir",
      "title": "资料目录闸门",
      "script": "scripts/check-data-dir.mjs",
      "args": ["."],
      "stage": ["M5", "M6", "M7", "M8"],
      "skipWhen": "无 pickDirectory/showDirectoryPicker/webkitdirectory/setDataRoot/​/root 端点",
      "docs": ["docs/23-METRIC-GRADING-AND-ALERTS.md"]
    }
  ]
}
```
纪律：`id` 唯一且 kebab-case；`script` 必须是仓内存在的相对路径；`stage` 非空数组；排序按 `id` 字典序（保证 diff 稳定）。

### 4.2 CLI

```
node scripts/audit-loop.mjs [项目根] [--stage M5] [--only id1,id2] [--json] [--out <file>] [--quiet]
```
- 退出码：`0` 无 fail；`1` 有 fail；`2` 用法/注册表缺失/环境错误。
- `--json`：stdout **只输出 JSON**（单行或 pretty 均可，但必须可 `JSON.parse`）。
- `--out`：写文件，内容与 `--json` 相同；文件路径必须落在项目根内（防越界写）。
- `--quiet`：只输出 JSON 与最终一行结论。
- 未知门禁 id（`--only`）→ `exit 2`（不静默忽略）。
- `--stage` 过滤：`gates[].stage` 含该值才执行；`M0` 项目只跑 `stage` 含 `M0` 的门禁。

### 4.3 报告 JSON（v1）

```json
{
  "schemaVersion": 1,
  "meta": { "generatedAt": "...", "project": "<绝对路径>", "stage": "M0|M5|null", "node": "v24.x", "platform": "win32|darwin|linux", "registryVersion": 1 },
  "summary": { "pass": 0, "fail": 0, "skip": 0, "total": 0 },
  "checks": [
    { "id": "...", "title": "...", "stage": ["M5"], "status": "pass|fail|skip",
      "exit": 0, "reason": "skip 必填", "evidence": "fail 必填（尾部输出）", "hint": "可选" }
  ]
}
```
幂等判据：去掉 `meta` 后两次运行结果完全一致。

### 4.4 `docs/STANDARDS/00-INDEX.md`

必含三段：
1. **角色入口表**：`新手开发者 / 熟手 / Agent / 维护者` × `第一步 / 必读 / 可跳过 / 命令`。
2. **裁决顺序**：明确"部署目标以 `docs/37` 为准""门禁判据以注册表 + 对应门禁脚本为准""提示词以 `prompts/` 为准"等冲突规则。
3. **不做什么**：索引不复制正文，正文改动只改原文。

## 5. 里程碑（含独占文件清单）

| # | 目标 | 独占文件（本 CHG 可改） | 验收 | 检查命令 |
|---|---|---|---|---|
| M1 | 注册表 + 生成器 + 漂移断言 | `scripts/build-gates-registry.mjs`（新）、`gates.registry.json`（新）、`scripts/check-starter.mjs`（仅加断言）、`scripts/init.mjs`（仅加下发） | 生成器幂等（跑两次 byte 相同）；注册表覆盖包内 100% 门禁；未登记门禁 → `check-starter` 红 | `node scripts/build-gates-registry.mjs && git diff --exit-code gates.registry.json`、`npm run check` |
| M2 | `audit-loop` + 契约 | `scripts/audit-loop.mjs`（新）、`package.json`（仅加 `audit:loop`） | 全新项目 `audit:loop --json` 可 `JSON.parse`，`summary.skip ≥ 5` 且每条 skip 有 reason；`--only`/`--stage` 生效；幂等 | 手工 + `test/audit-loop.test.mjs` |
| M3 | 标准索引 | `docs/STANDARDS/00-INDEX.md`（新）、`docs/STANDARDS/20-GATES.md`（生成）、`scripts/render-gates-doc.mjs`（新） | 00-INDEX 所有链接可达；20-GATES 与注册表一致（重新渲染无 diff） | `node scripts/render-gates-doc.mjs && git diff --exit-code docs/STANDARDS/20-GATES.md`、`check-starter` 链接检查 |
| M4 | Agent 接线 | `prompts/AGENT-AUDIT-LOOP.md`（新）、`AGENTS.md`（加一段指针） | 提示词引用的每条路径都存在；`check-static-refs` 通过 | `npm run check` |
| M5 | 反例测试 ≥3 | `test/audit-loop.test.mjs`（新）、`test/fixtures/audit-loop/*`（新，纯文本夹具） | ①干净项目绿 ②注入缺陷红且 `evidence` 指向文件 ③skip 必带 reason ④未知 id → exit 2 | `npm test` |

**依赖顺序**：M1 → M2 → (M3, M4 并行) → M5。
**绝不做什么**：不改 23 条 check 链路语义；不改 `templates/check-*.mjs` 的判据；不在 loop 里重写阶段判断；不引入依赖；不写死任何盘符/家目录/tmp 路径。

## 6. DoR / DoD

**DoR**：PRD 已批准（已满足）；注册表字段冻结（§4.1）；契约 v1 冻结（§4.2/4.3）。
**DoD**：
- `npm run check` 仍 0（含新增断言）；
- `npm test` 全绿（含 M5 反例）；
- `npm run audit:loop` 在 M0 项目 `exit 0`、在注入缺陷项目 `exit 1`；
- 生成器与渲染器幂等（二次运行无 diff）；
- 文档：`docs/LESSONS.md` 追加一条（新入口的用法与坑）；`docs/VALIDATION.md` 追加实测记录；
- 未验证项写进交付说明（如未在 Linux/macOS 实跑）。

## 7. 评审与交付闸口

- **SPEC 批准**：需维护者显式批准并记录 `approved_by/approved_at`（本文件当前 `status: draft`）。
- 批准后默认交 `goal-driven-development` 执行；Ralph 仅在显式指定时使用。
- **commit / push 是独立闸口**；提交物必须脱敏（无本机家目录路径、无 token、无测试临时产物）。
- 装机到 DSH Desktop 与浏览器探针属"未验证"层，不得用本 CHG 的绿结论替代。

## 8. 追溯与证据计划

见 [TRACEABILITY.md](TRACEABILITY.md)：G1–G6 各对应里程碑与实测命令；实现期逐条回填"实测输出原文"。

## 9. 风险与回滚

| 风险 | 缓解 | 回滚 |
|---|---|---|
| 注册表与门禁漂移 | `check-starter` 断言"包内门禁 ⊆ 注册表"，且 `stage` 为空即红 | 删除注册表与断言，回到现状（功能不受影响） |
| `audit-loop` 与 `npm run check` 结论不一致 | M2 验收加"同一项目两边 fail 集合一致"（以 `--only` 逐条对齐抽样 5 条） | 移除 `audit:loop` 脚本键 |
| 阶段元数据写错导致"该跑不跑" | `stage` 缺省为 `[]` 时**一律执行**（保守，不因缺元数据漏跑） | 同上 |
| 新增文件被误加进 `files` 白名单改变分发面 | `package.json.files` 只在 M1 加 `gates.registry.json`；其余新脚本不进包 | 还原 `files` |

## 10. 未决（实现期阻塞项，需在开工前定）

1. `gates.registry.json` 是否随 `init` 下发到生成项目？（推荐：下发，注册表在项目内可自检；代价是版本快照）
2. `audit-loop` 的 `evidence` 截断长度（默认尾部 20 行）是否够 Agent 定位？
3. `docs/AUDIT-REPORT.json` 是否默认写盘（会进 git），还是只写 `os.tmpdir()` 由 `--out` 显式指定？
