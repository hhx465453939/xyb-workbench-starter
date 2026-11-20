# 41 · Demo 公网发布（CloudBase）

> 目的：给患者/家属一个**能点开**的公网 demo 链接。来源：cancer-policy-workbench 2026-11-19/20 实测（默认域名强制下载，详见 LESSONS L133）。

## 两条路线

| 路线 | 命令 | 结果 |
| --- | --- | --- |
| 默认域名（开发自测） | `tcb app deploy <service> -e <env> --framework static --install-command "" --build-command "" --output-dir ./ --cwd <dir> --json -f` | 得到 `*.webapps.tcloudbase.com` 链接；首访有「风险提醒」中间页（等 3 秒点“确定访问”），非 navigate 请求强制下载 |
| 自定义域名（对外） | `tcb domains add <domain> --certid <id> -e <env>` + `tcb routes add` 挂 `STATIC_STORE` | 无中间页、无 attachment；要求域名已备案 + 有效 SSL 证书 |

## 步骤（静态 demo）

1. 构建纯静态目录（合成数据，无密钥/真实病历）：复制 `prototypes/<ver>/` 到发布目录；如需去掉子路径资源依赖，做**单文件 HTML**（内联 CSS/JS，`</script` 转义为 `<\/script`）。
2. 默认域名快速发布：`tcb app deploy <service> -e <env> --framework static --install-command "" --build-command "" --output-dir ./ --cwd <dir> --json -f`
3. 自定义域名（可选）：
   - `tcb domains add <domain> --certid <certId> -e <env>`
   - `tcb routes add -e <env> --yes --data '{"domain":"<domain>","routes":[{"path":"/<path>","upstreamResourceType":"STATIC_STORE","upstreamResourceName":"staticstore","enablePathTransmission":true}]}'`
4. 验证：**无头浏览器** `goto` + 等待 + 断言 h1/导航数量；`curl -I` 只能看响应头，不代表浏览器能渲染。

## 红线

- demo 只放合成数据；不得包含真实病历、患者联系方式、密钥。
- 默认域名仅供开发测试，访问量大或内容未审核会被平台风控关停；对外传播请用自定义域名。
- 临时加的自定义域名路由（如 `/demo`）验证完要 `tcb routes delete <domain> -p <path> --yes` 清理，不留死路由。
- 费用/政策金额是公开口径整理，demo 页脚与“关于”里必须保留“以经办机构最新答复为准”。

## 升级重装（0.2.2 实测补充）

- profile 依赖钉的是旧 tgz 的 `file:` 路径：**重装新版前不要删旧 tgz 文件**；正确顺序是「打新版 tgz → 改 profile 依赖指向新 tgz（或直接 `pnpm add <新tgz>`）→ `pnpm install` → 校验 `node_modules/<pkg>/package.json` version」。
- `pnpm add` 的真实退出码必须用 `set -o pipefail` 检查；DSH 的 pnpm runner 在失败时也会打"restored … projection(s)"，不能当成功。
- 装机成功的判据（verify-desktop-load）：`dshHomePath 数据目录已生成` + 结论"宿主已加载该工作台"；宿主工作台清单不含本包时，以数据目录痕迹为准。
