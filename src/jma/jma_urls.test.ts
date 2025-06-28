import { getAmdnoFromUrl, getAmedasUrl } from './jma_urls'

describe('jma_urls', () => {
  describe('getAmedasUrl', () => {
    it('正しいURLを生成できること', () => {
      const code = '44132'
      const yyyymmdd = '20240101'
      const hh = '03'
      const expected = 'https://www.jma.go.jp/bosai/amedas/data/point/44132/20240101_03.json'
      expect(getAmedasUrl(code, yyyymmdd, hh)).toBe(expected)
    })
  })

  describe('getAmdnoFromUrl', () => {
    it('URLの中からamdnoを取得できること', () => {
      expect(getAmdnoFromUrl('https://www.jma.go.jp/bosai/amedas/#amdno=44132')).toBe('44132')
      expect(
        getAmdnoFromUrl(
          'https://www.jma.go.jp/bosai/amedas/#area_type=offices&area_code=130000&amdno=44132&format=table10min&elems=53414',
        ),
      ).toBe('44132')
    })

    it('amdnoが見つからない場合はエラーを投げること', () => {
      expect(() => getAmdnoFromUrl('https://www.jma.go.jp/bosai/amedas/')).toThrow(
        'amdno not found in URL',
      )
    })
  })
})
