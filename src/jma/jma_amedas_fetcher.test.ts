import {
  type FetchedAmedasData,
  toAmedasData
} from './jma_amedas_fetcher'
import amedasDataJson from './testcases/jma_amedas_fetcher/amedas_data.json'

describe('jma_amedas_fetcher', () => {
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
