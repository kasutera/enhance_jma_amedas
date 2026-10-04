// 1. 最新のアメダスデータ https://www.jma.go.jp/bosai/amedas/data/point/{code}/{yyyymmdd}_{hh}.json を取得する
// 2. 取得したデータから、絶対湿度 (enhance-abs-humidity), 露点温度 (enhance-dew-point) を算出する
// 3. 算出したデータを、DOM操作によってテーブルに挿入する

import { globalColorScaleManager } from '../color_scale/color_scale_global'
import {
  applyEnhancedObservationVisibility,
  ensureEnhancedObservationSelector,
} from '../enhanced_observation_selector'
import { getAmdnoFromUrl } from '../jma_urls'
import { appendColumnToSeriestable, getTimeSeries } from './dom_handler'
import { type AmedasData, AmedasFetcher } from './jma_amedas_fetcher'
import { convertAmedasDataToSeriestableColumns } from './presentation'

export function seriestable_main() {
  const fetcher = new AmedasFetcher()
  ensureEnhancedObservationSelector()

  // dom が更新された時に以下を実行する
  async function render(seriestable: HTMLTableElement): Promise<void> {
    // JMAの表再生成時にも派生要素の選択UIを復元する。
    // JMA側の地点別ビットマスクには触れない。
    ensureEnhancedObservationSelector()

    const code = getAmdnoFromUrl(window.location.href)
    const timeseries = getTimeSeries(seriestable)
    const amedasDatas: AmedasData[] = []
    for (const date of timeseries) {
      const data = await fetcher.fetchAmedasData(code, date)
      amedasDatas.push(data)
    }
    const columns = convertAmedasDataToSeriestableColumns(amedasDatas)
    for (const column of columns) {
      appendColumnToSeriestable(seriestable, column)
    }

    // カラースケールを適用（全ての対象列）
    for (const column of columns) {
      globalColorScaleManager.applyColorScaleToColumn(seriestable, column.class)
    }

    applyEnhancedObservationVisibility(seriestable)
  }

  const observationTarget = document.querySelector('#amd-table')
  if (observationTarget === null) {
    throw new Error('amd-table not found')
  }

  const observer = new MutationObserver((mutationList: MutationRecord[]) => {
    void (async () => {
      for (const mutation of mutationList) {
        for (const addedNode of mutation.addedNodes) {
          if (
            addedNode instanceof HTMLElement &&
            addedNode.classList.contains('amd-table-seriestable')
          ) {
            if (addedNode.parentElement?.style.display === 'none') {
              // 親要素である contents-wide-table-* が非表示の場合は skip
              continue
            }
            observer.disconnect()
            await render(addedNode as HTMLTableElement)
            observer.observe(observationTarget, observeOptions)
          }
        }
      }
    })()
  })
  const observeOptions = { attributes: true, childList: true, subtree: true }
  observer.observe(observationTarget, observeOptions)

  // コンテナと表が一括挿入された場合、監視開始前の表も描画する。
  for (const table of observationTarget.querySelectorAll<HTMLTableElement>(
    '.amd-table-seriestable',
  )) {
    if (table.parentElement?.style.display !== 'none') {
      void render(table)
    }
  }
}
