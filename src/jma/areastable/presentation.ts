import {
  type DerivedObservationColumns,
  type ObservationInput,
  toDerivedObservationColumns,
} from '../derived_observations'

function* observationsForStations(
  stationIds: readonly string[],
  observations: Readonly<Record<string, ObservationInput | undefined>>,
): Generator<ObservationInput | undefined> {
  for (const stationId of stationIds) {
    yield observations[stationId]
  }
}

/** 地点行の順序で派生観測値の3列を生成する。 */
export function convertAmedasDataToAreastableColumns(
  stationIds: readonly string[],
  observations: Readonly<Record<string, ObservationInput | undefined>>,
): DerivedObservationColumns {
  return toDerivedObservationColumns(observationsForStations(stationIds, observations))
}
