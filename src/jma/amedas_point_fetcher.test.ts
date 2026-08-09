import { AmedasFetcher } from './amedas_point_fetcher'

describe('AmedasFetcher', () => {
  test('時刻範囲をJSTのURLとJSONキーで取得する', async () => {
    const fetchMock = jest.fn(async () => {
      return {
        ok: true,
        json: async () => ({
          '20260809002000': {
            pressure: [1000, 0],
            temp: [25, 0],
            humidity: [60, 0],
          },
        }),
      } as Response
    })
    global.fetch = fetchMock as jest.Mock

    const data = await new AmedasFetcher().fetchAmedasDataRange('44132', [
      new Date('2026-08-08T15:20:00Z'),
    ])

    expect(fetchMock).toHaveBeenCalledWith(
      'https://www.jma.go.jp/bosai/amedas/data/point/44132/20260809_00.json',
    )
    expect(data[0]).toMatchObject({ pressure: 1000, temperature: 25, humidity: 60 })
  })
})
