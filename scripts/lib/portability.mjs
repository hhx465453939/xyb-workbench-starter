/**
 * 跨平台（POSIX / Windows）共用的路径与校验和工具。
 *
 * 这些函数单独成模块，不是为了好看，是为了能被 test/ 直接 import 覆盖：
 * 下面每一条都对应一个已在本机 Windows 真机上踩到的缺陷（见 docs/LESSONS.md L171），
 * 只写在脚本里就没法写反例，下次还会踩。
 */
import { isAbsolute, relative, sep } from 'node:path'
import { createHash } from 'node:crypto'

/**
 * 判断 target 是否在 parent 之内（含 parent 本身）。
 *
 * 为什么不能只写「relative 结果不以 .. 开头」：Windows 上跨盘调用 path.relative 会
 * **返回绝对路径**（`relative('E:\\starter','C:\\Users\\x')` → `'C:\\Users\\x'`），
 * 那个结果既不是 '' 也不以 '..' 开头，于是被判成「在目录内」。实测后果：
 * 脚手架在 E: 盘、生成目标在 C: 盘时 `init` 直接报
 * 「Target must be outside the starter directory and not its ancestor」拒跑。
 */
export function within(parent, target) {
  const rel = relative(parent, target)
  if (rel === '') return true
  if (isAbsolute(rel)) return false // 跨盘：relative 退回绝对路径，必然不在 parent 内
  return rel !== '..' && !rel.startsWith('..' + sep)
}

/**
 * 统一用正斜杠做「键」。
 *
 * Windows 的 join() 产出反斜杠，直接拿它当 Map key，再用 `plan.get('assets/manifest.json')`
 * 这种正斜杠字面量去查就会拿到 undefined —— 实测后果是 init 在 Windows 上抛
 * 「Cannot read properties of undefined (reading 'toString')」，一个文件都写不出来。
 */
export function toPosix(path) {
  return sep === '/' ? path : path.split(sep).join('/')
}

/** 二进制扩展名白名单：不参与换行归一化，校验和按原始字节算 */
const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.bmp', '.avif',
  '.pdf', '.zip', '.gz', '.tgz', '.woff', '.woff2', '.ttf', '.otf',
  '.mp4', '.mov', '.mp3', '.wav', '.db', '.sqlite', '.sqlite3',
  '.xlsx', '.docx', '.pptx', '.bin'
])

export function isBinaryPath(file = '') {
  const lower = String(file).toLowerCase()
  const dot = lower.lastIndexOf('.')
  return dot >= 0 && BINARY_EXTENSIONS.has(lower.slice(dot))
}

/**
 * 把文本字节的 CRLF 归一化成 LF；二进制或非 UTF-8 原样返回。
 *
 * Git for Windows 安装默认 core.autocrlf=true，会把检出文件的换行转成 CRLF，
 * 而 assets/manifest.json 与 reference/sources.json 里的 sha256 是按仓库内容（LF）算的。
 * 不归一化时，Windows 上 `npm run check` 会报 13 条 Asset hash mismatch + 4 条
 * Official snapshot hash mismatch —— 全员都对的仓库被判红，是「假绿」的反面「假红」，
 * 同样会让「fail 不交付」这条规则失效（只是方向反了：永远无法交付）。
 */
export function normalizeEol(bytes) {
  if (!Buffer.isBuffer(bytes)) return normalizeEol(Buffer.from(bytes))
  if (bytes.includes(0)) return bytes // 含 NUL，视为二进制
  const text = bytes.toString('utf8')
  if (!Buffer.from(text, 'utf8').equals(bytes)) return bytes // 不是合法 UTF-8
  return /\r\n/.test(text) ? Buffer.from(text.replace(/\r\n/g, '\n'), 'utf8') : bytes
}

/** 跨平台稳定的 sha256：文本按 LF 归一化后计算，二进制按原始字节 */
export function sha256Of(bytes, file = '') {
  const payload = isBinaryPath(file) ? Buffer.from(bytes) : normalizeEol(bytes)
  return createHash('sha256').update(payload).digest('hex')
}
