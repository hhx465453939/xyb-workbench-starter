# MinerU 六部件接线清单（18 号 v2 · 2026-11-21 自 glanzmann-thrombasthenia-workbench 实测回流）

> 用户红线：**所有模块必须完整上线，不允许无特殊原因占位**。MinerU 不许只做纯函数——路由/服务/UI/测试任何一层缺失都算未交付。

## 六部件与必做口径

| # | 部件 | 必做内容 | 实测要求 |
| --- | --- | --- | --- |
| 1 | 密钥 | Token 只落 `~/.gt-workbench/<slug>/mineru-token`（0600；目录按 slug 隔离）；env `MINERU_TOKEN` 仅兜底且排在文件之后；回显只出后 4 位 + 来源 + 绝对路径 | 保存→status 掩码回显 E2E |
| 2 | 导入登记 | `POST <prefix>/mineru/import`：类型/大小校验（拒收说明原因），import_batches 落一行（status pending） | E2E |
| 3 | 抽取 | 本机通道（txt/md/csv，`extractObservationCandidates` + 行式兜底，不出本机）；云通道（pdf/图片，`extractWithMineru`：申请→上传→轮询→解包 full.md） | 本机通道必须 E2E 实测；云通道代码必做，成功路径需有效 Token（401/NO_TOKEN/TIMEOUT 分类如实） |
| 4 | 候选落库 | `import_candidates` in_use=0，核对采用才进事实层；payload 含 metricCode/valueRaw/unitRaw/occurredAt/sourceLocator/confidence/channel | E2E |
| 5 | 核对入库 | `POST <prefix>/mineru/verify`：勾选项 → lab_results（metricCode→metric_defs.title 反查）；重复（同档案同指标同日同值）进 import_conflicts，不重复写 | E2E + 重复进冲突断言 |
| 6 | 状态回显 | 设置 tab 真流：`GET <prefix>/mineru/status` 回显掩码/来源/路径/申请入口；四步指南；知情条款（原件上传 mineru.net，点"开始解析"才传） | 探针断言（CFG/MINERU 组） |

## 接线清单（缺一即漏）

- **Workbench 方法**：`mineruStatus / saveMineruToken / mineruImport / mineruExtractLocal / mineruCloudExtract / mineruVerify`（构造器收 `tokenFile` 覆盖，供测试隔离）。
- **server 路由**：`/mineru/status`（GET）`/mineru/token` `/mineru/import` `/mineru/extract-local`（body ≤8MB）`/mineru/cloud`（body ≤32MB，base64）`/mineru/verify`。
- **services 双形态**：`dsh/index.js` 与 `scripts/dev-server.mjs` 都要挂（禁只改一处）。
- **UI**：报告归档加「导入解析」子页（四步指南+文件多选+候选核对表+确认入库）；设置 MinerU tab 真表单（占位 toast = 返工）。
- **测试**：token 落盘/掩码、导入→抽取→核对→事实层+重复冲突、云通道 NO_TOKEN 隔离（临时清 env）、hospital 类同规范。
- **探针**：设置 tab 逐 tab 走真实动作；导入子页四步指南+文件选择+知情条款断言（CFG/MINERU 组）。

## 可复制件（本目录）

- `mineru-cloud-extract.mjs`：云链全函数（病种无关，直接复制进 `dsh/mineru.js`；保留病种自己的 resolve/save tokenFile 逻辑）。
- `mineru-markdown-candidates.mjs`：markdown → 候选（**热点：`METRIC_ALIASES` 按病种重写，metricCode = metric_defs.db 键**；排除项返回 null，具体别名排前面）。
- `mineru-zip.js`：零依赖 ZIP 读取（解包 full.md 用）→ 放 `lib/zip.js`。

## 已知坑（实测教训）

1. `readJsonBody` 默认 64KB：云通道 base64 必须放宽（32MB）并在超限时回 413。
2. tokenFile 必须在 **每一处** resolve 传入（漏一处就会读到别的路径/环境变量，测试互相污染）。
3. 云端 401 → `UNAUTHORIZED` 分类（不重试）；env Token 无效是账号问题，不是实现问题——如实标注"云端成功路径未实测"。
4. 行式抽取的单位字符类要含 `×` 与上标 `⁹²³…`，否则 `×10⁹/L` 被截断。
5. BSD sed 不支持 `\b`：批量改名后必须 grep 复核数据字段访问点（LESSONS L150）。
