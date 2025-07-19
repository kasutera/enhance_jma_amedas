import { areastable_main } from './areastable/areastable_main'
import { globalColorScaleManager } from './color_scale/color_scale_global'
import { ColorScaleUI } from './color_scale/color_scale_ui'
import { seriestable_main } from './seriestable/seriestable_main'

/**
 * メインアプリケーションの初期化
 * 既存機能との競合を避けるため、適切な順序で初期化を行う
 */
function initializeApplication(): void {
  try {
    // 1. 既存のテーブル機能を先に初期化
    // これにより、テーブルが存在する状態でカラースケール機能を初期化できる
    seriestable_main()
    areastable_main()

    // 2. カラースケールUIを初期化
    // テーブル機能の初期化後に実行することで、既存機能との競合を回避
    const colorScaleUI = new ColorScaleUI(globalColorScaleManager)

    // 短時間の遅延を設けてテーブルの初期化完了を待つ
    setTimeout(() => {
      colorScaleUI.initialize()
    }, 100)
  } catch (error) {
    console.error('アプリケーション初期化中にエラーが発生しました:', error)
    // エラーが発生しても既存機能は動作するようにする
  }
}

// ページ読み込み完了後にアプリケーションを初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApplication)
} else {
  initializeApplication()
}
