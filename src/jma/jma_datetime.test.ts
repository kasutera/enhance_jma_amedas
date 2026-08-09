import { getJstDateParts, jstDateToTimestamp } from './jma_datetime'

describe('JST日時変換', () => {
  test('端末のタイムゾーンに依存せずJSTの暦要素を返す', () => {
    const date = new Date('2026-08-08T15:20:00Z')

    expect(getJstDateParts(date)).toEqual({
      year: 2026,
      month: 8,
      day: 9,
      hour: 0,
      minute: 20,
    })
    expect(jstDateToTimestamp(date)).toBe('20260809002000')
  })
})
