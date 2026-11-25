---
doc: PRD
change_id: CHG-002
version: 1.0
status: approved
owner: community-maintainers
created: 2026-11-25
approved_by: project-owner
approved_at: 2026-11-25
---

# PRD · 脚手架内建「审计—测试」闭环与标准 IO

> 批准记录：2026-11-25 由项目主人批准进入 SPEC 阶段。批准范围 = §3 目标 G1–G6、§5 标准 IO 契约 v1、§6 里程碑 M1–M5；§10 未决项已按下方裁决冻结（见 §10）。实现仍需 SPEC 单独批准。

## 1. 背景与问题

现状（实测）：本仓有 **23 条默认门禁 + 27 个 `templates/check-*.mjs` + 40+ 份 `docs/` + 31 份 `prompts/`**，能力很强但呈现形态对"第一次接手的人/Agent"不友好：

| 问题 | 证据 | 后果 |
|---|---|---|
| 门禁多但没有统一入口 | `package.json` 的 `check` 是一行 23 段 `&&` 拼接 | 看不出"现在跑到哪一条、哪条是跳过、跳过为什么"；任何一条断链后面全不跑 |
| 结论不可机读 | 各门禁输出格式各异（`✓/✗`、JSON、SKIP 文案混排） | Agent 无法据此做判断闭环；只能靠人读日志 |
| 无阶段元数据 | 门禁是否该在 M0 生效，只能读源码里的跳过逻辑 | 新人/Agent 无法回答"我现在这阶段该跑哪些" |
| 标准散落 | `docs/01..41`、`prompts/*.md`、`spec/*.md` 各说一套 | 社区开发者要读十几份才知道"第一步做什么"；Agent 检索成本高 |
| 测试充分性靠人记 | `docs/VALIDATION.md` 手写 | 换机器/换人都要重新"想起来"跑什么 |

已经修掉的是"门禁本身错"（CHG-001）。本 PRD 要解决的是"门禁再对，也难被正确使用"。

## 2. 目标用户与场景

1. **社区新手开发者**：`init` 出项目后，想知道"现在该做什么、做对没做对"，希望一条命令给结论。
2. **熟手开发者**：只想跑受影响的那几条门禁，不想等全套。
3. **Agent（DSH / Codex / Claude Code）**：需要机器可读的"当前阶段 / 该跑什么 / 结果如何 / 下一步"，才能形成"改代码→审计→测试→再改"的自闭环。
4. **维护者**：需要一眼看出"这条门禁在哪个阶段生效、误报过几次"。

## 3. 目标（可度量）

| # | 目标 | 度量 |
|---|---|---|
| G1 | 一条命令拿到整仓审计结论 | `node scripts/audit-loop.mjs` 在 M0 生成项目上退出码 0，输出符合 §5 契约的 JSON + 人类摘要 |
| G2 | 结论机读且稳定 | JSON 有 `schemaVersion`；同一项目连跑两次 `checks[]` 的 `id/status` 完全一致（幂等） |
| G3 | 门禁带阶段元数据 | ≥ 90% 门禁在注册表里声明 `stage: ['M0'..'M9']`；未声明者单独列出 |
| G4 | 标准可被"最小阅读" | 新增 `docs/STANDARDS/00-INDEX.md`：任一角色 3 跳内找到"第一步/该跑什么/判据在哪"；与旧 docs 不重复搬内容（只做索引与裁决） |
| G5 | Agent 能自闭环 | `prompts/AGENT-AUDIT-LOOP.md` 给出固定动作序列，且其引用的脚本/文件路径全部存在（`check-static-refs` 同源校验） |
| G6 | 缺陷不回流 | 为闭环入口补 ≥ 3 条反例测试（注入缺陷必须被判红；无缺陷必须绿；跳过必须带原因） |

## 4. 非目标

- 不改任何业务判据的**语义**（35/36 号、CTCAE、一图秀等规则原样）。
- 不引入网络/第三方依赖；闭环必须离线可跑。
- 不做 GUI/Web 面板；输出是文本 + JSON 文件。
- 不替代 CHG-001 已建立的"逐门禁"用法（保留 `npm run check` 直跑能力）。

## 5. 标准 IO 契约（本 PRD 的核心产物）

### 5.1 命令

```
node scripts/audit-loop.mjs [--stage M0..M9] [--only id1,id2] [--json] [--out docs/AUDIT-REPORT.json] [项目根]
```

- 退出码：`0` = 无 fail（skip 不算 fail）；`1` = 有 fail；`2` = 用法/环境错误。
- `--json`：stdout 只输出 JSON（供 Agent）；无 `--json`：先人类摘要，再附 JSON 路径。
- 幂等：同一输入两次运行 `checks[].id/status` 一致；时间戳等易变字段只出现在顶层 `meta`。

### 5.2 JSON 结构（v1）

```json
{
  "schemaVersion": 1,
  "meta": { "generatedAt": "...", "project": "...", "stage": "M0", "node": "v24.22.1", "platform": "win32" },
  "summary": { "pass": 12, "fail": 0, "skip": 7, "total": 19 },
  "checks": [
    {
      "id": "data-dir",
      "title": "资料目录闸门",
      "stage": ["M5"],
      "status": "skip",
      "reason": "尚无资料目录能力（pickDirectory/showDirectoryPicker/setDataRoot 皆无）",
      "command": "node scripts/check-data-dir.mjs .",
      "evidence": "",
      "hint": "实现「选择资料目录」后本闸门自动生效（见 docs/STANDARDS/20-gates.md#data-dir）"
    }
  ]
}
```

字段纪律：`status` 只允许 `pass|fail|skip`；`skip` 必带 `reason`；`fail` 必带 `evidence`（命中文件:行 或 门禁原始输出尾部）。

### 5.3 门禁注册表

`gates.registry.json`（随包下发）：`{ id, title, script, stage[], requires[] , docs }`。
`audit-loop` 只按注册表执行；注册表缺失某门禁时输出 `warn`（不静默跳过）。

## 6. 范围与里程碑（草案，SPEC 阶段细化）

| # | 交付 | 说明 |
|---|---|---|
| M1 | `gates.registry.json` + 生成器 | 从现有 23 条与 `templates/` 扫描生成初版，人工补 `stage` |
| M2 | `scripts/audit-loop.mjs` | 顺序执行 + 契约化输出 + `--only/--stage` |
| M3 | `docs/STANDARDS/` 五件 | `00-INDEX` / `10-architecture` / `20-gates` / `30-testing` / `40-delivery`：**索引 + 裁决**，不复制原文 |
| M4 | Agent 接线 | `prompts/AGENT-AUDIT-LOOP.md` + 在 `AGENTS.md` 加一段"动手前后各跑什么" |
| M5 | 反例测试 ≥3 | 注入缺陷判红 / 干净判绿 / skip 带 reason |

## 7. 验收标准

1. 在全新 `init` 项目（M0）上：`audit-loop` 退出码 0，`summary.skip ≥ 5`，每条 skip 有 `reason`。
2. 在故意改坏的样本上（如 `businessWidth: 0.72`、`trial-match.js` 缺 `pct`）：对应 `checks[].status = fail` 且 `evidence` 指向文件。
3. `--only` 与 `--stage` 生效：`--only data-dir` 只执行该条。
4. `docs/STANDARDS/00-INDEX.md` 里所有链接可达（`check-starter` 同源链接检查）。
5. `prompts/AGENT-AUDIT-LOOP.md` 引用的每个路径都存在（同一 gate）。
6. 幂等：连跑两次 `--json`，去掉 `meta` 后完全一致。

## 8. 成功指标（上线后）

- 新项目"首个页面可用"的时间下降（以 `docs/development-reports/` 里后续报告自报为准，≥ 3 个样本）。
- 门禁误报（真绿被判红 / 真红被判绿）反馈条目下降。
- 社区开发者问"我该跑什么"类问题减少（以仓库 Issue 观察，定性）。

## 9. 风险与依赖

- **风险**：注册表与门禁漂移（新增门禁忘登记）。缓解：`check-starter` 断言 `templates/check-*.mjs` 全部在注册表中，未登记即红。
- **风险**：标准文档与旧 `docs/` 产生第二份真源。缓解：STANDARDS 只做"索引 + 裁决（冲突时谁优先）"，原文仍留在 docs。
- **依赖**：CHG-001 的 `portability.mjs`（路径/哈希口径）与四道门禁的跳过语义。

## 10. 决策已定（2026-11-25 主人拍板，本节冻结范围）

1. **默认入口**：**并存**。新增 `npm run audit:loop`；`npm run check` 的 23 条链路**不动**（零回归风险，向后兼容）。
2. **STANDARDS 与 docs 关系**：**只做索引 + 裁决**。`docs/` 原文不动；新增 `docs/STANDARDS/00-INDEX.md` 回答"我是什么角色→3 跳内该读什么"，并写明冲突裁决顺序（例：`docs/37-DEPLOY-TARGET` 与旧文冲突时以 37 为准）。
3. **注册表来源**：**自动生成 + 人工补 `stage`**。从 `package.json.scripts.check` 反解 + `templates/check-*.mjs` 扫描生成初版，`stage` 由维护者补齐；未登记的 `templates/check-*.mjs` 一律判红（防漂移）。
4. **新门禁必须声明 `stage`**：是。`check-starter` 强制：注册表里缺 `stage` 或仓内有未登记门禁即 fail。
5. **Windows 一等公民**：是。新增脚本的路径一律经 `scripts/lib/portability.mjs`；禁止依赖 bash/`python3`/`/tmp`；所有临时文件落 `os.tmpdir()`；新增门禁必须有 Windows 反例或条件跳过说明。

