# 工作台开发与交付报告模板

> 适用于里程碑交接、暂停停修以及最终交付验收。  
> 严格按下方 **八段标准结构** 输出；不适用写「不适用—原因」，未执行写「未验证—原因」，不可观测数据写「未取得」，缺失数据不得写 0 或谎报通过。预测数据独立标「估算」，严禁与实耗混淆，不重复累计已包含在主任务中的子任务。

---

## 1. 结论与资源消耗

| 维度 / 指标项 | 记录值 / 状态 | 说明 / 来源依据 |
| :--- | :--- | :--- |
| **认领 Issue / PR** | Issue #`{编号}` (`{claimed/自查补签}`) / PR #`{编号}` | GitHub 任务认领状态与链接 |
| **版本与交付终态** | v`{版本号}` (`{全绿交付 / D3停修 / 阶段阻塞}`) | 是否通过最终验收、能否安装及使用 |
| **起止时间与总耗时** | `{YYYY-MM-DD HH:MM}` → `{HH:MM}` (UTC+8)，共计 `{X小时Y分}` | 实际执行时间盒 |
| **主控模型** | `{模型型号，如 gpt-6.1-terra / gemini-3.8-flash}` | 实际调用型号（不可见写「未取得」；切换记录时间点） |
| **子角色 / 协作模型** | `{如 Analyst: xxx / Builder: xxx / Auditor: xxx}` | 各子 Agent 或分工模型（不可见写「未取得」） |
| **Token 消耗** | 累计约 `{N}` tokens<br>（输入 `{I}` / 输出 `{O}` / 缓存 `{C}`） | 会话工具报告实耗（说明统计范围；估算独立标「估算」） |
| **账号额度余量** | `{实际可见额度 / 百分比 / 未取得}` | 平台可见配额及记录时间点（不可见写「未取得」） |
| **关键工具链** | `{GitHub CLI / Node.js / SQLite / Playwright / MCP 等}` | 记录工具/版本/通道，严禁泄露凭据、真实病历、私有仓链接 |
| **代码与装机落盘** | Commit: `{commit_hash}`，Profile: `{web / 安装状态}` | 最新提交 hash 与 DSH Desktop 本机装机状态 |

---

## 2. 四条不可让步

- **配置目录**：`{通过 / 部分验证 / 未实现}`。`check-data-dir` 退出码 `{EXIT=0}`；目录选择调用、主目录/桌面/下载根目录/tmp 双端硬拒逻辑、`cordis.patch.yml` 与 `config.root` 持久化及重开回显实测结果；DSH 宿主实测或未验证说明。
- **临床试验**：`{通过 / 自动链通过但数据源不足 / 未实现}`。建档、检索、匹配、收藏四段完整性；候选池口径（已载 `{N}` 条 / 全表 `{M}` 条 / 快照日期 `{YYYY-MM-DD}`）；各通道实测终态（如 `{N PASS / M FAILED / K DENIED}`，成功查过 `{X}` 个）；「相关 0」或无快照严禁推断为无研究。
- **真实患者档案**：`{通过 / 未验证}`。`check-patient-create` 退出码 `{EXIT=0}`；新建我的档案 `POST /api/<slug>/subjects` 落库 SQLite 实测；八类记录写入持久化与刷新回显；多档案切换与会话/草稿隔离；demo 档案保护（`is_demo=1` 只读、不被覆盖）。
- **模块全量上线**：`{通过 / 未通过}`。全功能上线零功能桩；MinerU 六部件状态（1 密钥 0600 落盘+掩码回显 / 2 导入登记 / 3 本机抽取 + 云端调用 / 4 候选数据 `in_use=0` / 5 审查入库 + 冲突进 `conflicts` / 6 状态展示）；真实云 Token 实测或缺 Token 如实记 `401 UNAUTHORIZED`；隐私字段与三出口（复诊/AI/导出）代码级过滤。

---

## 3. 疾病概要与一图秀

- **本仓原型 URL**：`http://127.0.0.1:{端口}/prototypes/v0.2/index.html`
- **探针实测数字**：
  - 疾病概要：`probe-disease-primer.mjs` `{P/总数}` 通过，`--self-test` 注入缺陷检出（按预期退出码 `{1}`）；
  - 整页视图：`probe-page-view.mjs` `{A/总数}` 通过，`--self-test` 注入缺陷检出（按预期退出码 `{1}`）；
  - M2 路由与转场：`probe-<slug>-m2.mjs` `{R/总数}`（转场 `{T/总数}`），`--self-test` 检出注入缺陷。
- **小粉宝一图秀基准对照**：
  - `{通过 / 部分对齐 / 未通过}`：数值指标全期独立归一化平滑样条（Catmull-Rom / 单调三次插值）；
  - 离散自评点与单点样本只画节点不连线；
  - 治疗事件（手术/放化疗/用药色带）置于顶部独立泳道，开关治疗轨时不改变数值曲线 `path[d]` 坐标；
  - 超限指标选择回弹（最多 4 项）、Pin 固定与节点回源实测对照。

---

## 4. 原生 AI 面板

- **源码契约核验计数**：
  - `newSession` 计数：`{N ≥ 1}`
  - `subscribe` 计数：`{N ≥ 1}`
  - `ensureSession(...)` 计数：`{0}`（严禁出现）
  - `Boolean(conversation)` 计数：`{0}`（严禁出现）
- **契约检查器与安装状态**：
  - `node scripts/check-agent-pane-contract.mjs .` 结果：`{EXIT=0}`，`--self-test` 反例拦截 `{N/N}`；
  - 装机副本核验：`starter check-profile.mjs --profile <profile> --only <slug>` 结果：`{1/1 PASS}`；
  - 桌面端实机交互状态：`{DSH Desktop 未重启 / 已点验创建、展开、收起与草稿不丢失}`。

---

## 5. 门禁与测试

最新 `npm run check` 退出码 `{EXIT=0}`，七项强制门禁均通过，各自 `--self-test` 均能拦截并检出注入错误：

| 门禁项 | 执行命令 | 结果 / 退出码 | `--self-test` 验红结果 | 详细备注 / 覆盖范围 |
| :--- | :--- | :--- | :--- | :--- |
| **data-dir** | `node scripts/check-data-dir.mjs .` | `EXIT=0` | `EXIT=1` (成功检出注入缺陷) | 目录硬拒规则、持久化与服务端校验 |
| **trial-chain** | `node scripts/check-trial-chain.mjs .` | `EXIT=0` | `EXIT=1` (成功检出注入缺陷) | 检索/匹配/收藏隔离测试 |
| **patient-create** | `node scripts/check-patient-create.mjs .` | `EXIT=0` | `EXIT=1` (成功检出注入缺陷) | 新建档案及八类记录落 SQLite |
| **trial-snapshot** | `node scripts/check-trial-snapshot.mjs .` | `EXIT=0` | `EXIT=1` (成功检出注入缺陷) | `{N}` 份快照、`{M}` 条记录、通道终态对账 |
| **trial-matching** | `node scripts/check-trial-matching.mjs .` | `EXIT=0` | `EXIT=1` (成功检出注入缺陷) | 35 号匹配契约、可对照项<2不给百分数 |
| **placeholder-free** | `node scripts/check-placeholder-free.mjs .` | `EXIT=0` | `EXIT=1` (成功检出注入缺陷) | 零占位符与非降级功能桩文案扫描 |
| **derivative-leftovers** | `node scripts/check-derivative-leftovers.mjs .` | `EXIT=0` | `EXIT=1` (成功检出注入缺陷) | 跨病种底本残留 0 命中 |

- **单元测试**：`npm test` `{P/总数}` 通过，`EXIT=0`；
- **家族一致性**：`npm run audit` `{A/总数}` 通过，`EXIT=0`；
- **发布打包核验**：`npm pack --dry-run` `{N}` 个文件通过，无敏感与冗余文件。

---

## 6. D2／D3 独立审计与经验回流

- **D2 独立审查（Auditor）**：通过 `{A}`、失败 `{B}`、跳过 `{C}`、待人工 `{D}`；P0 共 `{N}` 项：
  1. `{P0 缺陷简述 1}`
  2. `{P0 缺陷简述 2}`
- **D3 验收自修**：完成 `{N}` 轮自修；同类问题修 2 轮仍红即停修（保存停修报告路径：`docs/D3-STOP-REPORT.md`）；
- **版本发布与 PR 状态**：M7 Tag/Release `{已发布 / 保持草稿}`；M8 BACKLOG PR `{已合并 / 保持草稿}`；
- **M9 脚手架经验回流**：
  - 本地回流提交：`{Commit hash 与回流规则描述}`；
  - starter 验证：`node scripts/check-starter.mjs` `{268/268}` PASS，`npm test` `{75/75}` PASS；
  - starter 远端推送：`{已推送到 origin/main / 保持本地提交待授权}`。

---

## 7. 未验证项与异常清单

- **未实测项**：真实患者访谈 `{0}`、临床专家复核 `{0}`、G1 专家签认 `{未完成}`；DSH Desktop 宿主未重启实机点验；MinerU 缺有效 Token 真实云端未测（模拟传输通过）。
- **外部异常与说明**：
  - 试验通道失败终态（如 FAILED/DENIED/401）不计为已查过，零候选不等于无相关研究；
  - 依赖与运行环境提示（如 Node 版本 EBADENGINE 提示、npm audit 告警等）；
  - 网络/权限抖动说明（如曾遇 502/连接重置但重试恢复）。

---

## 8. 需要拍板（晨审清单，最多 3 条）

1. **{决策项 1}**：{具体决策内容、影响范围与需要谁处理}。
2. **{决策项 2}**：{具体决策内容、影响范围与需要谁处理}。
3. **{决策项 3}**：{具体决策内容、影响范围与需要谁处理}。
