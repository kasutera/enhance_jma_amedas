import { getJstDateParts } from '../jma_datetime'

const LATEST_ROW_SELECTOR =
  '.contents-wide-table-scroll .amd-table-seriestable .amd-table-tr-onthedot, ' +
  '.contents-wide-table-scroll .amd-table-seriestable .amd-table-tr-notonthedot'

interface ObservationTimeParts {
  month: number | undefined
  day: number
  hour: number
  minute: number
}

function getObservationTimeParts(root: ParentNode): ObservationTimeParts | null {
  const row = root.querySelector(LATEST_ROW_SELECTOR)
  const dayText = row?.querySelector('td[rowspan]')?.textContent?.trim() ?? ''
  const timeText = row?.querySelector('td:not([rowspan])')?.textContent?.trim() ?? ''
  const japaneseDay = dayText.match(/^(\d{1,2})日$/)
  const englishDay = dayText.match(/^(\d{1,2})\/(\d{1,2})$/)
  const time = timeText.match(/^(\d{2}):(\d{2})$/)
  if ((japaneseDay === null && englishDay === null) || time === null) {
    return null
  }
  const month = englishDay === null ? undefined : Number(englishDay[1])
  const day = Number(japaneseDay?.[1] ?? englishDay?.[2])
  const hour = Number(time[1])
  const minute = Number(time[2])
  if (
    (month !== undefined && (month < 1 || month > 12)) ||
    day < 1 ||
    day > 31 ||
    hour > 24 ||
    minute > 59 ||
    minute % 10 !== 0 ||
    (hour === 24 && minute !== 0)
  ) {
    return null
  }
  return { month, day, hour, minute }
}

/** 表の先頭にある最新行の日付・時刻が読み取れるまで更新確認を待つ。 */
export function hasSeriestableObservationTime(root: ParentNode = document): boolean {
  return getObservationTimeParts(root) !== null
}

/** 日付の年・月は公開時刻を基準に補い、端末の時計やタイムゾーンには依存しない。 */
export function getSeriestableObservationTime(
  latestTime: Date,
  root: ParentNode = document,
): Date | null {
  if (!Number.isFinite(latestTime.getTime())) {
    return null
  }
  const parts = getObservationTimeParts(root)
  if (parts === null) {
    return null
  }
  const reference = getJstDateParts(latestTime)
  let year = reference.year
  let monthIndex = (parts.month ?? reference.month) - 1
  const referenceDay = Date.UTC(year, reference.month - 1, reference.day)
  const currentDay = Date.UTC(year, monthIndex, parts.day)
  const adjacentYear =
    parts.month === undefined ? year : year + (parts.month > reference.month ? -1 : 1)
  const adjacentMonth =
    parts.month === undefined ? monthIndex + (parts.day > reference.day ? -1 : 1) : monthIndex
  const adjacentDay = Date.UTC(adjacentYear, adjacentMonth, parts.day)
  // 最新時刻の応答が古い場合、表示行が翌月・翌年でも過去の日付と誤認しない。
  if (Math.abs(adjacentDay - referenceDay) < Math.abs(currentDay - referenceDay)) {
    year = adjacentYear
    monthIndex = adjacentMonth
  }
  const date = new Date(Date.UTC(year, monthIndex, parts.day))
  if (date.getUTCDate() !== parts.day) {
    return null
  }
  date.setUTCHours(parts.hour - 9, parts.minute, 0, 0)
  return date
}
