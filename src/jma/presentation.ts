import { type SeriestableRow } from './dom_seriestable_handler'
import { type AmedasData } from './jma_amedas_fetcher'
import { HumidCalculator } from './math'

const VOLUMETRIC_HUMIDITY_CLASS = 'td-volumetric-humidity'
const DEW_POINT_CLASS = 'td-dew-point'
const STANDARD_PRESSURE = 1013.25

const VALUES_PRECISION = 1

// AmedasData の配列を SeriestableRow (容積湿度, 露点温度) に変換する
export function convertAmedasDataToSeriestableRow (amedasDatas: AmedasData[]): [SeriestableRow, SeriestableRow] {
  const volumetricHumidityValues: number[] = []
  const dewPointValues: number[] = []
  for (const amedasData of amedasDatas) {
    const pressure = amedasData.pressure ?? STANDARD_PRESSURE
    const humidCalculator = new HumidCalculator(amedasData.temperature, amedasData.humidity, pressure)
    volumetricHumidityValues.push(humidCalculator.volumetricHumidity)
    dewPointValues.push(humidCalculator.dewPoint)
  }
  const volumetricHumidityRow: SeriestableRow = {
    class: VOLUMETRIC_HUMIDITY_CLASS,
    headerValue: '容積絶対湿度',
    headerUnit: 'g/㎥',
    values: volumetricHumidityValues.map(value => value.toFixed(VALUES_PRECISION))
  }
  const dewPointRow: SeriestableRow = {
    class: DEW_POINT_CLASS,
    headerValue: '露点温度',
    headerUnit: '℃',
    values: dewPointValues.map(value => value.toFixed(VALUES_PRECISION))
  }
  return [volumetricHumidityRow, dewPointRow]
}
