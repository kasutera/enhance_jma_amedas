import { dateToAmedasUrl, type FetchedAmedasData, toAmedasData } from './jma_amedas_fetcher'
import amedasDataJson from './testcases/jma_amedas_fetcher/20250628180000.json'

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
    expect(amedasData["44132"]).toEqual({
      pressure: 1003.6,
      temperature: 29.1,
      humidity: 56,
      date: new Date('2024-11-23T18:00:00'),
    })
  })
})
