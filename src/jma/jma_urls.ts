/**
 * 最新時刻のURL yyyy-mm-ddThh:mm:ss+09:00 (10分刻み)
 */
const latestTimeUrl = 'https://www.jma.go.jp/bosai/amedas/data/latest_time.txt'

/**
 * @param code - アメダスコード
 * @param yyyymmdd - yyyymmdd
 * @param hh - 00, 03, 06, 09, 12, 15, 18, 21 (3時間刻み)
 * @returns 最新アメダスデータのURL
 */
function getLatestAmedasUrl (code: string, yyyymmdd: string, hh: string): string {
  // assert(hh === '00' || hh === '03' || hh === '06' || hh === '09' || hh === '12' || hh === '15' || hh === '18' || hh === '21')
  return `https://www.jma.go.jp/bosai/amedas/data/point/${code}/${yyyymmdd}_${hh}.json`
}

/**
 * URL parameter みたいなものからコード (amdno) を取得する
 * しかし、よく見ると ? ではなく # なので URL parameter ではない
 * @param url - URL like https://www.jma.go.jp/bosai/amedas/#area_type=offices&area_code=130000&amdno=44132&format=table10min&elems=53414
 * @returns amdno
 */
function getAmdnoFromUrl (url: string): string {
  const pattern = /[#&]amdno=(\d+)/
  const matched = url.match(pattern)
  if (matched === null) {
    throw new Error(`amdno not found in URL: ${url}`)
  }
  return matched[1]
}

export { latestTimeUrl, getLatestAmedasUrl, getAmdnoFromUrl }
