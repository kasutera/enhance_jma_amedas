import { get_latest_amedas_url, get_amdno_from_url } from './jma_urls'

describe('jma_urls', () => {
    describe('get_latest_amedas_url', () => {
        it('正しいURLを生成できること', () => {
            const code = '44132'
            const yyyymmdd = '20240101'
            const hh = '03'
            const expected = 'https://www.jma.go.jp/bosai/amedas/data/point/44132/20240101_03.json'
            expect(get_latest_amedas_url(code, yyyymmdd, hh)).toBe(expected)
        })
    })

    describe('get_amdno_from_url', () => {
        it('URLの中からamdnoを取得できること', () => {
            expect(get_amdno_from_url('https://www.jma.go.jp/bosai/amedas/#amdno=44132')).toBe('44132')
            expect(get_amdno_from_url('https://www.jma.go.jp/bosai/amedas/#area_type=offices&area_code=130000&amdno=44132&format=table10min&elems=53414')).toBe('44132')
        })

        it('amdnoが見つからない場合はエラーを投げること', () => {
            expect(() => get_amdno_from_url('https://www.jma.go.jp/bosai/amedas/')).toThrow('amdno not found in URL')
        })
    })
})
