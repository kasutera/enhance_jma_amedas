/**
 * ColorScaleUI のテスト
 */

import { ColorScaleManager } from './color_scale_manager'
import { ColorScaleUI } from './color_scale_ui'

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

describe('ColorScaleUI', () => {
  let manager: ColorScaleManager
  let ui: ColorScaleUI

  beforeEach(() => {
    // ローカルストレージのモックをリセット
    localStorageMock.getItem.mockClear()
    localStorageMock.setItem.mockClear()
    localStorageMock.getItem.mockReturnValue(null)

    manager = new ColorScaleManager()
    ui = new ColorScaleUI(manager)

    // 既存のUIコンテナを削除
    const existingContainer = document.getElementById('color-scale-controls')
    if (existingContainer) {
      existingContainer.remove()
    }

    // テスト用のテーブル構造を作成
    const amdTable = document.createElement('div')
    amdTable.id = 'amd-table'

    const areastable = document.createElement('table')
    areastable.className = 'amd-areastable'

    amdTable.appendChild(areastable)
    document.body.appendChild(amdTable)
  })

  afterEach(() => {
    ui.destroy()

    // テスト用のテーブル構造を削除
    const amdTable = document.getElementById('amd-table')
    if (amdTable) {
      amdTable.remove()
    }
  })

  test('UIを初期化できる', () => {
    ui.initialize()

    const container = document.getElementById('color-scale-controls')
    expect(container).not.toBeNull()
    expect(container?.style.position).toBe('fixed')
  })

  test('チェックボックスが正しい初期状態を持つ', () => {
    ui.initialize()

    const checkbox = document.getElementById('color-scale-toggle') as HTMLInputElement
    expect(checkbox).not.toBeNull()
    expect(checkbox.checked).toBe(manager.getEnabled())
  })

  test('チェックボックスをクリックするとマネージャーの状態が変わる', () => {
    ui.initialize()

    const checkbox = document.getElementById('color-scale-toggle') as HTMLInputElement

    // 初期状態を確認（設定永続化により変動する可能性がある）
    const initialState = manager.getEnabled()
    expect(checkbox.checked).toBe(initialState)

    // チェックボックスの状態を反転させる
    const newState = !initialState
    checkbox.checked = newState
    checkbox.dispatchEvent(new Event('change'))

    // マネージャーの状態が変更されていることを確認
    expect(manager.getEnabled()).toBe(newState)

    // チェックボックスを元の状態に戻す
    checkbox.checked = initialState
    checkbox.dispatchEvent(new Event('change'))

    // マネージャーが元の状態に戻っていることを確認
    expect(manager.getEnabled()).toBe(initialState)
  })

  test('UIを破棄できる', () => {
    ui.initialize()

    const container = document.getElementById('color-scale-controls')
    expect(container).not.toBeNull()

    ui.destroy()

    const destroyedContainer = document.getElementById('color-scale-controls')
    expect(destroyedContainer).toBeNull()
  })

  test('既存のUIコンテナを置き換える', () => {
    ui.initialize()
    const firstContainer = document.getElementById('color-scale-controls')

    ui.initialize() // 再初期化
    const secondContainer = document.getElementById('color-scale-controls')

    expect(firstContainer).not.toBe(secondContainer)
    expect(secondContainer).not.toBeNull()
  })

  test('適切なラベルとタイトルが表示される', () => {
    ui.initialize()

    const container = document.getElementById('color-scale-controls')
    expect(container?.textContent).toContain('カラースケール')
    expect(container?.textContent).toContain('気象庁公式カラー')
    expect(container?.textContent).toContain('容積絶対湿度・露点温度・不快指数')
  })
})
