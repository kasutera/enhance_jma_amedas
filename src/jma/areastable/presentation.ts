import {
  type DerivedObservationColumns,
  toDerivedObservationColumns,
} from '../derived_observations'
import type { AmedasData, Ameid } from './jma_amedas_fetcher'

function* observationsForStations(
  amdnos: readonly Ameid[],
  amedasDatas: Readonly<Record<Ameid, AmedasData>>,
): Generator<AmedasData | undefined> {
  for (const amdno of amdnos) {
    yield amedasDatas[amdno]
  }
}

/** 地点行の順序で派生観測値の3列を生成する。 */
export function convertAmedasDataToAreastableColumns(
  amdnos: readonly Ameid[],
  amedasDatas: Readonly<Record<Ameid, AmedasData>>,
): DerivedObservationColumns {
  return toDerivedObservationColumns(observationsForStations(amdnos, amedasDatas))
}
