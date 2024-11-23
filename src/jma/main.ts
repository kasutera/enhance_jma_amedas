'use strict'
// 1. 適切な最新のアメダスデータ https://www.jma.go.jp/bosai/amedas/data/point/{code}/{yyyymmdd}_{hh}.json を取得する
// 2. 取得したデータから、絶対湿度 (enhance-abs-humidity), 露点温度 (enhance-dew-point) を算出する
// 3. 算出したデータを、DOM操作によってテーブルに挿入する
import { getAmdnoFromUrl } from './jma_urls'
import { fetchLatestAmedasData } from './latest_amedas'

const code = getAmdnoFromUrl(window.location.href)

// トップレベルのawaitを関数内に移動
async function init (): Promise<void> {
  const data = await fetchLatestAmedasData(code)
  console.log(data)
}

await init()
