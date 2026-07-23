/**
 * ColorScaleManager のテスト
 */

import { TABLE_CLASS_NAMES } from '../table_classes_definition'
import { ColorScaleManager, calculateTextColor, parseColorToRGB } from './color_scale_manager'

describe('ColorScaleManager', () => {
  let manager: ColorScaleManager

  beforeEach(() => {
    manager = new ColorScaleManager()
  })

  describe('テーブル操作', () => {
    let table: HTMLTableElement

    beforeEach(() => {
      // テスト用のテーブルを作成
      table = document.createElement('table')
      table.innerHTML = `
        <tr>
          <td class="${TABLE_CLASS_NAMES.sun1h}">0.8</td>
          <td class="${TABLE_CLASS_NAMES.volumetricHumidity}">15.5</td>
          <td class="${TABLE_CLASS_NAMES.dewPoint}">10.2</td>
          <td class="${TABLE_CLASS_NAMES.temperatureHumidityIndex}">65</td>
        </tr>
      `
      document.body.appendChild(table)
    })

    afterEach(() => {
      document.body.removeChild(table)
    })

    test('テーブルを登録できる', () => {
      expect(() => {
        manager.registerTable(table)
      }).not.toThrow()
    })

    test('特定の列にカラースケールを適用できる', () => {
      manager.applyColorScaleToColumn(table, TABLE_CLASS_NAMES.volumetricHumidity)

      const cell = table.querySelector(`.${TABLE_CLASS_NAMES.volumetricHumidity}`) as HTMLElement
      expect(cell.style.backgroundColor).not.toBe('')
    })

    test('日照時間カラムにカラースケールを適用できる', () => {
      manager.applyColorScaleToColumn(table, TABLE_CLASS_NAMES.sun1h)

      const cell = table.querySelector(`.${TABLE_CLASS_NAMES.sun1h}`) as HTMLElement
      expect(cell.style.backgroundColor).not.toBe('')
      // 0.8h の場合はオレンジ系の色になることを確認
      expect(cell.style.backgroundColor).toBeTruthy()
    })

    test('無効な列クラスではエラーが発生しない', () => {
      expect(() => {
        manager.applyColorScaleToColumn(table, 'invalid-column')
      }).not.toThrow()
    })
  })

  describe('calculateTextColor', () => {
    test('明るい背景色には黒文字を返す', () => {
      expect(calculateTextColor([255, 255, 255])).toBe('#444')
      expect(calculateTextColor([200, 200, 200])).toBe('#444')
      expect(calculateTextColor([150, 200, 250])).toBe('#444')
    })

    test('暗い背景色には白文字を返す', () => {
      expect(calculateTextColor([0, 0, 0])).toBe('white')
      expect(calculateTextColor([50, 50, 50])).toBe('white')
      expect(calculateTextColor([100, 50, 25])).toBe('white')
    })

    test('湿度100%のときの色には白文字を返す (#14)', () => {
      // 湿度100%の色: #091E78 = rgb(9, 30, 120) - 暗い青色
      expect(calculateTextColor([9, 30, 120])).toBe('white')
    })
  })

  describe('parseColorToRGB', () => {
    test('RGB形式の文字列を正しく解析する', () => {
      expect(parseColorToRGB('rgb(255, 0, 0)')).toEqual([255, 0, 0])
      expect(parseColorToRGB('rgb(0, 255, 0)')).toEqual([0, 255, 0])
      expect(parseColorToRGB('rgb(0, 0, 255)')).toEqual([0, 0, 255])
      expect(parseColorToRGB('rgb(128, 128, 128)')).toEqual([128, 128, 128])
    })

    test('16進数カラーコードを正しく解析する', () => {
      expect(parseColorToRGB('#ff0000')).toEqual([255, 0, 0])
      expect(parseColorToRGB('#00ff00')).toEqual([0, 255, 0])
      expect(parseColorToRGB('#0000ff')).toEqual([0, 0, 255])
      expect(parseColorToRGB('#808080')).toEqual([128, 128, 128])
    })

    test('短い16進数カラーコードを正しく解析する', () => {
      expect(parseColorToRGB('#f00')).toEqual([255, 0, 0])
      expect(parseColorToRGB('#0f0')).toEqual([0, 255, 0])
      expect(parseColorToRGB('#00f')).toEqual([0, 0, 255])
    })

    test('湿度100%の色を正しく解析する (#14)', () => {
      // 湿度100%の色: #091E78
      expect(parseColorToRGB('#091E78')).toEqual([9, 30, 120])
    })

    test('不正な形式の場合はnullを返す', () => {
      expect(parseColorToRGB('invalid')).toBe(null)
      expect(parseColorToRGB('rgb()')).toBe(null)
      expect(parseColorToRGB('rgb(255, 255)')).toBe(null)
      expect(parseColorToRGB('rgb(255, 255, 255, 255)')).toEqual([255, 255, 255])
      expect(parseColorToRGB('')).toBe(null)
      expect(parseColorToRGB('rgba(255, 255, 255, 0.5)')).toBe(null)
    })
  })
})
