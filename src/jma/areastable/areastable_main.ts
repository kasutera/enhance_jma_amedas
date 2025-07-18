// areastable 用の監視・編集処理

import { globalColorScaleManager } from '../color_scale/color_scale_global'
import { fetchLatestTime } from '../latest_amedas_date'
import { appendColumnToAreastable, getAmdnos } from './dom_handler'
import { AmedasFetcher } from './jma_amedas_fetcher'
import { convertAmedasDataToSeriestableRow as convertAmedasDataToAreastableRow } from './presentation'

export function areastable_main() {
  const fetcher = new AmedasFetcher()

  async function renderAreastable(areastable: HTMLTableElement): Promise<void> {
    // areastableは全観測所分を一度に表示するため、時系列は1つ（最新時刻）で良い
    // ここではテーブル内の観測所リストを取得し、最新時刻のデータを全観測所分取得する
    const amdnos = getAmdnos()
    // 最新時刻を推定（テーブル内のtrから取得する実装が必要だが、ここでは現在時刻を仮定）
    const latestTime = await fetchLatestTime()
    const fetched = await fetcher.fetchAmedasData(latestTime)
    const [volumetricHumidityRow, dewPointRow, temperatureHumidityIndexRow] =
      convertAmedasDataToAreastableRow(amdnos, fetched)
    appendColumnToAreastable(areastable, volumetricHumidityRow)
    appendColumnToAreastable(areastable, dewPointRow)
    appendColumnToAreastable(areastable, temperatureHumidityIndexRow)

    // カラースケールを適用（全ての対象列）
    globalColorScaleManager.applyColorScaleToColumn(areastable, 'td-volumetric-humidity')
    globalColorScaleManager.applyColorScaleToColumn(areastable, 'td-dew-point')
    globalColorScaleManager.applyColorScaleToColumn(areastable, 'td-temperature-humidity-index')
  }

  const observationTarget = document.querySelector('#amd-table')
  if (observationTarget !== null) {
    const observer = new MutationObserver((mutationList: MutationRecord[]) => {
      void (async () => {
        for (const mutation of mutationList) {
          for (const addedNode of mutation.addedNodes) {
            if (
              addedNode instanceof HTMLElement &&
              addedNode.classList.contains('amd-areastable') &&
              addedNode.classList.contains('amd-table-responsive')
            ) {
              if (addedNode.parentElement?.style.display === 'none') {
                continue
              }
              observer.disconnect()
              await renderAreastable(addedNode as HTMLTableElement)
              observer.observe(observationTarget, observeOptions)
            }
          }
        }
      })()
    })
    const observeOptions = { attributes: true, childList: true, subtree: true }
    observer.observe(observationTarget, observeOptions)
  }
}
