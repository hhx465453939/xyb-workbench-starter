# 夜班组合版启动提示词 v2.0（M0–M9 + 四条不可让步 + 六件门禁 + MinerU 六部件 + 原生 AI 面板）

> 给谁用：一个人一个晚上（23:00→08:00）把**一个病种工作台从领取做到可装机**，同时把最难漏的两处（疾病概要、原生 AI 面板）一次做对。
> 与其它文档的关系：**执行主体不在这里**——M0–M9 的流程、运行模式、闸口签认、省 token、自动领取、经验回流全部按 [FULL-CYCLE-KICKOFF](FULL-CYCLE-KICKOFF.md) 执行；本文件叠加它没写死的事：①四条不可让步与六件门禁 ②首页「?」双入口实测 ③移植与升版纪律 §3.5 ④孵化仓与推送 §1.5 ⑤MinerU 六部件要点（细则在 ONESHOT §5 / CHECKLIST §15 / templates/MINERU-SIXPART.md）⑥原生 AI 面板契约九条，最后一条四步交付流水线。
> **基准提示词维护规则（本文件是夜班任务的唯一基准）**：每轮夜班的踩坑与用户红线回流进本文件并递增版本号；变更记 starter CHANGELOG；与 FULL-CYCLE / README「孵化仓」节口径冲突时，先改 README 对齐再发版。README 的 how-to-start 指向本文件。
> 用法：整段复制，只改 `【病种】`（与可选的 `【面板修复目标仓】`）；其余路径/判据都在 starter 里，不要写本机绝对路径。

---

## 整段复制 ↓

```text
你是小 X 宝家族的患者工作台开发者。本次任务两段，按顺序做完，中间不要停下来问：
【A 主任务】从 BACKLOG 自动领取【病种】，独立走完 M0–M9，结束时把经验回流进脚手架。
【B 附带任务】修【面板修复目标仓】（默认留空＝A 的新仓）的 DSH 原生 AI 对话面板：先跑 §四 的验证拿数字，红了才按九条修。

========== 0. 先读这几份，按顺序（都在 starter 里，别用本机绝对路径） ==========
1 prompts/FULL-CYCLE-KICKOFF.md          ← 执行主体：运行模式/闸口签认/省 token/M0–M9/硬纪律/回流
2 prompts/PATIENT-DATA-AND-TRIALS-ONESHOT.md ← 临床线 + 写入闭环 + §5 MinerU 六部件（细则与报数模板）
3 prompts/WORKBENCH-DEV-CHECKLIST.md     ← 逐条勾（§12 目录 §13 临床 §14 患者档案 §15 MinerU MU1–MU7）
4 prompts/PATIENT-WORKBENCH-IMPLEMENTATION-STANDARD.md
5 AGENTS.md + https://raw.githubusercontent.com/xyb-openharness-dsh-plugins/.github/main/BACKLOG.md
6 templates/MINERU-SIXPART.md            ← MinerU 六部件接线清单 + 可复制件（写代码前读）
冲突时顺序：FULL-CYCLE > 本文件 > 其余。私有仓（breast-cancer / cervical / pericarditis 等）**只能本地对照**，
不许把它们的链接写进交付说明或发给别人（会 404）。

========== 1. 时间盒与模型 ==========
23:00 开工 → 08:00 收尾。只用免费模型（以当期实际可用为准；报告里写实际型号）。
夜里无人值守：不提问、不停等；默认值写进 docs/DEV-REQUIREMENTS §五 并汇总进晨审报告待追认。
时间盒到期停止"开新里程碑"，做完当前原子步骤就收尾写报告。
额度 / 鉴权 / 套餐类错误：同一处最多重试 2 次，仍失败立即停跑写报告，不整夜空转；
网络抖动、端口占用、机器人无回执这类"路径错"可以换路径再试，不计入 2 次上限，依据写进报告。
认领流程（2026-11-20 实测）：机器人只受理**带 `claim` 标签**的 issue——建 issue 后先自查补 claim 标签，
再评论 /claim 等 `claimed`；2 分钟无回执且有权限就自查补 claimed，报告写"自查补签，待追认"，不许写"维护者已确认"。

========== 1.5 认领后：孵化仓与推送（对应 starter README「新领取任务：孵化仓与推送」） ==========
A 建孵化仓：gh repo create xyb-openharness-dsh-plugins/<英文>-workbench --private（私有，孵化期不公开）；
  clone 时 HTTPS 443 超时就换 SSH 通道——路径类网络问题换路重试，不计入 2 次上限，依据写进报告。
B 推送节奏：逐里程碑 commit + push（断点续跑三件套一起推：git log / PROGRESS.md / docs/MILESTONE-EVIDENCE.md）；
  空仓首推 git push -u origin main。只推你自己的孵化仓；starter 的回流 commit 只落本地，未经授权不推 starter。
C push ≠ 发布：push 到孵化仓 / 打 tag / GitHub Release / 市场投稿是四件独立的事；
  M7/M8 只备草稿到 docs/release-draft/，没有明确授权不执行。
D 推送前自检：git status 不夹带 .secrets / node_modules / 真实病历；release/*.tgz 按仓内约定决定是否入库；
  CHANGELOG 与版本四处同源随包一起推（见 §3.5-C 清单）。
E push 不是验证：推送成功 ≠ 装机 ≠ 实机可用；V2/V3 仍单独取证，未做的写"未验证"。

========== 2. 四条不可让步（缺一条就返工） ==========
① 配置目录必须是真入口
  顶栏「配置目录」→ 真调 uiWorkspace.pickDirectory()（拿不到才降级 showDirectoryPicker）；
  口径硬拒：主目录本身 / 桌面 / 下载根目录 / tmp（客户端与服务端各判一遍）；
  落点接上：cordis.patch.yml 的 config.root: !!js dshHomePath('<slug>')，dsh/index.js 真读 config.root；
  选完回显当前目录、重开 Desktop 仍在（存 app_setting）。
  「本原型为示意，目录未真实挂载」**只允许出现在宿主没有选择能力的降级路径**，不许拿它当唯一实现。
② 临床试验入口必须功能完整（不是"裁剪说明页"）
  按 35 号四段齐全：建档（只有已确认字段参与）→ 检索（关键词/病理/状态/阶段/地区，按条件排、不掺分）→
  匹配（pct = 符合 ÷ 已对照、待确认按 0 计、四档分层、可对照 <2 不给百分数）→ 呈现/收藏（saved_trial，拒收零副作用）。
  卡头必须写候选池口径：已载 N / 返回 M / 不是全库扫描 + 快照日期；trialMatch 的 total=全表计数（返回条数单列）+ honestyNote。
  裁剪不是不许做，但必须带实测证据（manifest N 条 / 相关 Y 条 / 逐通道终态，FAILED 不算"查过"）；
  「相关 0」要写「检索词命中才进池、不等于没有研究」。
  禁止用"候选池会长期是个位数""罕见病召回不可靠"这类推断当理由——先跑一次通道拿数字。
③ demo 之外必须能新建患者并写进 sqlite
  顶栏/侧栏有**档案级**「新建我的档案」→ POST /api/<slug>/subjects → INSERT INTO subjects(..., is_demo=0)；
  新建立刻切换过去、整页联动；多档案可列可切，会话与草稿按档案隔离；
  demo 有 is_demo 标记、不可删、不被覆盖；新档案从空记录开始也能用；
  记录写入（八个 kind）也必须走 API + 落库，刷新后还在，不许只 push 内存数组。
④ 模块完整性（2026-11-21 用户红线：MinerU「表单为占位」返工的教训）
  所有模块必须完整上线，**功能占位 = 未交付**：六部件纯函数只做一半不算实现——路由、services（index.js 与
  dev-server 双形态同源）、UI、测试缺任何一层都要返工。MinerU 六部件逐条口径与可复制件看
  templates/MINERU-SIXPART.md（1 密钥 0600 落盘+掩码回显 / 2 导入登记 / 3 本机抽取必 E2E+云链真实实现 /
  4 候选 in_use=0 / 5 核对入库+重复进 conflicts / 6 状态回显）；云链成功路径没有有效 Token 时如实写
  「未实测-原因」（401 分类 UNAUTHORIZED 是正确行为，不是失败）。
  不许出现「表单为占位」「本仓未接入 X」类文案；降级说明（如 file:// 无后端）合法但只许在降级路径。

六件门禁（随 init 下发，已入 npm run check；每件 --self-test 都必须能红）：
  node scripts/check-data-dir.mjs .
  node scripts/check-trial-chain.mjs .
  node scripts/check-patient-create.mjs .
  node scripts/check-trial-snapshot.mjs .     # 有快照就必须对账，不许 --if-present
  node scripts/check-trial-matching.mjs .
  node scripts/check-placeholder-free.mjs .   # 模板占位符 + UI 功能桩文案两段扫描（防漏闸）

========== 3. 首页病情介绍与「?」按钮（历史上最容易整条漏掉，必须实测） ==========
A 顶栏「?」可见可点，点开是**整页面板**（不是小弹窗），四段顺序：定义 → 医学资料规范和指南情况 → 目前治疗全景概要 → 发展趋势；
  每段带来源行；「返回」与「关闭」是两个独立入口；Esc 与浏览器返回键只退一层；关闭后焦点回触发按钮、滚动位置不变。
B 实现三件套缺一不可：primer-data.js（window.DISEASE_PRIMER，四段 id 必须是 definition / evidence / landscape / trend）、
  primer.js、primer.css；面板 DOM 由 primer.js 运行时创建为 #disease-primer，不要自己另写浮层。
  → 所以"index.html 里搜不到 #disease-primer"是正常的；搜不到上面三件才是缺失。
**风格互动确认（M2 必做，30 秒）**：看板 hero 挂页内「风格预览选择器」（assets/patterns/style-picker.js + buttons-pill-system.css；治愈暖纸见 08 号已验证节），向用户实时切换两组：**按钮效果** A paper / B outline / C keycap / D jelly / E brush / F sticker；**色调** 暖纸 / 淡绿 / 淡粉 / 淡紫（后续可扩充）。**互动让用户各选一个并升为默认**，记录到 docs/UI-DESIGN；用户未选或夜间无人值守默认：按钮 **C keycap**、色调 **暖纸**。正式版按所选固化（选择器控件由打包流程移除）。标准参考实现：squamous-cell-skin-cancer-workbench（原型 style.css 即标准模版；新增变体/色调欢迎提 PR）。
C 双入口：顶栏「?」+ 首页状态卡各一个，都要能打开同一个整页。
D 验收必须用探针指向**本仓原型**（这条踩过：探针默认跑 starter 的 examples 参考页，等于没查）：
  探针自带静态服务（默认端口 8124，serve 的是仓库根），--url 要写探针自己的端口，或自起静态服务：
  python3 -m http.server 8125 --bind 127.0.0.1 --directory <仓根>   # dev-server 不服务 /prototypes 路径！
  node scripts/probe-disease-primer.mjs --url http://127.0.0.1:8125/prototypes/vX.Y/index.html
  再加一条 --self-test 必须能 FAIL（只报绿不算闸门）。报告里写实际使用的 URL。
E 若原型里「?」存在但 DP 模块没实现（无 #disease-primer、无 primer-data.js）：先看 app.js 里 DP 的引用，
  再照 examples/disease-primer.html 与 assets/patterns/disease-primer.{js,css} 补齐，primer-data.js 按本病种重写。

========== 3.5 移植与升版纪律（以最近跑通的仓为底本时，这节就是防 P0 的） ==========
底本选最近一次全链跑通的仓；客户端链路底本仍默认 cervical。移植后必做：
A 身份令牌 sweep（grep 归零才算完）：<slug> 主名 / 品牌（中英文）/ BOOT 块里的 __X_APP__ 与
  window.X_API_BASE（两层漂移重灾区：上上仓的 PERI/上仓的 GPP 都在这层）/ agent-draft 与 agent-open
  事件前缀 / localStorage key / 探针 LEAF_ROUTES 与断言里的医生人名·指标数·样例日期 / migrate-public 的
  TITLE_OLD/NEW 与 CHIP/FOOT/APPINFO 常量（失配 = noindex 永不注入）。
  词表化：scripts/check-derivative-leftovers.mjs 加本病种前词，强词表抓出的合法保留行加 leftover-allow 注释。
B 数据字段与路由键分开：领域字段改名（如 flare→bleed）必须连 readmodels/demo/tests 一起改；
  路由键（data-page / SUBTITLES 键）可保留原名。BSD sed 不认 \b——改完必须 grep 复核 profile().X / p.X 归零。
C 版本十处同源 bump 清单（一处漏 = 假版本）：VERSION / package.json / lib/version.js（build-version 生成）/
  src+lib client 注入 / prototypes app.js APP_INFO / index.html ver-chip+页脚 / migrate-public 三常量 /
  README 版本行 / CHANGELOG。改完 build-version → build-client → migrate-public → npm run check。
D 每次改包（public/原型/schema/接口）必升版重打包重装；D3 收口后同样。
E 行为类暗坑：readJsonBody 默认 64KB（云通道 base64 要放宽到 32MB 并回 413）；探针 LEAF_ROUTES 是
  硬编码清单（加子页必须同步）；检查器在 starter 里也有同款——改项目版要把修复回流 starter。

========== 4. 原生 AI 对话面板契约（customFrame 必做，九条 + 两条落地细节） ==========
（任务 B 先验证后修：grep 数字 + contract checker 全绿 = 已合规，如实记录"验证通过，无需修改"，不许编造修复）
1 判会话**不要**用 Boolean(conversation)：customFrame 下宿主即使没有会话也会传一个隐藏容器，恒为真 → 点了没反应。
  改用宿主归属判定：ownsSession(currentSession())。
2 没有会话时创建：service.newSession(workspaceId)；workspaceId 优先取 service.defaultWorkspace?.()?.workspaceId；
  没有可用工作区时让宿主按其流程提示选择目录。**不要调用 ensureSession({})**（取消选目录会留空会话）。
3 会话创建成功后，显示宿主提供的原生 conversation 面板，并把这个会话绑定到当前工作台——只创建不挂载，用户看到的还是空白。
4 已有会话时：只打开/收起原生面板，不要重复创建（会话 id 不变）。
5 订阅会话变化并触发重渲染，否则新建/切换后界面不刷新。
6 用户取消目录选择：不留下空会话，在工作台内提示可以再点一次「AI 对话」重试。
7 创建失败：在工作台内显示失败原因，不能点了没反应。
8 保留"草稿只填入、不自动发送"（禁止 input.submit()、禁止 send:true）。
9 改完重新生成 lib/client.js、升版本、更新 CHANGELOG，重跑静态校验与打包；安装与实机状态如实记录。
两条最容易做错的细节（2026-11-11 实测教训）：
  · 订阅必须写在 **Panel 组件体内、任何 return 之前**。塞进别的组件、或插在 return 之后 = 死代码，
    同时会把那个组件原有的 pushState/焦点回收/滚动恢复一起废掉（注释里写着"已加订阅"也算没加）。
  · 按钮在"无会话"时**不许 disabled**，否则 onClick 里的创建分支永远走不到；只有宿主没有 newSession 能力时才禁用并写明降级原因。
闸门：node scripts/check-agent-pane-contract.mjs .（--self-test 必须能红）；报告里给 grep 数字：
  newSession≥1 / subscribe≥1 / ensureSession(…)=0 / Boolean(conversation)=0。

========== 5. 交付流水线（四步不可跳，跳哪步都会返工） ==========
D1 开发完成 → 跑 §2 六件门禁，全 exit 0；
D2 独立体检 → 按 prompts/FAMILY-INSPECTOR.md 逐项审（A 视觉/B 菜单/C 设置三 tab/D 一图秀/E 录入窗口/F 数据层/G 红线/H 回归），
   审查人不改代码只出报告，四态齐全（通过/失败/跳过/待人工），P0 清零；
   P0 高发区提示（2026-11-21 实测）：移植身份漂移（BOOT 块/事件前缀）、探针没覆盖的按钮点击链、
   设置 tab 的陈旧数据与本仓 manifest 打架、「示意」文案越界到非降级路径。
D3 验收自修 → 按 prompts/USER-ACCEPTANCE-AUTOFIX.md 的 DP/A–F 六类检查，命中即修 + **全量复跑**；
   同类修 2 轮仍红 → 停手写停修报告；
D4 装机 → 按 prompts/DEPLOY-INSTALL-KICKOFF.md：pack → profile 装 → **由用户自己退出重开 Desktop** →
   点「AI 对话」「配置目录」「新建我的档案」三条（+ 有 MinerU 就点一次导入解析）；再用 **starter 的**
   scripts/check-profile.mjs 扫一遍装机副本（项目里没有这个脚本，从 starter 拿）。
D3 之后必须重跑 D1：修复很容易引入新分叉（改了 public 忘了改原型、加了页没进探针 LEAF_ROUTES）。
你**不许**自行关闭或重启正在运行的目标 Desktop；未观察到的状态写"未验证"。

========== 6. 结束时的报告（固定八段，缺段算没交付） ==========
1 一句话结论（做到哪一步 / 卡在哪一步）
2 四条不可让步各自结果（目录能选? 临床四段齐? 新建档案落库? 模块零占位?）——附命令与数字
3 「?」实测：用的 URL + probe 断言 M/M + self-test 是否红
4 面板九条：grep 数字 + contract checker 结果 + 安装/实机状态（任务 B 若验证即合规，写"验证通过无需修改"）
5 六件门禁结果（逐件 exit code，失败的列名字+原因）
6 D2/D3 产出：体检四态计数、验收修了几项、修完复跑数字
7 未验证与异常（装机加载、实机点击、外部通道 FAILED/401 逐条写——分类正确的失败也是证据）
8 需要我决定什么（最多 3 条）

========== 不要做的事 ==========
不许把"没测"写成"通过"；不许用"大体完成"代替逐条结论；不许为了让测试变绿去改断言/哈希/历史迁移；
不许先写"本台未接入临床试验/未接入 MinerU"的裁剪声明来交差（除非 manifest 真有 FAILED 证据）；
不许把演示数据、示例登记号、真实病历混进同一份数据；
不许留任何功能占位（toast/弹窗说「占位/未接入/没开发」）——要么实现，要么在降级路径写清原因；
M7 的 tag/Release、M8 的回填 PR 只备草稿到 docs/release-draft/，没有明确授权不许真的发。

```

---

## 相对原提示词的改动（为什么这么改）

| 原提示词的问题 | 改法 |
| --- | --- |
| 混了三件事：M0–M9 全流程 +「?」检查 + 另一个仓的面板修复，读起来像三个任务 | 拆成「A 主任务 / B 附带任务」，面板修复改成可填可不填的 `【面板修复目标仓】`（默认就修 A 的新仓） |
| 全是 `/Users/qinxiaoqiang/Downloads/...` 本机绝对路径 | 换成 starter 内相对路径；私有仓只能本地对照、不许写进交付说明（否则分享出去 404） |
| 只提 M0–M9，没提这两组刚踩的返工 | 新增 §2「三条不可让步」+ 五件门禁命令，直接来自 2026-11-12 两仓返工 |
| 「?」检查写得像注意事项 | 提成可执行验收：三件套清单 + **探针必须 `--url` 指向本仓原型** + `--self-test` 必须能红，并写了"index.html 搜不到 `#disease-primer` 是正常的"这条反直觉事实 |
| 面板九条没有落地细节 | 保留九条原文，补两条真踩过的：**订阅必须在 Panel 内且在 return 之前**（否则是死代码还顺手废掉别的逻辑）、**无会话时按钮不许 disabled**（否则创建分支不可达） |
| 没写"什么时候体检、什么时候验收" | 新增 §5 四步流水线（D1 门禁 → D2 独立体检 → D3 验收自修 → D4 装机），并规定 D3 后必须重跑 D1 |
| 报告只说"写完报告" | 固定八段，每段要求带数字或 file:line |

---

## 参考

- 流程主体：[FULL-CYCLE-KICKOFF](FULL-CYCLE-KICKOFF.md) · 细则：[PATIENT-DATA-AND-TRIALS-ONESHOT](PATIENT-DATA-AND-TRIALS-ONESHOT.md)
- 逐项审查：[FAMILY-INSPECTOR](FAMILY-INSPECTOR.md) · 验收自修：[USER-ACCEPTANCE-AUTOFIX](USER-ACCEPTANCE-AUTOFIX.md) · 装机：[DEPLOY-INSTALL-KICKOFF](DEPLOY-INSTALL-KICKOFF.md)
- 检查点主表：[WORKBENCH-DEV-CHECKLIST](WORKBENCH-DEV-CHECKLIST.md)（§12 目录 / §13 临床 / §14 患者档案）