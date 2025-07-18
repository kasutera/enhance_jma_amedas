// 1. 最新のアメダスデータ https://www.jma.go.jp/bosai/amedas/data/point/{code}/{yyyymmdd}_{hh}.json を取得する
// 2. 取得したデータから、絶対湿度 (enhance-abs-humidity), 露点温度 (enhance-dew-point) を算出する
// 3. 算出したデータを、DOM操作によってテーブルに挿入する

import { getAmdnoFromUrl } from './jma_urls'
import { appendColumnToSeriestable, getTimeSeries } from './seriestable/dom_handler'
import { type AmedasData, AmedasFetcher } from './seriestable/jma_amedas_fetcher'
import { convertAmedasDataToSeriestableRow } from './seriestable/presentation'

const fetcher = new AmedasFetcher()

// dom が更新された時に以下を実行する
async function render(seriestable: HTMLTableElement): Promise<void> {
  const code = getAmdnoFromUrl(window.location.href)
  const timeseries = getTimeSeries(seriestable)
  const amedasDatas: AmedasData[] = []
  for (const date of timeseries) {
    const data = await fetcher.fetchAmedasData(code, date)
    amedasDatas.push(data)
  }
  const [volumetricHumidityRow, dewPointRow] = convertAmedasDataToSeriestableRow(amedasDatas)
  appendColumnToSeriestable(seriestable, volumetricHumidityRow)
  appendColumnToSeriestable(seriestable, dewPointRow)
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

// areastable 用の監視・編集処理

import { appendColumnToAreastable, getAmdnos } from './areastable/dom_handler'
import { AmedasFetcher as AreaAmedasFetcher } from './areastable/jma_amedas_fetcher'
import { convertAmedasDataToSeriestableRow as convertAmedasDataToAreastableRow } from './areastable/presentation'
import { fetchLatestTime } from './latest_amedas_date'

const areaFetcher = new AreaAmedasFetcher()

async function renderAreastable(areastable: HTMLTableElement): Promise<void> {
  // areastableは全観測所分を一度に表示するため、時系列は1つ（最新時刻）で良い
  // ここではテーブル内の観測所リストを取得し、最新時刻のデータを全観測所分取得する
  const amdnos = getAmdnos()
  // 最新時刻を推定（テーブル内のtrから取得する実装が必要だが、ここでは現在時刻を仮定）
  const latestTime = await fetchLatestTime()
  const fetched = await areaFetcher.fetchAmedasData(latestTime)
  const [volumetricHumidityRow, dewPointRow] = convertAmedasDataToAreastableRow(amdnos, fetched)
  appendColumnToAreastable(areastable, volumetricHumidityRow)
  appendColumnToAreastable(areastable, dewPointRow)
}

const areaObservationTarget = document.querySelector('#amd-table')
if (areaObservationTarget !== null) {
  const areaObserver = new MutationObserver((mutationList: MutationRecord[]) => {
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
            areaObserver.disconnect()
            await renderAreastable(addedNode as HTMLTableElement)
            areaObserver.observe(areaObservationTarget, observeOptions)
          }
        }
      }
    })()
  })
  areaObserver.observe(areaObservationTarget, observeOptions)
}
