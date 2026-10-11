import { areastable_main } from './areastable/areastable_main'
import { initializeTableAutoRefresh } from './auto_refresh'
import { initializeEnhancedObservationSelector } from './enhanced_observation_selector'
import { favorite_navigation_main } from './favorite_navigation/favorite_navigation_main'
import type { Feature } from './feature'
import { graph_main } from './graph/graph_main'
import { seriestable_main } from './seriestable/seriestable_main'

/** DOM監視と画面遷移の購読はここだけで所有し、全機能を一括して解除する。 */
export function initializeApplication(): () => void {
  let disposed = false
  let refreshQueued = false
  const features: Array<{ name: string; feature: Feature }> = []

  for (const [name, initialize] of [
    ['観測要素選択', initializeEnhancedObservationSelector],
    ['お気に入り操作', favorite_navigation_main],
    ['派生グラフ', graph_main],
    ['表の自動更新', initializeTableAutoRefresh],
    ['時系列表拡張', seriestable_main],
    ['地域表拡張', areastable_main],
  ] as const) {
    try {
      features.push({ name, feature: initialize() })
    } catch (error) {
      console.error(`${name}の初期化中にエラーが発生しました:`, error)
    }
  }

  function refresh(): void {
    refreshQueued = false
    if (disposed) {
      return
    }
    for (const { name, feature } of features) {
      try {
        feature.refresh()
      } catch (error) {
        console.error(`${name}の更新中にエラーが発生しました:`, error)
      }
    }
  }

  function scheduleRefresh(): void {
    if (!disposed && !refreshQueued) {
      refreshQueued = true
      queueMicrotask(refresh)
    }
  }

  const observer = new MutationObserver(scheduleRefresh)
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['hidden', 'style'],
  })
  window.addEventListener('hashchange', scheduleRefresh)
  window.addEventListener('popstate', scheduleRefresh)

  function dispose(): void {
    if (disposed) {
      return
    }
    disposed = true
    observer.disconnect()
    window.removeEventListener('hashchange', scheduleRefresh)
    window.removeEventListener('popstate', scheduleRefresh)
    window.removeEventListener('pagehide', handlePageHide)
    for (let index = features.length - 1; index >= 0; index--) {
      const { name, feature } = features[index]
      try {
        feature.dispose()
      } catch (error) {
        console.error(`${name}の解除中にエラーが発生しました:`, error)
      }
    }
  }

  function handlePageHide(event: PageTransitionEvent): void {
    // BFCacheでは同じページを保持する。ブラウザが処理を凍結するため選択状態も残す。
    if (!event.persisted) {
      dispose()
    }
  }

  window.addEventListener('pagehide', handlePageHide)
  refresh()
  return dispose
}
