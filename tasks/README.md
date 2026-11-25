# tasks/ 变更契约索引

本目录存放本仓的变更契约（CHANGE / SPEC / TRACEABILITY，按需附 PRD）。合并后保留，供后续 Agent 追溯"为什么这么改"。

| CHG | 标题 | 状态 | 契约 | 摘要 |
|---|---|---|---|---|
| CHG-001 | 脚手架 Windows 可移植性修复与首日检查链恢复 | `draft`（已实现，待评审） | [CHANGE](CHG-001-windows-portability/CHANGE.md) · [SPEC](CHG-001-windows-portability/SPEC.md) · [TRACE](CHG-001-windows-portability/TRACEABILITY.md) | 口径模块 + `.gitattributes` + 四道门禁阶段感知 + 装机/探针链平台化；`npm run check` 265 文件通过、`npm test` 82/82 |
| CHG-002 | 脚手架内建「审计—测试」闭环与标准 IO | `已实现，待评审` | [PRD](CHG-002-agent-audit-loop/PRD.md) · [SPEC](CHG-002-agent-audit-loop/SPEC.md) · [TRACE](CHG-002-agent-audit-loop/TRACEABILITY.md) | PRD/SPEC 均于 2026-11-25 批准；已落 `gates.registry.json`（21 条）+ `audit-loop` 契约 v1 + `docs/STANDARDS/` 索引 + Agent 接线 + 6 条反例；`npm test` 88/88，生成项目 `audit:loop` = 14 pass / 7 skip / 0 fail |

## 状态语义

- `draft`：文档完整可评审，**不等于批准**。
- `approved`：需维护者显式批准并记录 `approved_by` / `approved_at`。
- 材料性变更（范围/架构）走新版本或 amendment，不覆盖历史。

## Agent 使用方式

1. 动手前先读本表，确认要改的行为落在哪个 CHG。
2. 实现类改动必须有 SPEC；纯修复可有 CHANGE（含根因与证据）。
3. 交付时把实测证据写进 `TRACEABILITY.md`，"未验证项"必须留在交付说明里，不许省略。
