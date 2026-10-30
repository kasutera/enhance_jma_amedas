import { getJmaRoute, getStationId, getTableRefreshRoute, navigateToStation } from './route'

beforeEach(() => {
  window.history.replaceState(null, '', '/')
})

it('地点コードをJMAハッシュから読み取る', () => {
  expect(getStationId('https://www.jma.go.jp/bosai/amedas/#amdno=44132')).toBe('44132')
  expect(
    getStationId(
      'https://www.jma.go.jp/bosai/amedas/#area_type=offices&area_code=130000&amdno=44132&format=table10min&elems=53414',
    ),
  ).toBe('44132')
  expect(() => getStationId('https://www.jma.go.jp/bosai/amedas/#amdno=abc')).toThrow(
    'amdno not found',
  )
  expect(() => getStationId('https://www.jma.go.jp/bosai/amedas/')).toThrow('amdno not found')
})

it.each([
  ['/#amdno=44132&datetime=202610041500', '2026-10-04T06:00:00.000Z'],
  ['/?datetime=202601010000#amdno=44132', '2025-12-31T15:00:00.000Z'],
])('過去日時をJSTの実時刻として読み、更新対象から除外する: %s', (url, expected) => {
  window.history.replaceState(null, '', url)
  expect(getJmaRoute().observationTime?.toISOString()).toBe(expected)
  expect(getTableRefreshRoute()).toBeNull()
})

it('地域表の観測要素変更は更新対象を変えず、地点表の粒度変更は更新対象を変える', () => {
  window.location.hash = 'area_type=offices&area_code=130000&format=table10min&elems=53414'
  const area = getTableRefreshRoute()
  window.location.hash = 'area_type=offices&area_code=130000&format=table1h&elems=5361c'
  expect(getTableRefreshRoute()).toEqual(area)
  window.location.hash = 'amdno=44132'
  expect(getTableRefreshRoute()?.kind).toBe('series-hourly')
  const hourly = getTableRefreshRoute()?.signature
  window.location.hash = 'amdno=44132&format=table10min'
  expect(getTableRefreshRoute()?.kind).toBe('series-ten-minute')
  expect(getTableRefreshRoute()?.signature).not.toBe(hourly)
  window.location.hash = 'amdno=44132&format=graph'
  expect(getTableRefreshRoute()).toBeNull()
})

it('地点変更は表示形式・観測要素・過去日時を保持し、未指定の地域情報だけを除去する', () => {
  window.location.hash =
    'area_type=offices&area_code=130000&amdno=44132&format=graph&elem=humidity&datetime=202610041500'
  navigateToStation({ amdno: '62078' })
  expect(getJmaRoute().stationId).toBe('62078')
  const parameters = new URLSearchParams(window.location.hash.slice(1))
  expect(parameters.get('format')).toBe('graph')
  expect(parameters.get('elem')).toBe('humidity')
  expect(parameters.get('datetime')).toBe('202610041500')
  expect(parameters.has('area_type')).toBe(false)
  expect(parameters.has('area_code')).toBe(false)
})
