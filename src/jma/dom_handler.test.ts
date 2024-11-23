import { getSeriestables } from './dom_handler'

describe('DOM操作関連の関数のテスト', () => {
    beforeEach(() => {
        document.body.innerHTML = ''
    })

    describe('getSeriestables()', () => {
        test('amd-table-seriestableクラスを持つ要素を全て取得できる', () => {
            // テスト用のDOM要素を作成
            document.body.innerHTML = `
                <div class="amd-table-seriestable"></div>
                <div class="other-class"></div>
                <div class="amd-table-seriestable"></div>
            `
            
            const result = getSeriestables()
            
            expect(result.length).toBe(2)
            result.forEach(element => {
                expect(element.classList.contains('amd-table-seriestable')).toBe(true)
            })
        })

        test('該当要素が存在しない場合は空配列を返す', () => {
            document.body.innerHTML = '<div class="other-class"></div>'
            
            const result = getSeriestables()
            
            expect(result).toEqual([])
        })
    })
})
