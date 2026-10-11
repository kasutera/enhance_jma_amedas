import {
  type DerivedObservationColumns,
  type ObservationInput,
  toDerivedObservationColumns,
} from '../derived_observations'

/** 時系列の行順で派生観測値の3列を生成する。 */
export function convertAmedasDataToSeriestableColumns(
  observations: readonly ObservationInput[],
): DerivedObservationColumns {
  return toDerivedObservationColumns(observations)
}
