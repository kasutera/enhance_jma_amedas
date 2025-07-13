import { HumidCalculator } from '../math'
import type { AreastableColumn } from './dom_handler'
import type { AmedasData, Ameid } from './jma_amedas_fetcher'

const VOLUMETRIC_HUMIDITY_CLASS = 'td-volumetric-humidity'
const DEW_POINT_CLASS = 'td-dew-point'
const STANDARD_PRESSURE = 1013.25

const VALUES_PRECISION = 1

// AmedasData の配列を SeriestableRow (容積湿度, 露点温度) に変換する
export function convertAmedasDataToSeriestableRow(
  amdnos: Ameid[],
  amedasDatas: Record<Ameid, AmedasData>,
): [AreastableColumn, AreastableColumn] {
  const volumetricHumidityValues: Array<number | null> = []
  const dewPointValues: Array<number | null> = []
  for (const amdno of amdnos) {
    const amedasData = amedasDatas[amdno]
    if (!amedasData.humidity) {
      // 湿度がない場合は計算しない
      volumetricHumidityValues.push(null)
      dewPointValues.push(null)
      continue
    }
    const pressure = amedasData.pressure ?? STANDARD_PRESSURE
    const humidCalculator = new HumidCalculator(
      amedasData.temperature,
      amedasData.humidity,
      pressure,
    )
    volumetricHumidityValues.push(humidCalculator.volumetricHumidity)
    dewPointValues.push(humidCalculator.dewPoint)
  }
  const volumetricHumidityRow: AreastableColumn = {
    class: VOLUMETRIC_HUMIDITY_CLASS,
    headerValue: '容積絶対湿度',
    headerUnit: 'g/㎥',
    values: volumetricHumidityValues.map((value) => value?.toFixed(VALUES_PRECISION) || ''),
  }
  const dewPointRow: AreastableColumn = {
    class: DEW_POINT_CLASS,
    headerValue: '露点温度',
    headerUnit: '℃',
    values: dewPointValues.map((value) => value?.toFixed(VALUES_PRECISION) || ''),
  }
  return [volumetricHumidityRow, dewPointRow]
}
