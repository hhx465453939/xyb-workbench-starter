#!/usr/bin/env node
/**
 * 路由前缀同源自查 —— 「UI 路由写死字面量」或「dsh/index.js 漏挂 UI 静态前缀路由」是多仓互撞与装机白屏的共同根因。
 *
 * 现场 1（2026-11-05）：takayasu-workbench 从 ttp-workbench 复制模板后，dsh/index.js 里
 * UI 路由仍写死 `path: '/ttp'`，而其客户端 iframe 加载 `/takayasu/`：
 *   ① 与 ttp-workbench 的 `/ttp` 相撞 → 宿主报 `duplicate prefix route "/ttp"`，一个插件激活失败；
 *   ② 即便不撞，客户端请求 `/takayasu/` 也会 404（SPA 兜底把 index.html 当 JS）。
 * 现场 2（2026-11-23）：BCC/DFSP v0.1.0 `dsh/index.js` 只注册了 `/api/<slug>` 而漏挂 `'/' + API_PREFIX`，
 * `npm run check` / `audit` 全绿，但 DSH Desktop 业务区白屏 404。
 *
 * 断言：
 *   ① dsh/index.js 不得出现写死的 `path: '/<非本仓 slug>'` 前缀注册，且必须用 `'/' + API_PREFIX`（或 `` `/${API_PREFIX}` ``）注册 UI 静态前缀路由；
 *   ② identity 的 API_PREFIX 必须是本仓 slug 子串；
 *   ③ 客户端 UI_ENTRY 与 API_PREFIX 一致（`/slug/`），健康检查 URL 与 API_PREFIX 同源。
 * 用法：
 *   node scripts/check-route-prefix.mjs
 *   node scripts/check-route-prefix.mjs --self-test
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export function checkRoutePrefix({ slug, identity, index, client }) {
  const fails = [];
  const prefix = (identity.match(/API_PREFIX\s*=\s*['"]([^'"]+)['"]/) || [])[1];
  if (!prefix) fails.push('lib/identity.js 缺 API_PREFIX');
  if (prefix && !slug.includes(prefix)) fails.push(`API_PREFIX(${prefix}) 与包名 slug(${slug}) 不同源`);
  const hard = [...index.matchAll(/path:\s*['"]\/([a-z0-9-]+)['"]/g)]
    .map((m) => m[1])
    .filter((x) => x !== slug && x !== prefix && x !== `api/${prefix}`);
  if (hard.length) fails.push(`dsh/index.js 写死路由前缀：${hard.join(', ')}（应只用 '/' + API_PREFIX 与 API_BASE_HOSTED）`);
  if (!/path\s*:\s*(?:'\/'\s*\+\s*API_PREFIX|"\/"\s*\+\s*API_PREFIX|`\/\$\{API_PREFIX\}`)/.test(index)) {
    fails.push("dsh/index.js 未使用 '/' + API_PREFIX 注册 UI 静态前缀路由（漏挂会导致 Desktop 业务区 404 白屏）");
  }
  if (prefix && !new RegExp(`UI_ENTRY\\s*=\\s*['"]/${prefix}/['"]`).test(client)) {
    fails.push(`src/client.js UI_ENTRY 不等于 /${prefix}/`);
  }
  /* L136（traps-workbench 2026-11-20 夜班）：init 骨架把健康检查 fetch 写死成
     `/api/<包名 slug>-workbench/health`，与 identity 的 API_PREFIX 漂移后装机即 404
     （版本 chip 永远「连接中」）。健康检查路由必须与 API_PREFIX 同源。 */
  const healthHard = [...client.matchAll(/fetch\(\s*['"]([^'"]*\/health)['"]/g)]
    .map((m) => m[1])
    .filter((u) => prefix && !u.includes(`/api/${prefix}/`) && !u.includes('${API_BASE}'));
  if (healthHard.length) fails.push(`client.js 健康检查 URL 与 API_PREFIX 不同源：${healthHard.join(', ')}（应为 /api/${prefix}/health）`);
  return { fails, prefix };
}

if (process.argv.includes('--self-test')) {
  const bad = checkRoutePrefix({
    slug: 'bcc-workbench',
    identity: "export const API_PREFIX = 'bcc'",
    index: "ctx.webServer.register({ kind: 'prefix', path: API_BASE_HOSTED, handler })",
    client: "export const UI_ENTRY = '/bcc/'; fetch('/api/bcc/api/health')",
  });
  const good = checkRoutePrefix({
    slug: 'bcc-workbench',
    identity: "export const API_PREFIX = 'bcc'",
    index: "ctx.webServer.register({ kind: 'prefix', path: API_BASE_HOSTED, handler });\nctx.webServer.register({ kind: 'prefix', path: '/' + API_PREFIX, handler });",
    client: "export const UI_ENTRY = '/bcc/'; fetch('/api/bcc/api/health')",
  });
  const ok = bad.fails.length > 0 && good.fails.length === 0;
  if (!ok) {
    console.error('✗ check-route-prefix self-test 失败', { bad: bad.fails, good: good.fails });
    process.exit(1);
  }
  console.log('✓ self-test：缺 UI 静态前缀路由反例被检出，合规正例 0 误报');
  process.exit(0);
}

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const identityPath = join(ROOT, 'lib/identity.js');
const clientPath = join(ROOT, 'src/client.js');
if (!existsSync(identityPath) || !existsSync(clientPath)) {
  console.log('✓ 路由前缀同源：M0 骨架阶段（尚未拆分 lib/identity.js / src/client.js），跳过');
  process.exit(0);
}

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const slug = String(pkg.name || '').split('/').pop();
const identity = readFileSync(identityPath, 'utf8');
const index = readFileSync(join(ROOT, 'dsh/index.js'), 'utf8');
const client = readFileSync(clientPath, 'utf8');
const { fails, prefix } = checkRoutePrefix({ slug, identity, index, client });
if (fails.length) { console.error('✗ 路由前缀同源断言失败：\n- ' + fails.join('\n- ')); process.exit(1); }
console.log(`✓ 路由前缀同源（slug=${slug} · API_PREFIX=${prefix} · UI=/${prefix}/）`);
