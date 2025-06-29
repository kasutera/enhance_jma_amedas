import { latestTimeUrl } from './jma_urls'

export async function fetchLatestTime(): Promise<Date> {
  /**
   * @returns date - 最新のアメダスデータの時刻
   */
  const responseLatestTime = await fetch(latestTimeUrl)
  const text = (await responseLatestTime.text()).trim()
  return new Date(text)
}
