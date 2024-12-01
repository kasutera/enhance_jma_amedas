import {
  type FetchedAmedasData,
  toAmedasData,
  dateToAmedasUrl
} from './jma_amedas_fetcher'
import amedasDataJson from './testcases/jma_amedas_fetcher/amedas_data.json'

describe('jma_amedas_fetcher', () => {
  it('dateToAmedasUrl', () => {
    const code = '44132'
    const testCases = [
      { date: new Date('2024-11-23T00:00:00'), url: 'https://www.jma.go.jp/bosai/amedas/data/point/44132/20241123_00.json' },
      { date: new Date('2024-11-23T00:10:00'), url: 'https://www.jma.go.jp/bosai/amedas/data/point/44132/20241123_00.json' },
      { date: new Date('2024-11-23T02:50:00'), url: 'https://www.jma.go.jp/bosai/amedas/data/point/44132/20241123_00.json' },
      { date: new Date('2024-11-23T03:00:00'), url: 'https://www.jma.go.jp/bosai/amedas/data/point/44132/20241123_03.json' },
      { date: new Date('2024-11-23T03:10:00'), url: 'https://www.jma.go.jp/bosai/amedas/data/point/44132/20241123_03.json' },
      { date: new Date('2024-11-23T05:50:00'), url: 'https://www.jma.go.jp/bosai/amedas/data/point/44132/20241123_03.json' },
      { date: new Date('2024-11-23T06:00:00'), url: 'https://www.jma.go.jp/bosai/amedas/data/point/44132/20241123_06.json' },
      { date: new Date('2024-11-23T06:10:00'), url: 'https://www.jma.go.jp/bosai/amedas/data/point/44132/20241123_06.json' },
      { date: new Date('2024-11-23T08:50:00'), url: 'https://www.jma.go.jp/bosai/amedas/data/point/44132/20241123_06.json' },
      { date: new Date('2024-11-23T09:00:00'), url: 'https://www.jma.go.jp/bosai/amedas/data/point/44132/20241123_09.json' },
      { date: new Date('2024-11-23T09:10:00'), url: 'https://www.jma.go.jp/bosai/amedas/data/point/44132/20241123_09.json' },
      { date: new Date('2024-11-23T11:50:00'), url: 'https://www.jma.go.jp/bosai/amedas/data/point/44132/20241123_09.json' },
      { date: new Date('2024-11-23T12:00:00'), url: 'https://www.jma.go.jp/bosai/amedas/data/point/44132/20241123_12.json' },
      { date: new Date('2024-11-23T12:10:00'), url: 'https://www.jma.go.jp/bosai/amedas/data/point/44132/20241123_12.json' },
      { date: new Date('2024-11-23T14:50:00'), url: 'https://www.jma.go.jp/bosai/amedas/data/point/44132/20241123_12.json' },
      { date: new Date('2024-11-23T15:00:00'), url: 'https://www.jma.go.jp/bosai/amedas/data/point/44132/20241123_15.json' },
      { date: new Date('2024-11-23T15:10:00'), url: 'https://www.jma.go.jp/bosai/amedas/data/point/44132/20241123_15.json' },
      { date: new Date('2024-11-23T17:50:00'), url: 'https://www.jma.go.jp/bosai/amedas/data/point/44132/20241123_15.json' },
      { date: new Date('2024-11-23T18:00:00'), url: 'https://www.jma.go.jp/bosai/amedas/data/point/44132/20241123_18.json' },
      { date: new Date('2024-11-23T18:10:00'), url: 'https://www.jma.go.jp/bosai/amedas/data/point/44132/20241123_18.json' },
      { date: new Date('2024-11-23T20:50:00'), url: 'https://www.jma.go.jp/bosai/amedas/data/point/44132/20241123_18.json' },
      { date: new Date('2024-11-23T21:00:00'), url: 'https://www.jma.go.jp/bosai/amedas/data/point/44132/20241123_21.json' },
      { date: new Date('2024-11-23T21:10:00'), url: 'https://www.jma.go.jp/bosai/amedas/data/point/44132/20241123_21.json' },
      { date: new Date('2024-11-23T23:50:00'), url: 'https://www.jma.go.jp/bosai/amedas/data/point/44132/20241123_21.json' }
    ]
    testCases.forEach(testCase => {
      const url = dateToAmedasUrl(code, testCase.date)
      try {
        expect(url).toBe(testCase.url)
      } catch {
        throw new Error(`${testCase.date.toISOString()} -> ${url}`)
      }
    })
  })

  it('toAmedasData', () => {
    const fetched = amedasDataJson as FetchedAmedasData
    const date = new Date('2024-11-23T18:00:00')
    const amedasData = toAmedasData(fetched, date)
    expect(amedasData).toEqual({
      pressure: 1016.3,
      temperature: 12,
      humidity: 45,
      date: new Date('2024-11-23T18:00:00')
    })

    const date2 = new Date('2024-11-23T18:10:00')
    const amedasData2 = toAmedasData(fetched, date2)
    expect(amedasData2).toEqual({
      pressure: 1016.5,
      temperature: 12,
      humidity: 45,
      date: new Date('2024-11-23T18:10:00')
    })
  })
})
