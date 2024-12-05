import * as fs from 'node:fs'
import {
  getSelectorBlockItems,
  appendBlockItemToSelectorBlockItems,
  type CheckboxItem
} from './dom_selectorblockitem_handler'

// HTMLの正規化関数 (比較用)
const normalizeHTML = (html: string): string => {
  return html
    .replaceAll(/>\s+</g, '><') // タグ間の空白を削除
    .replaceAll(/\s+/g, ' ') // 連続する空白を1つに
    .trim() // 前後の空白を削除
}

describe('DOM操作関連の関数のテスト', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  describe('getSelectorBlockItems()', () => {
    test('amd-selector-div-block-itemsのIDを持つ要素を取得できる', () => {
      document.body.innerHTML = `
        <div id="amd-selector-div-block-items"></div>
      `

      const result = getSelectorBlockItems()

      expect(result).not.toBeNull()
      expect(result?.id).toBe('amd-selector-div-block-items')
    })

    test('該当要素が存在しない場合はnullを返す', () => {
      document.body.innerHTML = '<div class="other-class"></div>'

      const result = getSelectorBlockItems()

      expect(result).toBeNull()
    })
  })

  describe('appendBlockItemToSelectorBlockItems()', () => {
    test('チェックボックスの要素を追加できる', () => {
      const srcPath = __dirname + '/testcases/dom_selectorblockitem_handler/base.html'
      document.body.innerHTML = fs.readFileSync(srcPath, { encoding: 'utf8' })

      const blockItems = getSelectorBlockItems()
      if (blockItems === null) {
        throw new Error('blockItems is null')
      }
      const checkboxItem: CheckboxItem = {
        id: 'test-id',
        value: 'test-value',
        headerValue: 'テストラベル'
      }

      appendBlockItemToSelectorBlockItems(checkboxItem, blockItems)

      const dstPath = __dirname + '/testcases/dom_selectorblockitem_handler/added.html'
      expect(normalizeHTML(blockItems.outerHTML))
        .toBe(normalizeHTML(fs.readFileSync(dstPath, { encoding: 'utf8' })))
    })
  })
})
