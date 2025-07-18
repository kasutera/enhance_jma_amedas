// 1. 最新のアメダスデータ https://www.jma.go.jp/bosai/amedas/data/point/{code}/{yyyymmdd}_{hh}.json を取得する
// 2. 取得したデータから、絶対湿度 (enhance-abs-humidity), 露点温度 (enhance-dew-point) を算出する
// 3. 算出したデータを、DOM操作によってテーブルに挿入する

import { getAmdnoFromUrl } from '../jma_urls'
import { appendColumnToSeriestable, getTimeSeries } from './dom_handler'
import { type AmedasData, AmedasFetcher } from './jma_amedas_fetcher'
import { convertAmedasDataToSeriestableRow } from './presentation'

export function seriestable_main() {
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
}
