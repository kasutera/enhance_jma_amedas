/**
 * @param date
 * @returns アメダスデータのURL
 */
export function dateToAmedasUrl(date: Date): string {
  /**
   * アメダスデータの URL を生成する
   * @param date - データを取得した日時 (10分単位)
   * @returns アメダスデータの URL
   */
  const yyyymmddhhmmss =
    `${date.getFullYear()}` +
    `${(date.getMonth() + 1).toString().padStart(2, '0')}` +
    `${date.getDate().toString().padStart(2, '0')}` +
    `${date.getHours().toString().padStart(2, '0')}` +
    `${date.getMinutes().toString().padStart(2, '0')}` +
    '00'
  return `https://www.jma.go.jp/bosai/amedas/data/map/${yyyymmddhhmmss}.json`
}

type MeasurementValue = number[]

/**
 * アメダスの特定時刻における観測結果
 * {
 *  "temp": [19.4, 0],
 *  "humidity": [65, 0],
 *  "snow1h": [0, null],
 *  "snow6h": [0, null],
 *  "snow12h": [0, null],
 *  "snow24h": [0, null],
 *  "sun10m": [10, 0],
 *  "sun1h": [1, 0],
 *  "precipitation10m": [0, 0],
 *  "precipitation1h": [0, 0],
 *  "precipitation3h": [0, 0],
 *  "precipitation24h": [0, 0],
 *  "windDirection": [11, 0],
 *  "wind": [6.7, 0]
 * }
 */
interface AmedasTimePoint {
  pressure?: MeasurementValue
  normalPressure?: MeasurementValue
  temp?: MeasurementValue
  humidity?: MeasurementValue
  snow?: MeasurementValue
  snow1h?: MeasurementValue
  snow6h?: MeasurementValue
  snow12h?: MeasurementValue
  snow24h?: MeasurementValue
  sun10m?: MeasurementValue
  sun1h?: MeasurementValue
  precipitation10m?: MeasurementValue
  precipitation1h?: MeasurementValue
  precipitation3h?: MeasurementValue
  precipitation24h?: MeasurementValue
  windDirection?: MeasurementValue
  wind?: MeasurementValue
}

export type Ameid = string // 観測所コード (例: "44132")

// ameid to AmedasTimePoint
export type FetchedAmedasData = Record<Ameid, AmedasTimePoint>

export interface AmedasData {
  /**
   * このプログラムで使用するためのアメダスデータのデータ形式
   * temperature, humidity が無い場合、本プログラムの性質上不要なため表現しない
   * @param pressure: 気圧 (hPa)
   * @param temperature: 気温 (℃)
   * @param humidity: 湿度 (%)
   * @param date: データを取得した日時 (10分単位)
   */
  pressure?: number
  temperature?: number
  humidity?: number
  date: Date
}

export function toAmedasData(fetched: FetchedAmedasData, date: Date): Record<Ameid, AmedasData> {
  /**
   * fetch したアメダスデータを使いやすい形式に変換する
   * @param fetched - アメダスデータ
   * @param date - データを取得した日時 (10分単位)
   * @returns AmedasData
   */
  const record: Record<Ameid, AmedasData> = {}
  for (const ameid in fetched) {
    const point = fetched[ameid]
    if (!point.temp || !point.humidity) {
      // 気温または湿度の項目がない場合は無視する
      continue
    }

    record[ameid] = {
      pressure: point.pressure?.[0] === null ? undefined : point.pressure?.[0],
      temperature: point.temp[0] === null ? undefined : point.temp[0],
      humidity: point.humidity[0] === null ? undefined : point.humidity[0],
      date,
    }
  }
  return record
}

export class AmedasFetcher {
  private readonly cache = new Map<string, FetchedAmedasData>()

  async fetchAmedasData(date: Date): Promise<Record<Ameid, AmedasData>> {
    /**
     * アメダスデータを取得する
     * @param date - データを取得した日時 (10分単位)
     * @returns AmedasData
     */
    const url = dateToAmedasUrl(date)
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
