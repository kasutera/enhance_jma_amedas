import { areastable_main } from './areastable/areastable_main'
import { graph_main } from './graph/graph_main'
import { seriestable_main } from './seriestable/seriestable_main'

/**
 * メインアプリケーションの初期化
 * 既存機能との競合を避けるため、適切な順序で初期化を行う
 */
function initializeApplication(): void {
  try {
    seriestable_main()
    areastable_main()
    graph_main()
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
