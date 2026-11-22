# 社区开发 assets

## 官方三大母题与设计令牌系统（2026-11-22 升级）

针对小 X 宝家族覆盖的 86 个罕见病与 25+ 癌种的不同临床与患者语境，脚手架提供**三大官方母题**，遵循 W3C DTCG（Design Tokens Community Group）与 WCAG 2.2 医疗无障碍标准，并在每个母题中内置病房低照度「暗纸护眼模式（Paper Twilight）」：

| 母题标识 | 适用临床与病种语境 | 主辅基因与视觉调性 | WCAG 对比度 | 关键文件 |
| :--- | :--- | :--- | :--- | :--- |
| **治愈暖纸<br>(Healing Paper)** | 肿瘤、慢性免疫、康复期慢病（乳腺癌、鳞癌、皮肌炎等） | 主吉卜力手绘亲和（被托住的安心）+ 辅瑞士平面骨架；米白底 `#faf7f0` + 暖墨 `#4a4238` + 草木绿 `#4a7c59`。 | **WCAG 2.2 AA**<br>次级文本 `#6e6456` 对比度 **4.7:1** | `tokens.healing-paper.json`<br>`tokens.healing-paper.css` |
| **澄净冷青<br>(Clinical Sage)** | 出血性疾病、血液肿瘤、心血管急症（血友病、VWD3、心包炎、MDS 等） | 现代医学理性 + 北欧克制结构；清冷纸底 `#f4f7f6` + 冷炭 `#202d2c` + 冷青松石 `#1f5f5b`；纯无衬线消除低分屏断笔。 | **WCAG 2.2 AA**<br>次级文本 `#526664` 对比度 **5.36:1** | `tokens.clinical-sage.json`<br>`tokens.clinical-sage.css` |
| **晨曦大字<br>(Dawn Clarity)** | 老年退行性病变、视力减退、伴随眼疾患者群体 | 极端无障碍包容性设计；底色 `#f8f9fa` + 明晰蓝 `#0052cc` + 墨黑 `#111827`；正文基线 **17px**，触控区 **≥48px**。 | **WCAG 2.2 AAA**<br>文本对比度全线 **≥7.2:1** | `tokens.dawn-clarity.json`<br>`tokens.dawn-clarity.css` |

### 核心资产清单

- `tokens.healing-paper.json` / `.css`：治愈暖纸母题令牌与作用域覆盖层（含 mint/rose/lilac 色调与 Paper Twilight 暗纸）。
- `tokens.clinical-sage.json` / `.css`：澄净冷青母题令牌与覆盖层。
- `tokens.dawn-clarity.json` / `.css`：晨曦大字母题令牌与覆盖层（WCAG AAA 极端无障碍）。
- `tokens.css` / `tokens.json`：通用基础社区主题建议，作用域 `.wb-{slug}`。
- `patterns/buttons-pill-system.css`：胶囊三级层级按钮系统（实心主色唯一 / 键帽 keycap / 幽灵）+ 6 种变体（A 暖纸 / B 白瓷 / C 键帽 / D 果冻 / E 手绘 / F 贴纸）。
- `patterns/style-picker.js`：原型看板 hero 卡内风格预览选择器（无依赖经典脚本，三大母题 × 6 种按钮变体 × 夜间暗纸 × 4 种色调点选即时切换；构建期自动剥离）。
- `patterns/page-view.js` / `page-view.css`：32 号整页视图的可运行实现（导航栈、Esc 一层一退、浏览器返回键、`#page=` 深链、焦点与滚动恢复）。只放结构与版式，颜色用 `--pv-*` 由项目覆盖。
- `patterns/disease-primer.js` / `disease-primer.css`：36 号疾病概要（「?」入口）的整页实现。经典脚本（IIFE），点开是整页视图，数据来自 `window.DISEASE_PRIMER`。
- `brand/xyb-logo.png`：社区提供的 Logo 参考副本。
- `icons/flower-5.svg` / `flower-7.svg` / `clover.svg`：几何装饰图标，支持减少动效。
- `manifest.json`：记录所有资产来源、用途、体积、hash 与许可状态。

### 医疗图表 Viz 语义色彩系统

三大官方母题均统一定义了医疗图表专用语义令牌（`viz` 组 / `--wb-viz-*`），彻底解决图表元素色彩冲突：
- `viz.bandNormal`（`--wb-viz-band-normal`）：化验参考值正常区间带底色。
- `viz.markerAbnormal`（`--wb-viz-marker-abnormal`）：化验异常警示标记点（高对比赭红）。
- `viz.eventInfusion`（`--wb-viz-event-infusion`）：因子输注/化疗/用药事件纵向对齐线。
- `viz.eventBleed`（`--wb-viz-event-bleed`）：出血/发作区间阴影带。

### 原型挑款与一键固化

1. **原型期（M2）**：在看板添加 `<div data-style-picker></div>`，用户可实时体验三大母题、按钮效果与夜间模式；
2. **定稿固化**：运行 CLI 工具快速固化：
   ```bash
   node scripts/apply-theme.mjs <项目目录> --theme clinical-sage --variant keycap
   ```
3. **发布包防腐**：构建期 `migrate-public` 自动置 `SHOW_STYLE_PICKER = false`，单元测试双向断言确保正式包零原型选择器代码。
