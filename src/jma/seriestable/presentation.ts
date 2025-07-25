import { HumidCalculator } from '../math'
import { TABLE_CLASS_NAMES } from '../table_classes_definition'
import type { SeriestableRow } from './dom_handler'
import type { AmedasData } from './jma_amedas_fetcher'

const STANDARD_PRESSURE = 1013.25

const VALUES_PRECISION = 1

// AmedasData の配列を SeriestableRow (容積湿度, 露点温度, 不快指数) に変換する
export function convertAmedasDataToSeriestableRow(
  amedasDatas: AmedasData[],
): [SeriestableRow, SeriestableRow, SeriestableRow] {
  const volumetricHumidityValues: Array<number | null> = []
  const dewPointValues: Array<number | null> = []
  const temperatureHumidityIndexValues: Array<number | null> = []

  for (const amedasData of amedasDatas) {
    // 気温または湿度が欠損している場合は"---"を表示
    if (amedasData.temperature === undefined || amedasData.humidity === undefined) {
      volumetricHumidityValues.push(null)
      dewPointValues.push(null)
      temperatureHumidityIndexValues.push(null)
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
    temperatureHumidityIndexValues.push(humidCalculator.temperatureHumidityIndex)
  }

  const volumetricHumidityRow: SeriestableRow = {
    class: TABLE_CLASS_NAMES.volumetricHumidity,
    headerValue: '容積絶対湿度',
    headerUnit: 'g/㎥',
    values: volumetricHumidityValues.map((value) => value?.toFixed(VALUES_PRECISION) || '---'),
  }

  const dewPointRow: SeriestableRow = {
    class: TABLE_CLASS_NAMES.dewPoint,
    headerValue: '露点温度',
    headerUnit: '℃',
    values: dewPointValues.map((value) => value?.toFixed(VALUES_PRECISION) || '---'),
  }

  const temperatureHumidityIndexRow: SeriestableRow = {
    class: TABLE_CLASS_NAMES.temperatureHumidityIndex,
    headerValue: '不快指数',
    headerUnit: '',
    values: temperatureHumidityIndexValues.map(
      (value) => value?.toFixed(VALUES_PRECISION) || '---',
    ),
  }

  return [volumetricHumidityRow, dewPointRow, temperatureHumidityIndexRow]
}
