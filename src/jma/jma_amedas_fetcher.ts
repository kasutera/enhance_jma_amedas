import { getAmedasUrl } from './jma_urls'

function dateToAmedasUrl (code: string, date: Date): string {
  /**
   * アメダスデータの URL を生成する
   * @param code - 観測所コード
   * @param date - データを取得した日時 (10分単位)
   * @returns アメダスデータの URL
   */
  const yyyymmdd = date.toISOString().slice(0, 10).replaceAll('-', '')
  const hh = date.getHours()
  // アメダスデータは3時間単位でデータがあるため、3時間単位の時間を取得する
  const hh3 = Math.floor(hh / 3) * 3
  const hh3str = hh3.toString().padStart(2, '0')
  return getAmedasUrl(code, yyyymmdd, hh3str)
}

interface TimeData {
  hour: number
  minute: number
}

type MeasurementValue = number[]

/**
 * アメダスの特定時刻における観測結果
 */
interface AmedasTimePoint {
  prefNumber: number
  observationNumber: number
  pressure?: MeasurementValue
  normalPressure?: MeasurementValue
  temp: MeasurementValue
  humidity: MeasurementValue
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
  temperature: number
  humidity: number
  date: Date
}

export function toAmedasData (fetched: FetchedAmedasData, date: Date): AmedasData {
  /**
   * fetch したアメダスデータを使いやすい形式に変換する
   * @param fetched - アメダスデータ
   * @param date - データを取得した日時 (10分単位)
   * @returns AmedasData
   */
  if (date.getMinutes() % 10 !== 0) {
    throw new Error(`date must be 10 minutes unit: ${date.toISOString()}`)
  }
  const yyyymmdd = date.toISOString().slice(0, 10).replaceAll('-', '')
  const hhmmss = date.getHours().toString().padStart(2, '0') + date.getMinutes().toString().padStart(2, '0') + '00'
  const timestamp: Timestamp = `${yyyymmdd}${hhmmss}`
  const timePoint = fetched[timestamp]
  return {
    pressure: timePoint.pressure?.[0],
    temperature: timePoint.temp[0],
    humidity: timePoint.humidity[0],
    date
  }
}

export class AmedasFetcher {
  private readonly cache = new Map<string, FetchedAmedasData>()

  async fetchAmedasData (code: string, date: Date): Promise<AmedasData> {
    /**
     * アメダスデータを取得する
     * @param code - 観測所コード
     * @param date - データを取得した日時 (10分単位)
     * @returns AmedasData
     */
    const url = dateToAmedasUrl(code, date)
    const cached = this.cache.get(url)
    if (cached !== undefined) {
      return toAmedasData(cached, date)
    }
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch data from ${url}`)
    }
    const json: FetchedAmedasData = await response.json()
    this.cache.set(url, json)
    return toAmedasData(json, date)
  }
}
