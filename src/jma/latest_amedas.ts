// 適切な最新のアメダスデータ https://www.jma.go.jp/bosai/amedas/data/point/{code}/{yyyymmdd}_{hh}.json を取得する
// import { fetch } from "undici"
import { latest_time_url, get_latest_amedas_url } from "./jma_urls"

async function fetch_latest_time(): Promise<string> {
    /**
     * @returns yyyy-mm-ddThh:mm:ss+09:00 (10分刻み)
     */
    const response_latest_time = await fetch(latest_time_url)
    return response_latest_time.text()
}

function latest_time_to_yyyymmdd_hh(latest_time: string): [string, string] {
    /**
     * @param latest_time yyyy-mm-ddThh:mm:ss+09:00 (10分刻み)
     * @returns [yyyymmdd, hh], ただし hh は 3 時間刻み (00, 03, 06, 09, 12, 15, 18, 21)
     */
    const pattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/
    const matched = latest_time.match(pattern)
    if (!matched) {
        throw new Error(`Invalid latest_time: ${latest_time}`)
    } else {
        const [_0, yyyy, mm, dd, hh, _1, _2] = matched
        const h_3 = Math.floor(parseInt(hh) / 3) * 3
        const hh_3 = h_3.toString().padStart(2, '0')
        return [`${yyyy}${mm}${dd}`, hh_3]
    }
}

async function fetch_latest_amedas_data(code: string): Promise<unknown> {
    const latest_time = await fetch_latest_time()
    const [yyyymmdd, hh] = latest_time_to_yyyymmdd_hh(latest_time)
    const url = get_latest_amedas_url(code, yyyymmdd, hh)

    const response = await fetch(url)
    return response.json()
}

export { fetch_latest_time, latest_time_to_yyyymmdd_hh, fetch_latest_amedas_data }
