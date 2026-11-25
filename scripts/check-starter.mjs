#!/usr/bin/env node
import { readFile, readdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { toPosix, sha256Of } from './lib/portability.mjs'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'), errors=[]
async function walk(path) {
  const files=[]
  for(const e of await readdir(path,{withFileTypes:true})) {
    if(e.name==='node_modules'||e.name==='.git') continue
    /* macOS 在 exFAT/U 盘上生成的 AppleDouble 元数据文件（._xxx）：不是项目文件，跳过 */
    if(e.name.startsWith('._')) continue
    const full=join(path,e.name)
    if(e.isDirectory()) files.push(...await walk(full));else files.push(full)
  }
  return files
}
const files=await walk(root)
for(const name of ['templates/check-trial-matching.mjs','test/trial-matching-gate-integration.test.mjs']) if(!files.includes(join(root,name))) errors.push('Missing '+name)
const initSource=await readFile(join(root,'scripts/init.mjs'),'utf8')
if(!initSource.includes("plan.set('scripts/check-trial-matching.mjs'")||!initSource.includes('node scripts/check-trial-matching.mjs .')) errors.push('Trial matching gate must be generated and integrated into the default check chain')
for(const name of ['docs/24-METRIC-TREND-TAB-DESIGN.md','templates/METRIC-TREND-SPEC.md','prompts/METRIC-TREND-TAB.md','README.md','CHANGELOG.md','AGENTS.md','spec/STARTER-SPEC.md','docs/SOURCES.md','docs/LESSONS.md','docs/09-WORKBENCH-STATUS.md','docs/10-MARKET-PUBLISHING.md','docs/11-REUSABLE-PATTERNS.md','docs/15-HVT-REVIEW.md','docs/16-ONE-CHART-SPEC.md','docs/18-MINERU-PARSING.md','scripts/check-conformance.mjs','docs/19-PROTOTYPE-CRAFT.md','docs/20-AGENT-PANE-DESIGN.md','docs/21-RESEARCH-PLAYBOOK.md','docs/22-PHASES-AND-GATES.md','examples/workbench-status.mjs','examples/progressive-disclosure.html','examples/mineru-labparse-align.mjs','templates/MARKET-ACCEPTANCE.md','templates/HVT-REVIEW.md','templates/ONE-CHART-SPEC.md','prompts/MARKET-PUBLISH.md','project.config.example.json','prompts/DESIGNER-FIRST.md','prompts/NEW-CANCER-WORKBENCH.md','templates/DESIGNER-BRIEF.md','templates/DESIGN-REVIEW.md','docs/13-DESIGNER-FIRST.md','docs/14-HTML-AND-DATA-CONTRACT.md','templates/PROTOTYPE-REVIEW.md','templates/SETTINGS-DESIGN.md','project-template/scripts/serve-artifact.mjs','project-template/scripts/verify-tabs-on-artifact.py','project-template/test/pack-contents.test.mjs','project-template/scripts/check-assertion-strength.mjs','docs/32-FULL-PAGE-VIEW.md','templates/FULL-PAGE-VIEW.md','assets/patterns/page-view.js','assets/patterns/page-view.css','examples/page-view.html','examples/page-view-standalone.html','scripts/probe-page-view.mjs','docs/36-DISEASE-PRIMER.md','templates/DISEASE-PRIMER.md','assets/patterns/disease-primer.js','assets/patterns/disease-primer.css','examples/disease-primer.html','examples/disease-primer-data.js','scripts/probe-disease-primer.mjs','docs/37-DEPLOY-TARGET.md','project-template/scripts/check-install.mjs','templates/check-trial-snapshot.mjs','test/trial-snapshot.test.mjs','docs/38-GUIDELINE-SOURCES.md','templates/check-primer-links.mjs','templates/check-host-route-dedupe.mjs','templates/check-static-token-inject.mjs']) {
  try {await readFile(join(root,name))}catch{errors.push('Missing '+name)}
}
for(const path of files.filter(p=>p.endsWith('.json')&&!toPosix(p).split('/').pop().startsWith('._'))) {
  try{JSON.parse(await readFile(path,'utf8'))}catch(e){errors.push('Invalid JSON '+path+': '+e.message)}
}
/* 快照文档抄自上游发布仓，里面的 ../data/... 是那边仓内相对路径，本仓无法解析；
   原写法 `!p.includes('/reference/')` 在 Windows 上是失效的（walk 出来的路径是反斜杠，永远不匹配），
   于是 Windows 上会凭空多出 4 条 Broken local link —— 判据本身没错，是它在 Windows 上没生效。 */
for(const path of files.filter(p=>p.endsWith('.md')&&!toPosix(p).includes('/reference/'))) {
  const s=await readFile(path,'utf8')
  for(const m of s.matchAll(/\]\(([^)]+)\)/g)) {
    const link=m[1].replace(/^<|>$/g,'').split('#')[0]
    if(!link||/^(https?:|mailto:|\/)/.test(link)) continue
    try{await readFile(resolve(dirname(path),link))}catch{errors.push('Broken local link '+path+' -> '+link)}
  }
}
const refs=JSON.parse(await readFile(join(root,'reference/sources.json'),'utf8'))
for(const entry of refs.sources.filter(s=>s.snapshot)) {
  const bytes=await readFile(join(root,entry.snapshot))
  // 换行归一化后再比：Windows 检出 CRLF 时不该把全对的仓库判红（见 scripts/lib/portability.mjs）
  if(sha256Of(bytes,entry.snapshot)!==entry.sha256) errors.push('Official snapshot hash mismatch '+entry.snapshot)
}
const assets=JSON.parse(await readFile(join(root,'assets/manifest.json'),'utf8'))
for(const entry of assets.assets.filter(s=>s.sha256)) {
  const bytes=await readFile(join(root,'assets',entry.path))
  if(sha256Of(bytes,entry.path)!==entry.sha256) errors.push('Asset hash mismatch '+entry.path)
}
/* 换行口径必须由版本库自己定死：缺 .gitattributes 时 Windows 默认 autocrlf 会把上面的哈希门禁变成假红 */
try {
  const attrs=await readFile(join(root,'.gitattributes'),'utf8')
  if(!/^\*\s+text=auto\s+eol=lf\b/m.test(attrs)) errors.push('.gitattributes 必须声明「* text=auto eol=lf」（否则 Windows 检出 CRLF 会让哈希门禁假红）')
} catch {
  errors.push('Missing .gitattributes（跨平台换行口径没有唯一来源）')
}
/* templates/lib/portability.mjs 是 scripts/lib/portability.mjs 的下发副本：
   两处必须逐字节相同，否则生成项目里的哈希门禁会和脚手架本体走不同口径。 */
try {
  const a=await readFile(join(root,'scripts/lib/portability.mjs'))
  const b=await readFile(join(root,'templates/lib/portability.mjs'))
  if(!a.equals(b)) errors.push('scripts/lib/portability.mjs 与 templates/lib/portability.mjs 不一致（下发副本漂移）')
} catch (e) {
  errors.push('Missing portability 模块副本：'+e.message)
}
/* CHG-002：门禁注册表必须与策展表一致，否则 audit-loop 会按过期集合执行（漂移=静默漏跑）。
   新增门禁只登记在 scripts/lib/gates-table.mjs 一处，这里做"注册表 == 策展表"的硬断言。 */
try {
  const { expectedRegistry, validateGates } = await import('./lib/gates-table.mjs')
  for (const e of validateGates(root)) errors.push('门禁表：'+e)
  const onDisk = JSON.parse(await readFile(join(root,'gates.registry.json'),'utf8'))
  if (JSON.stringify(onDisk) !== JSON.stringify(expectedRegistry())) {
    errors.push('gates.registry.json 与策展表不一致（改门禁表后请跑 node scripts/build-gates-registry.mjs）')
  }
} catch (e) {
  errors.push('Missing/Invalid gates.registry.json：'+e.message)
}
console.log(JSON.stringify({ files:files.length, pass:errors.length===0, errors },null,2))
if(errors.length)process.exitCode=1
