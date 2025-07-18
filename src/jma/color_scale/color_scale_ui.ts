/**
 * カラースケールUI制御クラス（設定永続化・全列対応）
 */

import type { ColorScaleManager } from './color_scale_manager'
import { COLUMN_DEFINITIONS } from './color_scale_types'

export class ColorScaleUI {
  private container: HTMLElement | null = null
  private manager: ColorScaleManager

  constructor(manager: ColorScaleManager) {
    this.manager = manager
  }

  /**
   * UIを初期化して表示する
   */
  initialize(): void {
    this.createContainer()
    this.render()
  }

  /**
   * UIコンテナを作成する
   */
  private createContainer(): void {
    // 既存のコンテナがあれば削除
    const existingContainer = document.getElementById('color-scale-controls')
    if (existingContainer) {
      existingContainer.remove()
    }

    // 新しいコンテナを作成
    this.container = document.createElement('div')
    this.container.id = 'color-scale-controls'
    this.container.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      z-index: 1000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
    `

    document.body.appendChild(this.container)
  }

  /**
   * UIを描画する
   */
  private render(): void {
    if (!this.container) {
      return
    }

    this.container.innerHTML = ''

    // メインタイトル
    const title = document.createElement('div')
    title.textContent = 'カラースケール設定'
    title.style.cssText = `
      font-weight: bold;
      margin-bottom: 12px;
      color: #333;
      border-bottom: 1px solid #eee;
      padding-bottom: 8px;
    `
    this.container.appendChild(title)

    // トグルチェックボックスを作成
    const toggleContainer = document.createElement('label')
    toggleContainer.style.cssText = `
      display: flex;
      align-items: center;
      cursor: pointer;
      user-select: none;
      margin-bottom: 16px;
    `

    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.id = 'color-scale-toggle'
    checkbox.checked = this.manager.getEnabled()
    checkbox.style.cssText = `
      margin-right: 8px;
      cursor: pointer;
    `

    const label = document.createElement('span')
    label.textContent = 'カラースケール有効'
    label.style.cssText = `
      color: #333;
      font-weight: 500;
    `

    // イベントリスナーを追加
    checkbox.addEventListener('change', (event) => {
      const target = event.target as HTMLInputElement
      if (target.checked) {
        this.manager.enable()
      } else {
        this.manager.disable()
      }
      this.updateColumnSettingsVisibility()
    })

    toggleContainer.appendChild(checkbox)
    toggleContainer.appendChild(label)
    this.container.appendChild(toggleContainer)

    // 各列の設定を表示
    this.renderColumnSettings()
    this.updateColumnSettingsVisibility()
  }

  /**
   * 各列の設定UIを描画する
   */
  private renderColumnSettings(): void {
    if (!this.container) {
      return
    }

    const settingsContainer = document.createElement('div')
    settingsContainer.id = 'column-settings'
    settingsContainer.style.cssText = `
      border-top: 1px solid #eee;
      padding-top: 12px;
    `

    // 各列の設定を作成
    for (const [columnClass, definition] of Object.entries(COLUMN_DEFINITIONS)) {
      const columnConfig = this.manager.getColumnConfig(columnClass)
      if (!columnConfig) {
        continue
      }

      const columnContainer = document.createElement('div')
      columnContainer.style.cssText = `
        margin-bottom: 12px;
        padding: 8px;
        background: #f9f9f9;
        border-radius: 4px;
      `

      // 列名とチェックボックス
      const columnHeader = document.createElement('label')
      columnHeader.style.cssText = `
        display: flex;
        align-items: center;
        cursor: pointer;
        user-select: none;
        font-weight: 500;
        margin-bottom: 4px;
      `

      const columnCheckbox = document.createElement('input')
      columnCheckbox.type = 'checkbox'
      columnCheckbox.checked = columnConfig.enabled
      columnCheckbox.style.cssText = `
        margin-right: 8px;
        cursor: pointer;
      `

      const columnLabel = document.createElement('span')
      columnLabel.textContent = `${definition.name} (${definition.unit})`
      columnLabel.style.cssText = `
        color: #333;
      `

      // イベントリスナー
      columnCheckbox.addEventListener('change', (event) => {
        const target = event.target as HTMLInputElement
        const updatedConfig = { ...columnConfig, enabled: target.checked }
        this.manager.updateColumnConfig(columnClass, updatedConfig)
      })

      columnHeader.appendChild(columnCheckbox)
      columnHeader.appendChild(columnLabel)
      columnContainer.appendChild(columnHeader)

      // カラー表示（簡易プレビュー）
      const colorPreview = document.createElement('div')
      colorPreview.style.cssText = `
        display: flex;
        height: 20px;
        border-radius: 2px;
        overflow: hidden;
        margin-top: 4px;
      `

      // グラデーションプレビューを作成
      const colors = columnConfig.colorScheme.colors
      for (let i = 0; i < colors.length; i++) {
        const colorSegment = document.createElement('div')
        colorSegment.style.cssText = `
          flex: 1;
          background-color: ${colors[i]};
        `
        colorPreview.appendChild(colorSegment)
      }

      columnContainer.appendChild(colorPreview)
      settingsContainer.appendChild(columnContainer)
    }

    this.container.appendChild(settingsContainer)
  }

  /**
   * 列設定の表示・非表示を更新する
   */
  private updateColumnSettingsVisibility(): void {
    const settingsContainer = this.container?.querySelector('#column-settings') as HTMLElement
    if (settingsContainer) {
      settingsContainer.style.display = this.manager.getEnabled() ? 'block' : 'none'
    }
  }

  /**
   * UIを破棄する
   */
  destroy(): void {
    if (this.container) {
      this.container.remove()
      this.container = null
    }
  }
}
