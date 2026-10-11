import areaFixture from '../areastable/testcases/jma_amedas_fetcher/with_null_values.json'
import pointFixture from '../seriestable/testcases/jma_amedas_fetcher/amedas_data.json'
import missingTimestampFixture from '../seriestable/testcases/jma_amedas_fetcher/missing_timestamp.json'
import { AmedasClient, fetchLatestTime } from './amedas_client'

function jsonResponse(value: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => value,
  } as Response
}

describe('AmedasClient', () => {
  test('decodes area measurements, retains quality, and includes missing station values', async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse(areaFixture))
    global.fetch = fetchMock as jest.Mock
    const date = new Date('2024-11-23T09:00:00Z')

    const observations = await new AmedasClient().fetchArea(date)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://www.jma.go.jp/bosai/amedas/data/map/20241123180000.json',
    )
    expect(Object.keys(observations)).toEqual(['44132', '44133', '44134'])
    expect(observations['44132']).toMatchObject({
      stationId: '44132',
      date,
      pressure: 1006.8,
      temperature: undefined,
      humidity: undefined,
      quality: { pressure: 0, temperature: 6, humidity: 6 },
      units: { temperature: '°C', humidity: '%', pressure: 'hPa' },
    })
    expect(observations['44133']).toMatchObject({
      temperature: 25.5,
      humidity: 60,
      quality: { temperature: 0, humidity: 0, pressure: undefined },
    })
    expect(observations['44134']).toMatchObject({
      pressure: undefined,
      temperature: undefined,
      humidity: 70,
      quality: { pressure: 6, temperature: 6, humidity: 0 },
    })
  })

  test('decodes point measurements from the existing fixture', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse(pointFixture)) as jest.Mock
    const date = new Date('2024-11-23T09:00:00Z')

    const observation = await new AmedasClient().fetchPoint('44132', date)

    expect(observation).toMatchObject({
      stationId: '44132',
      date,
      pressure: 1016.3,
      temperature: 12,
      humidity: 45,
      quality: { pressure: 0, temperature: 0, humidity: 0 },
      units: { pressure: 'hPa', temperature: '°C', humidity: '%' },
    })
  })

  test('fetches JST point blocks and preserves requested date order and zero values', async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === 'https://www.jma.go.jp/bosai/amedas/data/point/44132/20260809_00.json') {
        return jsonResponse({
          '20260809002000': { temp: [0, 6], humidity: [50, 1], pressure: [null, 6] },
          '20260809001000': { temp: [10, 0], humidity: [40, 0] },
        })
      }
      if (url === 'https://www.jma.go.jp/bosai/amedas/data/point/44132/20260809_03.json') {
        return jsonResponse({ '20260809030000': { temp: [30, 0], humidity: [60, 0] } })
      }
      throw new Error(`Unexpected URL: ${url}`)
    })
    global.fetch = fetchMock as jest.Mock
    const dates = [
      new Date('2026-08-08T15:20:00Z'),
      new Date('2026-08-08T18:00:00Z'),
      new Date('2026-08-08T15:10:00Z'),
    ]

    const observations = await new AmedasClient().fetchPointRange('44132', dates)

    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      'https://www.jma.go.jp/bosai/amedas/data/point/44132/20260809_00.json',
      'https://www.jma.go.jp/bosai/amedas/data/point/44132/20260809_03.json',
    ])
    expect(observations.map(({ date, temperature }) => [date, temperature])).toEqual([
      [dates[0], 0],
      [dates[1], 30],
      [dates[2], 10],
    ])
    expect(observations[0]).toMatchObject({
      humidity: 50,
      pressure: undefined,
      quality: { temperature: 6, humidity: 1, pressure: 6 },
    })
  })

  test('returns missing observations when a point timestamp is absent', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse(missingTimestampFixture)) as jest.Mock
    const date = new Date('2024-11-23T09:10:00Z')

    const observation = await new AmedasClient().fetchPoint('44132', date)

    expect(observation).toMatchObject({
      stationId: '44132',
      date,
      pressure: undefined,
      temperature: undefined,
      humidity: undefined,
      quality: { pressure: undefined, temperature: undefined, humidity: undefined },
    })
  })

  test('rejects malformed JSON and malformed consumed measurements', async () => {
    const client = new AmedasClient()
    global.fetch = jest.fn().mockResolvedValue(jsonResponse([])) as jest.Mock
    await expect(client.fetchArea(new Date('2024-11-23T09:00:00Z'))).rejects.toThrow(
      'Invalid JMA JSON object',
    )

    global.fetch = jest
      .fn()
      .mockResolvedValue(jsonResponse({ '20241123180000': { temp: ['25', 0] } })) as jest.Mock
    await expect(
      new AmedasClient().fetchPoint('44132', new Date('2024-11-23T09:00:00Z')),
    ).rejects.toThrow('Invalid JMA measurement value')
  })

  test('rejects point dates outside the ten-minute reporting grid', async () => {
    const fetchMock = jest.fn()
    global.fetch = fetchMock as jest.Mock

    await expect(
      new AmedasClient().fetchPoint('44132', new Date('2026-08-08T15:21:00Z')),
    ).rejects.toThrow('ten-minute')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('rejects HTTP errors', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({}, 503)) as jest.Mock

    await expect(new AmedasClient().fetchArea(new Date('2024-11-23T09:00:00Z'))).rejects.toThrow(
      'HTTP 503',
    )
  })
})

describe('fetchLatestTime', () => {
  test('parses a valid offset ISO timestamp as an actual instant', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '2026-08-09T00:00:00+09:00\n',
    }) as jest.Mock

    await expect(fetchLatestTime()).resolves.toEqual(new Date('2026-08-08T15:00:00Z'))
  })

  test.each([
    'not-a-date',
    '2026-08-09T00:00:00',
    '2026-02-30T00:00:00+09:00',
    '2026-08-09T00:01:00+09:00',
    '2026-08-09T00:00:01+09:00',
    '2026-08-09T00:00:00.000+09:00',
    '2026-08-09T24:00:00+09:00',
  ])('rejects invalid latest timestamp %s', async (text) => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => text,
    }) as jest.Mock

    await expect(fetchLatestTime()).rejects.toThrow('Invalid JMA latest time')
  })

  test('rejects latest-time HTTP errors', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => '',
    }) as jest.Mock

    await expect(fetchLatestTime()).rejects.toThrow('HTTP 500')
  })
})
