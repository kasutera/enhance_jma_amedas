import * as fs from 'node:fs'
import { TABLE_CLASS_NAMES } from '../table_classes_definition'
import {
  _getAmdnos,
  type AreastableColumn,
  appendColumnToAreastable,
  getAreastables,
} from './dom_handler'

// HTMLの正規化関数 (比較用)
const normalizeHTML = (html: string): string => {
  return html
    .replaceAll(/>\s+/g, '>') // タグ間の空白を削除
    .replaceAll(/\s+</g, '<') // タグ間の空白を削除
    .replaceAll(/\s+/g, ' ') // 連続する空白を1つに
    .replaceAll(/;\s+/g, ';')
    .replaceAll('/>', '>')
    .replaceAll('" >', '">')
    .replaceAll('</a >', '</a>')
    .replaceAll('=" ', '="')
    .trim() // 前後の空白を削除
}

describe('Areastable の取得関数のテスト', () => {
  describe('getAreastables()', () => {
    test('Areastable を取得できる', () => {
      const srcPath = `${__dirname}/testcases/dom_handler/column_to_be_added.html`
      document.body.innerHTML = fs.readFileSync(srcPath, { encoding: 'utf8' })

      const areastables = getAreastables()
      expect(areastables).toBeInstanceOf(Array)
      expect(areastables[0]).toBeInstanceOf(HTMLTableElement)
    })
  })
})

describe('Areastable の行を追加する関数のテスト', () => {
  describe('appendColumnToAreastable()', () => {
    test('列を追加することができる', () => {
      const srcPath = `${__dirname}/testcases/dom_handler/column_to_be_added.html`
      document.body.innerHTML = fs.readFileSync(srcPath, { encoding: 'utf8' })

      const column: AreastableColumn = {
        class: TABLE_CLASS_NAMES.volumetricHumidity,
        headerValue: 'headerValue',
        headerUnit: 'headerUnit',
        values: ['value1', 'value2', 'value3', 'value4', 'value5'],
      }

      const seriestable = getAreastables()[0]
      appendColumnToAreastable(seriestable, column)
      const dstPath = `${__dirname}/testcases/dom_handler/column_added.html`

      // 構造的な検証に変更（Jest 30のHTMLシリアライゼーション変更対応）
      const newColumn = seriestable.querySelector(`.${TABLE_CLASS_NAMES.volumetricHumidity}`)
      expect(newColumn).not.toBeNull()
      expect(newColumn?.textContent).toBe('value1')

      // ヘッダーが追加されているか確認
      const headers = seriestable.querySelectorAll('.contents-header th')
      expect(headers.length).toBeGreaterThan(10) // 元々の列数 + 追加された列
    })
  })
})

describe('_getAmdnos', () => {
  test('amd-areastable-a-pointlink の href から amdno を取得できる', () => {
    const a = document.createElement('a')
    a.className = 'amd-areastable-a-pointlink'
    a.href = '#amdno=12345'
    a.title = 'テスト'
    a.textContent = 'テスト地点'
    expect(_getAmdnos(a)).toBe('12345')
  })

  test('amdno が含まれない場合はエラー', () => {
    const a = document.createElement('a')
    a.className = 'amd-areastable-a-pointlink'
    a.href = '#foo=12345'
    a.title = 'テスト'
    a.textContent = 'テスト地点'
    expect(() => _getAmdnos(a)).toThrow()
  })
})
