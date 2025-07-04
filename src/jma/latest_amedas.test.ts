import { describe, expect } from '@jest/globals'
import { getAmedasUrl } from './jma_urls'
import { latestTimeToAmedasDateTime } from './latest_amedas'

// FIXME: fetch 系のテストが失敗する (ReferenceError: fetch is not defined)

describe('latest_amedas', () => {
  // describe('fetchLatestTime', () => {
  //   it('最新時刻を取得できること', async () => {
  //     const latestTime = await fetchLatestTime()
  //     expect(latestTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+09:00$/)
  //   })
  // })

  describe('latestTimeToAmedasDateTime', () => {
    it('正しい形式の日時文字列を変換できること', () => {
      const testCases = [
        '2024-03-21T15:00:00+09:00',
        '2024-03-21T15:10:00+09:00',
        '2024-03-21T15:20:00+09:00',
        '2024-03-21T16:20:00+09:00',
      ]
      for (const input of testCases) {
        const [yyyymmdd, hh] = latestTimeToAmedasDateTime(input)
        expect(yyyymmdd).toBe('20240321')
        expect(hh).toBe('15')
      }
    })

    it('不正な形式の文字列でエラーを投げること', () => {
      const input = '不正な形式'
      expect(() => latestTimeToAmedasDateTime(input)).toThrow('Invalid latestTime: 不正な形式')
    })
  })

  describe('getAmedasUrl', () => {
    it('正しいURLを生成できること', () => {
      const code = '44132'
      const yyyymmdd = '20240321'
      const hh = '15'
      const url = getAmedasUrl(code, yyyymmdd, hh)
      expect(url).toBe('https://www.jma.go.jp/bosai/amedas/data/point/44132/20240321_15.json')
    })
  })

  // describe('fetch_latest_amedas_data', () => {
  //   it('アメダスデータを取得できること', async () => {
  //     const code = '44132'
  //     const data = await fetchLatestAmedasData(code)
  //     expect(data).toBeDefined()
  //   })
  // })
})
