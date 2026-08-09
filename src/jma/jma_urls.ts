import { getJstDateParts } from './jma_datetime'

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

/** 指定時刻を含む3時間分のアメダス観測データURLを返す。 */
export function dateToAmedasUrl(code: string, date: Date): string {
  const yyyymmdd =
    `${date.getFullYear()}` +
    `${(date.getMonth() + 1).toString().padStart(2, '0')}` +
    `${date.getDate().toString().padStart(2, '0')}`
  const hour = Math.floor(date.getHours() / 3) * 3
  return `https://www.jma.go.jp/bosai/amedas/data/point/${code}/${yyyymmdd}_${`${hour}`.padStart(2, '0')}.json`
}

/** JSTの実時刻を含む3時間分のアメダス観測データURLを返す。 */
export function jstDateToAmedasUrl(code: string, date: Date): string {
  const { year, month, day, hour } = getJstDateParts(date)
  const yyyymmdd = `${year}${`${month}`.padStart(2, '0')}${`${day}`.padStart(2, '0')}`
  const threeHourly = Math.floor(hour / 3) * 3
  return `https://www.jma.go.jp/bosai/amedas/data/point/${code}/${yyyymmdd}_${`${threeHourly}`.padStart(2, '0')}.json`
}
