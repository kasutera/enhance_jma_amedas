/**
 * 最新時刻のURL yyyy-mm-ddThh:mm:ss+09:00 (10分刻み)
 */
export const latestTimeUrl = 'https://www.jma.go.jp/bosai/amedas/data/latest_time.txt'

/**
 * URL parameter みたいなものからコード (amdno) を取得する
 * しかし、よく見ると ? ではなく # なので URL parameter ではない
 * @param url - URL like https://www.jma.go.jp/bosai/amedas/#area_type=offices&area_code=130000&amdno=44132&format=table10min&elems=53414
 * @returns amdno
 */
export function getAmdnoFromUrl(url: string): string {
  const pattern = /[#&]amdno=(\d+)/
  const matched = url.match(pattern)
  if (matched === null) {
    throw new Error(`amdno not found in URL: ${url}`)
  }
  return matched[1]
}
