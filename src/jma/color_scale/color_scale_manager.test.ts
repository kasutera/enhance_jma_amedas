/**
 * ColorScaleManager のテスト
 */

import { ColorScaleManager } from './color_scale_manager'

describe('ColorScaleManager', () => {
  let manager: ColorScaleManager
  let mockTable: HTMLTableElement

  beforeEach(() => {
    manager = new ColorScaleManager()

    // モックテーブルを作成
    document.body.innerHTML = `
      <table class="amd-areastable">
        <tr>
          <td class="td-volumetric-humidity">15.5</td>
          <td class="td-volumetric-humidity">25.0</td>
          <td class="td-volumetric-humidity">---</td>
          <td class="td-volumetric-humidity">-5.0</td>
          <td class="td-volumetric-humidity">35.0</td>
        </tr>
        <tr>
          <td class="td-dew-point">10.2</td>
          <td class="td-dew-point">20.5</td>
        </tr>
      </table>
    `
    mockTable = document.querySelector('table') as HTMLTableElement
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  describe('applyColorScaleToColumn', () => {
    test('容積絶対湿度列にカラースケールが適用される', () => {
      manager.applyColorScaleToColumn(mockTable, 'td-volumetric-humidity')

      const cells = mockTable.querySelectorAll('.td-volumetric-humidity')

      // 数値を持つセルに背景色が適用されている
      expect((cells[0] as HTMLElement).style.backgroundColor).toMatch(/rgb\(\d+, \d+, \d+\)/)
      expect((cells[1] as HTMLElement).style.backgroundColor).toMatch(/rgb\(\d+, \d+, \d+\)/)

      // 欠損データ（---）には背景色が適用されない
      expect((cells[2] as HTMLElement).style.backgroundColor).toBe('')
    })

    test('容積絶対湿度以外の列にはカラースケールが適用されない', () => {
      manager.applyColorScaleToColumn(mockTable, 'td-dew-point')

      const cells = mockTable.querySelectorAll('.td-dew-point')

      // 背景色が適用されていない
      expect((cells[0] as HTMLElement).style.backgroundColor).toBe('')
      expect((cells[1] as HTMLElement).style.backgroundColor).toBe('')
    })

    test('存在しない列クラスを指定してもエラーにならない', () => {
      expect(() => {
        manager.applyColorScaleToColumn(mockTable, 'non-existent-class')
      }).not.toThrow()
    })
  })
})
