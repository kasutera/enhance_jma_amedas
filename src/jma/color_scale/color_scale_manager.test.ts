/**
 * ColorScaleManager のテスト
 */

import { TABLE_CLASS_NAMES } from '../table_classes_definition'
import { ColorScaleManager } from './color_scale_manager'

// ローカルストレージのモック
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('ColorScaleManager', () => {
  let manager: ColorScaleManager

  beforeEach(() => {
    // ローカルストレージのモックをリセット
    localStorageMock.getItem.mockClear()
    localStorageMock.setItem.mockClear()

    // デフォルトでは設定なし（初期値true）
    localStorageMock.getItem.mockReturnValue(null)

    manager = new ColorScaleManager()
  })

  describe('基本機能', () => {
    test('初期状態は有効', () => {
      expect(manager.getEnabled()).toBe(true)
    })

    test('無効にできる', () => {
      manager.disable()
      expect(manager.getEnabled()).toBe(false)
      expect(localStorageMock.setItem).toHaveBeenCalledWith('jma-color-scale-enabled', 'false')
    })

    test('有効にできる', () => {
      manager.disable()
      manager.enable()
      expect(manager.getEnabled()).toBe(true)
      expect(localStorageMock.setItem).toHaveBeenCalledWith('jma-color-scale-enabled', 'true')
    })
  })

  describe('設定永続化', () => {
    test('保存された設定を読み込む（有効）', () => {
      localStorageMock.getItem.mockReturnValue('true')
      const newManager = new ColorScaleManager()
      expect(newManager.getEnabled()).toBe(true)
    })

    test('保存された設定を読み込む（無効）', () => {
      localStorageMock.getItem.mockReturnValue('false')
      const newManager = new ColorScaleManager()
      expect(newManager.getEnabled()).toBe(false)
    })

    test('無効な設定値の場合はデフォルト値を使用', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error')
      })
      const newManager = new ColorScaleManager()
      expect(newManager.getEnabled()).toBe(true)
    })
  })

  describe('テーブル操作', () => {
    let table: HTMLTableElement

    beforeEach(() => {
      // テスト用のテーブルを作成
      table = document.createElement('table')
      table.innerHTML = `
        <tr>
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

    test('無効状態では色が適用されない', () => {
      manager.disable()
      manager.applyColorScaleToColumn(table, TABLE_CLASS_NAMES.volumetricHumidity)

      const cell = table.querySelector(`.${TABLE_CLASS_NAMES.volumetricHumidity}`) as HTMLElement
      expect(cell.style.backgroundColor).toBe('')
    })

    test('無効な列クラスではエラーが発生しない', () => {
      expect(() => {
        manager.applyColorScaleToColumn(table, 'invalid-column')
      }).not.toThrow()
    })
  })
})
