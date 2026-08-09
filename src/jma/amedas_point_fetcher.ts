import { dateToAmedasUrl } from './jma_urls'

interface TimeData {
  hour: number | null
  minute: number | null
}

type MeasurementValue = Array<number | null>

interface AmedasTimePoint {
  prefNumber: number
  observationNumber: number
  pressure?: MeasurementValue
  normalPressure?: MeasurementValue
  temp?: MeasurementValue
  humidity?: MeasurementValue
  snow?: MeasurementValue
  snow1h?: MeasurementValue
  snow6h?: MeasurementValue
  snow12h?: MeasurementValue
  snow24h?: MeasurementValue
  sun10m: MeasurementValue
  sun1h: MeasurementValue
  precipitation10m: MeasurementValue
  precipitation1h: MeasurementValue
  precipitation3h: MeasurementValue
  precipitation24h: MeasurementValue
  windDirection: MeasurementValue
  wind: MeasurementValue
  maxTempTime: TimeData
  maxTemp: MeasurementValue
  minTempTime: TimeData
  minTemp: MeasurementValue
  gustTime: TimeData
  gustDirection: MeasurementValue
  gust: MeasurementValue
}

type Timestamp = string

export type FetchedAmedasData = Record<Timestamp, AmedasTimePoint>

export interface AmedasData {
  pressure?: number
  temperature?: number
  humidity?: number
  date: Date
}

function getMeasurementValue(value: MeasurementValue | undefined): number | undefined {
  const measured = value?.[0]
  return measured === null || measured === undefined ? undefined : measured
}

export function toAmedasData(fetched: FetchedAmedasData, date: Date): AmedasData {
  if (date.getMinutes() % 10 !== 0) {
    throw new Error(`date must be 10 minutes unit: ${date.toISOString()}`)
  }
  const yyyymmdd =
    `${date.getFullYear()}` +
    `${(date.getMonth() + 1).toString().padStart(2, '0')}` +
    `${date.getDate().toString().padStart(2, '0')}`
  const hhmmss =
    date.getHours().toString().padStart(2, '0') +
    date.getMinutes().toString().padStart(2, '0') +
    '00'
  const timePoint = fetched[`${yyyymmdd}${hhmmss}`]

  if (timePoint === undefined) {
    return { pressure: undefined, temperature: undefined, humidity: undefined, date }
  }

  return {
    pressure: getMeasurementValue(timePoint.pressure),
    temperature: getMeasurementValue(timePoint.temp),
    humidity: getMeasurementValue(timePoint.humidity),
    date,
  }
}

export class AmedasFetcher {
  private readonly cache = new Map<string, FetchedAmedasData>()

  private async fetchFile(url: string): Promise<FetchedAmedasData> {
    const cached = this.cache.get(url)
    if (cached !== undefined) {
      return cached
    }
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch data from ${url}`)
    }
    const fetched: FetchedAmedasData = await response.json()
    this.cache.set(url, fetched)
    return fetched
  }

  async fetchAmedasData(code: string, date: Date): Promise<AmedasData> {
    const fetched = await this.fetchFile(dateToAmedasUrl(code, date))
    return toAmedasData(fetched, date)
  }

  async fetchAmedasDataRange(code: string, dates: Date[]): Promise<AmedasData[]> {
    const urls = [...new Set(dates.map((date) => dateToAmedasUrl(code, date)))]
    await Promise.all(urls.map((url) => this.fetchFile(url)))
    return dates.map((date) => {
      const fetched = this.cache.get(dateToAmedasUrl(code, date))
      if (fetched === undefined) {
        throw new Error(`Amedas data was not cached: ${date.toISOString()}`)
      }
      return toAmedasData(fetched, date)
    })
  }
}
