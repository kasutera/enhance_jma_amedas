import { dateToAmedasUrl, type FetchedAmedasData, toAmedasData } from './jma_amedas_fetcher'
import amedasDataJson from './testcases/jma_amedas_fetcher/20250628180000.json'
import amedasDataWithNullJson from './testcases/jma_amedas_fetcher/with_null_values.json'

describe('jma_amedas_fetcher', () => {
  it('dateToAmedasUrl', () => {
    const testCases = [
      {
        date: new Date('2024-11-23T00:00:00'),
        url: 'https://www.jma.go.jp/bosai/amedas/data/map/20241123000000.json',
      },
      {
        date: new Date('2024-11-23T20:50:00'),
        url: 'https://www.jma.go.jp/bosai/amedas/data/map/20241123205000.json',
      },
    ]
    testCases.forEach((testCase) => {
      const url = dateToAmedasUrl(testCase.date)
      try {
        expect(url).toBe(testCase.url)
      } catch {
        throw new Error(`${testCase.date} -> ${url}`)
      }
    })
  })

  it('toAmedasData', () => {
    const fetched = amedasDataJson as FetchedAmedasData
    const date = new Date('2024-11-23T18:00:00')
    const amedasData = toAmedasData(fetched, date)
    expect(amedasData['44132']).toEqual({
      pressure: 1003.6,
      temperature: 29.1,
      humidity: 56,
      date: new Date('2024-11-23T18:00:00'),
    })
  })

  describe('null値データの処理', () => {
    it('温度と湿度がnullの場合、そのエントリは除外される', () => {
      const fetched = amedasDataWithNullJson as FetchedAmedasData
      const date = new Date('2024-11-23T18:00:00')
      const amedasData = toAmedasData(fetched, date)

      expect(amedasData['44132']).toEqual({
        pressure: 1006.8,
        temperature: undefined,
        humidity: undefined,
        date: new Date('2024-11-23T18:00:00'),
      })
    })

    it('温度または湿度の片方のみnullの場合、そのエントリは除外される', () => {
      const fetched = amedasDataWithNullJson as FetchedAmedasData
      const date = new Date('2024-11-23T18:00:00')
      const amedasData = toAmedasData(fetched, date)

      expect(amedasData['44134']).toEqual({
        pressure: undefined,
        temperature: undefined,
        humidity: 70,
        date: new Date('2024-11-23T18:00:00'),
      })
    })

    it('温度と湿度が有効な場合、正常に処理される', () => {
      const fetched = amedasDataWithNullJson as FetchedAmedasData
      const date = new Date('2024-11-23T18:00:00')
      const amedasData = toAmedasData(fetched, date)

      // 44133: temp=25.5, humidity=60 で正常
      expect(amedasData['44133']).toEqual({
        pressure: undefined,
        temperature: 25.5,
        humidity: 60,
        date: new Date('2024-11-23T18:00:00'),
      })
    })

    it('nullを0として誤解釈しない', () => {
      const fetched: FetchedAmedasData = {
        '12345': {
          temp: [null, 0] as any,
          humidity: [null, 0] as any,
        },
      }
      const date = new Date('2024-11-23T18:00:00')
      const amedasData = toAmedasData(fetched, date)

      expect(amedasData['12345']).toEqual({
        pressure: undefined,
        temperature: undefined,
        humidity: undefined,
        date: new Date('2024-11-23T18:00:00'),
      })
    })
  })
})
