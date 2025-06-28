// 適切な最新のアメダスデータ https://www.jma.go.jp/bosai/amedas/data/point/{code}/{yyyymmdd}_{hh}.json を取得する
// import { fetch } from "undici"
import { getAmedasUrl, latestTimeUrl } from './jma_urls'

async function fetchLatestTime(): Promise<string> {
  /**
   * @returns yyyy-mm-ddThh:mm:ss+09:00 (10分刻み)
   */
  const responseLatestTime = await fetch(latestTimeUrl)
  return await responseLatestTime.text()
}

function latestTimeToAmedasDateTime(latestTime: string): [string, string] {
  /**
   * @param latestTime - yyyy-mm-ddThh:mm:ss+09:00 (10分刻み)
   * @returns [yyyymmdd, hh], ただし hh は 3 時間刻み (00, 03, 06, 09, 12, 15, 18, 21)
   */
  const pattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):\d{2}:\d{2}/
  const matched = latestTime.match(pattern)
  if (matched === null) {
    throw new Error(`Invalid latestTime: ${latestTime}`)
  }
  const [, yyyy, mm, dd, hh] = matched
  const h3 = Math.floor(Number.parseInt(hh) / 3) * 3
  const hh3 = h3.toString().padStart(2, '0')
  return [`${yyyy}${mm}${dd}`, hh3]
}

async function fetchLatestAmedasData(code: string): Promise<unknown> {
  const latestTime = await fetchLatestTime()
  const [yyyymmdd, hh] = latestTimeToAmedasDateTime(latestTime)
  const url = getAmedasUrl(code, yyyymmdd, hh)

  const response = await fetch(url)
  return await response.json()
}

export { fetchLatestTime, latestTimeToAmedasDateTime, fetchLatestAmedasData }
