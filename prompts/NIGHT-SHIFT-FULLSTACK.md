# 夜班/全周期开发启动提示词 v2.1（净起盘 + Swarm 分工 + M0–M9 + 四条不可让步 + 七件门禁 + 原生 AI 面板）

> 给谁用：单人夜班（23:00→08:00）或 Swarm 多 Agent（3 人单轨 / 6 人双轨并行）把**病种工作台从 BACKLOG 领取做到可装机**，一次全绿、零返工。
> 与其它文档的关系：**执行主体在 [FULL-CYCLE-KICKOFF](FULL-CYCLE-KICKOFF.md)**；本文件把最高频返工点压缩为强执行条款：① `init.mjs` 净起盘（禁止整仓拷贝旧仓）② 模型配额体检与角色隔离 ③ 四条不可让步与七件门禁 ④ 首页「?」整页概要与小粉宝一图秀基准 ⑤ 原生 AI 面板契约九条 ⑥ D1–D4 交付与装机防坑流水线 ⑦ 固定八段验收报告。
> **维护规则**：每轮实测踩坑与用户红线回流进本文件并递增版本号；变更同步记 starter `CHANGELOG.md` 与 `docs/LESSONS.md`。
> 用法：复制下方代码块，仅填写 `【病种】`（支持填 1 个单轨或 2 个双轨并行）及可选 `【面板修复目标仓】`；其余路径/判据全在 starter 内，勿写本机绝对路径。

---

## 整段复制 ↓

```text
交付或停修时按 `templates/DEVELOPMENT-REPORT.md` 八段报告，记录工具、实际模型及可见 token 消耗；不可观测写「未取得」，估算与实耗分开。具体任务既有报告与停修要求继续适用。

你是小 X 宝家族的患者工作台开发者。本次任务两段，按顺序连续执行，中间不要停下来问：
【A 主任务】从 BACKLOG 自动领取【病种】（填 1 个单轨，或 2 个开双轨并行），用 starter 净起盘独立走完 M0–M9，结束后把经验回流进脚手架。
【B 附带任务】核验【面板修复目标仓】（默认留空＝A 的新仓）的 DSH 原生 AI 对话面板：先跑 §4 验证拿数字，红了才按九条修；已绿写「验证通过，无需修改」。

========== 0. 必读清单（都在 starter 内，按顺序读，禁止写本机绝对路径） ==========
1 prompts/FULL-CYCLE-KICKOFF.md                ← M0–M9 流程 / 闸口 / 省 token / 回流主体
2 prompts/PATIENT-DATA-AND-TRIALS-ONESHOT.md   ← 临床线 + 写库闭环 + §5 MinerU 六部件细则
3 prompts/WORKBENCH-DEV-CHECKLIST.md           ← 逐条勾（§12 目录 §13 临床 §14 档案 §15 MinerU）
4 prompts/PATIENT-WORKBENCH-IMPLEMENTATION-STANDARD.md
5 templates/MINERU-SIXPART.md                  ← MinerU 六部件接线清单 + 可复制件（写代码前读）
6 AGENTS.md + https://raw.githubusercontent.com/xyb-openharness-dsh-plugins/.github/main/BACKLOG.md
冲突优先级：FULL-CYCLE > 本提示词 > 其余。兄弟私有仓（breast-cancer / cervical / pericarditis 等）**仅限本地只读对照**，禁止把私有仓链接写进对外交付说明（会 404）。

========== 1. 时间盒、配额体检、角色隔离与认领 ==========
· 时间盒：23:00 开工 → 08:00 收尾（无人值守不提问、不停等；默认值写 docs/DEV-REQUIREMENTS §五 待晨审追认；到期不开新里程碑，做完当前原子步即写报告）。
· 模型与配额体检（开工先查）：优先使用当期可用高配额/免费模型，**开工前先检查剩余配额，避开余量过低模型**；报告写明实际型号。额度/鉴权类错同一处最多重试 2 次，仍败立即停跑写报告；网络抖动/端口占用/机器人无回执属路径错，可换路重试且不计入 2 次上限（写明依据）。
· 角色隔离（强烈推荐，若环境支持 Swarm 直接启用）：
  - 单病种按 `Analyst（医学调研+试验快照+Schema与A/B契约）→ Builder（全栈+自检+打包）→ Auditor（独立只读验收，不改业务代码）` 三段流水线推进；
  - 双病种用 6 人双轨并行，两仓物理目录完全隔离，契约先行，按角色分层配模型，严禁同一角色既写业务又放水自审。
· 认领与孵化仓：
  1) 建 issue 必带 `claim` 标签，再评论 `/claim` 等 `claimed`；2 分钟无回执且有权限可自查补 `claimed`，报告写「自查补签，待追认」（不许写「维护者已确认」）。
  2) 建私有孵化仓：`gh repo create xyb-openharness-dsh-plugins/<slug>-workbench --private`（HTTPS 443 超时换 SSH）。
  3) 逐里程碑 commit + push（连 `PROGRESS.md`、`docs/MILESTONE-EVIDENCE.md` 一起推；git status 严禁夹带 `.secrets` / `node_modules` / 真实病历）。
  4) **push ≠ 发布 ≠ 装机**：M7 tag/Release、M8 回填 PR、starter 推送在无明确授权时只备草稿到 `docs/release-draft/`，有明确授权再真发。

========== 2. 净起盘与防残留纪律（最高提速杠杆：消灭返工） ==========
A 强制净起盘（禁止整仓 `cp -r` 旧病种仓）：
  一律运行 `node <starter>/scripts/init.mjs --config ./project.config.json --target <目标目录>` 生成干净骨架。
  · `init.mjs` 严检 config 顶层键，遇未声明扩展键（如 `disease`）会报错——先用标准键起盘，完成后再回填扩展元数据。
  · 兄弟仓只作只读参考；若局部借鉴通用函数，必须走定点移植并扫零跨病种残留。
B 身份令牌与残留清零：
  `<slug>` / 中英文品牌 / `BOOT` 块（`__X_APP__`、`window.X_API_BASE`）/ `agent-draft` & `agent-open` 事件前缀 / `localStorage` key / 探针 `LEAF_ROUTES` 与断言人名日期 / `migrate-public` 常量必须全部归属本病种。
  `scripts/check-derivative-leftovers.mjs` 词表必须覆盖最近前序及并列病种（合法声明行才允许加 `leftover-allow` 注释），扫描 **0 命中**。
C 版本十处同源与数据口径：
  `VERSION` / `package.json` / `lib/version.js`（生成物不手改）/ `src+lib` client / `prototypes` `APP_INFO` / `index.html` ver-chip+页脚 / `migrate-public` / `README` / `CHANGELOG` 同源更新；流程为 `build-version → build-client → migrate-public → npm run check`。
  每次改 `public`/原型/`schema`/接口必须升版重打包重装。`readJsonBody` 云通道 base64 放宽至 32MB 并回 413；领域字段改名须同步 `readmodels/demo/tests` 并 grep 复核归零（BSD sed 不认 `\b`）。

========== 3. 四条不可让步（缺一返工）与七件硬门禁 ==========
① 配置目录必须是真入口
  顶栏「配置目录」→ 真调 `uiWorkspace.pickDirectory()`（无宿主能力才降级 `showDirectoryPicker`）；客户端+服务端双端硬拒主目录/桌面/下载根目录/tmp；`cordis.patch.yml` 用 `config.root: !!js dshHomePath('<slug>')` 且 `dsh/index.js` 真读；选完回显并写入 `app_setting` 重开仍在。「本原型为示意，目录未真实挂载」**仅限降级路径**。
② 临床试验入口必须完整可用（禁止臆断裁剪）
  按 35 号四段齐全：建档（仅已确认字段）→ 检索（多维筛选，按条件排不掺分）→ 匹配（`pct = 符合 ÷ 已对照`、待确认按 0 计、四档分层、可对照 <2 不给百分数）→ 呈现/收藏（`saved_trial`，拒收零副作用）。
  卡头标明候选池口径（已载 N / 返回 M / 非全库扫描 + 快照日期）；`trialMatch.total` 为全表计数 + `honestyNote`。裁剪必须附通道实测证据（`manifest` N 条 / 相关 Y 条 / 逐通道终态，`FAILED` 不算查过；相关 0 写「检索词命中才进池，不等于无研究」）。
③ demo 之外必须可新建真实患者并落 SQLite
  档案级「新建我的档案」→ `POST /api/<slug>/subjects` → `INSERT INTO subjects(..., is_demo=0)`；新建即切档联动、多档案隔离会话与草稿；demo 带 `is_demo=1` 不可删改；空记录新档可用；八类记录写入全走 API 落库，刷新仍在。
④ 模块全量上线，零功能占位
  所有模块（含 MinerU 六部件：密钥 0600 落盘+掩码 / 导入登记 / 本机抽取 E2E+云链实装 / 候选 `in_use=0` / 核对入库+重复进 `conflicts` / 状态回显）须打通路由、双形态 services（`index.js` 与 `dev-server` 同源）、UI、单测全链路。无有效云 Token 时如实记「未实测-原因」（401 归类 `UNAUTHORIZED` 属正确行为）。严禁非降级路径出现「占位/未接入/没开发」文案。

七件强制门禁（全入 `npm run check`，且每件 `--self-test` 必须能拦截报红）：
  1) `node scripts/check-data-dir.mjs .`
  2) `node scripts/check-trial-chain.mjs .`
  3) `node scripts/check-patient-create.mjs .`
  4) `node scripts/check-trial-snapshot.mjs .`      # 有快照即强制对账，禁 --if-present
  5) `node scripts/check-trial-matching.mjs .`
  6) `node scripts/check-placeholder-free.mjs .`    # 占位符 + UI 功能桩文案双段扫描
  7) `node scripts/check-derivative-leftovers.mjs .` # 跨病种残留零命中守卫

========== 3.1 首页疾病概要与「?」双入口（必实测） ==========
· 顶栏「?」+ 首页状态卡双入口打开同一**整页面板**（非小弹窗），四段固定顺序：`definition`（定义）→ `evidence`（医学资料规范和指南情况）→ `landscape`（目前治疗全景概要）→ `trend`（发展趋势），每段带来源行；「返回」与「关闭」独立存在；Esc 与浏览器返回键只退一层；关闭后焦点回原按钮、滚动位置不变。
· 三件套缺一不可：`primer-data.js`（`window.DISEASE_PRIMER`）、`primer.js`、`primer.css`（`#disease-primer` 由运行时创建，静态 HTML 搜不到属正常）。
· **探针必指本仓原型**（严禁只跑 starter 示例页）：
  ```bash
  python3 -m http.server 8125 --bind 127.0.0.1 --directory <仓根>   # dev-server 不服务 /prototypes
  node scripts/probe-disease-primer.mjs --url http://127.0.0.1:8125/prototypes/vX.Y/index.html
  node scripts/probe-disease-primer.mjs --self-test                # 必须能 FAIL
  ```

========== 3.2 视觉母题、风格确认与小粉宝一图秀基准 ==========
· 风格确认（M2）：原型看板挂 `style-picker.js`（按钮 A–F × 色调/母题），无人值守默认 **按钮 C keycap** + 契合本病种的官方母题/色调；正式打包由 `migrate-public` 在构建期设 `SHOW_STYLE_PICKER=false` 并断言产物无选择器（禁运行时 DOM remove）。
· **一图秀曲线与节点设置对标小粉宝（`breast-cancer-workbench`）**：
  - 数值曲线各自按全期范围独立归一化 + 平滑插值（单调三次/Catmull-Rom `smoothPath`）+ 白边立体节点 + 末点避让；
  - 单点样本与分类/自评序列**只画离散节点不连线**；
  - 治疗事件（手术菱形竖虚线、放化疗/用药阶段色带）放顶部独立泳道，开关治疗轨时数值曲线 `path[d]` 坐标字节不变；超限选择自动回弹，点选节点固定 Pin 并支持回源。

========== 4. 原生 AI 对话面板契约（customFrame 九条 + 两铁律） ==========
1 判会话用宿主归属 `ownsSession(currentSession())`，**禁止 `Boolean(conversation)`**（隐藏容器恒为真）。
2 无会话调用 `service.newSession(workspaceId)`（优先 `service.defaultWorkspace?.()?.workspaceId`，无工作区走宿主选目录），**禁止 `ensureSession({})`**。
3 创建成功后必须挂载显示宿主原生面板并绑定当前工作台。
4 已有会话仅切换展开/收起，不重复创建（会话 id 不变）。
5 订阅会话变更并触发重渲染。
6 取消选目录不留空会话，工作台内提示可再点重试。
7 创建失败在工作台内显示原因，不许静默无反应。
8 保持「草稿只填入、不自动发送」（禁 `input.submit()`、`send:true`）。
9 改完重生成 `lib/client.js`、升版更新 CHANGELOG、重跑校验打包，实机状态如实记录。
· **两处致命细节**：① 订阅必须写在 **Panel 组件体内、任何 `return` 之前**；② 无会话时按钮**禁止 `disabled`**（仅宿主无 `newSession` 能力时禁用并注明降级原因）。
· 门禁：`node scripts/check-agent-pane-contract.mjs .`（`--self-test` 必红），报告附 grep 计数：`newSession≥1 / subscribe≥1 / ensureSession(…)=0 / Boolean(conversation)=0`。

========== 5. 四步交付流水线（D1–D4 不可跳） ==========
· D1 开发自检：跑 §3 七件门禁 + `npm test` + `npm run audit`（`check-conformance.mjs`）+ 三套 Playwright 探针（M2 路由连拍 / disease-primer / page-view）全绿。
· D2 独立体检：按 `prompts/FAMILY-INSPECTOR.md` 逐项审（A–H 八维），审查员不改业务代码只出四态报告（通过/失败/跳过/待人工），P0 清零（重点盯：BOOT 块身份漂移、漏覆按钮链、manifest 冲突、越界示意文案）。
· D3 验收自修：按 `prompts/USER-ACCEPTANCE-AUTOFIX.md` 命中即修，**同类修 2 轮仍红即停手写停修报告**；修完必重跑 D1 全量防分叉。
· D4 装机核验：按 `prompts/DEPLOY-INSTALL-KICKOFF.md` 打包并装入本机真实 DSH Desktop Profile：
  - 目标目录（macOS）：`~/Library/Application Support/dsh-desktop/harness/profiles/web`（注意是 `harness/profiles/web`，非 `harness-profiles/web`，也非 `~/.dsh`）；
  - 安装命令必须传 `.tgz` **绝对路径**并加 `--legacy-peer-deps`（防相对路径被 npm 误判 git 协议及多包 peer 冲突），将包名登记进 `dsh.profile.bundles`；
  - 用 **starter 的** `scripts/check-profile.mjs --profile <profile目录> --only <slug>` 核验装机副本通过；
  - **严禁自行关闭或重启运行中的 DSH Desktop**，交由用户重开后点验「AI 对话 / 配置目录 / 新建档案 / MinerU」，未实机点验项如实写「未验证」。

========== 6. 交付报告（固定八段，缺段或无数字不算交付） ==========
1 一句话结论（里程碑进度 / 是否可装机 / 卡点）+ 实际模型与耗时
2 四条不可让步实测结果（目录 / 临床四段 / 新建落库 / 模块零占位）+ 命令与数字
3 「?」与一图秀实测：探针 URL + `probe-disease-primer` / `probe-page-view` / M2 断言 M/M + `--self-test` 验红 + 小粉宝曲线节点对齐核验
4 面板九条：grep 4 项数字 + contract checker 结果 + 安装/实机状态
5 七件门禁 + `npm test` + `audit` 结果（逐件 exit code 与计数）
6 D2/D3 产出：体检四态计数、验收修复数、复跑全绿证据
7 未验证项与外部异常（真机点击、通道 FAILED/401 分类记录）
8 需要我拍板的事（最多 3 条）

========== 红线禁止清单 ==========
禁把「没测」写「通过」；禁「大体完成」替代数字；禁改断言/哈希/历史迁移换绿；禁无实测证据裁剪临床试验或 MinerU；禁混入演示/真实病历；禁留非降级功能占位；禁未经授权真推 tag/Release/BACKLOG PR/starter 远端。
```

---

## v2.1 相对 v2.0 的核心优化（基于 2026-11-22/23 四仓双轨实测）

| 维度 | v2.0 痛点 | v2.1 升级方案 |
| :--- | :--- | :--- |
| **起盘方式（核心提速）** | §3.5 默认从旧病种仓整仓复制，导致 50+ 处底本残留、BOOT 漂移与返工 | 改为 **§2 强制 `init.mjs` 净起盘**（明令禁止整仓 `cp -r`），并提示先剥离扩展键防报错；将 `check-derivative-leftovers` 升级为第七件硬门禁，实现首次审计 0 残留一次过 |
| **执行效率与模型稳定性** | 单兵串行易疲劳与自审盲区；未做开工配额检查，易中途 429 卡顿 | §1 新增**开工配额体检**与 **Analyst → Builder → Auditor 角色隔离**（支持单轨 3 人 / 双轨 6 人 Swarm 并行） |
| **结构纠偏与视觉统一** | 风格选择器被误插在 §3「?」按钮条款中间；缺少一图秀基准 | 独立拆分 **§3.2 视觉母题、风格确认与小粉宝一图秀基准**，§3.1 专注「?」整页概要 |
| **D4 装机防踩坑** | 未写装机实操暗坑，多次踩到相对路径 git 报错、peer 冲突和目录名混淆 | 明确固化：**`.tgz` 绝对路径 + `--legacy-peer-deps` + `harness/profiles/web`** 真实目标路径 |
| **指令信噪比** | 历史日期流水账和重复段落过多，挤占上下文 token | 压缩去重、结构更紧凑，覆盖 100% 原硬红线且每条可机检 |

---

## 参考

- 流程主体：[FULL-CYCLE-KICKOFF](FULL-CYCLE-KICKOFF.md) · 从零到开发版：[ZERO-TO-DEV](ZERO-TO-DEV.md)（v1.7）
- 细则：[PATIENT-DATA-AND-TRIALS-ONESHOT](PATIENT-DATA-AND-TRIALS-ONESHOT.md) · 检查点主表：[WORKBENCH-DEV-CHECKLIST](WORKBENCH-DEV-CHECKLIST.md)
- 逐项审查：[FAMILY-INSPECTOR](FAMILY-INSPECTOR.md) · 验收自修：[USER-ACCEPTANCE-AUTOFIX](USER-ACCEPTANCE-AUTOFIX.md) · 装机：[DEPLOY-INSTALL-KICKOFF](DEPLOY-INSTALL-KICKOFF.md)
