const JST_OFFSET_MILLISECONDS = 9 * 60 * 60 * 1000
const OBSERVATION_TIME_SELECTOR = '.amd-areastable-span-obstime'
const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
}

interface ObservationTimeParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

function createJstDate({ year, month, day, hour, minute }: ObservationTimeParts): Date | null {
  if (
    year < 1000 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    minute % 10 !== 0
  ) {
    return null
  }

  let daysInMonth = 31
  if (month === 4 || month === 6 || month === 9 || month === 11) {
    daysInMonth = 30
  } else if (month === 2) {
    const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
    daysInMonth = isLeapYear ? 29 : 28
  }
  if (day > daysInMonth) {
    return null
  }

  return new Date(Date.UTC(year, month - 1, day, hour, minute) - JST_OFFSET_MILLISECONDS)
}

function parseObservationTime(text: string): Date | null {
  const japanese = text.match(
    /^\s*(\d{4})年(\d{1,2})月(\d{1,2})日\s*(\d{1,2})時(\d{1,2})分(?:\s*現在)?\s*$/,
  )
  if (japanese !== null) {
    const [, year, month, day, hour, minute] = japanese
    if (
      year === undefined ||
      month === undefined ||
      day === undefined ||
      hour === undefined ||
      minute === undefined
    ) {
      return null
    }
    return createJstDate({
      year: Number(year),
      month: Number(month),
      day: Number(day),
      hour: Number(hour),
      minute: Number(minute),
    })
  }

  const english = text.match(
    /^\s*As\s+of\s+(\d{1,2}):(\d{2})\s+JST,\s*(\d{1,2})\s+([A-Za-z]{3,9})\.?\s+(\d{4})\s*$/i,
  )
  if (english === null) {
    return null
  }

  const [, hour, minute, day, monthName, year] = english
  if (
    hour === undefined ||
    minute === undefined ||
    day === undefined ||
    monthName === undefined ||
    year === undefined
  ) {
    return null
  }
  const month = MONTHS[monthName.toLowerCase()]
  if (month === undefined) {
    return null
  }

  return createJstDate({
    year: Number(year),
    month,
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
  })
}

/** JMA地域表見出しの先頭にある観測時刻を、端末タイムゾーン非依存の実時刻として返す。 */
export function getAreastableObservationTime(root: ParentNode = document): Date | null {
  const observationTimeElement = root.querySelector(OBSERVATION_TIME_SELECTOR)
  if (observationTimeElement === null) {
    return null
  }
  return parseObservationTime(observationTimeElement.textContent ?? '')
}
