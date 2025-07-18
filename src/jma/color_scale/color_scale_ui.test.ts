/**
 * ColorScaleUIのテスト
 */

import { ColorScaleManager } from './color_scale_manager'
import { ColorScaleUI } from './color_scale_ui'

describe('ColorScaleUI', () => {
  let manager: ColorScaleManager
  let ui: ColorScaleUI

  beforeEach(() => {
    manager = new ColorScaleManager()
    ui = new ColorScaleUI(manager)
    document.body.innerHTML = ''
  })

  afterEach(() => {
    ui.destroy()
    document.body.innerHTML = ''
  })

  test('initialize()でUIが作成される', () => {
    ui.initialize()

    const container = document.getElementById('color-scale-controls')
    expect(container).toBeTruthy()

    const checkbox = document.getElementById('color-scale-toggle') as HTMLInputElement
    expect(checkbox).toBeTruthy()
    expect(checkbox.type).toBe('checkbox')
    expect(checkbox.checked).toBe(true) // 初期状態は有効
  })

  test('チェックボックスの状態がマネージャーの状態と同期する', () => {
    ui.initialize()

    const checkbox = document.getElementById('color-scale-toggle') as HTMLInputElement

    // 初期状態
    expect(checkbox.checked).toBe(manager.getEnabled())

    // マネージャーを無効化
    manager.disable()

    // UIを再初期化して状態を確認
    ui.destroy()
    ui.initialize()

    const newCheckbox = document.getElementById('color-scale-toggle') as HTMLInputElement
    expect(newCheckbox.checked).toBe(false)
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

  test('destroy()でUIが削除される', () => {
    ui.initialize()

    // UIが存在することを確認
    expect(document.getElementById('color-scale-controls')).toBeTruthy()

    // 破棄
    ui.destroy()

    // UIが削除されていることを確認
    expect(document.getElementById('color-scale-controls')).toBeFalsy()
  })
})
