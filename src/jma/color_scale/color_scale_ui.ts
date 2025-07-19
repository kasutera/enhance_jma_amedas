/**
 * カラースケールUI制御クラス（シンプル版）
 */

import type { ColorScaleManager } from './color_scale_manager'

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

    // タイトル
    const title = document.createElement('div')
    title.textContent = 'カラースケール'
    title.style.cssText = `
      font-weight: bold;
      margin-bottom: 8px;
      color: #333;
      font-size: 13px;
    `
    this.container.appendChild(title)

    // トグルチェックボックスを作成
    const toggleContainer = document.createElement('label')
    toggleContainer.style.cssText = `
      display: flex;
      align-items: center;
      cursor: pointer;
      user-select: none;
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
    label.textContent = '気象庁公式カラー'
    label.style.cssText = `
      color: #333;
      font-size: 12px;
    `

    // イベントリスナーを追加
    checkbox.addEventListener('change', (event) => {
      const target = event.target as HTMLInputElement
      if (target.checked) {
        this.manager.enable()
      } else {
        this.manager.disable()
      }
    })

    toggleContainer.appendChild(checkbox)
    toggleContainer.appendChild(label)
    this.container.appendChild(toggleContainer)

    // 説明文
    const description = document.createElement('div')
    description.textContent = '容積絶対湿度・露点温度・不快指数'
    description.style.cssText = `
      font-size: 10px;
      color: #666;
      margin-top: 4px;
      line-height: 1.2;
    `
    this.container.appendChild(description)
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
