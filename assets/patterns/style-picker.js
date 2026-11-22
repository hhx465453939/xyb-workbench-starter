/* 风格预览选择器（原型演示控件）· 三大官方母题 + 按钮效果 A–F + 夜间暗纸 + 细节色调
 * 来源：squamous-cell-skin-cancer-workbench 0.2.0-rc.10；
 * 升级：2026-11-22 升级支持三大官方母题（治愈暖纸/澄净冷青/晨曦大字）与病房低照度暗纸模式。
 * 用法：
 *   1. 页面容器：<div data-style-picker></div>（看板 hero 卡内）；本脚本自动渲染四组胶囊：
 *      - 官方母题：healing-paper 治愈暖纸 / clinical-sage 澄净冷青 / dawn-clarity 晨曦大字
 *      - 按钮效果：A paper / B outline / C keycap（默认）/ D jelly / E brush / F sticker
 *      - 护眼模式：日间纸底 / 🌙 夜间暗纸（Paper Twilight）
 *      - 细节色调：暖纸（默认）/ mint 淡绿 / rose 淡粉 / lilac 淡紫
 *   2. 切换作用域：
 *      - documentElement[data-theme]：母题切换（配套 tokens.*.css）
 *      - documentElement[data-twilight]：低照度暗纸模式
 *      - 按钮效果：.hero-actions 与 .top-actions（或 data-variant-targets 覆盖）
 *      - documentElement[data-tone]：暖纸微调色
 * 作用域（用户规则 2026-11-21）：仅在原型 demo 确认阶段显示。定稿后开发版不得出现——
 *   原型留 `var SHOW_STYLE_PICKER = true`，构建期（migrate-public）置 `false` 并由测试断言。
 * 无依赖、经典脚本，file:// 可开。
 */
;(function (global) {
  'use strict'
  var THEMES = [
    ['healing-paper', '治愈暖纸'],
    ['clinical-sage', '澄净冷青'],
    ['dawn-clarity', '晨曦大字']
  ]
  var VARIANTS = [
    ['paper', 'A 暖纸'], ['outline', 'B 白瓷'], ['keycap', 'C 键帽'],
    ['jelly', 'D 果冻'], ['brush', 'E 手绘'], ['sticker', 'F 贴纸']
  ]
  var TWILIGHTS = [
    ['', '日间纸底'],
    ['twilight', '🌙 夜间暗纸']
  ]
  var TONES = [['', '暖纸'], ['mint', '淡绿'], ['rose', '淡粉'], ['lilac', '淡紫']]
  var DEFAULT_THEME = 'healing-paper'
  var DEFAULT_VARIANT = 'keycap' /* 2026-11-21 用户采纳 C 键帽 */

  var esc = function (v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    })
  }

  function mount() {
    var host = document.querySelector('[data-style-picker]')
    if (!host || host.dataset.mounted) return
    host.dataset.mounted = '1'

    var targets = (host.getAttribute('data-variant-targets') || '.hero-actions,.top-actions').split(',').map(function (s) { return s.trim() }).filter(Boolean)
    var currentTheme = host.getAttribute('data-theme') || DEFAULT_THEME
    var currentVariant = host.getAttribute('data-variant') || DEFAULT_VARIANT
    var currentTwilight = host.getAttribute('data-twilight') || ''

    var html =
      '<div class="style-picker" role="toolbar" aria-label="原型风格挑选器">' +
      '<span class="sp-label">官方母题：</span>' + THEMES.map(function (o) {
        return '<button type="button" class="sp-chip" data-sp-theme="' + esc(o[0]) + '" aria-pressed="' + (o[0] === currentTheme) + '">' + esc(o[1]) + '</button>'
      }).join('') +
      '<span class="sp-sep" aria-hidden="true"></span><span class="sp-label">按钮效果：</span>' + VARIANTS.map(function (o) {
        return '<button type="button" class="sp-chip" data-sp-variant="' + esc(o[0]) + '" aria-pressed="' + (o[0] === currentVariant) + '">' + esc(o[1]) + '</button>'
      }).join('') +
      '<span class="sp-sep" aria-hidden="true"></span><span class="sp-label">环境：</span>' + TWILIGHTS.map(function (o) {
        return '<button type="button" class="sp-chip" data-sp-twilight="' + esc(o[0]) + '" aria-pressed="' + (o[0] === currentTwilight) + '">' + esc(o[1]) + '</button>'
      }).join('') +
      '<span class="sp-sep" aria-hidden="true"></span><span class="sp-label">色调：</span>' + TONES.map(function (o) {
        return '<button type="button" class="sp-chip" data-sp-tone="' + esc(o[0]) + '" aria-pressed="' + (o[0] === '') + '">' + esc(o[1]) + '</button>'
      }).join('') +
      '<span class="muted sp-note">（点选即时预览 · 定稿后开发版自动固化）</span>' +
      '</div>'

    host.innerHTML = html

    function setTheme(t) {
      if (t) document.documentElement.setAttribute('data-theme', t)
      else document.documentElement.removeAttribute('data-theme')
      host.querySelectorAll('[data-sp-theme]').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-sp-theme') === t))
      })
    }

    function setVariant(v) {
      targets.forEach(function (sel) {
        document.querySelectorAll(sel).forEach(function (c) { c.setAttribute('data-variant', v) })
      })
      host.querySelectorAll('[data-sp-variant]').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-sp-variant') === v))
      })
    }

    function setTwilight(tw) {
      if (tw) {
        document.documentElement.setAttribute('data-twilight', 'true')
        document.documentElement.setAttribute('data-theme-mode', 'dark')
      } else {
        document.documentElement.removeAttribute('data-twilight')
        document.documentElement.removeAttribute('data-theme-mode')
      }
      host.querySelectorAll('[data-sp-twilight]').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-sp-twilight') === tw))
      })
    }

    function setTone(t) {
      if (t) document.documentElement.setAttribute('data-tone', t)
      else document.documentElement.removeAttribute('data-tone')
      host.querySelectorAll('[data-sp-tone]').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-sp-tone') === t))
      })
    }

    host.addEventListener('click', function (e) {
      var thBtn = e.target.closest('[data-sp-theme]')
      if (thBtn) { setTheme(thBtn.getAttribute('data-sp-theme')); return }
      var vBtn = e.target.closest('[data-sp-variant]')
      if (vBtn) { setVariant(vBtn.getAttribute('data-sp-variant')); return }
      var twBtn = e.target.closest('[data-sp-twilight]')
      if (twBtn) { setTwilight(twBtn.getAttribute('data-sp-twilight')); return }
      var tBtn = e.target.closest('[data-sp-tone]')
      if (tBtn) setTone(tBtn.getAttribute('data-sp-tone'))
    })

    setTheme(currentTheme)
    setVariant(currentVariant)
    setTwilight(currentTwilight)
  }

  global.StylePicker = { mount: mount }
  if (document.readyState !== 'loading') mount()
  else document.addEventListener('DOMContentLoaded', mount)
})(window)
