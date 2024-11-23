"use strict";
// 1. 適切な最新のアメダスデータ https://www.jma.go.jp/bosai/amedas/data/point/{code}/{yyyymmdd}_{hh}.json を取得する
// 2. 取得したデータから、絶対湿度 (enhance-abs-humidity), 露点温度 (enhance-dew-point) を算出する
// 3. 算出したデータを、DOM操作によってテーブルに挿入する
import { fetch_latest_amedas_data } from "./latest_amedas"
import { get_amdno_from_url } from "./jma_urls"

const code = get_amdno_from_url(window.location.href)

// トップレベルのawaitを関数内に移動
async function init() {
    const data = await fetch_latest_amedas_data(code)
    console.log(data)
}

init()
