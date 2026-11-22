import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { applyTheme, VALID_THEMES } from '../scripts/apply-theme.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function hexToRgb(hex) {
  const clean = hex.replace('#', '')
  const num = parseInt(clean, 16)
  return [num >> 16, (num >> 8) & 255, num & 255]
}

function relativeLuminance([r, g, b]) {
  const [rs, gs, bs] = [r, g, b].map(v => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

function contrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(hexToRgb(hex1))
  const l2 = relativeLuminance(hexToRgb(hex2))
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

test('官方三大母题文件存在且完整', () => {
  for (const t of VALID_THEMES) {
    const jsonPath = join(ROOT, 'assets', `tokens.${t}.json`)
    const cssPath = join(ROOT, 'assets', `tokens.${t}.css`)
    assert.ok(existsSync(jsonPath), `tokens.${t}.json 缺失`)
    assert.ok(existsSync(cssPath), `tokens.${t}.css 缺失`)

    const data = JSON.parse(readFileSync(jsonPath, 'utf8'))
    assert.ok(data.color, `${t} 必须声明 color`)
    assert.ok(data.chart, `${t} 必须声明 chart`)
    assert.ok(data.viz, `${t} 必须声明 viz 医疗图表语义`)
    assert.ok(data.twilight, `${t} 必须声明 twilight 夜间暗纸调`)
    assert.ok(data.font, `${t} 必须声明 font`)

    // 医疗图表四部件语义
    assert.ok(data.viz.bandNormal, `${t} 缺少 bandNormal 正常值区间带`)
    assert.ok(data.viz.markerAbnormal, `${t} 缺少 markerAbnormal 异常标记点`)
    assert.ok(data.viz.eventInfusion, `${t} 缺少 eventInfusion 输注事件线`)
    assert.ok(data.viz.eventBleed, `${t} 缺少 eventBleed 发作/出血区间带`)
  }
})

test('治愈暖纸（Healing Paper）满足 WCAG 2.2 AA 级对比度', () => {
  const data = JSON.parse(readFileSync(join(ROOT, 'assets/tokens.healing-paper.json'), 'utf8'))
  const paper = data.color.paper.$value
  const ink = data.color.ink.$value
  const muted = data.color.muted.$value

  const inkRatio = contrastRatio(ink, paper)
  const mutedRatio = contrastRatio(muted, paper)

  assert.ok(inkRatio >= 7.0, `正文墨色对比度 ${inkRatio.toFixed(2)}:1 必须 ≥ 7.0`)
  assert.ok(mutedRatio >= 4.5, `次级文本对比度 ${mutedRatio.toFixed(2)}:1 必须 ≥ 4.5 (WCAG AA)`)
})

test('澄净冷青（Clinical Sage）满足 WCAG 2.2 AA 级对比度', () => {
  const data = JSON.parse(readFileSync(join(ROOT, 'assets/tokens.clinical-sage.json'), 'utf8'))
  const paper = data.color.paper.$value
  const ink = data.color.ink.$value
  const muted = data.color.muted.$value

  const inkRatio = contrastRatio(ink, paper)
  const mutedRatio = contrastRatio(muted, paper)

  assert.ok(inkRatio >= 7.0, `正文冷炭对比度 ${inkRatio.toFixed(2)}:1 必须 ≥ 7.0`)
  assert.ok(mutedRatio >= 4.5, `次级文本对比度 ${mutedRatio.toFixed(2)}:1 必须 ≥ 4.5 (WCAG AA)`)
})

test('晨曦大字（Dawn Clarity）满足 WCAG 2.2 AAA 级高对比度（≥7.0:1）', () => {
  const data = JSON.parse(readFileSync(join(ROOT, 'assets/tokens.dawn-clarity.json'), 'utf8'))
  const paper = data.color.paper.$value
  const ink = data.color.ink.$value
  const muted = data.color.muted.$value

  const inkRatio = contrastRatio(ink, paper)
  const mutedRatio = contrastRatio(muted, paper)

  assert.ok(inkRatio >= 10.0, `正文对比度 ${inkRatio.toFixed(2)}:1 必须 ≥ 10.0`)
  assert.ok(mutedRatio >= 7.0, `次级文本对比度 ${mutedRatio.toFixed(2)}:1 必须 ≥ 7.0 (WCAG AAA 极端无障碍)`)
})

test('低照度病房暗纸模式（Paper Twilight）色彩对比度合格', () => {
  for (const t of VALID_THEMES) {
    const data = JSON.parse(readFileSync(join(ROOT, 'assets', `tokens.${t}.json`), 'utf8'))
    const darkPaper = data.twilight.paper.$value
    const darkInk = data.twilight.ink.$value
    const darkMuted = data.twilight.muted.$value

    const inkRatio = contrastRatio(darkInk, darkPaper)
    const mutedRatio = contrastRatio(darkMuted, darkPaper)

    assert.ok(inkRatio >= 7.0, `${t} 暗色正文对比度 ${inkRatio.toFixed(2)}:1 必须 ≥ 7.0`)
    assert.ok(mutedRatio >= 4.5, `${t} 暗色次级文本对比度 ${mutedRatio.toFixed(2)}:1 必须 ≥ 4.5`)
  }
})

test('CSS 令牌中无裸露 <slug> 占位符注释（L164）', () => {
  for (const t of VALID_THEMES) {
    const css = readFileSync(join(ROOT, 'assets', `tokens.${t}.css`), 'utf8')
    assert.ok(!css.includes('<slug>'), `tokens.${t}.css 中禁止包含裸露 <slug>`)
  }
})
