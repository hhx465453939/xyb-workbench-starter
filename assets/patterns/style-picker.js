/* 风格预览选择器（原型演示控件）· 按钮效果 A–F + 色调
 * 来源：squamous-cell-skin-cancer-workbench 0.2.0-rc.10（2026-11-21 用户互动实测形态）。
 * 用法：
 *   1. 页面容器：<div data-style-picker></div>（看板 hero 卡内）；本脚本自动渲染两组胶囊：
 *      按钮效果 A paper / B outline / C keycap / D jelly / E brush / F sticker
 *      色调 暖纸（默认，无属性）/ mint 淡绿 / rose 淡粉 / lilac 淡紫
 *   2. 按钮效果切换容器：.hero-actions 与 .top-actions（或容器上 data-variant-targets="选择器1,选择器2" 覆盖）；
 *   3. 色调切换：documentElement[data-tone]（配套 :root[data-tone=...] 令牌块见 tokens.healing-paper.css）。
 *   4. 配套样式：buttons-pill-system.css（.style-picker/.sp-chip/.sp-sep）。
 * 作用域：仅原型演示；正式版按所选固化，本控件由打包流程移除（squamous 仓 migrate-public BOOT_BLOCK 示例）。
 * 无依赖、经典脚本，file:// 可开。
 */
;(function (global) {
  'use strict'
  var VARIANTS = [
    ['paper', 'A 暖纸'], ['outline', 'B 白瓷'], ['keycap', 'C 键帽'],
    ['jelly', 'D 果冻'], ['brush', 'E 手绘'], ['sticker', 'F 贴纸']
  ]
  var TONES = [['', '暖纸'], ['mint', '淡绿'], ['rose', '淡粉'], ['lilac', '淡紫']]
  var DEFAULT_VARIANT = 'keycap' /* 2026-11-21 用户采纳 C */
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
    var currentVariant = (host.getAttribute('data-variant') || DEFAULT_VARIANT)
    var html = '<span class="sp-label">按钮效果：</span>' + VARIANTS.map(function (o) {
      return '<button type="button" class="sp-chip" data-sp-variant="' + esc(o[0]) + '" aria-pressed="' + (o[0] === currentVariant) + '">' + esc(o[1]) + '</button>'
    }).join('') +
    '<span class="sp-sep" aria-hidden="true"></span><span class="sp-label">色调：</span>' + TONES.map(function (o) {
      return '<button type="button" class="sp-chip" data-sp-tone="' + esc(o[0]) + '" aria-pressed="' + (o[0] === '') + '">' + esc(o[1]) + '</button>'
    }).join('') +
    '<span class="muted">点选即时预览（原型演示控件，正式版固化所选风格）</span>'
    host.innerHTML = html
    function setVariant(v) {
      targets.forEach(function (sel) {
        document.querySelectorAll(sel).forEach(function (c) { c.setAttribute('data-variant', v) })
      })
      host.querySelectorAll('[data-sp-variant]').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-sp-variant') === v))
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
      var vBtn = e.target.closest('[data-sp-variant]')
      if (vBtn) { setVariant(vBtn.getAttribute('data-sp-variant')); return }
      var tBtn = e.target.closest('[data-sp-tone]')
      if (tBtn) setTone(tBtn.getAttribute('data-sp-tone'))
    })
    setVariant(currentVariant)
  }
  global.StylePicker = { mount: mount }
  if (document.readyState !== 'loading') mount()
  else document.addEventListener('DOMContentLoaded', mount)
})(window)
