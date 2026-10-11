import { jstDateToTimestamp } from '../jma_datetime'
import { OBSERVATION_UNITS, type Observation } from '../observation'

const AREA_DATA_URL = 'https://www.jma.go.jp/bosai/amedas/data/map'
const POINT_DATA_URL = 'https://www.jma.go.jp/bosai/amedas/data/point'
const LATEST_TIME_URL = 'https://www.jma.go.jp/bosai/amedas/data/latest_time.txt'
const TEN_MINUTES_MILLISECONDS = 10 * 60 * 1000

interface Measurement {
  readonly value: number | undefined
  readonly quality: number | null | undefined
}

function asRecord(value: unknown, context: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Invalid JMA JSON object: ${context}`)
  }
  return value as Record<string, unknown>
}

function decodeMeasurement(
  record: Record<string, unknown>,
  field: 'temp' | 'humidity' | 'pressure',
  context: string,
): Measurement {
  const raw = record[field]
  if (raw === undefined) {
    return { value: undefined, quality: undefined }
  }
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error(`Invalid JMA measurement ${field}: ${context}`)
  }

  const rawValue: unknown = raw[0]
  if (rawValue !== null && (typeof rawValue !== 'number' || !Number.isFinite(rawValue))) {
    throw new Error(`Invalid JMA measurement value ${field}: ${context}`)
  }

  const rawQuality: unknown = raw[1]
  if (
    rawQuality !== undefined &&
    rawQuality !== null &&
    (typeof rawQuality !== 'number' || !Number.isFinite(rawQuality))
  ) {
    throw new Error(`Invalid JMA measurement quality ${field}: ${context}`)
  }

  return {
    value: rawValue === null ? undefined : rawValue,
    quality: rawQuality,
  }
}

function toObservation(
  stationId: string,
  date: Date,
  record: Record<string, unknown>,
  context: string,
): Observation {
  const temperature = decodeMeasurement(record, 'temp', context)
  const humidity = decodeMeasurement(record, 'humidity', context)
  const pressure = decodeMeasurement(record, 'pressure', context)
  return {
    stationId,
    date,
    temperature: temperature.value,
    humidity: humidity.value,
    pressure: pressure.value,
    quality: {
      temperature: temperature.quality,
      humidity: humidity.quality,
      pressure: pressure.quality,
    },
    units: OBSERVATION_UNITS,
  }
}

function timestampFor(date: Date): string {
  if (!Number.isFinite(date.getTime())) {
    throw new Error('Observation date must be a valid Date')
  }
  if (date.getTime() % TEN_MINUTES_MILLISECONDS !== 0) {
    throw new Error('Observation date must align with the ten-minute JMA reporting interval')
  }
  return jstDateToTimestamp(date)
}

function pointDataUrl(stationId: string, timestamp: string): string {
  const threeHourBlock = `${Math.floor(Number(timestamp.slice(8, 10)) / 3) * 3}`.padStart(2, '0')
  const date = timestamp.slice(0, 8)
  return `${POINT_DATA_URL}/${encodeURIComponent(stationId)}/${date}_${threeHourBlock}.json`
}

/** Reads the ISO timestamp published by JMA without accepting Date's loose parsing forms. */
function parseLatestTime(value: string): Date {
  const text = value.trim()
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(Z|[+-]\d{2}:\d{2})$/.exec(text)
  if (match === null) {
    throw new Error(`Invalid JMA latest time: ${text}`)
  }

  const [, yearText, monthText, dayText, hourText, minuteText, secondText, zone] = match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const hour = Number(hourText)
  const minute = Number(minuteText)
  const second = Number(secondText)
  const calendarDate = new Date(`${yearText}-${monthText}-${dayText}T00:00:00.000Z`)
  if (
    !Number.isFinite(calendarDate.getTime()) ||
    calendarDate.getUTCFullYear() !== year ||
    calendarDate.getUTCMonth() + 1 !== month ||
    calendarDate.getUTCDate() !== day ||
    hour > 23 ||
    minute > 59 ||
    minute % 10 !== 0 ||
    second !== 0
  ) {
    throw new Error(`Invalid JMA latest time: ${text}`)
  }

  if (zone !== 'Z') {
    const offsetHours = Number(zone.slice(1, 3))
    const offsetMinutes = Number(zone.slice(4, 6))
    if (offsetHours > 23 || offsetMinutes > 59) {
      throw new Error(`Invalid JMA latest time: ${text}`)
    }
  }

  const date = new Date(text)
  if (!Number.isFinite(date.getTime())) {
    throw new Error(`Invalid JMA latest time: ${text}`)
  }
  return date
}

export class AmedasClient {
  private readonly cache = new Map<string, Record<string, unknown>>()

  private async fetchRecord(url: string): Promise<Record<string, unknown>> {
    const cached = this.cache.get(url)
    if (cached !== undefined) {
      return cached
    }

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch JMA data from ${url}: HTTP ${response.status}`)
    }
    const record = asRecord(await response.json(), url)
    this.cache.set(url, record)
    return record
  }

  async fetchPoint(stationId: string, date: Date): Promise<Observation> {
    const timestamp = timestampFor(date)
    const url = pointDataUrl(stationId, timestamp)
    const record = await this.fetchRecord(url)
    const rawObservation = record[timestamp]
    if (rawObservation === undefined) {
      return toObservation(stationId, date, {}, `${url}#${timestamp}`)
    }
    return toObservation(
      stationId,
      date,
      asRecord(rawObservation, `${url}#${timestamp}`),
      `${url}#${timestamp}`,
    )
  }

  async fetchPointRange(stationId: string, dates: readonly Date[]): Promise<Observation[]> {
    const requests = dates.map((date) => {
      const timestamp = timestampFor(date)
      return { date, timestamp, url: pointDataUrl(stationId, timestamp) }
    })
    const urls = [...new Set(requests.map(({ url }) => url))]
    const records = new Map<string, Record<string, unknown>>()
    await Promise.all(
      urls.map(async (url) => {
        records.set(url, await this.fetchRecord(url))
      }),
    )

    return requests.map(({ date, timestamp, url }) => {
      const record = records.get(url)
      if (record === undefined) {
        throw new Error(`JMA point data was not loaded: ${url}`)
      }
      const rawObservation = record[timestamp]
      if (rawObservation === undefined) {
        return toObservation(stationId, date, {}, `${url}#${timestamp}`)
      }
      return toObservation(
        stationId,
        date,
        asRecord(rawObservation, `${url}#${timestamp}`),
        `${url}#${timestamp}`,
      )
    })
  }

  async fetchArea(date: Date): Promise<Record<string, Observation>> {
    const url = `${AREA_DATA_URL}/${timestampFor(date)}.json`
    const record = await this.fetchRecord(url)
    const observations: Record<string, Observation> = {}
    for (const [stationId, rawObservation] of Object.entries(record)) {
      observations[stationId] = toObservation(
        stationId,
        date,
        asRecord(rawObservation, `${url}#${stationId}`),
        `${url}#${stationId}`,
      )
    }
    return observations
  }
}

export async function fetchLatestTime(): Promise<Date> {
  const response = await fetch(LATEST_TIME_URL)
  if (!response.ok) {
    throw new Error(
      `Failed to fetch JMA latest time from ${LATEST_TIME_URL}: HTTP ${response.status}`,
    )
  }
  return parseLatestTime(await response.text())
}
