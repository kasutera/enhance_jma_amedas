import {
  type DerivedObservationColumns,
  toDerivedObservationColumns,
} from '../derived_observations'
import type { AmedasData } from './jma_amedas_fetcher'

/** 時系列の行順で派生観測値の3列を生成する。 */
export function convertAmedasDataToSeriestableColumns(
  amedasDatas: readonly AmedasData[],
): DerivedObservationColumns {
  return toDerivedObservationColumns(amedasDatas)
}
