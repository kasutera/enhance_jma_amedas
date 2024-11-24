import * as fs from 'node:fs'
import {
  getSeriestables,
  type SeriestableRow,
  appendColumnToSeriestable,
  getLatestDateFromDay,
  getTimeSeries
} from './dom_handler'

// TODO: column_to_be_added.html は 1時間おきのデータであるため、10分おきのケースを追加する

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

describe('getLatestDateFromDay()', () => {
  test('最後の日付を取得できる', () => {
    const testCases = [
      // Month は 0-11 の範囲で指定する
      { dayOfMonth: 23, now: new Date(2024, 11, 24), expected: new Date(2024, 11, 23) },
      { dayOfMonth: 24, now: new Date(2024, 11, 24), expected: new Date(2024, 11, 24) },
      { dayOfMonth: 25, now: new Date(2024, 11, 24), expected: new Date(2024, 10, 25) },
      { dayOfMonth: 1, now: new Date(2024, 2, 1), expected: new Date(2024, 2, 1) },
      { dayOfMonth: 29, now: new Date(2024, 2, 1), expected: new Date(2024, 1, 29) } // 閏年
    ]
    testCases.forEach(({ dayOfMonth, now, expected }) => {
      const date = getLatestDateFromDay(dayOfMonth, now)
      expect(date).toEqual(expected)
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

describe('getTimeSeries()', () => {
  test('時系列を取得できる', () => {
    const srcPath = __dirname + '/testcases/dom_handler/column_added.html'
    document.body.innerHTML = fs.readFileSync(srcPath, { encoding: 'utf8' })

    const seriestable = getSeriestables()[0]
    const timeSeries = getTimeSeries(seriestable)
    const answerTimeSeries = []
    for (let i = 18; i >= 0; i--) {
      answerTimeSeries.push(new Date(2024, 10, 23, i, 0))
    }
    for (let i = 23; i >= 1; i--) {
      answerTimeSeries.push(new Date(2024, 10, 22, i, 0))
    }

    expect(timeSeries).toEqual(answerTimeSeries)
  })
})

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
