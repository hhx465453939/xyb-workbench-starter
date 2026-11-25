# 开发标准索引（从这里进，别从 40 份文档里翻）

> 定位：**索引 + 裁决**，不复制正文。正文仍住在 `docs/`、`spec/`、`prompts/`；
> 本目录只回答两件事：①我是什么角色、现在该读什么；②两份文档冲突时听谁的。
> 门禁清单（有哪些门禁、何时生效、何时跳过）见 [20-GATES.md](20-GATES.md)（生成物，勿手改）。

## 1. 角色 → 入口

| 我是谁 | 第一步（必做） | 必读 | 可以先跳过 | 命令 |
|---|---|---|---|---|
| **社区新手**（第一次做工作台） | 读 [README](../../README.md) 的"完全新手？从这里开始"，整段复制 [NEWBIE-KICKOFF](../../prompts/NEWBIE-KICKOFF.md) | [17 号闭环流程](../17-CLOSED-LOOP-PROJECT-FLOW.md)、[13 设计者优先](../13-DESIGNER-FIRST.md)、[14 HTML/数据合同](../14-HTML-AND-DATA-CONTRACT.md)、[37 部署目标](../37-DEPLOY-TARGET.md) | 36/35/32/24 等专题（做到对应模块再读） | `npm run audit:loop` |
| **熟手**（做过 1 台以上） | 直接从 [FULL-CYCLE-KICKOFF](../../prompts/FULL-CYCLE-KICKOFF.md) 或 [NIGHT-SHIFT-FULLSTACK](../../prompts/NIGHT-SHIFT-FULLSTACK.md) 起 | [22 阶段与闸口](../22-PHASES-AND-GATES.md)、[06 验证与发布](../06-VALIDATION-AND-RELEASE.md)、[检查点主表](../../prompts/WORKBENCH-DEV-CHECKLIST.md) | 设计者系列（已有稳定风格时） | `npm run audit:loop --only <id>` |
| **Agent**（DSH / Codex / Claude Code） | 读 [AGENT-AUDIT-LOOP](../../prompts/AGENT-AUDIT-LOOP.md) 的固定动作序列 | 同上 + [20-GATES.md](20-GATES.md)（决定跑哪些）、[spec/STARTER-SPEC.md](../../spec/STARTER-SPEC.md) | 业务领域专题（按需检索） | `node scripts/audit-loop.mjs . --json` |
| **维护者** | 读 [LESSONS](../LESSONS.md) 最近 5 条 + [VALIDATION](../VALIDATION.md) | [STARTER-SPEC](../../spec/STARTER-SPEC.md)、[06 验证与发布](../06-VALIDATION-AND-RELEASE.md) | 开发者提示词 | `npm run check && npm test` |

## 2. 裁决顺序（冲突时按此，不许临场另立）

1. **部署目标**：只认本机 **DSH Desktop**；与任何"装到 `~/.dsh` / DeepSeek Harness / dev server"的说法冲突时，以 [37 号](../37-DEPLOY-TARGET.md) 为准。
2. **门禁判据**：以 `gates.registry.json` + 对应门禁脚本的**实际断言**为准；文档里写的判据与脚本不一致时，先修脚本或先改文档，**不许**按文档宣称通过。
3. **证据口径**：`pass` / `skip` / `fail` 三态语义以 `scripts/audit-loop.mjs` 的契约为准（skip 必带 reason、fail 必带 evidence）。
4. **业务规则**：35 号试验匹配、36 号疾病概要、23 号指标分级等**专题文档**优先于通用模板；通用模板与专题冲突时以专题为准。
5. **提示词**：`prompts/` 里的启动提示词是执行口径；与 `docs/` 叙述冲突时，以提示词里的"必须/不许"为准并回修文档。
6. **平台口径**：Windows / macOS / Linux 必须给同一结论；路径与校验和一律走 `scripts/lib/portability.mjs`（见 [LESSONS L171](../LESSONS.md)）。

## 3. 这个目录不做什么

- 不复制正文（改正文只改原文，本目录只做指针与裁决）。
- 不替代 `docs/LESSONS.md`：踩坑经验记在 LESSONS，本目录只索引"哪些必须读"。
- 不替代门禁：这里写"该读什么"，不写"已经通过"。

## 4. 最小闭环（任何角色都适用）

```
读 → 改 → npm run audit:loop（看 pass/skip/fail 三态与 reason/evidence）→ 修 → 再跑 → npm run check && npm test
```

`skip` 不是"通过"：它表示"该能力还没做/未到阶段"，交付说明里必须写清是缺什么。
