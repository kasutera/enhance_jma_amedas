/**
 * カラースケール管理クラス（最小実装）
 */

import { ColorScaleCalculator } from './color_scale_calculator'
import type { ColorScheme } from './color_scale_types'

export class ColorScaleManager {
  private calculator: ColorScaleCalculator

  constructor() {
    this.calculator = new ColorScaleCalculator()
  }

  /**
   * テーブルの指定された列にカラースケールを適用する（最小実装）
   */
  applyColorScaleToColumn(table: HTMLTableElement, columnClass: string): void {
    try {
      // 容積絶対湿度列のみに固定のカラースケールを適用
      if (columnClass !== 'td-volumetric-humidity') {
        return
      }

      const cells = table.querySelectorAll(`.${columnClass}`)
      if (cells.length === 0) {
        return
      }

      // 固定のカラースケール設定（白→青）
      const colorScheme: ColorScheme = {
        type: 'gradient',
        colors: ['#ffffff', '#0066cc'],
      }
      const minValue = 0
      const maxValue = 30

      // 各セルにカラースケールを適用
      cells.forEach((cell) => {
        if (cell instanceof HTMLElement) {
          const value = this.calculator.parseNumericValue(cell.textContent || '')
          if (value !== null) {
            const color = this.calculator.calculateColor(value, minValue, maxValue, colorScheme)
            if (color !== 'transparent') {
              cell.style.backgroundColor = color
              // 文字の可読性を確保するため、背景が濃い場合は白文字にする
              if (value > (minValue + maxValue) / 2) {
                cell.style.color = 'white'
              }
            }
          }
        }
      })
    } catch (error) {
      console.error('カラースケール適用中にエラーが発生しました:', error)
      // エラーが発生しても既存機能に影響を与えない
    }
  }
}
