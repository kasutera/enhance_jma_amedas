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
    // テーブルが存在するかチェック
    const tableExists = this.checkTableExists()
    if (!tableExists) {
      // テーブルが存在しない場合は少し待ってから再試行
      setTimeout(() => {
        this.initialize()
      }, 500)
      return
    }

    this.createContainer()
    this.render()
  }

  /**
   * 対象テーブルが存在するかチェックする
   */
  private checkTableExists(): boolean {
    const amdTable = document.querySelector('#amd-table')
    if (!amdTable) {
      return false
    }

    // エリアテーブルまたは時系列テーブルが存在するかチェック
    const areastable = amdTable.querySelector('.amd-areastable')
    const seriestable = amdTable.querySelector('.amd-table-seriestable')

    return areastable !== null || seriestable !== null
  }

  /**
   * UIコンテナを作成する
   */
  private createContainer(): void {
    try {
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
    } catch (error) {
      console.error('カラースケールUIコンテナの作成に失敗しました:', error)
      // エラーが発生しても既存機能に影響を与えない
    }
  }

  /**
   * UIを描画する
   */
  private render(): void {
    if (!this.container) {
      return
    }

    try {
      this.container.innerHTML = ''

      // トグルチェックボックスを作成
      const toggleContainer = document.createElement('label')
      toggleContainer.style.cssText = `
        display: flex;
        align-items: center;
        cursor: pointer;
        user-select: none;
        margin-bottom: 0px;
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
      label.textContent = 'カラースケール'
      label.style.cssText = `
        color: #333;
        font-size: 12px;
      `

      // イベントリスナーを追加（エラーハンドリング付き）
      checkbox.addEventListener('change', (event) => {
        try {
          const target = event.target as HTMLInputElement
          if (target.checked) {
            this.manager.enable()
          } else {
            this.manager.disable()
          }
        } catch (error) {
          console.error('カラースケール切り替え中にエラーが発生しました:', error)
          // エラーが発生してもUIは元の状態に戻す
          checkbox.checked = this.manager.getEnabled()
        }
      })

      toggleContainer.appendChild(checkbox)
      toggleContainer.appendChild(label)
      this.container.appendChild(toggleContainer)
    } catch (error) {
      console.error('カラースケールUI描画中にエラーが発生しました:', error)
      // エラーが発生しても既存機能に影響を与えない
    }
  }

  /**
   * UIを破棄する
   */
  destroy(): void {
    try {
      if (this.container) {
        this.container.remove()
        this.container = null
      }
    } catch (error) {
      console.error('カラースケールUI破棄中にエラーが発生しました:', error)
      // エラーが発生してもcontainerをnullにして状態をリセット
      this.container = null
    }
  }
}
