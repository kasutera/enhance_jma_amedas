import { areastable_main } from './areastable/areastable_main'
import { initializeTableAutoRefresh } from './auto_refresh'
import { favorite_navigation_main } from './favorite_navigation/favorite_navigation_main'
import { graph_main } from './graph/graph_main'
import { seriestable_main } from './seriestable/seriestable_main'

/**
 * メインアプリケーションの初期化
 * JMA側のDOM生成が遅れても、各機能を独立して初期化する。
 */
function initializeFeature(name: string, initialize: () => unknown): void {
  try {
    initialize()
  } catch (error) {
    console.error(`${name}の初期化中にエラーが発生しました:`, error)
  }
}

function initializeTableFeatures(): void {
  const initialize = () => {
    initializeFeature('時系列表拡張', seriestable_main)
    initializeFeature('地域表拡張', areastable_main)
  }

  if (document.querySelector('#amd-table') !== null) {
    initialize()
    return
  }

  // iOS SafariのUserscriptsでは、document-end後にもJMA側の#amd-table生成が
  // 完了していないことがある。出現後に一度だけ表機能を初期化する。
  const observer = new MutationObserver(() => {
    if (document.querySelector('#amd-table') === null) {
      return
    }
    observer.disconnect()
    initialize()
  })
  observer.observe(document.documentElement, { childList: true, subtree: true })
}

export function initializeApplication(): void {
  initializeFeature('お気に入り操作', favorite_navigation_main)
  initializeFeature('派生グラフ', graph_main)
  initializeFeature('表の自動更新', initializeTableAutoRefresh)
  initializeTableFeatures()
}

// ページ読み込み完了後にアプリケーションを初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApplication)
} else {
  initializeApplication()
}
