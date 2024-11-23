'use strict'
// 1. 最新のアメダスデータ https://www.jma.go.jp/bosai/amedas/data/point/{code}/{yyyymmdd}_{hh}.json を取得する
// 2. 取得したデータから、絶対湿度 (enhance-abs-humidity), 露点温度 (enhance-dew-point) を算出する
// 3. 算出したデータを、DOM操作によってテーブルに挿入する
import {
  getSeriestables,
  type SeriestableRow,
  appendColumnToSeriestable
} from './dom_handler'
import { getAmdnoFromUrl } from './jma_urls'
import { fetchLatestAmedasData } from './latest_amedas'

const code = getAmdnoFromUrl(window.location.href)

// トップレベルのawaitを関数内に移動
// async function init (): Promise<void> {
//   const data = await fetchLatestAmedasData(code)
//   console.log(data)
// }

// await init()

// dom が更新された時に以下を実行する
// TODO: 表示形式を切り替えた後に上書きしてくれない
const observer = new MutationObserver(() =>
  getSeriestables().forEach(seriestable => {
    // stop observer
    observer.disconnect()

    const str: SeriestableRow = {
      class: 'new-class',
      headerValue: 'headerValue',
      headerUnit: 'headerUnit',
      values: ['value1', 'value2']
    }
    appendColumnToSeriestable(seriestable, str)

    // start observer
    observer.observe(seriestable, observeOptions)
  })
)
const observeOptions = { attributes: true, childList: true, subtree: true }
observer.observe(document.documentElement, observeOptions)
