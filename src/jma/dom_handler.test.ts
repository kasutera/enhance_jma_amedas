import * as fs from 'node:fs'
import {
  getSeriestables,
  type SeriestableRow,
  appendColumnToSeriestable
} from './dom_handler'

describe('DOM操作関連の関数のテスト', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  describe('getSeriestables()', () => {
    test('amd-table-seriestableクラスを持つ要素を全て取得できる', () => {
      // テスト用のDOM要素を作成
      document.body.innerHTML = `
                <table class="amd-table-seriestable"></table>
                <div class="other-class"></div>
                <table class="amd-table-seriestable"></table>
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

// HTMLの正規化関数 (比較用)
const normalizeHTML = (html: string): string => {
  return html
    .replaceAll(/>\s+</g, '><') // タグ間の空白を削除
    .replaceAll(/\s+/g, ' ') // 連続する空白を1つに
    .trim() // 前後の空白を削除
}

describe('Seriestable の行を追加する関数のテスト', () => {
  describe('appendColumnToSeriestable()', () => {
    test('列を追加することができる', () => {
      const srcPath = __dirname + '/testcases/dom_handler/column_to_be_added.html'
      document.body.innerHTML = fs.readFileSync(srcPath, { encoding: 'utf8' })

      const row: SeriestableRow = {
        class: 'new-class',
        headerValue: 'headerValue',
        headerUnit: 'headerUnit',
        values: ['value1', 'value2']
      }

      const seriestable = getSeriestables()[0]
      appendColumnToSeriestable(seriestable, row)
      const dstPath = __dirname + '/testcases/dom_handler/column_added.html'

      expect(normalizeHTML(seriestable.outerHTML))
        .toBe(normalizeHTML(fs.readFileSync(dstPath, { encoding: 'utf8' })))
    })
  })
})
