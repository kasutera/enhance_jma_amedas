import {
  calculateDerivedObservations,
  calculateDewPoint,
  calculateTemperatureHumidityIndex,
  calculateVolumetricHumidity,
  type DerivedObservations,
} from './math'
import { TABLE_CLASS_NAMES } from './table_classes_definition'

export type DerivedObservationKey = keyof DerivedObservations

/** 表・グラフ・選択UIが共有する派生観測要素の定義。 */
export const DERIVED_OBSERVATION_DEFINITIONS = [
  {
    key: 'volumetricHumidity',
    label: '容積絶対湿度',
    unit: 'g/㎥',
    className: TABLE_CLASS_NAMES.volumetricHumidity,
    calculate: calculateVolumetricHumidity,
  },
  {
    key: 'dewPoint',
    label: '露点温度',
    unit: '℃',
    className: TABLE_CLASS_NAMES.dewPoint,
    calculate: calculateDewPoint,
  },
  {
    key: 'temperatureHumidityIndex',
    label: '不快指数',
    unit: '',
    className: TABLE_CLASS_NAMES.temperatureHumidityIndex,
    calculate: calculateTemperatureHumidityIndex,
  },
] as const satisfies readonly {
  key: DerivedObservationKey
  label: string
  unit: string
  className: string
  calculate: (temperature: number, relativeHumidity: number) => number
}[]

export type DerivedObservationDefinition = (typeof DERIVED_OBSERVATION_DEFINITIONS)[number]

interface HumidityObservation {
  readonly temperature?: number
  readonly humidity?: number
}

export interface DerivedObservationColumn {
  readonly class: string
  readonly headerValue: string
  readonly headerUnit: string
  readonly values: readonly string[]
}

export type DerivedObservationColumns = readonly [
  DerivedObservationColumn,
  DerivedObservationColumn,
  DerivedObservationColumn,
]

function hasHumidityObservation(
  observation: HumidityObservation | undefined,
): observation is Required<HumidityObservation> {
  return (
    observation !== undefined &&
    observation.temperature !== undefined &&
    observation.humidity !== undefined
  )
}

/** グラフ用の選択値を返す。気温または湿度が欠損している場合は null。 */
export function getDerivedObservationValue(
  observation: HumidityObservation | undefined,
  definition: DerivedObservationDefinition,
): number | null {
  return hasHumidityObservation(observation)
    ? definition.calculate(observation.temperature, observation.humidity)
    : null
}

function createDerivedColumn(definition: DerivedObservationDefinition) {
  return {
    class: definition.className,
    headerValue: definition.label,
    headerUnit: definition.unit,
    values: [] as string[],
  }
}

/** 入力順を保ち、小数1桁・欠損値「---」の表用3列を生成する。 */
export function toDerivedObservationColumns(
  observations: Iterable<HumidityObservation | undefined>,
): DerivedObservationColumns {
  const columns = [
    createDerivedColumn(DERIVED_OBSERVATION_DEFINITIONS[0]),
    createDerivedColumn(DERIVED_OBSERVATION_DEFINITIONS[1]),
    createDerivedColumn(DERIVED_OBSERVATION_DEFINITIONS[2]),
  ] as const

  for (const observation of observations) {
    const derived = hasHumidityObservation(observation)
      ? calculateDerivedObservations(observation.temperature, observation.humidity)
      : null
    for (let index = 0; index < columns.length; index++) {
      const value = derived?.[DERIVED_OBSERVATION_DEFINITIONS[index].key]
      columns[index].values.push(value?.toFixed(1) ?? '---')
    }
  }

  return columns
}
