# AGENT · 审计—测试闭环（改代码前后照这个走）

> 这份提示词是**动作序列**，不是背景介绍。Agent 接手任何工作台项目时，先读它，再动手。
> 索引：不知道先读什么 → [STANDARDS/00-INDEX](../docs/STANDARDS/00-INDEX.md)；不知道有哪些门禁 → [20-GATES](../docs/STANDARDS/20-GATES.md)。

## 0. 开工前（30 秒）

```bash
cd <项目根>
git status --short                # 有没有别人的在途改动
node scripts/audit-loop.mjs .     # 看当前 pass / skip / fail 三态
```

三条硬规矩：

1. **`skip` 不是通过**。它表示"该能力还没做/未到阶段"。你要在交付说明里写"缺什么、为什么现在不跑"。
2. **`fail` 必须先看 `evidence`**（尾部 20 行）再判断根因，不许看到红就直接改代码。
3. **不许为了变绿改门禁/改注册表**。要改判据，走变更契约（`tasks/CHG-*/`）并在 PR 里说明。

## 1. 定位：先判根因，再动手

```bash
node scripts/audit-loop.mjs . --json --out report.json   # 机读；再按 id 逐个看
node scripts/audit-loop.mjs . --only <id>                 # 只跑一条
```

- `evidence` 指向哪个文件/行 → 去那个文件看。
- 判据来源在注册表的 `docs` 字段（`gates.registry.json`）→ 看它为什么这么判。
- 平台相关（Windows/macOS/Linux）问题先查 `scripts/lib/portability.mjs` 与 [LESSONS L171](../docs/LESSONS.md)。

## 2. 改：一处一改，成组验证

```bash
npm run audit:loop --only <受影响 id>     # 改完立刻验受影响门禁
npm run audit:loop                        # 再跑全量（含 skip 的 reason 是否变化）
npm run check && npm test                 # 项目定义的全量链（别用 head/tail 替代退出码）
```

- 不要把"改一个样式"变成"全站重跑"；也不要把"改完没验"当完成。
- 断言要能红：新加的判据必须配反例（注入缺陷必须判红），只跑正例等于没有闸门。

## 3. 交付：证据先于结论

- 报告 `pass/skip/fail` 实际数字（`audit-loop` 的 `summary`）。
- 列"未验证项"：没跑的命令不写结果，没打开的页面不写通过（装机、浏览器探针、外部服务分别声明）。
- 变更落到 `tasks/CHG-*/TRACEABILITY.md`：每条验收项 → 实测命令 → 输出原文关键行。

## 4. 命令速查

| 目的 | 命令 |
|---|---|
| 人类摘要 | `npm run audit:loop` |
| 机读 JSON | `node scripts/audit-loop.mjs . --json` |
| 落盘报告 | `node scripts/audit-loop.mjs . --json --out report.json`（只允许写进项目根） |
| 只跑某条 | `node scripts/audit-loop.mjs . --only data-dir` |
| 按阶段 | `node scripts/audit-loop.mjs . --stage M5` |
| 门禁清单 | 读 `gates.registry.json` 或 [20-GATES](../docs/STANDARDS/20-GATES.md) |
| 重建注册表/视图 | `npm run gates:build && npm run standards:render` |

## 5. 不许做的事

- ❌ 把 `skip` 写成"已通过"；❌ 把 FAIL 改成 SKIP 来变绿。
- ❌ 修改 `gates.registry.json` 或门禁脚本的判据而不走 CHG（会被 `check-starter` 的"注册表 == 策展表"断言拦住）。
- ❌ 用源码树冒充装机产物（`serve-artifact` 找不到装机副本会 `exit 2`，别绕过）。
- ❌ 在 Windows 上把路由/URL 语义的正斜杠改成 `path.sep`（见 L171 的"不要顺手改"）。
