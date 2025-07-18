import { areastable_main } from './areastable/areastable_main'
import { globalColorScaleManager } from './color_scale/color_scale_global'
import { ColorScaleUI } from './color_scale/color_scale_ui'
import { seriestable_main } from './seriestable/seriestable_main'

// カラースケールUIを初期化
const colorScaleUI = new ColorScaleUI(globalColorScaleManager)

// ページ読み込み完了後にUIを初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    colorScaleUI.initialize()
  })
} else {
  colorScaleUI.initialize()
}

seriestable_main()
areastable_main()
