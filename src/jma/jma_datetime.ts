const JST_OFFSET_MILLISECONDS = 9 * 60 * 60 * 1000

export interface JstDateParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

/** 実時刻を、端末のタイムゾーンに依存しない日本標準時の暦要素へ変換する。 */
export function getJstDateParts(date: Date): JstDateParts {
  const shifted = new Date(date.getTime() + JST_OFFSET_MILLISECONDS)
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  }
}

export function jstDateToTimestamp(date: Date): string {
  const { year, month, day, hour, minute } = getJstDateParts(date)
  return (
    `${year}` +
    `${month}`.padStart(2, '0') +
    `${day}`.padStart(2, '0') +
    `${hour}`.padStart(2, '0') +
    `${minute}`.padStart(2, '0') +
    '00'
  )
}
