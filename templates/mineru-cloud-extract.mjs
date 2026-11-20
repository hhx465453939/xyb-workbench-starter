/**
 * MinerU 六部件（18 号 v2）：导入 → 队列 → 解析 → 候选 → 核对 → 归档。
 *
 * 本文件是**接口契约 + 纯文本抽取**，不做真实上传（未接通形态，如实标注）：
 * - Token 解析（resolveToken / resolveMineruToken）：文件优先、环境变量兜底，读不到如实返回 null；
 * - 六部件函数按 18 号 v2 的状态机签名实现：状态只进出枚举，失败带 reason，不裸 throw；
 * - parseLocalText：TXT / MD / CSV 本地抽取（化验候选），不上传任何内容；
 * - 真实云解析需要用户在设置页填 Token（存 .secrets，git 忽略），未配置时 upload 返回
 *   `needsSetup`，绝不假装解析成功。勾选与保存都不联网。
 *
 * GT 指标字典：血小板计数/血红蛋白/白细胞/APTT/PT 等——只匹配名称，不做参考范围判定（阈值一律【待核】）。
 */

import { readFileSync as readFileSyncFn, writeFileSync as writeFileSyncFn, mkdirSync, chmodSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const MINERU_TOKEN_URL = 'https://mineru.net/apiManage/token';
/** 18 号：Token 只进本地密钥文件，默认落用户目录（绝对路径）；.secrets 相对写法只作展示别名。 */
export const SECRETS_FILE = '.secrets/mineru-token';
export function defaultTokenFile() {
  return join(homedir(), '.gt-workbench', 'mineru-token');
}

/** Token 解析：文件（.secrets/mineru-token）优先，环境变量 MINERU_TOKEN 兜底；两者都没有 → null（不猜）。 */
export function resolveToken({ readFileFn, env } = {}) {
  return resolveMineruToken({ readFileFn, env });
}

export function resolveMineruToken({ readFileFn, env, tokenFile } = {}) {
  const read = readFileFn || ((p) => { try { return readFileSyncFn(p, 'utf8'); } catch { return null; } });
  const secretFile = tokenFile || defaultTokenFile(); /* 文件优先（默认用户目录绝对路径） */
  const fromFile = read(secretFile);
  if (fromFile && typeof fromFile === 'string' && fromFile.trim()) return { source: 'file', token: fromFile.trim() };
  const fromEnv = env?.MINERU_TOKEN ?? process.env.MINERU_TOKEN;
  if (fromEnv && String(fromEnv).trim()) return { source: 'env', token: String(fromEnv).trim() };
  return null;
}

/** 设置页手工保存 Token：写 .secrets/mineru-token（0600 权限由调用方保证；.secrets 已 git 忽略）。 */
export function saveMineruToken(token, { writeFileFn, tokenFile } = {}) {
  const t = String(token || '').trim();
  if (!t) return { saved: false, reason: 'empty-token' };
  if (t.length > 4096) return { saved: false, reason: 'token-too-long' };
  const file = tokenFile || defaultTokenFile();
  const write = writeFileFn || ((p, s) => {
    mkdirSync(join(file, '..'), { recursive: true });
    writeFileSyncFn(p, s, 'utf8');
    try { chmodSync(p, 0o600); } catch { /* 权限收紧失败不阻塞保存，status 里如实标注 */ }
    return true;
  });
  write(file, t);
  return { saved: true, path: file };
}

/** ① 导入：收文件清单，返回批次 id 与逐文件接受结果（超大/不支持类型直接拒收并说明）。 */
export function importFiles(files, { maxBytes = 50 * 1024 * 1024 } = {}) {
  const supported = ['.txt', '.md', '.csv', '.pdf', '.png', '.jpg', '.jpeg', '.webp', '.docx', '.xlsx'];
  const accepted = [], rejected = [];
  for (const f of files || []) {
    const name = String(f?.name || '');
    const ext = name.slice(name.lastIndexOf('.')).toLowerCase();
    if (!supported.includes(ext)) rejected.push({ name, reason: 'unsupported-type' });
    else if ((f?.size ?? 0) > maxBytes) rejected.push({ name, reason: 'too-large' });
    else accepted.push({ name, ext, size: f?.size ?? null, localOnly: ['.txt', '.md', '.csv'].includes(ext) });
  }
  return { batchId: 'batch-' + Date.now().toString(36), accepted, rejected };
}

/** ② 队列：accepted 文件分流——localOnly 走本地抽取，其余排队等云解析。 */
export function enqueue(batch) {
  const jobs = (batch?.accepted || []).map((f, i) => ({
    jobId: `${batch.batchId}-${i}`, file: f.name,
    channel: f.localOnly ? 'local' : 'mineru-cloud',
    status: f.localOnly ? 'ready' : 'queued',
  }));
  return { batchId: batch?.batchId ?? null, jobs };
}

/** ③ 解析：云通道在未配置 Token 时如实 needsSetup；本地通道由 parseLocalText 完成。 */
export function parseJob(job, { token } = {}) {
  if (job.channel === 'mineru-cloud' && !token) {
    return { ...job, status: 'needsSetup', reason: 'MINERU_TOKEN 未配置（设置页填 Token 后启用云解析）', tokenUrl: MINERU_TOKEN_URL };
  }
  return { ...job, status: job.status === 'ready' || token ? 'parsing' : job.status };
}

const NUM = /^[<>≥≤]?\s*\d+(?:\.\d+)?$/;

/** GT 指标字典（名称 → code）：与 metric_defs 同源（不在库内判定参考范围）。 */
export const METRIC_DICT = [
  { code: 'plt', names: ['PLT', '血小板', '血小板计数', 'PLT计数', '血小板数'] },
  { code: 'hb', names: ['Hb', 'HB', 'HGB', '血红蛋白', '血色素'] },
  { code: 'wbc', names: ['WBC', '白细胞', '白细胞计数', 'WBC计数'] },
  { code: 'aptt', names: ['APTT', '活化部分凝血活酶时间'] },
  { code: 'pt', names: ['PT', '凝血酶原时间'] },
  { code: 'ferritin', names: ['铁蛋白', 'SF', '血清铁蛋白', 'Ferritin'] },
];

/** 行式文本 → 化验候选（纯本地；日期行 + "名称 数值 单位" 模式）。 */
export function parseLocalText(text, { dateHint } = {}) {
  const out = [];
  let currentDate = dateHint ?? null;
  const lines = String(text || '').split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const dm = line.match(/(\d{4}[-/年]\d{1,2}[-/月]\d{1,2})/);
    if (dm) currentDate = dm[1].replace(/年|月|\//g, '-').replace(/日/g, '');
    for (const entry of METRIC_DICT) {
      for (const name of entry.names) {
        const re = new RegExp('^' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*[:：]?\\s*([<>≥≤]?\\s*\\d+(?:\\.\\d+)?)\\s*([a-zA-Z×⁹/μµ%·°℃]+.*)?$');
        const m = line.match(re);
        if (m && NUM.test(m[1])) {
          out.push({ code: entry.code, matchedName: name, date: currentDate, valueText: m[1], unit: (m[2] || '').trim() || null, kind: 'metric' });
        }
      }
    }
  }
  return out;
}

/** ④ 候选：解析产物 → import_candidates 形状（in_use=0；核对前不入事实层）。 */
export function toCandidates(parsed, { sourceNote = '文档解析（本地抽取）' } = {}) {
  return (parsed || []).map((c, i) => ({
    id: 'cand-' + (i + 1), kind: c.kind, code: c.code, date: c.date,
    valueText: c.valueText, unit: c.unit, from: sourceNote, inUse: false, rejected: false,
  }));
}

/** ⑤ 核对：逐条 accept/reject；reject 不改事实层（零副作用），accept 返回待写入 payload。 */
export function verifyCandidates(cands, { acceptIds = [], rejectIds = [] } = {}) {
  const now = new Date().toISOString().slice(0, 10);
  return (cands || []).map((c) => {
    if (acceptIds.includes(c.id)) return { ...c, inUse: true, verifiedOn: now };
    if (rejectIds.includes(c.id)) return { ...c, rejected: true };
    return c;
  });
}

/** ⑥ 归档：已核对候选 → 写库调用方执行；本函数只产出归档清单（batch 封存、原件路径保留）。 */
export function archiveBatch(batchId, verifiedCount) {
  return { batchId, archivedAt: new Date().toISOString(), verifiedCount: verifiedCount ?? 0, originalsKept: true };
}


/* ── 云解析链（移植自小胰宝 mineru.js 实测实现：申请→上传→轮询→解包；18 号 v2）── */

export const MINERU_BASE_URL = 'https://mineru.net/api/v4'
export const MINERU_MODEL_DEFAULT = 'pipeline'
export const MINERU_MODEL_FALLBACK = 'vlm'
/**
 * Token 申请 / 重置页。
 *
 * 这个地址同时是"这是一类 Token 问题"的约定标记：客户端只认错误消息里有没有它
 * （见 lib/client.js 的 mineruAlert），不另造一套状态码，避免前后端各猜一套。
 */

// 2026-10-22 实测：v4 批量接口拒收 HTML（`model_version 'vlm'/'pipeline' cannot process html files`，-10002），
// 所以白名单里不再放 `.html`。留着它等于承诺一个一定失败的入口。
const supported = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx'])
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export class MineruError extends Error {
  constructor(code, message, detail = null) {
    super(message)
    this.name = 'MineruError'
    this.code = code
    this.detail = detail
  }
}

/**
 * 接口是否"明确不接受这个模型参数"。
 *
 * 为什么只对这一类错误换模型：默认 `pipeline`（2026-10-22 跨工作台统一口径），个别账号/版本会拒；
 * 压平表格用 `vlm` 还原更稳，调用方可显式传 `model: 'vlm'`。
 * **文件本身解析失败不换模型重试**——那只会多花一次额度，结论还是失败。
 */
export function modelFallbackWorthy(error) {
  if (!error) return false
  if (!['API_ERROR', 'BAD_INPUT'].includes(error.code)) return false
  return /model|模型|version|版本|参数|param|unsupported|not supported|不支持|invalid/iu.test(String(error.message ?? ''))
}

function authRejected(error) {
  return error?.code === 'UNAUTHORIZED'
}

/**
 * 系统是否配了代理。
 *
 * Node 内置 `fetch` **不走 `HTTP_PROXY`/`HTTPS_PROXY`**（这点和 curl/CLI 不同）。
 * 所以代理环境下网络失败时，要直接说清是代理没被支持，而不是丢一句"无法连接"——
 * 那会让人去查网络、查 Token，查半天都不是原因。
 */
function proxyEnvHint() {
  const keys = ['HTTPS_PROXY', 'https_proxy', 'HTTP_PROXY', 'http_proxy', 'ALL_PROXY', 'all_proxy']
  const hit = keys.find((key) => String(process.env[key] || '').trim())
  return hit ? `系统设置了 ${hit}，当前版本的内置请求不走系统代理；可先关闭代理或改用直连网络重试。` : ''
}

/** 只用于错误提示，不落库、不进日志。 */
function safeDetail(error) {
  return String(error?.message || '').slice(0, 260)
}

async function requestJson(fetchImpl, url, { method = 'GET', token, tokenSource = '', body = null, timeoutMs = 60000 } = {}) {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== null) headers['Content-Type'] = 'application/json'

  let response
  try {
    response = await fetchImpl(url, {
      method,
      headers,
      body: body === null ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      throw new MineruError('TIMEOUT', 'MinerU 请求超时；原件仍保存在本机，可稍后重试。', { url })
    }
    const hint = proxyEnvHint()
    throw new MineruError('NETWORK', `无法连接 MinerU：${error?.message || error}${hint ? `（${hint}）` : ''}`, { url })
  }

  if (response.status === 401 || response.status === 403) {
    // 把 MinerU 自己的报文读出来：`user token expired` 和 `invalid token` 是两种处理，
    // 只报“401”会让用户以为是网络或代码问题（实际是换了 Token 没生效）。
    let apiMessage = ''
    try {
      const text = await response.text()
      apiMessage = String(JSON.parse(text)?.msg || '').trim()
    } catch { /* 报文不是 JSON 就只按状态码说 */ }
    const reason = /expired|过期/iu.test(apiMessage)
      ? 'Token 已过期'
      : /invalid|无效/iu.test(apiMessage) ? 'Token 无效' : apiMessage
    const from = tokenSource === 'secret-file'
      ? '本次使用的是你在设置里保存的 Token'
      : tokenSource === 'environment'
        ? '本次使用的是环境变量 MINERU_TOKEN（它会盖过设置里未保存的值；如已换新 Token 仍报错，检查是否存在这条环境变量）'
        : tokenSource === 'bundled-community'
          ? '本次使用的是随包公益 Token'
          : ''
    throw new MineruError(
      'UNAUTHORIZED',
      `MinerU 拒绝了这个 Token（HTTP ${response.status}${reason ? `，${reason}` : ''}）。${from}可在设置中替换 Token，或到 ${MINERU_TOKEN_URL} 申请 / 重置。`,
      { status: response.status, apiMessage },
    )
  }

  let json = null
  try {
    json = await response.json()
  } catch {
    throw new MineruError('BAD_RESPONSE', `MinerU 返回的不是 JSON（HTTP ${response.status}）`, { url })
  }
  if (json?.code !== 0) {
    const message = String(json?.msg ?? '未知错误')
    const code = /token|auth|权限|登录/iu.test(message) ? 'UNAUTHORIZED' : 'API_ERROR'
    throw new MineruError(code, `MinerU 接口报错（code=${json?.code}）：${message}`, { apiCode: json?.code })
  }
  return json
}

/** ① 申请上传链接；返回 batchId 与 PUT 地址。 */
async function createUploadBatch(fetchImpl, baseUrl, token, tokenSource, { name, modelVersion, language, timeoutMs }) {
  const body = { enable_formula: true, enable_table: true, language, files: [{ name }] }
  if (modelVersion) body.model_version = modelVersion
  const json = await requestJson(fetchImpl, `${baseUrl}/file-urls/batch`, { method: 'POST', token, tokenSource, body, timeoutMs })
  const batchId = json?.data?.batch_id
  const urls = json?.data?.file_urls
  if (!batchId || !Array.isArray(urls) || urls.length !== 1) {
    throw new MineruError('BAD_RESPONSE', '申请上传链接的返回不完整（缺 batch_id 或 file_urls 数量对不上）')
  }
  return { batchId, uploadUrl: urls[0] }
}

/** ② 上传原件。MinerU 要求不设 Content-Type，所以这里只带 Authorization。 */
async function uploadFile(fetchImpl, uploadUrl, bytes, timeoutMs) {
  let response
  try {
    response = await fetchImpl(uploadUrl, { method: 'PUT', headers: {}, body: bytes, signal: AbortSignal.timeout(timeoutMs) })
  } catch (error) {
    throw new MineruError('UPLOAD_FAILED', `上传原件失败：${error?.message || error}`)
  }
  if (!response.ok) throw new MineruError('UPLOAD_FAILED', `上传原件失败：HTTP ${response.status}`)
}

/** ③ 轮询到结束。 */
async function waitForBatch(fetchImpl, baseUrl, token, tokenSource, batchId, { intervalMs, timeoutMs }) {
  const startedAt = Date.now()
  for (;;) {
    const json = await requestJson(fetchImpl, `${baseUrl}/extract-results/batch/${batchId}`, { token, tokenSource, timeoutMs: 30000 })
    const results = json?.data?.extract_result
    if (!Array.isArray(results)) throw new MineruError('BAD_RESPONSE', '批次结果里没有 extract_result 数组')
    const pending = results.filter((r) => r.state !== 'done' && r.state !== 'failed')
    if (pending.length === 0) return results[0]
    if (Date.now() - startedAt > timeoutMs) {
      throw new MineruError(
        'TIMEOUT',
        `等了 ${Math.round(timeoutMs / 1000)} 秒还没解析完（仍在 ${[...new Set(pending.map((p) => p.state))].join('/')}）`,
      )
    }
    await sleep(intervalMs)
  }
}

/** ④ 下载并取出 full.md。 */
async function downloadMarkdown(fetchImpl, zipUrl, timeoutMs) {
  let response
  try {
    response = await fetchImpl(zipUrl, { signal: AbortSignal.timeout(timeoutMs) })
  } catch (error) {
    throw new MineruError('NETWORK', `下载解析结果失败：${error?.message || error}`)
  }
  if (!response.ok) throw new MineruError('DOWNLOAD_FAILED', `下载解析结果失败：HTTP ${response.status}`)
  const buffer = Buffer.from(await response.arrayBuffer())
  let zip
  try {
    zip = readZip(buffer)
  } catch (error) {
    throw new MineruError('BAD_ZIP', `解析结果不是可读的 ZIP：${error.message}`)
  }
  if (!zip.has('full.md')) {
    throw new MineruError('NO_MARKDOWN', `解析结果里没有 full.md（实际条目：${zip.names.slice(0, 8).join(', ')}）`)
  }
  return zip.text('full.md')
}

/**
 * 解析一份文件，返回 markdown 与引擎标识。
 *
 * @param {Buffer|Uint8Array} bytes
 * @param {string} extension 含点，如 `.pdf`
 * @param {object} opts
 * @param {string} opts.token     MinerU Token（不传就抛，不走匿名请求）
 * @param {string} [opts.model]   `pipeline`（默认）或 `vlm`
 * @param {Function} [opts.fetchImpl] 注入用（单测不联网）
 * @returns {Promise<{markdown: string, engine: string, message?: string}>}
 */
export async function extractWithMineru(bytes, extension, {
  token = '',
  tokenSource = '',
  model = MINERU_MODEL_DEFAULT,
  fetchImpl = null,
  baseUrl = MINERU_BASE_URL,
  language = 'ch',
  intervalMs = 3000,
  timeoutMs = 300000,
  requestTimeoutMs = 60000,
} = {}) {
  if (!supported.has(extension)) throw new Error('MinerU 当前不支持此文件类型；可保留原件并手工录入。')
  if (!bytes || bytes.byteLength === 0) throw new Error('文件内容为空，不提交解析。')
  if (bytes.byteLength > 200 * 1024 * 1024) throw new Error('单份资料超过 MinerU 支持的 200 MB 上限。')
  if (!String(token || '').trim()) {
    throw new Error(`没有可用的 MinerU Token：请在设置中填写，或到 ${MINERU_TOKEN_URL} 申请后重试。`)
  }

  const useFetch = fetchImpl ?? globalThis.fetch
  const entry = String(token).trim()
  const preferred = model === MINERU_MODEL_FALLBACK ? MINERU_MODEL_FALLBACK : MINERU_MODEL_DEFAULT
  const attempts = preferred === MINERU_MODEL_FALLBACK ? [MINERU_MODEL_FALLBACK] : [MINERU_MODEL_DEFAULT, MINERU_MODEL_FALLBACK]

  let lastError = null
  for (const modelVersion of attempts) {
    try {
      const name = `source${extension}`
      const { batchId, uploadUrl } = await createUploadBatch(useFetch, baseUrl, entry, tokenSource, { name, modelVersion, language, timeoutMs: requestTimeoutMs })
      await uploadFile(useFetch, uploadUrl, bytes, Math.max(requestTimeoutMs, 300000))
      const result = await waitForBatch(useFetch, baseUrl, entry, tokenSource, batchId, { intervalMs, timeoutMs })

      if (result.state !== 'done') {
        // 文件本身失败：不换模型重试，直接报
        throw new MineruError('TASK_FAILED', `MinerU 解析失败：${result.err_msg || result.state}`, { batchId, state: result.state })
      }
      if (!result.full_zip_url) throw new MineruError('BAD_RESPONSE', '解析完成但没有返回 full_zip_url', { batchId })

      const markdown = String(await downloadMarkdown(useFetch, result.full_zip_url, Math.max(requestTimeoutMs, 120000)) || '').trim()
      if (!markdown) throw new MineruError('NO_MARKDOWN', 'MinerU 没有返回可读取的文本')

      const engine = `mineru-api-${modelVersion}`
      const message = modelVersion !== preferred
        ? `当前账号不支持 ${preferred} 模型，已改用 ${modelVersion} 解析。结果排版可能不同，核对时留意串位。`
        : ''
      return { markdown, engine, ...(message ? { message } : {}) }
    } catch (error) {
      lastError = error
      if (authRejected(error)) throw error
      // 只有"接口不接受这个模型"才换下一个模型，其余错误直接抛
      if (modelVersion === MINERU_MODEL_DEFAULT && modelFallbackWorthy(error)) continue
      throw error
    }
  }
  throw lastError ?? new MineruError('UNKNOWN', 'MinerU 解析未能完成')
}

/** 统一成用户能看懂的一句话；不再出现 ENOENT 这类机器痕迹。 */
export function describeMineruFailure(error) {
  /* 返回 {kind, message}：kind 供前端/路由分层（18 号：错误码分类，不一个 500 打天下） */
  if (error instanceof MineruError) {
    if (error.code === 'UNAUTHORIZED') return { kind: 'UNAUTHORIZED', message: error.message }
    if (error.code === 'TIMEOUT') return { kind: 'TIMEOUT', message: 'MinerU 解析超时；原件仍保存在本机，可稍后重试。' }
    if (error.code === 'NO_TOKEN') return { kind: 'NO_TOKEN', message: error.message }
    return { kind: error.code || 'TASK_FAILED', message: `MinerU 解析失败：${safeDetail(error)}` }
  }
  return { kind: 'NETWORK', message: `MinerU 解析失败：${error?.message || error}` }
}

