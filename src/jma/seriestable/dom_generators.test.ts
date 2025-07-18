import {
  generate1stContentsHeaderElement,
  generate2ndContentsHeaderElement,
  generateAmdTableTdElement,
  generateSimpleTableHiddenTr,
} from './dom_generators'

describe('DOM操作関連の関数のテスト', () => {
  describe('generateSimpleTableHiddenTr()', () => {
    test('正しい構造のtr要素が生成される', () => {
      const elementCount = 3
      const tr = generateSimpleTableHiddenTr(elementCount)

      // クラス名の確認
      expect(tr.classList.contains('simple-table-hidden-tr')).toBe(true)

      // 子要素の数の確認（ヘッダー2列 + 指定した要素数）
      expect(tr.childNodes.length).toBe(elementCount + 2)

      // 全ての子要素がtd要素であることを確認
      Array.from(tr.childNodes).forEach((node) => {
        expect(node.nodeName.toLowerCase()).toBe('td')
        expect((node as HTMLTableCellElement).style.borderBottom).toBe('hidden')
        expect((node as HTMLTableCellElement).style.padding).toBe('0px')
      })
    })

    test('widthの合計が100%になる', () => {
      const elementCount = 3
      const tr = generateSimpleTableHiddenTr(elementCount)

      const totalWidth = Array.from(tr.childNodes)
        .map((node) => Number.parseFloat((node as HTMLTableCellElement).style.width))
        .reduce((sum, width) => sum + width, 0)

      expect(Math.round(totalWidth)).toBe(100)
    })
  })

  describe('generate1stContentsHeaderElement()', () => {
    test('正しい構造のth要素が生成される', () => {
      const className = 'td-wind'
      const headerValue = '風速'

      expect(generate1stContentsHeaderElement(className, headerValue).outerHTML).toBe(
        '<th class="td-wind"><div><div class="amd-table-div-elemname amd-table-elemname-resize-responsive">風速</div></div></th>',
      )
    })
  })

  describe('generate2ndContentsHeaderElement()', () => {
    test('正しい構造のth要素が生成される', () => {
      const className = 'td-wind'
      const headerUnit = 'm/s'

      expect(generate2ndContentsHeaderElement(className, headerUnit).outerHTML).toBe(
        '<th class="td-wind"><div class="amd-table-elemunit-resize-responsive">m/s</div></th>',
      )
    })
  })

  describe('generateAmdTableTdElement()', () => {
    test('正しい構造のtd要素が生成される', () => {
      const className = 'td-wind'
      const value = '3.2'

      expect(generateAmdTableTdElement(className, value).outerHTML).toBe(
        '<td class="td-wind">3.2</td>',
      )
    })
  })
})
