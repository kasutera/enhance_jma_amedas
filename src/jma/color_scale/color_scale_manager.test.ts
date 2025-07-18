/**
 * ColorScaleManagerのテスト
 */

import { ColorScaleManager } from './color_scale_manager'

describe('ColorScaleManager', () => {
  let manager: ColorScaleManager
  let mockTable: HTMLTableElement

  beforeEach(() => {
    manager = new ColorScaleManager()

    // モックテーブルを作成
    document.body.innerHTML = `
      <table id="test-table">
        <tr>
          <td class="td-volumetric-humidity">15.5</td>
          <td class="td-volumetric-humidity">25.0</td>
          <td class="td-volumetric-humidity">---</td>
        </tr>
      </table>
    `
    mockTable = document.getElementById('test-table') as HTMLTableElement
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  test('初期状態では有効になっている', () => {
    expect(manager.getEnabled()).toBe(true)
  })

  test('disable()で無効にできる', () => {
    manager.disable()
    expect(manager.getEnabled()).toBe(false)
  })

  test('enable()で有効にできる', () => {
    manager.disable()
    manager.enable()
    expect(manager.getEnabled()).toBe(true)
  })

  test('カラースケールが適用される', () => {
    manager.applyColorScaleToColumn(mockTable, 'td-volumetric-humidity')

    const cells = mockTable.querySelectorAll('.td-volumetric-humidity')
    const cell1 = cells[0] as HTMLElement
    const cell2 = cells[1] as HTMLElement
    const cell3 = cells[2] as HTMLElement

    // 数値セルには背景色が適用される
    expect(cell1.style.backgroundColor).toBeTruthy()
    expect(cell2.style.backgroundColor).toBeTruthy()

    // 欠損データ（---）には背景色が適用されない
    expect(cell3.style.backgroundColor).toBeFalsy()
  })

  test('無効化するとカラースケールが削除される', () => {
    // まずカラースケールを適用
    manager.applyColorScaleToColumn(mockTable, 'td-volumetric-humidity')

    const cells = mockTable.querySelectorAll('.td-volumetric-humidity')
    const cell1 = cells[0] as HTMLElement

    // 背景色が適用されていることを確認
    expect(cell1.style.backgroundColor).toBeTruthy()

    // 無効化
    manager.disable()

    // 背景色が削除されていることを確認
    expect(cell1.style.backgroundColor).toBe('')
  })

  test('再有効化するとカラースケールが再適用される', () => {
    // カラースケールを適用
    manager.applyColorScaleToColumn(mockTable, 'td-volumetric-humidity')

    // 無効化
    manager.disable()

    const cells = mockTable.querySelectorAll('.td-volumetric-humidity')
    const cell1 = cells[0] as HTMLElement

    // 背景色が削除されていることを確認
    expect(cell1.style.backgroundColor).toBe('')

    // 再有効化
    manager.enable()

    // 背景色が再適用されていることを確認
    expect(cell1.style.backgroundColor).toBeTruthy()
  })
})
