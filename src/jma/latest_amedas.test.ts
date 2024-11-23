import { fetch_latest_time, latest_time_to_yyyymmdd_hh, fetch_latest_amedas_data } from './latest_amedas'
import { get_latest_amedas_url } from './jma_urls'
import {describe, expect} from '@jest/globals';

describe('latest_amedas', () => {
    describe('fetch_latest_time', () => {
        it('最新時刻を取得できること', async () => {
            const latest_time = await fetch_latest_time()
            expect(latest_time).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+09:00$/)
        })
    })

    describe('latest_time_to_yyyymmdd_hh', () => {
        it('正しい形式の日時文字列を変換できること', () => {
            const test_cases = [
                '2024-03-21T15:00:00+09:00',
                '2024-03-21T15:10:00+09:00',
                '2024-03-21T15:20:00+09:00',
                '2024-03-21T16:20:00+09:00',
            ]
            for (const input of test_cases) {
                const [yyyymmdd, hh] = latest_time_to_yyyymmdd_hh(input)
                expect(yyyymmdd).toBe('20240321')
                expect(hh).toBe('15')
            }
        })

        it('不正な形式の文字列でエラーを投げること', () => {
            const input = '不正な形式'
            expect(() => latest_time_to_yyyymmdd_hh(input)).toThrow('Invalid latest_time')
        })
    })

    describe('get_latest_amedas_url', () => {
        it('正しいURLを生成できること', () => {
            const code = '44132'
            const yyyymmdd = '20240321'
            const hh = '15'
            const url = get_latest_amedas_url(code, yyyymmdd, hh)
            expect(url).toBe('https://www.jma.go.jp/bosai/amedas/data/point/44132/20240321_15.json')
        })
    })

    describe('fetch_latest_amedas_data', () => {
        it('アメダスデータを取得できること', async () => {
            const code = '44132'
            const data = await fetch_latest_amedas_data(code)
            expect(data).toBeDefined()
        })
    })
})
