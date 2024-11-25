'use strict'
// 1. 最新のアメダスデータ https://www.jma.go.jp/bosai/amedas/data/point/{code}/{yyyymmdd}_{hh}.json を取得する
// 2. 取得したデータから、絶対湿度 (enhance-abs-humidity), 露点温度 (enhance-dew-point) を算出する
// 3. 算出したデータを、DOM操作によってテーブルに挿入する
import {
  getSeriestables,
  appendColumnToSeriestable,
  getTimeSeries
} from './dom_handler'
import {
  type AmedasData,
  AmedasFetcher
} from './jma_amedas_fetcher'
import { getAmdnoFromUrl } from './jma_urls'
import { convertAmedasDataToSeriestableRow } from './presentation'

// dom が更新された時に以下を実行する
// FIXME: 表示形式を切り替えた後に上書きしてくれない
// FIXME: ウィンドウをリサイズすると行がどんどん増えていく
async function render (seriestable: HTMLTableElement): Promise<void> {
  const code = getAmdnoFromUrl(window.location.href)
  const timeseries = getTimeSeries(seriestable)
  const amedasDatas: AmedasData[] = []
  for (const date of timeseries) {
    const fetcher = new AmedasFetcher()
    const data = await fetcher.fetchAmedasData(code, date)
    amedasDatas.push(data)
  }
  const [volumetricHumidityRow, dewPointRow] = convertAmedasDataToSeriestableRow(amedasDatas)
  appendColumnToSeriestable(seriestable, volumetricHumidityRow)
  appendColumnToSeriestable(seriestable, dewPointRow)
}

const observer = new MutationObserver(() => {
  void (async () => {
    for (const seriestable of getSeriestables()) {
      observer.disconnect()
      await render(seriestable)
      observer.observe(seriestable, observeOptions)
    }
  })()
})
const observeOptions = { attributes: true, childList: true, subtree: true }
observer.observe(document.documentElement, observeOptions)
