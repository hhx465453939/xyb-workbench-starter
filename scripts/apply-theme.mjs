#!/usr/bin/env node
/**
 * apply-theme.mjs — 官方母题与按钮变体固化工具（CLI）
 *
 * 作用：
 *   在 M2 原型经由 style-picker 挑定「母题 + 变体 + 护眼暗纸」后，
 *   一键将所选主题与变体固化进目标工作台项目，消除人肉复制 CSS 的失误。
 *
 * 用法：
 *   node scripts/apply-theme.mjs [项目目录] --theme <healing-paper|clinical-sage|dawn-clarity> [--variant <keycap|outline|paper|jelly|brush|sticker>] [--twilight]
 *   node scripts/apply-theme.mjs --self-test
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const STARTER_ROOT = resolve(__dirname, '..')

export const VALID_THEMES = ['healing-paper', 'clinical-sage', 'dawn-clarity']
export const VALID_VARIANTS = ['paper', 'outline', 'keycap', 'jelly', 'brush', 'sticker']

export function applyTheme(projectDir, options = {}) {
  const root = resolve(projectDir)
  const theme = options.theme || 'healing-paper'
  const variant = options.variant || 'keycap'
  const twilight = Boolean(options.twilight)

  if (!VALID_THEMES.includes(theme)) {
    throw new Error(`非法母题名称 "${theme}"；可选值：${VALID_THEMES.join(', ')}`)
  }
  if (!VALID_VARIANTS.includes(variant)) {
    throw new Error(`非法按钮变体 "${variant}"；可选值：${VALID_VARIANTS.join(', ')}`)
  }

  const results = { updatedFiles: [], theme, variant, twilight }

  // 1. 尝试同步 tokens CSS
  const srcCss = join(STARTER_ROOT, 'assets', `tokens.${theme}.css`)
  if (existsSync(srcCss)) {
    const cssContent = readFileSync(srcCss, 'utf8')
    const targetAssetCss = join(root, 'assets', `tokens.${theme}.css`)
    if (existsSync(join(root, 'assets'))) {
      writeFileSync(targetAssetCss, cssContent, 'utf8')
      results.updatedFiles.push(`assets/tokens.${theme}.css`)
    }
  }

  // 2. 检查 HTML 入口并更新根属性与变体
  const htmlTargets = [
    join(root, 'prototypes/v0.2/index.html'),
    join(root, 'public/index.html')
  ]

  for (const htmlPath of htmlTargets) {
    if (!existsSync(htmlPath)) continue
    let html = readFileSync(htmlPath, 'utf8')

    // 更新 <html> data-theme 与 data-twilight
    html = html.replace(/<html([^>]*)>/, (match, attrs) => {
      let nextAttrs = attrs
      if (/data-theme="[^"]*"/.test(nextAttrs)) {
        nextAttrs = nextAttrs.replace(/data-theme="[^"]*"/, `data-theme="${theme}"`)
      } else {
        nextAttrs += ` data-theme="${theme}"`
      }
      if (twilight) {
        if (!/data-twilight/.test(nextAttrs)) nextAttrs += ' data-twilight="true"'
      } else {
        nextAttrs = nextAttrs.replace(/\s*data-twilight="true"/g, '')
      }
      return `<html${nextAttrs}>`
    })

    // 更新 .hero-actions 与 .top-actions 变体属性
    html = html.replace(/(class="(?:hero-actions|top-actions)[^"]*")/g, (match) => {
      return `${match} data-variant="${variant}"`
    })

    writeFileSync(htmlPath, html, 'utf8')
    results.updatedFiles.push(htmlPath.replace(root + '/', ''))
  }

  return results
}

function selfTest() {
  const tmp = join(tmpdir(), 'test-apply-theme-' + Date.now())
  mkdirSync(join(tmp, 'prototypes/v0.2'), { recursive: true })
  mkdirSync(join(tmp, 'assets'), { recursive: true })

  try {
    const mockHtml = '<!doctype html>\n<html lang="zh-CN">\n<head></head>\n<body><div class="hero-actions"></div></body></html>'
    writeFileSync(join(tmp, 'prototypes/v0.2/index.html'), mockHtml, 'utf8')

    // 测试 1：应用 clinical-sage + keycap
    const res1 = applyTheme(tmp, { theme: 'clinical-sage', variant: 'keycap', twilight: true })
    if (res1.theme !== 'clinical-sage') throw new Error('Theme not set correctly')
    const applied1 = readFileSync(join(tmp, 'prototypes/v0.2/index.html'), 'utf8')
    if (!applied1.includes('data-theme="clinical-sage"')) throw new Error('HTML data-theme not injected')
    if (!applied1.includes('data-twilight="true"')) throw new Error('HTML data-twilight not injected')

    // 测试 2：应用 dawn-clarity + outline（日间）
    const res2 = applyTheme(tmp, { theme: 'dawn-clarity', variant: 'outline', twilight: false })
    const applied2 = readFileSync(join(tmp, 'prototypes/v0.2/index.html'), 'utf8')
    if (!applied2.includes('data-theme="dawn-clarity"')) throw new Error('HTML data-theme switch failed')
    if (applied2.includes('data-twilight="true"')) throw new Error('HTML data-twilight removal failed')

    // 测试 3：非法参数必须抛异常
    let threw = false
    try { applyTheme(tmp, { theme: 'non-existent' }) } catch { threw = true }
    if (!threw) throw new Error('Invalid theme did not throw')

    console.log('apply-theme --self-test: PASS（3/3 断言通过）')
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
}

const args = process.argv.slice(2)
if (args.includes('--self-test')) {
  selfTest()
  process.exit(0)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = args.find(a => !a.startsWith('-')) || process.cwd()
  const themeIdx = args.indexOf('--theme')
  const theme = themeIdx >= 0 ? args[themeIdx + 1] : 'healing-paper'
  const varIdx = args.indexOf('--variant')
  const variant = varIdx >= 0 ? args[varIdx + 1] : 'keycap'
  const twilight = args.includes('--twilight') || args.includes('--dark')

  try {
    const res = applyTheme(dir, { theme, variant, twilight })
    console.log(`✓ 成功固化母题 [${res.theme}] · 按钮变体 [${res.variant}] · 暗纸 [${res.twilight ? '开' : '关'}]`)
    for (const f of res.updatedFiles) console.log(`  更新：${f}`)
  } catch (err) {
    console.error(`✗ 固化失败：${err.message}`)
    process.exit(1)
  }
}
