import { jstDateToTimestamp } from '../jma_datetime'

export interface JmaRoute {
  readonly stationId: string | null
  readonly areaType: string | null
  readonly areaCode: string | null
  readonly format: string | null
  readonly historical: boolean
  readonly observationTime: Date | null
  readonly signature: string
}

export interface StationLocation {
  readonly amdno: string
  readonly areaType?: string
  readonly areaCode?: string
}

export interface TableRefreshRoute {
  readonly kind: 'area' | 'series-hourly' | 'series-ten-minute'
  readonly signature: string
}

/** JMAのハッシュ形式を読む唯一の境界。未指定の表示形式は地点の1時間表として扱う。 */
export function getJmaRoute(url: string = window.location.href): JmaRoute {
  const parsed = new URL(url)
  const parameters = new URLSearchParams(parsed.hash.slice(1))
  const datetime = parameters.get('datetime') ?? parsed.searchParams.get('datetime')
  const parts = datetime?.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(?:00)?$/)
  let observationTime = parts
    ? new Date(
        Date.UTC(
          Number(parts[1]),
          Number(parts[2]) - 1,
          Number(parts[3]),
          Number(parts[4]) - 9,
          Number(parts[5]),
        ),
      )
    : null
  if (
    observationTime !== null &&
    (observationTime.getUTCMinutes() % 10 !== 0 ||
      jstDateToTimestamp(observationTime).slice(0, 12) !== datetime?.slice(0, 12))
  ) {
    observationTime = null
  }
  return {
    stationId: parameters.get('amdno'),
    areaType: parameters.get('area_type'),
    areaCode: parameters.get('area_code'),
    format: parameters.get('format'),
    historical: parameters.has('datetime') || parsed.searchParams.has('datetime'),
    observationTime,
    signature: `${parsed.search}\u0000${parsed.hash}`,
  }
}

export function isGraphFormat(): boolean {
  return getJmaRoute().format === 'graph'
}

export function getTableRefreshRoute(): TableRefreshRoute | null {
  const route = getJmaRoute()
  if (
    route.historical ||
    (route.format !== null && route.format !== 'table1h' && route.format !== 'table10min')
  ) {
    return null
  }
  if (route.stationId !== null) {
    return route.stationId === ''
      ? null
      : {
          kind: route.format === 'table10min' ? 'series-ten-minute' : 'series-hourly',
          signature: `series\u0000${route.stationId}\u0000${route.format ?? 'table1h'}`,
        }
  }
  return route.areaType === null || route.areaCode === null
    ? null
    : { kind: 'area', signature: `area\u0000${route.areaType}\u0000${route.areaCode}` }
}

export function getStationId(url: string = window.location.href): string {
  const stationId = getJmaRoute(url).stationId
  if (stationId === null || !/^\d+$/.test(stationId)) {
    throw new Error(`amdno not found in URL: ${url}`)
  }
  return stationId
}

/** 地点変更時は表示形式・観測要素・日時の指定をそのまま保持する。 */
export function navigateToStation(station: StationLocation): void {
  const parameters = new URLSearchParams(window.location.hash.slice(1))
  parameters.set('amdno', station.amdno)
  for (const [key, value] of [
    ['area_type', station.areaType],
    ['area_code', station.areaCode],
  ] as const) {
    if (value === undefined) {
      parameters.delete(key)
    } else {
      parameters.set(key, value)
    }
  }
  window.location.hash = parameters.toString()
}

export function reloadJmaPage(): void {
  window.location.reload()
}
